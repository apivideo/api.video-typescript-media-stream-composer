import { ApiVideoMediaRecorder, ProgressiveUploaderOptionsWithAccessToken, ProgressiveUploaderOptionsWithUploadToken, VideoUploadResponse } from "@api.video/media-recorder";
import { AddStreamOptions, VideoStreamMerger } from "video-stream-merger";
import MouseEventListener, { DragEvent, MoveEvent } from "./mouse-event-listener";


export interface Options {
    resolution: Resolution
};

export interface StreamOptions {
    name?: string;
    position?: "contain" | "cover" | "fixed";
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    draggable?: boolean;
    resizable?: boolean;
    mask?: Mask;
    index?: number;
    mute?: boolean;
    onClick?: (streamId: string, event: { x: number, y: number }) => void;
}

type Mask = "none" | "circle";

interface StreamDisplaySettings {
    displayResolution: Resolution,
    streamResolution: Resolution,
    position: Position,
    radius?: number;
    index: number;
}

interface DimensionsCalculationResult {
    displayResolution: Resolution,
    position: Position,
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

export interface StreamDetails {
    id: string;
    options: StreamOptions;
    displaySettings: StreamDisplaySettings;
    stream: MediaStream;
}

interface DrawingSettings {
    color: string;
    lineWidth: number;
    autoEraseDelay: number;
}

type MouseTool = "draw" | "move-resize";

type MouseAction = "move" | "circle-resize"
    | "top-resize" | "right-resize" | "bottom-resize" | "left-resize";

type RecordingOptions = ProgressiveUploaderOptionsWithUploadToken | ProgressiveUploaderOptionsWithAccessToken;

export class MediaStreamComposer {
    private options: Options;
    private merger?: VideoStreamMerger;
    public result: MediaStream | null = null;
    private recorder?: ApiVideoMediaRecorder;
    private canvas?: HTMLCanvasElement;
    private streams: { [id: string]: StreamDetails } = {};
    private mouseTool: MouseTool | null = "move-resize";
    private isDrawing = false;
    private drawingSettings: DrawingSettings = {
        lineWidth: 2,
        color: "#000000",
        autoEraseDelay: 0,
    }
    private drawings: ({ coords: [number, number][], startTime: number, } & DrawingSettings)[] = [];

    constructor(options: Partial<Options>) {
        this.options = {
            resolution: {
                width: 1280,
                height: 720
            },
            ...options
        };
    }

    public startRecording(options: RecordingOptions) {
        this.recorder = new ApiVideoMediaRecorder(this.result!, options);
        this.recorder.start();
    }

    public stopRecording(): Promise<VideoUploadResponse> {
        if (!this.recorder) {
            throw new Error("Recorder is not started");
        }
        return this.recorder.stop();
    }

    public updateStream(streamId: string, options: StreamOptions) {
        options = this.validateOptions(options);
        const stream = this.streams[streamId];

        const newOptions = {
            ...stream.options,
            ...options,
            index: options.index || stream.displaySettings.index,
        };
        this.streams[streamId] = {
            ...stream,
            options: newOptions,
            displaySettings: this.buildStreamDisplaySettings(streamId, stream.stream, newOptions)
        };

        this.cleanIndexes();
    }

    public appendCanvasTo(containerQuerySelector: string) {
        const container = document.querySelector(containerQuerySelector) as HTMLCanvasElement;
        if (!container) {
            throw new Error("Container not found");
        }
        if (!this.canvas) {
            throw new Error("Canvas is not created yet");
        }
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
        if (!this.merger) {
            this.init();
        }
        let streamId = "" + Object.keys(this.streams).length.toString();

        options = this.validateOptions(options);

        const displaySettings = this.buildStreamDisplaySettings(streamId, mediaStream, options);
        this.streams[streamId] = {
            id: streamId,
            options,
            displaySettings,
            stream: mediaStream
        }

        this.merger!.addStream(mediaStream, {
            ...options,
            x: displaySettings.position.x,
            y: displaySettings.position.y,
            width: displaySettings.displayResolution.width,
            height: displaySettings.displayResolution.height,
            index: displaySettings.index,
            draw: (ctx, frame, done) => this.drawStream(streamId, ctx, frame, done),
        } as AddStreamOptions);

        this.cleanIndexes();

        return streamId;
    }

    public getCanvas() {
        return this.canvas;
    }

    public getStreams(): StreamDetails[] {
        return Object.values(this.streams);
    }

    public getStream(id: string): StreamDetails {
        return this.streams[id];
    }

    public moveUp(streamId: string) {
        this.updateIndex(streamId, 1);
    }

    public moveDown(streamId: string) {
        this.updateIndex(streamId, -1);
    }

    public setMouseTool(tool: MouseTool) {
        this.mouseTool = tool;
    }

    public setDrawingSettings(settings: Partial<DrawingSettings>) {
        this.drawingSettings = {
            ...this.drawingSettings,
            ...settings
        };
    }

    public clearDrawing() {
        this.drawings = [];
    }

    private updateIndex(streamId: string, indexChange: 1 | -1) {
        const thisStream = this.getStream(streamId);
        const currentIndex = thisStream.displaySettings.index;
        let skip = true;

        for (let stream of Object.values(this.streams)) {
            if (stream.displaySettings.index == currentIndex + indexChange) {
                skip = false;
                stream.displaySettings.index -= indexChange;
            }
        }
        if (!skip) {
            thisStream.displaySettings.index += indexChange;
        }

        this.getStreams().forEach(s => this.merger?.updateIndex(s.stream, s.displaySettings.index))
    }

    private drawStream(streamId: string, ctx: CanvasRenderingContext2D, frame: CanvasImageSource, done: () => void) {
        const displaySettings = this.streams[streamId].displaySettings;

        switch (this.streams[streamId].options.mask) {
            case "circle":
                ctx.save();
                ctx.beginPath();

                const radius = displaySettings.radius!;

                ctx.arc(
                    displaySettings.position.x + radius,
                    displaySettings.position.y + radius,
                    radius,
                    0,
                    Math.PI * 2,
                    false
                );

                ctx.clip();

                const wider = displaySettings.streamResolution.width > displaySettings.streamResolution.height;
                const adaptedWidth = displaySettings.displayResolution.width * displaySettings.streamResolution.width / displaySettings.streamResolution.height;
                const adaptedHeight = displaySettings.displayResolution.height * displaySettings.streamResolution.height / displaySettings.streamResolution.width;

                ctx.drawImage(frame,
                    wider ? displaySettings.position.x - (adaptedWidth - displaySettings.displayResolution.width) / 2 : displaySettings.position.x,
                    wider ? displaySettings.position.y : displaySettings.position.y - (adaptedHeight - displaySettings.displayResolution.height) / 2,
                    wider ? adaptedWidth : displaySettings.displayResolution.width,
                    wider ? displaySettings.displayResolution.height : adaptedHeight,
                );

                ctx.restore();
                break;
            default:
                ctx.drawImage(frame, displaySettings.position.x, displaySettings.position.y, displaySettings.displayResolution.width, displaySettings.displayResolution.height);
        }

        done();
    }

    private validateOptions(options: StreamOptions): StreamOptions {
        if(!options.position) {
            options.position = "contain";
        }
        if (options.position === "cover" || options.position === "contain") {
            options = {
                ...options,
                width: undefined,
                height: undefined,
                x: undefined,
                y: undefined,
            }
        }
        return options;
    }

    private cleanIndexes() {
        let index = 1;
        this.getStreams()
            .sort((a, b) => a.displaySettings.index - b.displaySettings.index)
            .forEach(s => s.displaySettings.index = index++);

        this.getStreams().forEach(s => this.merger?.updateIndex(s.stream, s.displaySettings.index));
    }

    private calculateCoverDimensions(containerDimentions: Resolution, elementDimentions: Resolution, mask?: Mask): DimensionsCalculationResult {
        let width, height;
        if (elementDimentions.width / containerDimentions.width > elementDimentions.height / containerDimentions.height) {
            height = containerDimentions.height;
            width = mask != "circle" ? elementDimentions.width * containerDimentions.height / elementDimentions.height : height;
        } else {
            width = containerDimentions.width;
            height = mask != "circle" ? elementDimentions.height * containerDimentions.width / elementDimentions.width : width;
        };

        let x = 0, y = 0;
        if (width > containerDimentions.width) {
            x = (containerDimentions.width - width) / 2;
        }
        if (height > containerDimentions.height) {
            y = (containerDimentions.height - height) / 2;
        }

        return {
            displayResolution: { width, height },
            position: { x, y },
            radius: width! / 2
        }
    }

    private calculateContainDimensions(containerDimentions: Resolution, elementDimentions: Resolution, mask?: Mask): DimensionsCalculationResult {
        let width, height, radius;
        if (elementDimentions.width / containerDimentions.width > elementDimentions.height / containerDimentions.height) {
            width = containerDimentions.width;
            height = mask != "circle" ? elementDimentions.height * containerDimentions.width / elementDimentions.width : width;
            radius = width! / 2;
        } else {
            height = containerDimentions.height;
            width = mask != "circle" ? height * elementDimentions.width / elementDimentions.height : height;
            radius = height! / 2;
        };
        let x = 0, y = 0;
        if (width < containerDimentions.width) {
            x = (containerDimentions.width - width) / 2;
        }
        if (height < containerDimentions.height) {
            y = (containerDimentions.height - height) / 2;
        }

        return {
            displayResolution: { width, height },
            position: { x, y },
            radius: width! / 2
        }
    }

    private calculateFixedDimensions(containerDimentions: Resolution, elementDimentions: Resolution, targetDimensions: Resolution, position?: Position, mask?: Mask): DimensionsCalculationResult {

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
                width = height;
            } else if (height === undefined) {
                radius = width! / 2;
                height = width;
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


        return {
            radius,
            displayResolution: { width, height },
            position: { x: position?.x || 0, y: position?.y || 0 }
        }
    }

    private buildStreamDisplaySettings(id: string, mediaStream: MediaStream, options: StreamOptions): StreamDisplaySettings {
        const trackSettings = mediaStream.getVideoTracks()[0].getSettings();
        const streamResolution = { width: trackSettings.width!, height: trackSettings.height! };
        const containerResolution = this.options.resolution;

        let pos: DimensionsCalculationResult;

        if (options.position === "contain") {
            pos = this.calculateContainDimensions(containerResolution, streamResolution, options.mask);
        } else if (options.position === "cover") {
            pos = this.calculateCoverDimensions(containerResolution, streamResolution, options.mask);
        } else {
            let alignmentOrPosition: Position = { ...options } as Position;

            pos = this.calculateFixedDimensions(containerResolution, streamResolution, { width: options.width!, height: options.height! }, alignmentOrPosition, options.mask);
        }

        return {
            ...pos,
            streamResolution,
            index: options.index || Object.keys(this.streams).length + 1,
        };
    }

    private onMouseMove(e: MoveEvent) {
        let cursor = "auto";
        if (e.stream && this.mouseTool === "move-resize") {
            if (e.stream.options.draggable && e.locations?.indexOf("inside") !== -1) {
                cursor = "grab";
            }
            if (e.stream.options.resizable) {
                if (e.locations?.indexOf("circle") !== -1) cursor = "all-scroll";
                else if (e.locations?.indexOf("top") !== -1) cursor = "ns-resize";
                else if (e.locations?.indexOf("left") !== -1) cursor = "ew-resize";
                else if (e.locations?.indexOf("bottom") !== -1) cursor = "ns-resize";
                else if (e.locations?.indexOf("right") !== -1) cursor = "ew-resize";
            }
        }
        this.canvas!.style.cursor = cursor;
    }

    private onMouseDrag(e: DragEvent) {
        if (this.mouseTool === "draw") {
            if (!this.isDrawing) {
                this.drawings.push({
                    ...this.drawingSettings,
                    coords: [[e.x, e.y]],
                    startTime: new Date().getTime()
                });
                this.isDrawing = true;
            } else {
                this.drawings[this.drawings.length - 1].coords.push([e.x, e.y]);
            }
        }
        if (this.mouseTool === "move-resize" && e.dragStart.stream) {
            if (e.dragStart.stream.options.resizable && e.dragStart.locations?.find(e => ["top", "right", "bottom", "left", "circle"].indexOf(e) !== -1)) {
                if (e.dragStart.locations?.indexOf("circle") !== -1) {
                    const circleCenter = {
                        x: e.dragStart.x - e.dragStart.offsetX! + (e.dragStart.circleRadius || 0),
                        y: e.dragStart.y - e.dragStart.offsetY! + (e.dragStart.circleRadius || 0)
                    };
                    const newRadius = Math.sqrt(Math.pow(e.x - circleCenter.x, 2) + Math.pow(e.y - circleCenter.y, 2));
                    const change = newRadius / e.dragStart.circleRadius!;

                    const newDisplaySettings = {
                        width: e.dragStart.streamWidth! * change,
                        height: e.dragStart.streamHeight! * change,
                        x: e.dragStart.x - e.dragStart.offsetX! + (e.dragStart.circleRadius! - newRadius),
                        y: e.dragStart.y - e.dragStart.offsetY! + (e.dragStart.circleRadius! - newRadius),
                    };
                    this.updateStream(e.dragStart.stream.id, newDisplaySettings);
                } else if (e.dragStart.locations?.indexOf("bottom") !== -1) {
                    const height = e.dragStart.streamHeight! + e.y - e.dragStart.y;
                    const width = e.dragStart.streamWidth! * height / e.dragStart.streamHeight!;
                    const x = e.dragStart.x - e.dragStart.offsetX! - (width - e.dragStart.streamWidth!) / 2;
                    this.updateStream(e.dragStart.stream.id, { height, width, x });
                } else if (e.dragStart.locations?.indexOf("top") !== -1) {
                    const height = e.dragStart.streamHeight! - (e.y - e.dragStart.y);
                    const width = e.dragStart.streamWidth! * height / e.dragStart.streamHeight!;
                    const y = e.dragStart.y - e.dragStart.offsetY! + (e.y - e.dragStart.y);
                    const x = e.dragStart.x - e.dragStart.offsetX! - (width - e.dragStart.streamWidth!) / 2;
                    this.updateStream(e.dragStart.stream.id, { height, y, x, width });
                } else if (e.dragStart.locations?.indexOf("left") !== -1) {
                    const width = e.dragStart.streamWidth! - (e.x - e.dragStart.x);
                    const height = e.dragStart.streamHeight! * width / e.dragStart.streamWidth!;
                    const x = e.dragStart.x - e.dragStart.offsetX! + (e.x - e.dragStart.x);
                    const y = e.dragStart.y - e.dragStart.offsetY! - (height - e.dragStart.streamHeight!) / 2;
                    this.updateStream(e.dragStart.stream.id, { width, x, height, y });
                } else if (e.dragStart.locations?.indexOf("right") !== -1) {
                    const width = e.dragStart.streamWidth! + (e.x - e.dragStart.x)
                    const height = e.dragStart.streamHeight! * width / e.dragStart.streamWidth!;
                    const y = e.dragStart.y - e.dragStart.offsetY! - (height - e.dragStart.streamHeight!) / 2;
                    this.updateStream(e.dragStart.stream.id, { width, height, y });
                }
            } else if (e.dragStart.stream.options.draggable && e.dragStart.locations?.indexOf("inside") !== -1) {
                this.updateStream(e.dragStart.stream.id, {
                    x: e.x - e.dragStart.offsetX!,
                    y: e.y - e.dragStart.offsetY!,
                    width: e.dragStart.stream.displaySettings.displayResolution.width,
                    height: e.dragStart.stream.displaySettings.displayResolution.height,
                    position: "fixed"
                });
            }
        }
    }

    private createDrawingStream(merger: VideoStreamMerger) {
        merger.addStream("drawing", {
            x: 0,
            y: 0,
            index: Infinity,
            mute: true,
            muted: true,
            width: this.options.resolution.width,
            height: this.options.resolution.height,
            draw: (ctx, frame, done) => {
                this.drawings.forEach(drawing => {
                    ctx.save();
                    ctx.beginPath();
                    ctx.lineWidth = drawing.lineWidth;
                    ctx.strokeStyle = drawing.color;
                    if (drawing.autoEraseDelay && drawing.startTime > 0) {
                        const elapsedTime = (new Date().getTime() - drawing.startTime) / 1000;
                        const remainingTime = drawing.autoEraseDelay - elapsedTime;
                        if (remainingTime <= 1 && remainingTime >= 0) {
                            ctx.globalAlpha = remainingTime;
                        } else if (remainingTime < 0) {
                            ctx.globalAlpha = 0;
                        }
                    }


                    ctx.moveTo(drawing.coords[0][0], drawing.coords[0][1]);
                    for (let i = 1; i < drawing.coords.length; i++) {
                        ctx.lineTo(drawing.coords[i][0], drawing.coords[i][1]);
                    }
                    ctx.stroke();
                    ctx.restore();
                });

                done();
            },
            audioEffect: undefined as any,
        });
    }

    private init(): VideoStreamMerger {
        if (!this.merger) {
            this.merger = new VideoStreamMerger({ ...this.options.resolution, fps: 25, clearRect: true } as any);
            this.merger.start();
            this.canvas = (this.merger as any)._canvas;

            this.result = this.merger.result;
            this.createDrawingStream(this.merger);

            const mouseEventListener = new MouseEventListener(this.canvas!, this.streams);
            mouseEventListener.onClick((e) => e.stream?.options.onClick && e.stream.options.onClick(e.stream.id, { x: e.x, y: e.y }));
            mouseEventListener.onDrag((e) => this.onMouseDrag(e));
            mouseEventListener.onDragEnd(() => this.isDrawing = false);
            mouseEventListener.onMove((e) => this.onMouseMove(e));
        }

        return this.merger;
    }
}