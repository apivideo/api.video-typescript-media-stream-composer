import { DragEvent, DragStart } from "../mouse-event-listener";
import { Position, Resolution, StreamMask, StreamPosition, StreamPositionType } from "../stream-position";

interface StreamAudio {
    audioSource?: MediaStreamAudioSourceNode
    audioOutput?: GainNode
}

interface StreamDisplaySettings {
    displayResolution: Resolution,
    streamResolution: Resolution,
    position: Position,
    radius?: number;
}

type StreamType = "AUDIO" | "VIDEO";

export interface StreamOptions {
    name?: string;
    position: StreamPosition;
    draggable: boolean;
    resizable: boolean;
    mask: StreamMask;
    mute: boolean;
    hidden: boolean;
    opacity: number;
    index: number;
    onClick?: (streamId: string, event: { x: number, y: number }) => void;
}


export interface StreamDetails {
    type: StreamType;
    id: string;
    options: StreamOptions;
    displaySettings?: StreamDisplaySettings;
    stream?: MediaStream;
    streamVideo?: CanvasImageSource;
    streamAudio?: StreamAudio;
}

export interface StreamUserOptions {
    name?: string;
    position?: StreamPositionType;
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
    onClick?: (streamId: string, event: { x: number, y: number }) => void;
}

export class Stream {
    private static lastStreamId = 0;

    private id: string;
    private name?: string;
    private position: StreamPosition = Position.cover;
    private draggable: boolean = false;
    private resizable: boolean = false;
    private mask: StreamMask = "none";
    private mute: boolean = false;
    private hidden: boolean = false;
    private opacity: number = 100;
    private onClick?: (streamId: string, event: { x: number, y: number }) => void;
    private mediaStream?: MediaStream;
    private videoElement?: CanvasImageSource;
    private streamAudio?: StreamAudio;
    private type: StreamType;
    private displaySettings?: StreamDisplaySettings;
    private containerResolution: Resolution;
    private audioDelayNode: DelayNode;

    constructor(mediaStream: MediaStream | CanvasImageSource, type: StreamType, audioContext: AudioContext, audioDelayNode: DelayNode, options: StreamUserOptions, containerResolution: Resolution) {
        this.containerResolution = containerResolution;
        this.type = type;
        this.audioDelayNode = audioDelayNode;
        this.id = `${type.toLowerCase()}_${Stream.lastStreamId++}`;


        if (mediaStream instanceof MediaStream) {
            this.mediaStream = mediaStream;

            this.videoElement = this.createStreamVideoElement(mediaStream);
            this.videoElement.onresize = (_) => this.updateDisplaySettings();
        } else {
            this.videoElement = mediaStream;
            (this.videoElement as HTMLImageElement).onload = (_) => this.updateDisplaySettings();
        }

        this.displaySettings = this.updateOptions(options);

        if (this.mediaStream && this.mediaStream.getAudioTracks().length > 0 && audioContext && !this.mute) {
            this.streamAudio = this.createStreamAudioElement(audioContext, audioDelayNode, this.mediaStream);
        }
    }

    getId(): string {
        return this.id; 
    }
  
    public updateOptions(userOptions: StreamUserOptions) {
        const convertPosition = (options: StreamUserOptions): StreamPosition => {
            switch (options.position) {
                case "cover":
                    return Position.cover;
                case "contain":
                    return Position.contain;
                case "fixed":
                    return Position.fixed({
                        x: options.x,
                        y: options.y,
                        height: options.height,
                        width: options.width,
                    });
                default:
                    throw new Error("Invalid position");
            }
        }

        if (userOptions.name !== undefined) {
            this.name = userOptions.name;
        }
        if (userOptions.position !== undefined) {
            this.position = convertPosition(userOptions);
        }
        if (userOptions.draggable !== undefined) {
            this.draggable = userOptions.draggable;
        }
        if (userOptions.resizable !== undefined) {
            this.resizable = userOptions.resizable;
        }
        if (userOptions.mask !== undefined) {
            this.mask = userOptions.mask;
        }
        if (userOptions.mute !== undefined) {
            this.mute = userOptions.mute;
        }
        if (userOptions.hidden !== undefined) {
            this.hidden = userOptions.hidden;
        }
        if (userOptions.opacity !== undefined) {
            this.opacity = userOptions.opacity;
        }
        if (userOptions.onClick !== undefined) {
            this.onClick = userOptions.onClick;
        }

        return this.updateDisplaySettings();
    }

    public destroy() {
        if (this.streamAudio) {
            if (this.streamAudio.audioSource) {
                this.streamAudio.audioSource = undefined;
            }
            if (this.streamAudio.audioOutput) {
                this.streamAudio.audioOutput.disconnect(this.audioDelayNode);
                this.streamAudio.audioOutput = undefined;
            }
        }
        if (this.videoElement && typeof this.videoElement === "object" && this.videoElement instanceof HTMLVideoElement) {
                this.videoElement.remove();
        }

        (this.mediaStream?.getTracks() || []).forEach(x => x.stop());
    }

    public getDisplaySettings(): StreamDisplaySettings | undefined {
        return this.displaySettings;
    }


    public getStreamDetails(): StreamDetails {
        return {
            type: this.type,
            id: this.id,
            options: {
                name: this.name,
                position: this.position,
                draggable: this.draggable,
                resizable: this.resizable,
                mask: this.mask,
                mute: this.mute,
                hidden: this.hidden,
                opacity: this.opacity,
                onClick: this.onClick,
                index: -1,
            },
            displaySettings: this.displaySettings,
            stream: this.mediaStream,
            streamVideo: this.videoElement,
            streamAudio: this.streamAudio,
        }
    }

    public updatePosition(position: StreamPosition) {
        this.position = position;
        this.updateDisplaySettings();
    }

    public draw(canvasRenderingContext: CanvasRenderingContext2D) {
        if (!canvasRenderingContext || !this.displaySettings) return;

        const { displayResolution,
            streamResolution,
            position,
            radius } = this.displaySettings;


        if (this.hidden || !canvasRenderingContext || !this.videoElement) {
            return;
        }

        canvasRenderingContext.save();
        canvasRenderingContext.globalAlpha = this.opacity / 100;

        const image = this.videoElement;

        switch (this.mask) {
            case "circle":
                canvasRenderingContext.beginPath();

                canvasRenderingContext.arc(
                    position.x + radius!,
                    position.y + radius!,
                    radius!,
                    0,
                    Math.PI * 2,
                    false
                );

                canvasRenderingContext.clip();

                const wider = streamResolution.width > streamResolution.height;
                const adaptedWidth = displayResolution.width * streamResolution.width / streamResolution.height;
                const adaptedHeight = displayResolution.height * streamResolution.height / streamResolution.width;

                canvasRenderingContext.drawImage(image,
                    wider ? position.x - (adaptedWidth - displayResolution.width) / 2 : position.x,
                    wider ? position.y : position.y - (adaptedHeight - displayResolution.height) / 2,
                    wider ? adaptedWidth : displayResolution.width,
                    wider ? displayResolution.height : adaptedHeight,
                );

                break;
            default:
                canvasRenderingContext.drawImage(image, position.x, position.y, displayResolution.width, displayResolution.height);
        }
        canvasRenderingContext.restore();
    }

    public hasDisplay(): boolean {
        return !!this.displaySettings;
    }

    public onMouseDrag(e: DragEvent) {
        const streamDetails = this.getStreamDetails();
        if (streamDetails.options.resizable && e.dragStart.locations?.find((location) => ["top", "right", "bottom", "left", "circle"].indexOf(location) !== -1)) {
            this.onMouseResize(e.dragStart, e.x, e.y);
        } else if (streamDetails.options.draggable && e.dragStart.locations?.indexOf("inside") !== -1) {
            this.updatePosition(Position.fixed({
                x: e.x - e.dragStart.offsetX!,
                y: e.y - e.dragStart.offsetY!,
                width: streamDetails.displaySettings!.displayResolution.width,
                height: streamDetails.displaySettings!.displayResolution.height,
            }));
        }
    }

    private onMouseResize(dragStart: DragStart, mouseX: number, mouseY: number) {
        if (dragStart.locations?.indexOf("circle") !== -1) {
            const circleCenter = {
                x: dragStart.x - dragStart.offsetX! + (dragStart.circleRadius || 0),
                y: dragStart.y - dragStart.offsetY! + (dragStart.circleRadius || 0)
            };
            const newRadius = Math.sqrt(Math.pow(mouseX - circleCenter.x, 2) + Math.pow(mouseY - circleCenter.y, 2));
            const change = newRadius / dragStart.circleRadius!;

            this.updatePosition(Position.fixed({
                width: dragStart.streamWidth! * change,
                height: dragStart.streamHeight! * change,
                x: dragStart.x - dragStart.offsetX! + (dragStart.circleRadius! - newRadius),
                y: dragStart.y - dragStart.offsetY! + (dragStart.circleRadius! - newRadius),
            }));
        } else if (dragStart.locations?.indexOf("bottom") !== -1) {
            const height = dragStart.streamHeight! + mouseY - dragStart.y;
            const width = dragStart.streamWidth! * height / dragStart.streamHeight!;
            const x = dragStart.x - dragStart.offsetX! - (width - dragStart.streamWidth!) / 2;
            const y = dragStart.y - dragStart.offsetY!;
            this.updatePosition(Position.fixed({ height, width, x, y }));
        } else if (dragStart.locations?.indexOf("top") !== -1) {
            const height = dragStart.streamHeight! - (mouseY - dragStart.y);
            const width = dragStart.streamWidth! * height / dragStart.streamHeight!;
            const y = dragStart.y - dragStart.offsetY! + (mouseY - dragStart.y);
            const x = dragStart.x - dragStart.offsetX! - (width - dragStart.streamWidth!) / 2;
            this.updatePosition(Position.fixed({ height, width, x, y }));
        } else if (dragStart.locations?.indexOf("left") !== -1) {
            const width = dragStart.streamWidth! - (mouseX - dragStart.x);
            const height = dragStart.streamHeight! * width / dragStart.streamWidth!;
            const x = dragStart.x - dragStart.offsetX! + (mouseX - dragStart.x);
            const y = dragStart.y - dragStart.offsetY! - (height - dragStart.streamHeight!) / 2;
            this.updatePosition(Position.fixed({ height, width, x, y }));
        } else if (dragStart.locations?.indexOf("right") !== -1) {
            const width = dragStart.streamWidth! + (mouseX - dragStart.x)
            const height = dragStart.streamHeight! * width / dragStart.streamWidth!;
            const y = dragStart.y - dragStart.offsetY! - (height - dragStart.streamHeight!) / 2;
            const x = dragStart.x - dragStart.offsetX!;
            this.updatePosition(Position.fixed({ height, width, x, y }));
        }
    }

    private updateDisplaySettings() {
        if (this.type === "AUDIO") return;

        const trackSettings = this.mediaStream?.getVideoTracks()[0].getSettings();

        const streamResolution = trackSettings
            ? { width: trackSettings.width as number, height: trackSettings.height as number }
            : { width: this.videoElement?.width as number, height: this.videoElement?.height as number };

        return this.displaySettings = {
            ...this.position.calculatePositionAndDimensions(this.containerResolution, streamResolution, this.mask),
            streamResolution,
        };
    }


    private createStreamVideoElement(mediaStream: MediaStream): HTMLVideoElement {
        const videoElement = document.createElement('video');
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.srcObject = mediaStream;
        videoElement.setAttribute('style', 'position:fixed; left: 0px; top:0px; pointer-events: none; opacity:0;');
        document.body.appendChild(videoElement);

        const res = videoElement.play();
        res.catch(null);

        return videoElement;
    }


    private createStreamAudioElement(audioContext: AudioContext, audioDelayNode: DelayNode, mediaStream: MediaStream): StreamAudio {

        const audioSource = audioContext.createMediaStreamSource(mediaStream);
        const audioOutput = audioContext.createGain(); // Intermediate gain node
        audioOutput.gain.value = 1;
        audioSource.connect(audioOutput); // Default is direct connect
        audioOutput.connect(audioDelayNode);

        return {
            audioSource,
            audioOutput
        }

    }
}