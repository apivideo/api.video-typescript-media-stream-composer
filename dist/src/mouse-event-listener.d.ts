import { StreamDetails } from ".";
declare type StreamMouseLocation = "inside" | "circle" | "top" | "bottom" | "left" | "right";
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
}
export interface DragEvent {
    x: number;
    y: number;
    dragStart: DragStart;
}
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
}
export default class MouseEventListener {
    private streams;
    private onClickListeners;
    private onDragListeners;
    private onDragEndListeners;
    private onMoveListeners;
    private dragStart?;
    private overStream?;
    constructor(canvas: HTMLCanvasElement, streams: {
        [id: string]: StreamDetails;
    });
    onClick(listener: (e: ClickEvent) => void): void;
    onDrag(listener: (e: DragEvent) => void): void;
    onDragEnd(listener: () => void): void;
    onMove(listener: (e: MoveEvent) => void): void;
    private mouseUp;
    private mouseDown;
    private mouseMove;
}
export {};
