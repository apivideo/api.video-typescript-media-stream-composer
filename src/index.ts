import { ApiVideoMediaRecorder, ProgressiveUploaderOptionsWithAccessToken, ProgressiveUploaderOptionsWithUploadToken, VideoUploadResponse } from "@api.video/media-recorder";
import { AddStreamOptions, VideoStreamMerger } from "video-stream-merger";


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
    mask?: "none" | "circle";
    index?: number;
    mute?: boolean;
    muted?: boolean;
    onClick?: (streamId: string, event: MouseEvent) => void;
}

type Mask = "none" | "circle" | "rectangle";

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

interface StreamDetails {
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
    private streams: { [id: string]: { id: string, options: StreamOptions, displaySettings: StreamDisplaySettings, stream: MediaStream } } = {};
    private mouseStreamId: string | null = null;
    private mouseAction: MouseAction | null = null;
    private mouseTool: MouseTool | null = "move-resize";
    private drag: Drag | null = null;
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
            throw new Error("init() must be called before adding streams");
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

        this.merger.addStream(mediaStream, {
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

    public moveUp(id: string) {
        const thisStream = this.getStream(id);
        const currentIndex = thisStream.displaySettings.index;
        let skip = true;

        for (let stream of Object.values(this.streams)) {
            if (stream.displaySettings.index == currentIndex + 1) {
                skip = false;
                stream.displaySettings.index--;
            }
        }
        if (!skip) {
            thisStream.displaySettings.index++;
        }

        this.getStreams().forEach(s => this.merger?.updateIndex(s.stream, s.displaySettings.index))
    }

    public moveDown(id: string) {
        const thisStream = this.getStream(id);
        const currentIndex = thisStream.displaySettings.index;
        let skip = true;

        for (let stream of Object.values(this.streams)) {
            if (stream.displaySettings.index == currentIndex - 1) {
                skip = false;
                stream.displaySettings.index++;
            }
        }
        if (!skip) {
            thisStream.displaySettings.index--;
        }

        this.getStreams().forEach(s => this.merger?.updateIndex(s.stream, s.displaySettings.index))
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

    private drawStream(streamId: string, ctx: CanvasRenderingContext2D, frame: CanvasImageSource, done: () => void) {
        const displaySettings = this.streams[streamId].displaySettings;

        if (this.streams[streamId].options.mask === "circle") {
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
        } else {
            ctx.drawImage(frame, displaySettings.position.x, displaySettings.position.y, displaySettings.displayResolution.width, displaySettings.displayResolution.height);
        }

        done();
    }

    private validateOptions(options: StreamOptions): StreamOptions {
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

    private mouseUp(e: MouseEvent) {
        if (this.mouseTool === "draw") {
            if (this.isDrawing) {
                this.drawings[this.drawings.length - 1].startTime = new Date().getTime();
            }
            this.isDrawing = false;
            return;
        }

        if (this.mouseStreamId != null) {
            const stream = this.streams[this.mouseStreamId];
            if (this.drag && !this.drag?.hasMoved && stream.options.onClick) {
                stream.options.onClick(this.mouseStreamId, e);
            }
        }
        this.drag = null;
    }

    private mouseDown(e: MouseEvent) {
        if (this.mouseTool === "draw") {
            this.drawings.push({
                ...this.drawingSettings,
                coords: [[e.offsetX, e.offsetY]],
                startTime: 0
            });
            this.isDrawing = true;
            return;
        }
        if (this.mouseStreamId != null) {
            const stream = this.streams[this.mouseStreamId];

            this.drag = {
                hasMoved: false,
                streamId: this.mouseStreamId,
                mouseStartPosition: {
                    x: e.offsetX,
                    y: e.offsetY
                },
                streamStartPosition: {
                    ...stream.displaySettings.position,
                    ...stream.displaySettings.displayResolution,
                    radius: stream.displaySettings.radius
                }
            }
        }
    }

    private mouseMoveWhileDragging(e: MouseEvent) {
        if (!this.drag) {
            return;
        }

        const mX = e.offsetX;
        const mY = e.offsetY;

        if (!this.drag.hasMoved) {
            this.drag.hasMoved = true;
        }
        const stream = this.streams[this.drag.streamId];

        if (this.mouseAction === "move") {
            this.updateStream(this.drag.streamId, {
                x: e.offsetX - (this.drag.mouseStartPosition.x - this.drag.streamStartPosition.x),
                y: e.offsetY - (this.drag.mouseStartPosition.y - this.drag.streamStartPosition.y),
                width: stream.displaySettings.displayResolution.width,
                height: stream.displaySettings.displayResolution.height,
                position: "fixed"
            });
        } else if (this.mouseAction === "circle-resize") {
            const circleCenter = {
                x: this.drag.streamStartPosition.x + this.drag.streamStartPosition.radius!,
                y: this.drag.streamStartPosition.y + this.drag.streamStartPosition.radius!
            };
            const newRadius = Math.sqrt(Math.pow(mX - circleCenter.x, 2) + Math.pow(mY - circleCenter.y, 2));
            const change = newRadius / this.drag.streamStartPosition.radius!;

            const newDisplaySettings = {
                width: this.drag.streamStartPosition.width * change,
                height: this.drag.streamStartPosition.height * change,
                y: this.drag.streamStartPosition.y + (this.drag.streamStartPosition.radius! - newRadius),
                x: this.drag.streamStartPosition.x + (this.drag.streamStartPosition.radius! - newRadius),
            };
            this.updateStream(this.drag.streamId, newDisplaySettings);
        } else if (this.mouseAction === "bottom-resize") {
            const height = this.drag.streamStartPosition.height + mY - this.drag.mouseStartPosition.y;
            const width = this.drag.streamStartPosition.width * height / this.drag.streamStartPosition.height;
            const x = this.drag.streamStartPosition.x - (width - this.drag.streamStartPosition.width) / 2;
            this.updateStream(this.drag.streamId, { height, width, x });
        } else if (this.mouseAction === "top-resize") {
            const height = this.drag.streamStartPosition.height - (mY - this.drag.mouseStartPosition.y);
            const width = this.drag.streamStartPosition.width * height / this.drag.streamStartPosition.height;
            const y = this.drag.streamStartPosition.y + (mY - this.drag.mouseStartPosition.y);
            const x = this.drag.streamStartPosition.x - (width - this.drag.streamStartPosition.width) / 2;
            this.updateStream(this.drag.streamId, { height, y, x, width });
        } else if (this.mouseAction === "left-resize") {
            const width = this.drag.streamStartPosition.width - (mX - this.drag.mouseStartPosition.x);
            const height = this.drag.streamStartPosition.height * width / this.drag.streamStartPosition.width;
            const x = this.drag.streamStartPosition.x + (mX - this.drag.mouseStartPosition.x);
            const y = this.drag.streamStartPosition.y - (height - this.drag.streamStartPosition.height) / 2;
            this.updateStream(this.drag.streamId, { width, x, height, y });
        } else if (this.mouseAction === "right-resize") {
            const width = this.drag.streamStartPosition.width + (mX - this.drag.mouseStartPosition.x)
            const height = this.drag.streamStartPosition.height * width / this.drag.streamStartPosition.width;
            const y = this.drag.streamStartPosition.y - (height - this.drag.streamStartPosition.height) / 2;
            this.updateStream(this.drag.streamId, { width, height, y });
        }

    }

    private mouseMove(e: MouseEvent) {
        const mX = e.offsetX;
        const mY = e.offsetY;

        if (this.mouseTool === "draw") {
            if (this.isDrawing) {
                this.drawings[this.drawings.length - 1].coords.push([mX, mY]);
                return;
            }
        } else if (this.drag != null) {
            this.mouseMoveWhileDragging(e);
        } else {
            let mouseStreamId: string | null = null;

            const streamIds = Object.keys(this.streams);
            let index = 0;
            let mouseMode: MouseAction | null = null;
            for (let streamId of streamIds) {
                let currentMouseMode: MouseAction | null = null;
                const stream = this.streams[streamId];
                if (!stream) {
                    continue;
                }
                let {
                    x,
                    y,
                    width,
                    height
                } = { ...stream.displaySettings.displayResolution, ...stream.displaySettings.position };

                if (stream.options.mask === "circle") {
                    const centerX = x + stream.displaySettings.radius!;
                    const centerY = y + stream.displaySettings.radius!;
                    const distance = Math.sqrt(Math.pow(centerX - mX, 2) + Math.pow(centerY - mY, 2));
                    if (stream.options.draggable && distance <= stream.displaySettings.radius!) {
                        currentMouseMode = "move";
                    }
                    if (stream.options.resizable && distance <= stream.displaySettings.radius! + 10 && distance > stream.displaySettings.radius! - 10) {
                        currentMouseMode = "circle-resize";
                    }
                } else {

                    if (stream.options.draggable && mX > x && mX < x + width && mY > y && mY < y + height) currentMouseMode = "move";

                    if (stream.options.resizable) {
                        if (mX > x && mX < x + width && mY > y - 10 && mY < y + 10) currentMouseMode = "top-resize";
                        if (mX > x && mX < x + width && mY > y + height - 10 && mY < y + height + 10) currentMouseMode = "bottom-resize";
                        if (mY > y && mY < y + height && mX > x - 10 && mX < x + 10) currentMouseMode = "left-resize";
                        if (mY > y && mY < y + height && mX > x + width - 10 && mX < x + width + 10) currentMouseMode = "right-resize";
                    }
                }

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
                } else if (stream.options.resizable) {
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
            this.mouseAction = mouseMode;
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

    public init(): VideoStreamMerger {
        if (!this.merger) {
            this.merger = new VideoStreamMerger({ ...this.options.resolution, fps: 25, clearRect: true } as any);
            this.merger.start();
            this.canvas = (this.merger as any)._canvas;
            this.canvas!.addEventListener("mouseup", (e) => this.mouseUp(e));
            this.canvas!.addEventListener("mousedown", (e) => this.mouseDown(e));
            this.canvas!.addEventListener("mousemove", (e) => this.mouseMove(e));
            this.canvas!.addEventListener("mouseleave", (e) => this.mouseUp(e));
            this.result = this.merger.result;
            this.createDrawingStream(this.merger);
        }

        return this.merger;
    }
}