import { ApiVideoMediaRecorder, ProgressiveUploaderOptionsWithAccessToken, ProgressiveUploaderOptionsWithUploadToken, VideoUploadResponse } from "@api.video/media-recorder";
import { AudioEffect, DrawFunction, VideoStreamMerger } from "video-stream-merger";


export interface Options {
    resolution?: {
        width: number;
        height: number;
    }
};

export interface AddStreamOptions {
    position?: "contain" | "cover" | "fixed";
    top: number | string;
    bottom: number | string;
    left: number | string;
    right: number | string;
    horizontalAlign: "left" | "center" | "right";
    verticalAlign: "top" | "center" | "bottom";
    width: number | string;
    height: number | string;
    mask?: "none" | "circle" | "rectangle";
    index: number;
    mute: boolean;
    muted: boolean;
    draw: DrawFunction;
    audioEffect: AudioEffect;
}

type Mask = "none" | "circle" | "rectangle";

interface StreamDisplaySettings {
    mask?: Mask;
    x: number;
    y: number;
    width: number;
    height: number;
    radius?: number;
}

interface Resolution {
    height: number;
    width: number;
}

interface Position {
    x: number;
    y: number;
}

interface PositionOrPercent {
    top: number | string;
    bottom: number | string;
    left: number | string;
    right: number | string;
}

interface ResolutionOrPercent {
    height: number | string;
    width: number | string;
}

interface Alignment {
    horizontalAlign: "left" | "center" | "right";
    verticalAlign: "top" | "center" | "bottom";
}

export class MediaStreamMerger {
    private options: Options;
    private merger?: VideoStreamMerger;
    public result: MediaStream | null = null;
    private resolution: Resolution;
    private recorder?: ApiVideoMediaRecorder;
    private streams: { [id: number]: { options: AddStreamOptions, settings: StreamDisplaySettings, stream: MediaStream } } = {};

    constructor(options: Options) {
        this.options = {
            resolution: {
                width: 1280,
                height: 720
            },
            ...options
        };

        this.resolution = this.options.resolution!;
    }

    public startRecording(options: ProgressiveUploaderOptionsWithUploadToken | ProgressiveUploaderOptionsWithAccessToken) {
        this.recorder = new ApiVideoMediaRecorder(this.result!, options);
        this.recorder.start();
    }

    public stopRecording(): Promise<VideoUploadResponse> {
        if(!this.recorder) {
            throw new Error("Recorder is not started");
        }
        return this.recorder.stop();
    }

    public updateStream(streamId: number, opts: AddStreamOptions) {
        this.streams[streamId] = this.buildStreamDisplaySettings(this.streams[streamId].stream, {
            ...this.streams[streamId].options,
            ...opts
        });
    }

    public addStream(mediaStream: MediaStream, options: AddStreamOptions): number {
        const streamSettings = this.buildStreamDisplaySettings(mediaStream, options);
        let streamId = Object.keys(this.streams).length;
        this.streams[streamId] = streamSettings;


        options = {
            ...options,
            draw: (ctx, frame, done) => {
                const displaySettings = this.streams[streamId].settings;

                if (displaySettings.mask === "circle") {
                    ctx.save();
                    ctx.beginPath();

                    const radius = displaySettings.radius!;

                    ctx.arc(
                        displaySettings.x + radius,
                        displaySettings.y + radius,
                        radius,
                        0,
                        Math.PI * 2,
                        false
                    );

                    ctx.clip();

                    ctx.drawImage(frame, 
                        displaySettings.height < displaySettings.width ? displaySettings.x - (displaySettings.width - displaySettings.height) / 2 : displaySettings.x, 
                        displaySettings.width < displaySettings.height ? displaySettings.y - (displaySettings.height - displaySettings.width) / 2 : displaySettings.y, 
                        displaySettings.width < displaySettings.height ?  radius * 2 : radius * 2 * (displaySettings.width / displaySettings.height), 
                        displaySettings.height < displaySettings.width ? radius * 2 : radius * 2 * (displaySettings.height / displaySettings.width));

                    ctx.restore();
                } else {
                    ctx.drawImage(frame, displaySettings.x, displaySettings.y, displaySettings.width, displaySettings.height);
                }

                done();
            }
        }

        this.getMerger().addStream(mediaStream, {
            ...options,
            ...streamSettings.settings
        });
        return streamId;
    }


    private calcPosition(containerDimentions: Resolution, elementDimentions: Resolution, position?: Alignment | PositionOrPercent, mask?: Mask): Position {

        const realEltDim = mask === "circle"
            ? {
                width: Math.min(elementDimentions.width, elementDimentions.height),
                height: Math.min(elementDimentions.width, elementDimentions.height),
            }
            : elementDimentions;



        const pos = position as any || {};
        let x, y;

        if (pos.left) {
            x = typeof pos.left === "number" ? pos.left : parseInt(pos.left || "0%") * containerDimentions.width / 100;
        } else if (pos.right) {
            x = containerDimentions.width - elementDimentions.width - (typeof pos.right === "number" ? pos.right : parseInt(pos.right || "0%") * containerDimentions.width / 100);
            x += (elementDimentions.width - realEltDim.width) / 2;
        } else if (pos.horizontalAlign) {
            x = pos.horizontalAlign === "center"
                ? Math.round((containerDimentions.width - realEltDim.width) / 2)
                : pos.horizontalAlign === "right"
                    ? containerDimentions.width - realEltDim.width
                    : 0;
        } else {
            x = 0;
        }

        if (pos.top) {
            y = typeof pos.top === "number" ? pos.top : parseInt(pos.top || "0%") * containerDimentions.height / 100;
            y -= (elementDimentions.height - realEltDim.height) / 2;
        } else if (pos.bottom) {
            y = containerDimentions.height - elementDimentions.height - (typeof pos.bottom === "number" ? pos.bottom : parseInt(pos.bottom || "0%") * containerDimentions.height / 100);
            y += (elementDimentions.height - realEltDim.height) / 2;
        } else if (pos.verticalAlign) {
            y = pos.verticalAlign === "center"
                ? Math.round((containerDimentions.height - realEltDim.height) / 2)
                : pos.verticalAlign === "bottom"
                    ? containerDimentions.height - realEltDim.height
                    : 0
        } else {
            y = 0;
        }

        return { x, y };

    }

    private calculateCoverDimensions(containerDimentions: Resolution, elementDimentions: Resolution, alignment?: Alignment | PositionOrPercent, mask?: Mask): Resolution & Position & { radius?: number } {
        let width, height;
        if (elementDimentions.width / containerDimentions.width > elementDimentions.height / containerDimentions.height) {
            height = containerDimentions.height;
            width = elementDimentions.width * containerDimentions.height / elementDimentions.height;
        } else {
            width = containerDimentions.width;
            height = elementDimentions.height * containerDimentions.width / elementDimentions.width;
        };
        console.log({width, height});
        return { width, height, ...this.calcPosition(containerDimentions, { width, height }, alignment, mask) }
    }

    private calculateContainDimensions(containerDimentions: Resolution, elementDimentions: Resolution, position?: Alignment | PositionOrPercent, mask?: Mask): Resolution & Position & { radius?: number } {
        let width, height;
        if (elementDimentions.width / containerDimentions.width > elementDimentions.height / containerDimentions.height) {
            width = containerDimentions.width;
            height = elementDimentions.height * containerDimentions.width / elementDimentions.width;
        } else {
            height = containerDimentions.height;
            width = elementDimentions.width * containerDimentions.height / elementDimentions.height;
        };

        return { width, height, ...this.calcPosition(containerDimentions, { width, height }, position, mask) }
    }

    private calculateFixedDimensions(containerDimentions: Resolution, elementDimentions: Resolution, targetDimensions: ResolutionOrPercent, position?: Alignment | PositionOrPercent, mask?: Mask): Resolution & Position & { radius?: number } {

        let width = typeof targetDimensions.width === "undefined"
            ? undefined
            : typeof targetDimensions.width === "number"
                ? targetDimensions.width
                : parseInt(targetDimensions.width || "100%") * containerDimentions.width / 100;
        let height = typeof targetDimensions.height === "undefined"
            ? undefined
            : typeof targetDimensions.height === "number"
                ? targetDimensions.height
                : parseInt(targetDimensions.height || "100%") * containerDimentions.height / 100;

        let radius = 0;

        if (width === undefined && height === undefined) {
            width = containerDimentions.width;
            height = containerDimentions.height;
        }

        if (width === undefined) {
            radius = height! / 2;
            width = elementDimentions.width * height! / elementDimentions.height;
        }

        if (height === undefined) {
            radius = width! / 2;
            height = elementDimentions.height * width! / elementDimentions.width;
        }


        return { radius, width, height, ...this.calcPosition(containerDimentions, { width, height }, position, mask) }
    }

    private buildStreamDisplaySettings(mediaStream: MediaStream, options: AddStreamOptions): { options: AddStreamOptions, settings: StreamDisplaySettings, stream: MediaStream } {

        const trackSettings = mediaStream.getVideoTracks()[0].getSettings();
        const streamWidth = trackSettings.width!;
        const streamHeight = trackSettings.height!;

        let pos: Resolution & Position & { radius?: number };

        if (options.position === "contain") {
            pos = this.calculateContainDimensions(this.resolution, { width: streamWidth, height: streamHeight }, { verticalAlign: options.verticalAlign, horizontalAlign: options.horizontalAlign }, options.mask);
        } else if (options.position === "cover") {
            pos = this.calculateCoverDimensions(this.resolution, { width: streamWidth, height: streamHeight }, { verticalAlign: options.verticalAlign, horizontalAlign: options.horizontalAlign }, options.mask);
        } else {
            let alignmentOrPosition: Alignment | PositionOrPercent = { ...options };

            pos = this.calculateFixedDimensions(this.resolution, { width: streamWidth, height: streamHeight }, { width: options.width, height: options.height }, alignmentOrPosition, options.mask);
        }


        return {
            options,
            stream: mediaStream,
            settings: {
                ...options,
                ...pos,
            }
        };
    }

    private getMerger(): VideoStreamMerger {
        if(!this.merger) {
            this.merger =  new VideoStreamMerger({ ...this.resolution, fps: 25, clearRect: true } as any);
            this.merger.start();
            this.result = this.merger.result;
        }
        return this.merger;
    }

}