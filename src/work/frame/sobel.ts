const sobelX: readonly number[][] = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
];

const sobelY: readonly number[][] = [
    [1, 2, 1],
    [0, 0, 0],
    [-1, -2, -1],
];

/**
 * Applies the Sobel edge detection algorithm to a frame buffer.
 * @param frameBuffer - The frame buffer to process.
 * @param frameWidth Width of the frame.
 * @param rect - The rectangle to process within the frame buffer.
 * @returns A 2D array of edge detection values.
 */
export const getSobelEdges = (frameBuffer: Uint8Array, frameWidth: number, rect: number[]) => {
    // Initialize variables
    let sobelMax = -1;
    const [posX, posY, width, height] = rect;
    const edgeDetectionValues = new Array<number[]>(width);
    for (let i = 0; i < width; i++) {
        edgeDetectionValues[i] = new Array<number>(height).fill(0);
    }

    // Apply Sobel algorithm to each pixel in the frame buffer
    for (let x = 1; x < width - 1; x++) {
        for (let y = 1; y < height - 1; y++) {
            let gx = 0;
            let gy = 0;
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    const r = frameBuffer[(posX + x - 1 + i + (posY + y - 1 + j) * frameWidth) * 4];
                    gx += r * sobelX[i][j];
                    gy += r * sobelY[i][j];
                }
            }
            edgeDetectionValues[x][y] = Math.sqrt(gx * gx + gy * gy);
            if (sobelMax < edgeDetectionValues[x][y]) {
                sobelMax = edgeDetectionValues[x][y];
            }
        }
    }

    // Normalize the Sobel values and return the result
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            edgeDetectionValues[i][j] = edgeDetectionValues[i][j] / sobelMax > 0.3 ? 255 : 0;
        }
    }
    return edgeDetectionValues;
};