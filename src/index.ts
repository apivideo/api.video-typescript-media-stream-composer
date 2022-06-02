import { ApiVideoMediaRecorder, ProgressiveUploaderOptionsWithAccessToken, ProgressiveUploaderOptionsWithUploadToken, VideoUploadResponse } from "@api.video/media-recorder";
import { AddStreamOptions, AudioEffect, DrawFunction, VideoStreamMerger } from "video-stream-merger";


export interface Options {
    resolution?: {
        width: number;
        height: number;
    }
};

export interface StreamOptions {
    name?: string;
    position?: "contain" | "cover" | "fixed";
    top?: number | string;
    bottom?: number | string;
    left?: number | string;
    right?: number | string;
    horizontalAlign?: "left" | "center" | "right";
    verticalAlign?: "top" | "center" | "bottom";
    width?: number | string;
    height?: number | string;
    draggable?: boolean;
    resizable?: boolean;
    mask?: "none" | "circle" | "rectangle";
    index?: number;
    mute?: boolean;
    muted?: boolean;
    draw?: DrawFunction;
    audioEffect?: AudioEffect;
    onClick?: (streamId: string, event: MouseEvent) => void;
}

type Mask = "none" | "circle" | "rectangle";

interface StreamDisplaySettings {
    x: number;
    y: number;
    width: number;
    height: number;
    radius?: number;
    index: number;
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

interface Drag {
    hasMoved: boolean,
    streamId: string;
    mouseStartPosition: {
        x: number;
        y: number;
    };
    streamStartPosition: {
        x: number;
        y: number;
        width: number;
        height: number;
        radius?: number;
    };
}

type MouseMode = "move" | "circle-resize"
    | "top-resize" | "right-resize" | "bottom-resize" | "left-resize";

export class MediaStreamComposer {
    private options: Options;
    private merger?: VideoStreamMerger;
    public result: MediaStream | null = null;
    private resolution: Resolution;
    private recorder?: ApiVideoMediaRecorder;
    private canvas?: HTMLCanvasElement;
    private streams: { [id: string]: { id: string, options: StreamOptions, displaySettings: StreamDisplaySettings, stream: MediaStream } } = {};
    private mouseStreamId: string | null = null;
    private mouseMode: MouseMode | null = null;
    private drag: Drag | null = null;

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
        if (!this.recorder) {
            throw new Error("Recorder is not started");
        }
        return this.recorder.stop();
    }

    public updateStream(streamId: string, opts: StreamOptions) {
        const stream = this.streams[streamId];
        const newOptions = {
            ...stream.options,
            ...opts,
            index: opts.index || stream.displaySettings.index
        };
        this.streams[streamId] = {
            ...stream,
            options: newOptions,
            displaySettings: this.buildStreamDisplaySettings(streamId, stream.stream, newOptions)
        };
        this.cleanIndexes();
    }

    public showCanvas(containerQuerySelector: string) {
        console.log("here");
        const container = document.querySelector(containerQuerySelector) as HTMLCanvasElement;
        if (!container) {
            throw new Error("Container not found");
        }
        if (!this.canvas) {
            throw new Error("Canvas is not created yet");
        }
        console.log(container);
        container.appendChild(this.canvas!);
        this.canvas!.style.position = "unset";
        this.canvas!.style.pointerEvents = "unset";
    }

    public removeStream(id: string) {
        const stream = this.streams[id];
        if (stream) {
            this.merger?.removeStream(stream.stream);
            delete this.streams[id];
        }
        this.cleanIndexes();
    }

    public addStream(mediaStream: MediaStream, options: StreamOptions): string {
        let streamId = ""+ Object.keys(this.streams).length;
        const displaySettings = this.buildStreamDisplaySettings(streamId, mediaStream, options);
        this.streams[streamId] = {
            id: streamId,
            options,
            displaySettings,
            stream: mediaStream
        }


        options = {
            ...options,
            draw: (ctx, frame, done) => {
                const displaySettings = this.streams[streamId].displaySettings;

                if (this.streams[streamId].options.mask === "circle") {
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
                        displaySettings.width < displaySettings.height ? radius * 2 : radius * 2 * (displaySettings.width / displaySettings.height),
                        displaySettings.height < displaySettings.width ? radius * 2 : radius * 2 * (displaySettings.height / displaySettings.width));

                    ctx.restore();
                } else {
                    ctx.drawImage(frame, displaySettings.x, displaySettings.y, displaySettings.width, displaySettings.height);
                }

                done();
            }
        }

        console.log("adding", displaySettings);
        this.getMerger().addStream(mediaStream, {
            ...options,
            ...displaySettings,
        } as AddStreamOptions);

        this.cleanIndexes();
        
        return streamId;
    }

    public getCanvas() {
        return this.canvas;
    }

    public getStreams() {
        return Object.values(this.streams);
    }

    public getStream(id: string) {
        return this.streams[id];
    }

    public moveFront(id: string) {
        const thisStream = this.getStream(id);
        const currentIndex = thisStream.displaySettings.index;
        console.log(currentIndex);
        let skip = true;
        
        for(let stream of Object.values(this.streams)) {
            if(stream.displaySettings.index == currentIndex + 1) {
                skip = false;
                stream.displaySettings.index--;
            }
        }
        if(!skip) {
           thisStream.displaySettings.index++;
        }

        this.getStreams().forEach(s => this.merger?.updateIndex(s.stream, s.displaySettings.index))

        console.log("new indexes", this.getStreams().map(s => ({id: s.id, index: s.displaySettings.index})));
    }

    private cleanIndexes() {
        let index = 1;
        this.getStreams()
            .sort((a, b) => a.displaySettings.index - b.displaySettings.index)
            .forEach(s => s.displaySettings.index = index++);

            this.getStreams().forEach(s => this.merger?.updateIndex(s.stream, s.displaySettings.index));
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

        let radius = undefined;

        if (width === undefined && height === undefined) {
            width = containerDimentions.width;
            height = containerDimentions.height;
        }

        if (mask === "circle") {
            if (width === undefined) {
                radius = height! / 2;
            } else if (height === undefined) {
                radius = width! / 2;
            } else {
                radius = Math.min(width!, height!) / 2;
            }
        }

        if (width === undefined) {
            width = elementDimentions.width * height! / elementDimentions.height;
        }

        if (height === undefined) {
            height = elementDimentions.height * width! / elementDimentions.width;
        }


        return { radius, width, height, ...this.calcPosition(containerDimentions, { width, height }, position, mask) }
    }

    private buildStreamDisplaySettings(id: string, mediaStream: MediaStream, options: StreamOptions): StreamDisplaySettings {

        console.log(options);
        const trackSettings = mediaStream.getVideoTracks()[0].getSettings();
        const streamWidth = trackSettings.width!;
        const streamHeight = trackSettings.height!;

        let pos: Resolution & Position & { radius?: number };

        if (options.position === "contain") {
            pos = this.calculateContainDimensions(this.resolution, { width: streamWidth, height: streamHeight }, { verticalAlign: options.verticalAlign!, horizontalAlign: options.horizontalAlign! }, options.mask);
        } else if (options.position === "cover") {
            pos = this.calculateCoverDimensions(this.resolution, { width: streamWidth, height: streamHeight }, { verticalAlign: options.verticalAlign!, horizontalAlign: options.horizontalAlign! }, options.mask);
        } else {
            let alignmentOrPosition: Alignment | PositionOrPercent = { ...options } as Alignment | PositionOrPercent;

            pos = this.calculateFixedDimensions(this.resolution, { width: streamWidth, height: streamHeight }, { width: options.width!, height: options.height! }, alignmentOrPosition, options.mask);
        }

        console.log("=>", options.index || Object.keys(this.streams).length + 1);
        return {
            ...pos,
            index: options.index || Object.keys(this.streams).length + 1,
        };
    }

    private mouseUp(e: MouseEvent) {
        if (this.mouseStreamId != null) {
            const stream = this.streams[this.mouseStreamId];
            if (this.drag && !this.drag?.hasMoved && stream.options.onClick) {
                stream.options.onClick(this.mouseStreamId, e);
            }
        }
        this.drag = null;
    }

    private mouseDown(e: MouseEvent) {
        if (this.mouseStreamId != null) {
            const stream = this.streams[this.mouseStreamId];

            if (stream.options.draggable) {
                this.drag = {
                    hasMoved: false,
                    streamId: this.mouseStreamId,
                    mouseStartPosition: {
                        x: e.offsetX,
                        y: e.offsetY
                    },
                    streamStartPosition: {
                        ...stream.displaySettings
                    }
                }
            }
        }
    }

    private mouseMove(e: MouseEvent) {
        const mX = e.offsetX;
        const mY = e.offsetY;



        if (this.drag != null) {
            if (!this.drag.hasMoved) {
                this.drag.hasMoved = true;
            }
            const stream = this.streams[this.drag.streamId];

            if (this.mouseMode === "move") {
                this.updateStream(this.drag.streamId, {
                    ...stream.options,
                    left: e.offsetX - (this.drag.mouseStartPosition.x - this.drag.streamStartPosition.x),
                    top: e.offsetY - (this.drag.mouseStartPosition.y - this.drag.streamStartPosition.y),
                    position: "fixed"
                });
            } else if (this.mouseMode === "circle-resize") {
                const circleCenter = {
                    x: this.drag.streamStartPosition.x + this.drag.streamStartPosition.radius!,
                    y: this.drag.streamStartPosition.y + this.drag.streamStartPosition.radius!
                };
                const newRadius = Math.sqrt(Math.pow(mX - circleCenter.x, 2) + Math.pow(mY - circleCenter.y, 2));
                const change = newRadius / this.drag.streamStartPosition.radius!;

                const newDisplaySettings = {
                    width: this.drag.streamStartPosition.width * change,
                    height: this.drag.streamStartPosition.height * change,
                    top: this.drag.streamStartPosition.y + (this.drag.streamStartPosition.radius! - newRadius),
                    left: this.drag.streamStartPosition.x + (this.drag.streamStartPosition.radius! - newRadius),
                };
                this.updateStream(this.drag.streamId, newDisplaySettings);
            } else if (this.mouseMode === "bottom-resize") {
                const height = this.drag.streamStartPosition.height + mY - this.drag.mouseStartPosition.y;
                const width = this.drag.streamStartPosition.width * height / this.drag.streamStartPosition.height;
                const left = this.drag.streamStartPosition.x - (width - this.drag.streamStartPosition.width) / 2;
                this.updateStream(this.drag.streamId, { height, width, left });
            } else if (this.mouseMode === "top-resize") {
                const height = this.drag.streamStartPosition.height - (mY - this.drag.mouseStartPosition.y);
                const width = this.drag.streamStartPosition.width * height / this.drag.streamStartPosition.height;
                const top = this.drag.streamStartPosition.y + (mY - this.drag.mouseStartPosition.y);
                const left = this.drag.streamStartPosition.x - (width - this.drag.streamStartPosition.width) / 2;
                this.updateStream(this.drag.streamId, { height, top, left, width });
            } else if (this.mouseMode === "left-resize") {
                const width = this.drag.streamStartPosition.width - (mX - this.drag.mouseStartPosition.x);
                const height = this.drag.streamStartPosition.height * width / this.drag.streamStartPosition.width;
                const left = this.drag.streamStartPosition.x + (mX - this.drag.mouseStartPosition.x);
                const top = this.drag.streamStartPosition.y - (height - this.drag.streamStartPosition.height) / 2;
                this.updateStream(this.drag.streamId, { width, left, height, top });
            } else if (this.mouseMode === "right-resize") {
                const width = this.drag.streamStartPosition.width + (mX - this.drag.mouseStartPosition.x)
                const height = this.drag.streamStartPosition.height * width / this.drag.streamStartPosition.width;
                const top = this.drag.streamStartPosition.y - (height - this.drag.streamStartPosition.height) / 2;
                this.updateStream(this.drag.streamId, { width, height, top });
            }

            return;
        }

        let mouseStreamId: string | null = null;

        const streamIds = Object.keys(this.streams);
        let index = 0;
        let mouseMode: MouseMode | null = null;
        for (let streamId in streamIds) {
            let currentMouseMode: MouseMode | null = null;
            const stream = this.streams[streamId];
            if(!stream) continue;
            let {
                x,
                y,
                width,
                height
            } = stream.displaySettings;

            let isInside = false;
            let isOnResizeEdge = false;

            if (stream.options.mask === "circle") {
                const centerX = x + stream.displaySettings.radius!;
                const centerY = y + stream.displaySettings.radius!;
                const distance = Math.sqrt(Math.pow(centerX - mX, 2) + Math.pow(centerY - mY, 2));
                if (distance <= stream.displaySettings.radius! + 10 && distance > stream.displaySettings.radius! - 10) {
                    currentMouseMode = "circle-resize";
                } else if (distance <= stream.displaySettings.radius!) {
                    currentMouseMode = "move";
                }
            } else {
                if (mX > x && mX < x + width && mY > y - 10 && mY < y + 10) currentMouseMode = "top-resize";
                if (mX > x && mX < x + width && mY > y + height - 10 && mY < y + height + 10) currentMouseMode = "bottom-resize";

                if (mY > y && mY < y + height && mX > x - 10 && mX < x + 10) currentMouseMode = "left-resize";
                if (mY > y && mY < y + height && mX > x + width - 10 && mX < x + width + 10) currentMouseMode = "right-resize";

                else if (mX > x && mX < x + width && mY > y && mY < y + height) currentMouseMode = "move";
            }


            if(currentMouseMode != null)
                console.log(`stream ${streamId} had index ${stream.displaySettings.index!} vs index ${index}`);
            if (currentMouseMode != null && stream.displaySettings.index! > index) {
                index = stream.displaySettings.index!;
                mouseStreamId = streamId;
                mouseMode = currentMouseMode;
            }
        }

        if (mouseStreamId !== null) {
            const stream = this.streams[mouseStreamId];
           
            if (stream.options.draggable && mouseMode === "move") {
                this.canvas!.style.cursor = "grab";
            } else if(stream.options.resizable) {
                switch (mouseMode) {
                    case "circle-resize": this.canvas!.style.cursor = "all-scroll"; break;
                    case "bottom-resize":
                    case "top-resize": this.canvas!.style.cursor = "ns-resize"; break;
                    case "left-resize":
                    case "right-resize": this.canvas!.style.cursor = "ew-resize"; break;
                }
            } else {
                this.canvas!.style.cursor = "auto";
            }
        }

        if (mouseStreamId !== this.mouseStreamId) {
            this.canvas!.style.cursor = "auto";
            this.mouseStreamId = mouseStreamId;
        }
        this.mouseMode = mouseMode;

    }

    private getMerger(): VideoStreamMerger {
        if (!this.merger) {
            this.merger = new VideoStreamMerger({ ...this.resolution, fps: 25, clearRect: true } as any);
            this.merger.start();
            this.canvas = (this.merger as any)._canvas;
            this.canvas!.addEventListener("mouseup", (e) => this.mouseUp(e));
            this.canvas!.addEventListener("mousedown", (e) => this.mouseDown(e));
            this.canvas!.addEventListener("mousemove", (e) => this.mouseMove(e));
            this.canvas!.addEventListener("mouseleave", (e) => this.mouseUp(e));
            this.result = this.merger.result;
        }
        return this.merger;
    }

}