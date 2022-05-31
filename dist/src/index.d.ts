import { ProgressiveUploaderOptionsWithAccessToken, ProgressiveUploaderOptionsWithUploadToken, VideoUploadResponse } from "@api.video/media-recorder";
import { AudioEffect, DrawFunction } from "video-stream-merger";
export interface Options {
    resolution?: {
        width: number;
        height: number;
    };
}
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
export declare class MediaStreamMerger {
    private options;
    private merger?;
    result: MediaStream | null;
    private resolution;
    private recorder?;
    private streams;
    constructor(options: Options);
    startRecording(options: ProgressiveUploaderOptionsWithUploadToken | ProgressiveUploaderOptionsWithAccessToken): void;
    stopRecording(): Promise<VideoUploadResponse>;
    updateStream(streamId: number, opts: AddStreamOptions): void;
    addStream(mediaStream: MediaStream, options: AddStreamOptions): number;
    private calcPosition;
    private calculateCoverDimensions;
    private calculateContainDimensions;
    private calculateFixedDimensions;
    private buildStreamDisplaySettings;
    private getMerger;
}
