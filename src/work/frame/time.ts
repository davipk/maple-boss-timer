const segmentRect: readonly number[][] = [
    [0.385, 0.175, 0.095, 0.615],
    [0.48, 0.175, 0.098, 0.615],
    [0.698, 0.175, 0.101, 0.615],
    [0.799, 0.175, 0.098, 0.615],
];

/**
 * Processes the time value from a given frame and rectangle.
 * @param frameBuffer - The frame to process.
 * @param frameWidth Width of the frame.
 * @param rect - The rectangle to use for processing.
 * @returns The processed time value in seconds, or null if the processing fails.
 */
export const getTimeInSeconds = (frameBuffer: Uint8Array, frameWidth: number, rect: number[]) => {
    const [posX, posY, width, height] = rect;
    const segmentValue = new Array<number>(segmentRect.length);
    // Iterate over each segment and check if it is displaying a valid value
    for (let i = 0; i < segmentRect.length; i++) {
        const startX = Math.floor(posX + width * segmentRect[i][0]);
        const endX = Math.floor(posX + width * (segmentRect[i][0] + segmentRect[i][2]));
        const startY = Math.floor(posY + height * segmentRect[i][1]);
        const endY = Math.floor(posY + height * (segmentRect[i][1] + segmentRect[i][3]));
        // Check each pixel in the segment to see if it is a valid segment or hole
        for (let j = startX; j <= endX; j++) {
            for (let k = startY; k <= endY; k++) {
                if (j === startX || j === endX || k === startY || k === endY) {
                    if (frameBuffer[(j + k * frameWidth) * 4] >= 0x80) {
                        return null;
                    }
                }
            }
        }
        // Calculate the segment display value based on the pixels in the segment
        let segmentDisplay = 0;
        for (let j = 0; j < 5; j++) {
            for (let k = 0; k < 3; k++) {
                const x = Math.floor(startX + (endX - startX + 1) * (0.2 + 0.3 * k));
                const y = Math.floor(startY + (endY - startY + 1) * (0.12 + 0.19 * j));
                const pos = (x + y * frameWidth) * 4;
                const segment = (j * 3 + k) % 2 != 0;
                const hole = !segment && (j * 3 + k) % 3 === 1;
                if (!segment && !hole) {
                    continue;
                } else if (segment && frameBuffer[pos] >= 0x80) {
                    segmentDisplay |= 1 << Math.floor((j * 3 + k) / 2);
                } else if (hole && frameBuffer[pos] >= 0x80) {
                    return null;
                }
            }
        }
        // Map the segment display value to a digit and store it in the segmentValues array
        switch (segmentDisplay) {
            case 0x77:
                segmentValue[i] = 0;
                break;
            case 0x24:
                segmentValue[i] = 1;
                break;
            case 0x5d:
                segmentValue[i] = 2;
                break;
            case 0x6d:
                segmentValue[i] = 3;
                break;
            case 0x2e:
                segmentValue[i] = 4;
                break;
            case 0x6b:
                segmentValue[i] = 5;
                break;
            case 0x7b:
                segmentValue[i] = 6;
                break;
            case 0x25:
                segmentValue[i] = 7;
                break;
            case 0x7f:
                segmentValue[i] = 8;
                break;
            case 0x6f:
                segmentValue[i] = 9;
                break;
            default:
                if (i === 0 && segmentDisplay === 0x00) {
                    segmentValue[i] = 0;
                } else {
                    return null;
                }
        }
    }
    // Calculate the time value based on the segment values and return it
    return (segmentValue[0] * 10 + segmentValue[1]) * 60 + segmentValue[2] * 10 + segmentValue[3];
};
