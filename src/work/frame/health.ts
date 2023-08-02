const bin: readonly number[][] = [
    [62, 65, 65, 65, 62],
    [0, 32, 127, 0, 0],
    [33, 67, 69, 73, 49],
    [34, 65, 73, 73, 54],
    [12, 20, 36, 127, 4],
    [114, 73, 73, 73, 70],
    [62, 73, 73, 73, 38],
    [64, 64, 67, 76, 112],
    [54, 73, 73, 73, 54],
    [50, 73, 73, 73, 62],
    [0, 0, 1, 0, 0],
];
const binChar: Readonly<string> = "0123456789.";
const sharpenKernel: readonly number[][] = [
    [0, -1, 0],
    [-1, 5, -1],
    [0, -1, 0],
];

/**
 * Processes the HP bar of a game frame and returns the current HP percentage.
 * @param frameBuffer The game frame as a Uint8Array.
 * @param frameWidth Width of the frame.
 * @param rect The rectangle coordinates of the HP bar in the frame as an array of numbers [posX, posY, width, height].
 * @returns The current HP percentage as a number between 0 and 100, or null if it could not be determined.
 */
export const getHpPercentage = (frameBuffer: Uint8Array, frameWidth: number, rect: number[]) => {
    const [posX, posY, width, height] = rect;
    let arr = new Array<number>();
    let maxY = -1;
    let rslt = "";
    for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        let lastY = -1;
        for (let y = 1; y < height - 1; y++) {
            let sharpen = 0;
            for (let i = 0; i < sharpenKernel.length; i++) {
                for (let j = 0; j < sharpenKernel.length; j++) {
                    let pos = (posX + x - 1 + i + (posY + y - 1 + j) * frameWidth) * 4;
                    sharpen += Math.round(0.299 * frameBuffer[pos] + 0.587 * frameBuffer[pos + 1] + 0.114 * frameBuffer[pos + 2]) * sharpenKernel[i][j];
                }
            }
            if (sharpen >= 255) {
                if (lastY >= 0) {
                    sum <<= y - lastY;
                }
                sum |= 1;
                lastY = y;
            }
        }
        if (maxY < lastY) {
            if (maxY >= 0) {
                for (let i = 0; i < arr.length; i++) {
                    arr[i] <<= lastY - maxY;
                }
            }
            maxY = lastY;
        }
        if (lastY >= 0) {
            arr.push(sum << (maxY - lastY));
        } else if (maxY >= 0) {
            let arrCenter = Math.floor(arr.length / 2);
            while (arrCenter < 2) {
                arr.unshift(0);
                arrCenter++;
            }
            while (arr.length < 5) {
                arr.push(0);
            }
            if (arr.length > 5) {
                rslt += "#";
            } else {
                let best = -1;
                let minError = -1;
                for (let i = 0; i < bin.length; i++) {
                    let error = 0;
                    for (let j = 0; j < bin[i].length; j++) {
                        let xor = bin[i][j] ^ arr[j];
                        while (xor > 0) {
                            if (xor & 1) {
                                error++;
                            }
                            xor >>= 1;
                        }
                    }
                    if (minError < 0 || minError > error) {
                        best = i;
                        minError = error;
                    }
                }
                if (best >= 0 && minError < 3) {
                    rslt += binChar[best];
                } else {
                    rslt += "#";
                }
            }
            arr = new Array<number>();
            maxY = -1;
        }
    }
    let point = rslt.indexOf(".");
    if (rslt.length > 3 && rslt.indexOf("#") === rslt.length - 1 && (point < 0 || point === rslt.length - 3)) {
        return parseFloat(rslt.substring(0, rslt.length - 1));
    }
    return null;
};
