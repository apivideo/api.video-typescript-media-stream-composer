import { Stream } from "./stream/stream";

type StreamMouseLocation = "inside" | "circle" | "top" | "bottom" | "left" | "right";

export interface ClickEvent {
    x: number;
    y: number;
    stream?: Stream;
}

export interface MoveEvent {
    x: number;
    y: number;
    stream?: Stream;
    locations?: StreamMouseLocation[];
};

export interface DragEvent {
    x: number;
    y: number;
    dragStart: DragStart
};

export interface DragStart {
    x: number;
    y: number;
    circleRadius?: number;
    streamWidth?: number;
    streamHeight?: number;
    offsetX?: number;
    offsetY?: number;
    stream?: Stream;
    locations?: StreamMouseLocation[];
};

type OverStream = {
    stream: Stream;
    locations: StreamMouseLocation[];
};

interface Coordinates {
    x: number;
    y: number;
}

export default class MouseEventListener {
    private streams: Stream[];
    private onClickListeners: ((e: ClickEvent) => void)[] = [];
    private onDragListeners: ((e: DragEvent) => void)[] = [];
    private onDragEndListeners: (() => void)[] = [];
    private onMoveListeners: ((e: MoveEvent) => void)[] = [];
    private dragStart?: DragStart & { hasMoved: boolean };
    private overStream?: OverStream;

    constructor(canvas: HTMLCanvasElement, streams:Stream[]) {
        this.streams = streams;

        const getDimensionsRatio = () => {
            return {
                widthRatio: canvas.clientWidth / canvas.width,
                heightRatio: canvas.clientHeight / canvas.height,
            }
        }

        const fromMouseEvent = (e: MouseEvent) => {
            const dimensionsRatio = getDimensionsRatio();
            return {
                x: e.offsetX / dimensionsRatio.widthRatio,
                y: e.offsetY / dimensionsRatio.heightRatio,
            };
        };
        const fromTouchEvent = (e: TouchEvent, fct: ((e: Coordinates) => void)) => {
            if (!e.targetTouches[0]) {
                return;
            }
            const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
            const dimensionsRatio = getDimensionsRatio();

            fct({
                x: (e.targetTouches[0].pageX - rect.left) * dimensionsRatio.widthRatio,
                y: (e.targetTouches[0].pageY - rect.top) * dimensionsRatio.heightRatio,
            });
        };

        window.addEventListener("mouseup", (e) => this.mouseUp());
        canvas.addEventListener("mousedown", (e) => this.mouseDown(fromMouseEvent(e)));
        canvas.addEventListener("mousemove", (e) => this.mouseMove(fromMouseEvent(e)));

        window.addEventListener("touchend", (e) => this.mouseUp());
        canvas.addEventListener("touchstart", (e) => fromTouchEvent(e, (a) => {
            this.mouseMove(a);
            this.mouseDown(a);
        }));
        canvas.addEventListener("touchmove", (e) => fromTouchEvent(e, (a) => this.mouseMove(a)));
    }

    public onClick(listener: (e: ClickEvent) => void) {
        this.onClickListeners.push(listener);
    }

    public onDrag(listener: (e: DragEvent) => void) {
        this.onDragListeners.push(listener);
    }

    public onDragEnd(listener: () => void) {
        this.onDragEndListeners.push(listener);
    }

    public onMove(listener: (e: MoveEvent) => void) {

        this.onMoveListeners.push(listener);
    }

    private mouseUp() {
        if (this.dragStart) {
            if (!this.dragStart.hasMoved) {
                this.onClickListeners.forEach(l => l({
                    x: this.dragStart!.x,
                    y: this.dragStart!.y,
                    ...(this.overStream && this.overStream.locations.indexOf("inside") > -1 ? { stream: this.overStream!.stream } : {})
                }));
            } else {
                this.onDragEndListeners.forEach(l => l());
            }
        }
        this.dragStart = undefined;
    }

    private mouseDown(mouseCoordinates: Coordinates) {
        if (this.overStream) {
            const { displaySettings, options } = this.overStream.stream.getStreamDetails();
            if(!displaySettings) return;
        
            this.dragStart = {
                ...this.overStream,
                offsetX: mouseCoordinates.x - displaySettings.position.x,
                offsetY: mouseCoordinates.y - displaySettings.position.y,
                ...(options.mask === "circle" ? { circleRadius: displaySettings.radius } : {}),
                streamWidth: displaySettings.displayResolution.width,
                streamHeight: displaySettings.displayResolution.height,
                x: mouseCoordinates.x,
                y: mouseCoordinates.y,
                hasMoved: false,
            };
        } else {
            this.dragStart = {
                x: mouseCoordinates.x,
                y: mouseCoordinates.y,
                hasMoved: false,
            };
        }
    }
    private mouseMove(mouseCoordinates: Coordinates) {
        if (this.dragStart) {
            this.onDragListeners.forEach(l => l({
                ...mouseCoordinates,
                dragStart: this.dragStart!,
            }));
            this.dragStart.hasMoved = true;
        } else {
            let index = 0;
            let overStream: OverStream | undefined;

            let currentStreamIndex = 0;
            for (const stream of this.streams) {
                if(!stream.hasDisplay()) continue;
                const locations: StreamMouseLocation[] = [];
                const streamDetails = stream.getStreamDetails();
                const displaySettings = streamDetails.displaySettings!;
                //const stream = this.streams.find(s => s.id === streamId);

                currentStreamIndex++;

                if (!stream) {
                    continue;
                }
                const {
                    x,
                    y,
                    width,
                    height
                } = { ...displaySettings.displayResolution, ...displaySettings.position };

                if (streamDetails.options.mask === "circle") {
                    const centerX = x + displaySettings.radius!;
                    const centerY = y + displaySettings.radius!;
                    const distance = Math.sqrt(Math.pow(centerX - mouseCoordinates.x, 2) + Math.pow(centerY - mouseCoordinates.y, 2));
                    if (distance <= displaySettings.radius!) {
                        locations.push("inside");
                    }
                    if (distance <= displaySettings.radius! + 10 && distance > displaySettings.radius! - 10) {
                        locations.push("circle");
                    }
                } else {

                    if (mouseCoordinates.x > x && mouseCoordinates.x < x + width && mouseCoordinates.y > y && mouseCoordinates.y < y + height) locations.push("inside");

                    if (mouseCoordinates.x > x && mouseCoordinates.x < x + width && mouseCoordinates.y > y - 10 && mouseCoordinates.y < y + 10) locations.push("top");
                    if (mouseCoordinates.x > x && mouseCoordinates.x < x + width && mouseCoordinates.y > y + height - 10 && mouseCoordinates.y < y + height + 10) locations.push("bottom");
                    if (mouseCoordinates.y > y && mouseCoordinates.y < y + height && mouseCoordinates.x > x - 10 && mouseCoordinates.x < x + 10) locations.push("left");
                    if (mouseCoordinates.y > y && mouseCoordinates.y < y + height && mouseCoordinates.x > x + width - 10 && mouseCoordinates.x < x + width + 10) locations.push("right");
                }

                if (locations.length > 0 && currentStreamIndex > index) {
                    index = currentStreamIndex;
                    overStream = {
                        stream,
                        locations
                    }
                }
            }
            this.overStream = overStream;

            this.onMoveListeners.forEach(l => l({
                ...(this.overStream ? this.overStream! : {}),
                ...mouseCoordinates
            }));
        }
    }
}