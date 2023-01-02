import { DragEvent } from "./mouse-event-listener";

export interface DrawingSettings {
    color: string;
    lineWidth: number;
    autoEraseDelay: number;
}

export class DrawingLayer {
    private drawings: ({ coords: [number, number][], startTime: number, } & DrawingSettings)[] = [];
    private isDrawing = false;
    private drawingsCleanerInterval?: any;

    private drawingSettings: DrawingSettings = {
        lineWidth: 2,
        color: "#000000",
        autoEraseDelay: 0,
    }

    constructor(settings?: Partial<DrawingSettings>) {
        if(settings) {
            this.setDrawingSettings(settings);
        }        
    }

    public init() {
        this.drawingsCleanerInterval = setInterval(() => {
            const currentTime = new Date().getTime();
            this.drawings = this.drawings.filter((drawing) => drawing.autoEraseDelay === 0 || (currentTime - drawing.startTime) / 1000 <= drawing.autoEraseDelay);
        }, 1000);
    }

    public destroy() {
        this.clear();
        if (this.drawingsCleanerInterval) {
            clearInterval(this.drawingsCleanerInterval);
            this.drawingsCleanerInterval = undefined;
        }
    }

    public setDrawingSettings(settings: Partial<DrawingSettings>) {
        this.drawingSettings = {
            ...this.drawingSettings,
            ...settings
        };;
    }

    public clear() {
        this.drawings = [];
    }

    public draw(ctx: CanvasRenderingContext2D) {
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
    }

    public onMouseDragEnd() {
        this.isDrawing = false;
    }

    public onMouseDrag(e: DragEvent) {
        if (!this.isDrawing) {
            this.drawings.push({
                ...this.drawingSettings,
                coords: [[e.x, e.y]],
                startTime: new Date().getTime()
            });
            this.isDrawing = true;
        } else {
            this.drawings[this.drawings.length - 1].coords.push([e.x, e.y]);
        }
    }
}