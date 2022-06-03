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
    mask?: "none" | "circle";
    index?: number;
    mute?: boolean;
    muted?: boolean;
    onClick?: (streamId: string, event: MouseEvent) => void;
}
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
interface Resolution {
    height: number;
    width: number;
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
declare type MouseTool = "draw" | "move-resize";
export declare class MediaStreamComposer {
    private options;
    private merger?;
    result: MediaStream | null;
    private recorder?;
    private canvas?;
    private streams;
    private mouseStreamId;
    private mouseAction;
    private mouseTool;
    private drag;
    private isDrawing;
    private drawingSettings;
    private drawings;
    constructor(options: Partial<Options>);
    startRecording(options: ProgressiveUploaderOptionsWithUploadToken | ProgressiveUploaderOptionsWithAccessToken): void;
    stopRecording(): Promise<VideoUploadResponse>;
    updateStream(streamId: string, options: StreamOptions): void;
    appendCanvasTo(containerQuerySelector: string): void;
    removeStream(id: string): void;
    addStream(mediaStream: MediaStream, options: StreamOptions): string;
    getCanvas(): HTMLCanvasElement | undefined;
    getStreams(): StreamDetails[];
    getStream(id: string): StreamDetails;
    moveUp(id: string): void;
    moveDown(id: string): void;
    setMouseTool(tool: MouseTool): void;
    setDrawingSettings(settings: Partial<DrawingSettings>): void;
    clearDrawing(): void;
    private drawStream;
    private validateOptions;
    private cleanIndexes;
    private calculateCoverDimensions;
    private calculateContainDimensions;
    private calculateFixedDimensions;
    private buildStreamDisplaySettings;
    private mouseUp;
    private mouseDown;
    private mouseMoveWhileDragging;
    private mouseMove;
    private createDrawingStream;
    private getMerger;
}
export {};
