import { ProgressiveUploaderOptionsWithAccessToken, ProgressiveUploaderOptionsWithUploadToken, VideoUploadResponse } from "@api.video/media-recorder";
export interface Options {
    resolution: Resolution;
}
export declare type StreamPosition = "contain" | "cover" | "fixed";
export declare type StreamMask = "none" | "circle";
export interface StreamOptions {
    name?: string;
    position?: StreamPosition;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    draggable?: boolean;
    resizable?: boolean;
    mask?: StreamMask;
    index?: number;
    mute?: boolean;
    hidden?: boolean;
    opacity?: number;
    onClick?: (streamId: string, event: {
        x: number;
        y: number;
    }) => void;
}
interface StreamDisplaySettings {
    displayResolution: Resolution;
    streamResolution: Resolution;
    position: Position;
    radius?: number;
    index: number;
    hidden: boolean;
    opacity: number;
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
export interface AudioSourceDetails {
    id: string;
    stream: MediaStream;
}
declare type EventType = "error" | "recordingStopped";
interface DrawingSettings {
    color: string;
    lineWidth: number;
    autoEraseDelay: number;
}
export declare type MouseTool = "draw" | "move-resize";
declare type RecordingOptions = ProgressiveUploaderOptionsWithUploadToken | ProgressiveUploaderOptionsWithAccessToken;
export declare class MediaStreamComposer {
    private options;
    private merger?;
    result: MediaStream | null;
    private recorder?;
    private canvas?;
    private streams;
    private audioSources;
    private mouseTool;
    private isDrawing;
    private eventTarget;
    private drawingSettings;
    private drawings;
    private lastStreamId;
    private drawingsCleanerInterval?;
    constructor(options: Partial<Options>);
    startRecording(options: RecordingOptions): void;
    destroy(): void;
    private destroyIfNeeded;
    addEventListener(type: EventType, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions | undefined): void;
    stopRecording(): Promise<VideoUploadResponse>;
    updateStream(streamId: string, options: StreamOptions): void;
    appendCanvasTo(containerQuerySelector: string): void;
    removeStream(id: string): void;
    addAudioSource(mediaStream: MediaStream): string;
    removeAudioSource(id: string): void;
    addStream(mediaStream: MediaStream, options: StreamOptions): string;
    getCanvas(): HTMLCanvasElement | undefined;
    getAudioSources(): AudioSourceDetails[];
    getAudioSource(id: string): AudioSourceDetails;
    getStreams(): StreamDetails[];
    getStream(id: string): StreamDetails;
    moveUp(streamId: string): void;
    moveDown(streamId: string): void;
    setMouseTool(tool: MouseTool): void;
    setDrawingSettings(settings: Partial<DrawingSettings>): void;
    clearDrawing(): void;
    private dispatch;
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
