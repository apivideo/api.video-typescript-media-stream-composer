import { ApiVideoMediaRecorder, Options as RecorderOptions, ProgressiveUploaderOptionsWithAccessToken, ProgressiveUploaderOptionsWithUploadToken, VideoUploadResponse } from "@api.video/media-recorder";
import { DrawingLayer, DrawingSettings } from "./drawing-layer";
import MouseEventListener, { DragEvent, MoveEvent } from "./mouse-event-listener";
import { Resolution } from "./stream-position";
import { Stream, StreamDetails, StreamUserOptions } from "./stream/stream";

export { StreamDetails };

export interface Options {
    resolution: Resolution;
};

export interface AudioSourceDetails {
    id: string;
    stream: MediaStream;
}

declare type EventType = "error" | "recordingStopped" | "videoPlayable";

let PACKAGE_VERSION = "";
try {
    // @ts-ignore
    PACKAGE_VERSION = __PACKAGE_VERSION__ || "";
} catch (e) {
    // ignore
}

declare global {
    interface Window {
      AudioContext: AudioContext;
      webkitAudioContext: any;
    }
    interface AudioContext {
      createGainNode: any;
    }
    interface HTMLCanvasElement {
        captureStream(frameRate?: number): MediaStream;
    }
    interface HTMLMediaElement {
      _mediaElementSource: any
    }
    interface HTMLVideoElement {
      playsInline: boolean;
    }
  }

export type MouseTool = "draw" | "move-resize";

type RecordingOptions =  RecorderOptions & (ProgressiveUploaderOptionsWithUploadToken | ProgressiveUploaderOptionsWithAccessToken) & {timeslice?: number};

const DEFAULT_TIMESLICE = 5000;

export class MediaStreamComposer {
    private result: MediaStream | null = null;
    private recorder?: ApiVideoMediaRecorder;
    
    private streams: Stream[] = [];
    
    private eventTarget: EventTarget; 
    private fps = 25;
    private resolution: Resolution;

    private audioContext?: AudioContext;
    private audioDestinationNode?: MediaStreamAudioDestinationNode;
    private audioDelayNode?: DelayNode;
    
    private canvas?: HTMLCanvasElement;
    private canvasRenderingContext: CanvasRenderingContext2D | null = null;

    private frameCount = 0;
    private started = false;

    private mouseTool: MouseTool | null = "move-resize";
    private drawingLayer: DrawingLayer;

    constructor(options: Partial<Options>) {
        this.eventTarget = new EventTarget();
        this.resolution = options.resolution || { width: 1280, height: 720 };
        this.drawingLayer = new DrawingLayer();
    }

    private init() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioSupport = !!(window.AudioContext && (new AudioContext()).createMediaStreamDestination);
        const canvasSupport = !!document.createElement('canvas').captureStream;

        if (!audioSupport || !canvasSupport) {
            throw new Error("Audio and canvas are required for MediaStreamComposer to work");
        }

        this.audioContext = new AudioContext();
        this.audioDestinationNode = this.audioContext.createMediaStreamDestination();

        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute('width', this.resolution.width.toString());
        this.canvas.setAttribute('height', this.resolution.height.toString());
        this.canvas.setAttribute('style', 'position:fixed; left: 110%; pointer-events: none'); // Push off screen
        this.canvasRenderingContext = this.canvas.getContext('2d');

        // delay node for video sync
        this.audioDelayNode = this.audioContext.createDelay(5.0);
        this.audioDelayNode.connect(this.audioDestinationNode);
        this._backgroundAudioHack();
        this.started = true;

        this.drawingLayer.init();
        this._requestAnimationFrame(() => this._draw());
        
        // Add video
        this.result = this.canvas?.captureStream(this.fps) || null;
        

        // Remove "dead" audio track
        const deadTrack = this.result?.getAudioTracks()[0];
        if (deadTrack) { this.result?.removeTrack(deadTrack); }

        // Add audio
        const audioTracks = this.audioDestinationNode.stream.getAudioTracks();
        if (audioTracks && audioTracks.length) {
            this.result?.addTrack(audioTracks[0]);
        }

        const d = this;

        const mouseEventListener = new MouseEventListener(this.canvas!, this.streams);
        mouseEventListener.onClick((e) => {
            if(!e.stream) return;
            const options = e.stream.getStreamDetails().options;
            options.onClick && options.onClick(e.stream.getId(), { x: e.x, y: e.y })
        });
        mouseEventListener.onDrag((e) => this.onMouseDrag(e));
        mouseEventListener.onDragEnd(() => this.onMouseDragEnd());
        mouseEventListener.onMove((e) => this.onMouseMove(e));

    }

    private _backgroundAudioHack() {
        const createConstantSource = () => {
            if (this.audioContext?.createConstantSource) {
                return this.audioContext.createConstantSource();
            }

            // not really a constantSourceNode, just a looping buffer filled with the offset value
            const constantSourceNode = this.audioContext!.createBufferSource();
            const constantBuffer = this.audioContext!.createBuffer(1, 1, this.audioContext!.sampleRate);
            const bufferData = constantBuffer.getChannelData(0);
            bufferData[0] = (0 * 1200) + 10;
            constantSourceNode.buffer = constantBuffer;
            constantSourceNode.loop = true;

            return constantSourceNode;
        }

        // stop browser from throttling timers by playing almost-silent audio
        const source = createConstantSource();
        const gainNode = this.audioContext!.createGain();
        if (gainNode && source) {
            gainNode.gain.value = 0.001; // required to prevent popping on start
            source.connect(gainNode);
            gainNode.connect(this.audioContext!.destination);
            source.start();
        }
    }

    public getResultStream() {
        return this.result;
    }

    public static getSupportedMimeTypes() {
        return ApiVideoMediaRecorder.getSupportedMimeTypes();
    }

    public startRecording(options: RecordingOptions) {
        if(!this.started) this.init();
        
        this._updateAudioDelay(Math.min(5000, options.timeslice || DEFAULT_TIMESLICE)); 
        
        this.recorder = new ApiVideoMediaRecorder(this.result!, {
            ...options,
            origin: {
                sdk: {
                    name: "media-stream-composer",
                    version: PACKAGE_VERSION
                },
                ...options.origin
            },
        });

        const eventTypes: EventType[] = ["error", "recordingStopped", "videoPlayable"];
        eventTypes.forEach(event => {
            this.recorder?.addEventListener(event, (e) => this.eventTarget.dispatchEvent(Object.assign(new Event(event), { data: (e as any).data })));
        });
        
        this.recorder.start({ timeslice: options.timeslice || DEFAULT_TIMESLICE });
    }

    public destroy() {
        this.drawingLayer.destroy();
        
        this.recorder?.stop();
        this.recorder = undefined;

        this.streams.forEach(stream => this.removeStream(stream.getId()));
        
        this.canvas?.parentElement?.removeChild(this.canvas);
        this.canvas = undefined;
        
        this.audioContext?.close();
        this.audioContext = undefined;

        this.audioDestinationNode = undefined;

        this.result?.getTracks().forEach(track => track.stop());
        this.result = null;

        this.started = false;
    }

    public addEventListener(type: EventType, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions | undefined): void {
        this.eventTarget.addEventListener(type, callback, options);
    }

    public stopRecording(): Promise<VideoUploadResponse> {
        if (!this.recorder) {
            throw new Error("Recorder is not started");
        }
        return this.recorder.stop();
    }

    public updateStream(streamId: string, userOptions: StreamUserOptions) {
        const stream = this.streams.find(s => s.getId() === streamId);

        if (!stream) {
            throw new Error(`Stream with id ${streamId} does not exist`);
        }

        stream.updateOptions(userOptions);
    }
    
    public appendCanvasTo(containerQuerySelector: string) {
        if(!this.started) this.init();

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

    public removeStream(streamId: string) {
        const streamIndex = this.streams.findIndex(stream => stream.getId() === streamId);

        if (streamIndex === -1) {
            throw new Error(`Stream with id ${streamId} does not exist`);
        }

        const stream = this.streams[streamIndex];

        this.streams.splice(streamIndex, 1);
        stream.destroy();
    }

    public addAudioSource(mediaStream: MediaStream): string {
        if(!this.started) this.init();

        const stream = new Stream("AUDIO", this.audioDelayNode!, this.resolution);
        stream.load(mediaStream, this.audioContext!, {})
        this.streams.push(stream);
        return stream.getId();
    }

    public removeAudioSource(id: string) {
        this.removeStream(id);
    }

    public async addStream(mediaStream: MediaStream | HTMLImageElement, userOptions: StreamUserOptions): Promise<string> {
        if(!this.started) this.init();
        const stream = new Stream( "VIDEO", this.audioDelayNode!, this.resolution);
        await stream.load(mediaStream, this.audioContext!, userOptions)
        this.streams.push(stream);
        return stream.getId();
    }

    public getCanvas() {
        if(!this.started) this.init();

        return this.canvas;
    }

    public getAudioSources(): AudioSourceDetails[] {
        return this.streams.filter(x => !x.hasDisplay()).map(x => ({
            id: x.getId(),
            stream: x.getStreamDetails().stream!,
        }));
    }

    public getAudioSource(id: string): AudioSourceDetails | undefined {
        return this.getAudioSources().find(x => x.id === id);
    }

    public getStreams(): StreamDetails[] {
        return this.streams.filter(s => s.hasDisplay()).map((stream, index) => {
            const details = stream.getStreamDetails();
            return {
                ...details,
                options: {
                    ...details.options,
                    index,
                }
            }
        });
    }

    public getStream(id: string): StreamDetails | undefined {
        return this.getStreams().find(x => x.id === id);
    }

    public moveUp(streamId: string) {
        const streamIndex = this.streams.findIndex(stream => stream.getId() === streamId);

        if(streamIndex === -1 || streamIndex >= this.streams.length - 1) {
            return;
        }
        
        this.streams.splice(streamIndex, 2, this.streams[streamIndex+1], this.streams[streamIndex])
    }

    public moveDown(streamId: string) {
        const streamIndex = this.streams.findIndex(stream => stream.getId() === streamId);

        if(streamIndex <= 0) {
            return;
        }

        this.streams.splice(streamIndex - 1, 2, this.streams[streamIndex], this.streams[streamIndex-1])
    }

    public setMouseTool(tool: MouseTool) {
        this.mouseTool = tool;
    }

    public setDrawingSettings(settings: Partial<DrawingSettings>) {
        this.drawingLayer.setDrawingSettings(settings);
    }

    public clearDrawing() {
        this.drawingLayer.clear();
    }

    private dispatch(type: EventType, data: any): boolean {
        return this.eventTarget.dispatchEvent(Object.assign(new Event(type), { data }));
    }

    private async _draw() {
        if (!this.started) { return; }

        this.frameCount++;
        const updateProcessingDelay = this.frameCount % 60 === 0;
        const t0 = performance.now();

        this.canvasRenderingContext?.clearRect(0, 0, this.resolution.width, this.resolution.height);

        for (const stream of this.streams) {
            stream.draw(this.canvasRenderingContext!);
        }
        this.drawingLayer.draw(this.canvasRenderingContext!);

        const delay = performance.now() - t0;
        if (updateProcessingDelay) {
            // this._updateAudioDelay(delay);
            this._updateAudioDelay(0); // fixme
        }

        setTimeout(() => this._requestAnimationFrame(() => this._draw()), 1000 / this.fps - delay);
    }

    private _requestAnimationFrame(callback: () => void) {
        let fired = false;
        const interval = setInterval(() => {
            if (!fired && document.hidden) {
                fired = true;
                clearInterval(interval);
                callback();
            }
        }, 1000 / this.fps);
        requestAnimationFrame(() => {
            if (!fired) {
                fired = true;
                clearInterval(interval);
                callback();
            }
        });
    }

    private _updateAudioDelay(delayInMs: number) {
        if (this.audioDelayNode && this.audioContext) {
            this.audioDelayNode.delayTime.setValueAtTime(delayInMs / 1000, this.audioContext.currentTime);
        }
    }


    private onMouseMove(e: MoveEvent) {
        let cursor = "auto";
        if (e.stream && this.mouseTool === "move-resize") {
            const options = e.stream.getStreamDetails().options;
            if (options.draggable && e.locations?.indexOf("inside") !== -1) {
                cursor = "grab";
            }
            if (options.resizable) {
                if (e.locations?.indexOf("circle") !== -1) cursor = "all-scroll";
                else if (e.locations?.indexOf("top") !== -1) cursor = "ns-resize";
                else if (e.locations?.indexOf("left") !== -1) cursor = "ew-resize";
                else if (e.locations?.indexOf("bottom") !== -1) cursor = "ns-resize";
                else if (e.locations?.indexOf("right") !== -1) cursor = "ew-resize";
            }
        }
        this.canvas!.style.cursor = cursor;
    }

    private onMouseDragEnd() {
        if(!this.started) return;

        if (this.mouseTool === "draw") {
            this.drawingLayer.onMouseDragEnd();
        }
    }
    
    private onMouseDrag(e: DragEvent) {
        if(!this.started) return;

        if (this.mouseTool === "draw") {
            this.drawingLayer.onMouseDrag(e);
        }
        if (this.mouseTool === "move-resize" && e.dragStart.stream) {
            e.dragStart.stream.onMouseDrag(e);
        }
    }
}