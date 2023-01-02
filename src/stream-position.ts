export type StreamPositionType = "contain" | "cover" | "fixed";

interface FixedPositionSettings {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}

export interface Resolution {
    height: number;
    width: number;
}

export interface Position {
    x: number;
    y: number;
}

interface DimensionsCalculationResult {
    displayResolution: Resolution,
    position: Position,
    radius?: number;
}

export type StreamMask = "none" | "circle";


export abstract class StreamPosition {
    abstract calculatePositionAndDimensions(containerDimensions: Resolution, streamDimensions: Resolution, mask: StreamMask): DimensionsCalculationResult;
}

class StreamPositionFixed extends StreamPosition {
    private fixedPositionSettings: FixedPositionSettings;

    constructor(fixedPositionSettings: FixedPositionSettings) {
        super();
        this.fixedPositionSettings = fixedPositionSettings;
    }

    calculatePositionAndDimensions(containerDimensions: Resolution, streamDimensions: Resolution, mask: StreamMask): DimensionsCalculationResult {
        const targetDimensions = {
            width: this.fixedPositionSettings.width,
            height: this.fixedPositionSettings.height
        };
        const position = {
            x: this.fixedPositionSettings.x,
            y: this.fixedPositionSettings.y
        };

        let width = typeof targetDimensions.width === "undefined"
            ? undefined
            : typeof targetDimensions.width === "number"
                ? targetDimensions.width
                : parseInt(targetDimensions.width || "100%", 10) * containerDimensions.width / 100;
        let height = typeof targetDimensions.height === "undefined"
            ? undefined
            : typeof targetDimensions.height === "number"
                ? targetDimensions.height
                : parseInt(targetDimensions.height || "100%", 10) * containerDimensions.height / 100;

        let radius;

        if (width === undefined && height === undefined) {
            width = containerDimensions.width;
            height = containerDimensions.height;
        }

        if (mask === "circle") {
            if (width === undefined) {
                radius = height! / 2;
                width = height;
            } else if (height === undefined) {
                radius = width! / 2;
                height = width;
            } else {
                radius = Math.min(width!, height!) / 2;
            }
        }

        if (width === undefined) {
            width = streamDimensions.width * height! / streamDimensions.height;
        }

        if (height === undefined) {
            height = streamDimensions.height * width! / streamDimensions.width;
        }


        return {
            radius,
            displayResolution: { width, height },
            position: { x: position?.x || 0, y: position?.y || 0 }
        }
    }
}

class StreamPositionContain extends StreamPosition {

    calculatePositionAndDimensions(containerDimensions: Resolution, streamDimensions: Resolution, mask: StreamMask): DimensionsCalculationResult {
        let width;
        let height;
        let radius;

        

        if (streamDimensions.width / containerDimensions.width > streamDimensions.height / containerDimensions.height) {
            width = containerDimensions.width;
            height = mask !== "circle" ? streamDimensions.height * containerDimensions.width / streamDimensions.width : width;
            radius = width! / 2;
        } else {
            height = containerDimensions.height;
            width = mask !== "circle" ? height * streamDimensions.width / streamDimensions.height : height;
            radius = height! / 2;
        };
        let x = 0;
        let y = 0;
        if (width < containerDimensions.width) {
            x = (containerDimensions.width - width) / 2;
        }
        if (height < containerDimensions.height) {
            y = (containerDimensions.height - height) / 2;
        }

        return {
            displayResolution: { width, height },
            position: { x, y },
            radius: width! / 2
        }
    }
}

class StreamPositionCover extends StreamPosition {

    calculatePositionAndDimensions(containerDimensions: Resolution, streamDimensions: Resolution, mask: StreamMask): DimensionsCalculationResult {
        let width;
        let height;

        if (streamDimensions.width / containerDimensions.width > streamDimensions.height / containerDimensions.height) {
            height = containerDimensions.height;
            width = mask !== "circle" ? streamDimensions.width * containerDimensions.height / streamDimensions.height : height;
        } else {
            width = containerDimensions.width;
            height = mask !== "circle" ? streamDimensions.height * containerDimensions.width / streamDimensions.width : width;
        };

        let x = 0;
        let y = 0;
        if (width > containerDimensions.width) {
            x = (containerDimensions.width - width) / 2;
        }
        if (height > containerDimensions.height) {
            y = (containerDimensions.height - height) / 2;
        }

        return {
            displayResolution: { width, height },
            position: { x, y },
            radius: width! / 2
        }
    }
}

export const Position = {
    contain: new StreamPositionContain(),
    cover: new StreamPositionCover(),
    fixed: (position: FixedPositionSettings) => new StreamPositionFixed(position),
}