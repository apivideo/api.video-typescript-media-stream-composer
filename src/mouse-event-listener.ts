import { StreamDetails } from ".";

type StreamMouseLocation = "inside" | "circle" | "top" | "bottom" | "left" | "right";

export interface ClickEvent {
    x: number;
    y: number;
    stream?: StreamDetails;
}

export interface MoveEvent {
    x: number;
    y: number;
    stream?: StreamDetails;
    locations?: StreamMouseLocation[];
};

export interface DragEvent {
    x: number;
    y: number;
    dragStart: DragStart
};

interface DragStart {
    x: number;
    y: number;
    circleRadius?: number;
    streamWidth?: number;
    streamHeight?: number;
    offsetX?: number;
    offsetY?: number;
    stream?: StreamDetails;
    locations?: StreamMouseLocation[];
};

type OverStream = {
    stream: StreamDetails;
    locations: StreamMouseLocation[];
};

interface Coordinates {
    x: number;
    y: number;
}

export default class MouseEventListener {
    private streams: { [id: string]: StreamDetails };
    private onClickListeners: ((e: ClickEvent) => void)[] = [];
    private onDragListeners: ((e: DragEvent) => void)[] = [];
    private onDragEndListeners: (() => void)[] = [];
    private onMoveListeners: ((e: MoveEvent) => void)[] = [];
    private dragStart?: DragStart & { hasMoved: boolean };
    private overStream?: OverStream;

    constructor(canvas: HTMLCanvasElement, streams: { [id: string]: StreamDetails }) {
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
            this.dragStart = {
                ...this.overStream,
                offsetX: mouseCoordinates.x - this.overStream.stream.displaySettings.position.x,
                offsetY: mouseCoordinates.y - this.overStream.stream.displaySettings.position.y,
                ...(this.overStream.stream.options.mask === "circle" ? { circleRadius: this.overStream.stream.displaySettings.radius } : {}),
                streamWidth: this.overStream.stream.displaySettings.displayResolution.width,
                streamHeight: this.overStream.stream.displaySettings.displayResolution.height,
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
            const streamIds = Object.keys(this.streams);
            let index = 0;
            let overStream: OverStream | undefined;


            for (const streamId of streamIds) {
                const locations: StreamMouseLocation[] = [];
                const stream = this.streams[streamId];

                if (!stream) {
                    continue;
                }
                const {
                    x,
                    y,
                    width,
                    height
                } = { ...stream.displaySettings.displayResolution, ...stream.displaySettings.position };

                if (stream.options.mask === "circle") {
                    const centerX = x + stream.displaySettings.radius!;
                    const centerY = y + stream.displaySettings.radius!;
                    const distance = Math.sqrt(Math.pow(centerX - mouseCoordinates.x, 2) + Math.pow(centerY - mouseCoordinates.y, 2));
                    if (distance <= stream.displaySettings.radius!) {
                        locations.push("inside");
                    }
                    if (distance <= stream.displaySettings.radius! + 10 && distance > stream.displaySettings.radius! - 10) {
                        locations.push("circle");
                    }
                } else {

                    if (mouseCoordinates.x > x && mouseCoordinates.x < x + width && mouseCoordinates.y > y && mouseCoordinates.y < y + height) locations.push("inside");

                    if (mouseCoordinates.x > x && mouseCoordinates.x < x + width && mouseCoordinates.y > y - 10 && mouseCoordinates.y < y + 10) locations.push("top");
                    if (mouseCoordinates.x > x && mouseCoordinates.x < x + width && mouseCoordinates.y > y + height - 10 && mouseCoordinates.y < y + height + 10) locations.push("bottom");
                    if (mouseCoordinates.y > y && mouseCoordinates.y < y + height && mouseCoordinates.x > x - 10 && mouseCoordinates.x < x + 10) locations.push("left");
                    if (mouseCoordinates.y > y && mouseCoordinates.y < y + height && mouseCoordinates.x > x + width - 10 && mouseCoordinates.x < x + width + 10) locations.push("right");
                }

                if (locations.length > 0 && stream.displaySettings.index! > index) {
                    index = stream.displaySettings.index!;
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