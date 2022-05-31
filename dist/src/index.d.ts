import { ProgressiveUploaderOptionsWithAccessToken, ProgressiveUploaderOptionsWithUploadToken, VideoUploadResponse } from "@api.video/media-recorder";
export interface Options {
    resolution: Resolution;
}
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
    onClick?: (streamId: string, event: {
        x: number;
        y: number;
    }) => void;
}
declare type Mask = "none" | "circle";
interface StreamDisplaySettings {
    displayResolution: Resolution;
    streamResolution: Resolution;
    position: Position;
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
declare type MouseTool = "draw" | "move-resize";
declare type RecordingOptions = ProgressiveUploaderOptionsWithUploadToken | ProgressiveUploaderOptionsWithAccessToken;
export declare class MediaStreamComposer {
    private options;
    private merger?;
    result: MediaStream | null;
    private recorder?;
    private canvas?;
    private streams;
    private mouseTool;
    private isDrawing;
    private drawingSettings;
    private drawings;
    constructor(options: Partial<Options>);
    startRecording(options: RecordingOptions): void;
    stopRecording(): Promise<VideoUploadResponse>;
    updateStream(streamId: string, options: StreamOptions): void;
    appendCanvasTo(containerQuerySelector: string): void;
    removeStream(id: string): void;
    addStream(mediaStream: MediaStream, options: StreamOptions): string;
    getCanvas(): HTMLCanvasElement | undefined;
    getStreams(): StreamDetails[];
    getStream(id: string): StreamDetails;
    moveUp(streamId: string): void;
    moveDown(streamId: string): void;
    setMouseTool(tool: MouseTool): void;
    setDrawingSettings(settings: Partial<DrawingSettings>): void;
    clearDrawing(): void;
    private updateIndex;
    private drawStream;
    private validateOptions;
    private cleanIndexes;
    private calculateCoverDimensions;
    private calculateContainDimensions;
    private calculateFixedDimensions;
    private buildStreamDisplaySettings;
    private onMouseMove;
    private onMouseDrag;
    private createDrawingStream;
    private init;
}
export {};
