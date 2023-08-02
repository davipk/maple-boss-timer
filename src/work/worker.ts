import { getSobelEdges } from "./frame/sobel";
import { getTimeInSeconds } from "./frame/time";
import { getHpPercentage } from "./frame/health";
import { ISendMessage } from "./worker-types";

const minRectWidth = 10;
const minRectHeight = 10;

let timeRectReset = 0;
let hpRectReset = 0;

self.onmessage = (param: MessageEvent<ISendMessage>) => {
    const { frameBuffer, frameWidth, frameHeight, timeRect, hpRect } = param.data;
    const frame = new Uint8Array(frameBuffer);
    let timeArea = timeRect;
    let hpArea = hpRect;
    if (!timeArea || !hpArea) {
        const sobel = getSobelEdges(frame, frameWidth, [0, 0, frameWidth, frameHeight]);
        const hEdgeCounter = new Array(frameHeight).fill(0);
        const vEdgeCounter = new Array(frameWidth).fill(0);
        const vEdge = [];
        const hEdge = [];
        const rect = [];
        for (let x = 0; x < frameWidth; x++) {
            for (let y = 0; y < frameHeight; y++) {
                const value = sobel[x][y] > 0;
                if (value) {
                    hEdgeCounter[y]++;
                    vEdgeCounter[x]++;
                }
                if (!value || x === frameWidth - 1) {
                    if (hEdgeCounter[y] >= minRectWidth) {
                        hEdge.push([x - hEdgeCounter[y] + (value ? 1 : 0), y, hEdgeCounter[y]]);
                    }
                    hEdgeCounter[y] = 0;
                }
                if (!value || y == frameHeight - 1) {
                    if (vEdgeCounter[x] >= minRectHeight) {
                        vEdge.push([x, y - vEdgeCounter[x] + (value ? 1 : 0), vEdgeCounter[x]]);
                    }
                    vEdgeCounter[x] = 0;
                }
            }
        }
        for (let i = 0; i < hEdge.length; i++) {
            for (let j = i + 1; j < hEdge.length; j++) {
                const x1 = Math.max(hEdge[i][0], hEdge[j][0]);
                const x2 = Math.min(hEdge[i][0] + hEdge[i][2] - 1, hEdge[j][0] + hEdge[j][2] - 1);
                if (x2 - x1 + 1 < minRectWidth) {
                    continue;
                }
                const top = Math.min(hEdge[i][1], hEdge[j][1]);
                const bot = Math.max(hEdge[i][1], hEdge[j][1]);
                if (bot - top + 1 < minRectHeight) {
                    continue;
                }
                let left = -1;
                let right = -1;
                let leftMinStd = Number.MAX_VALUE;
                let rightMinStd = Number.MAX_VALUE;
                for (let k = 0; k < vEdge.length; k++) {
                    let x;
                    if (vEdge[k][0] <= x1) {
                        x = x1;
                    } else if (vEdge[k][0] >= x2) {
                        x = x2;
                    } else {
                        continue;
                    }
                    let y1 = Math.max(vEdge[k][1], top);
                    let y2 = Math.min(vEdge[k][1] + vEdge[k][2] - 1, bot);
                    let diffX = Math.abs(vEdge[k][0] - x);
                    let diffY1 = Math.abs(y1 - top);
                    let diffY2 = Math.abs(y2 - bot);
                    if (Math.min(diffX, diffY1, diffY2) / Math.max(diffX, diffY1, diffY2) < 0.5) {
                        continue;
                    }
                    if (Math.sqrt(diffX * diffX + Math.max(diffY1 * diffY1, diffY2 * diffY2)) > Math.min(x2 - x1, y2 - y1)) {
                        continue;
                    }
                    let mean = (diffX + diffY1 + diffY2) / 3;
                    let std = Math.sqrt((diffX * diffX + diffY1 * diffY1 + diffY2 * diffY2) / 3 - mean * mean);
                    if (x === x1 && (left < 0 || leftMinStd > std)) {
                        left = vEdge[k][0];
                        leftMinStd = std;
                    } else if (x === x2 && (right < 0 || rightMinStd > std)) {
                        right = vEdge[k][0];
                        rightMinStd = std;
                    }
                }
                if (left >= 0 && right >= 0) {
                    rect.push([left, top, right - left + 1, bot - top + 1]);
                }
            }
        }
        for (let i = rect.length - 1; i >= 0; i--) {
            for (let j = rect.length - 1; j >= 0; j--) {
                if (i === j) {
                    continue;
                } else if (rect[i][0] >= rect[j][0] && rect[i][1] >= rect[j][1] && rect[i][0] + rect[i][2] <= rect[j][0] + rect[j][2] && rect[i][1] + rect[i][3] <= rect[j][1] + rect[j][3]) {
                    rect.splice(i, 1);
                    break;
                }
            }
        }
        for (let i = 0; i < rect.length; i++) {
            if (rect[i][0] > frameWidth * 0.5) {
                continue;
            } else if (!timeArea && getTimeInSeconds(frame, frameWidth, rect[i])) {
                timeArea = rect[i];
            } else if (!hpArea && getHpPercentage(frame, frameWidth, rect[i])) {
                hpArea = rect[i];
            }
        }
    }
    let time = null;
    if (timeArea) {
        time = getTimeInSeconds(frame, frameWidth, timeArea);
        if (time) {
            timeRectReset = 0;
        } else {
            timeRectReset++;
            if (timeRectReset === 100) {
                timeArea = null;
                timeRectReset = 0;
            }
        }
    }
    let hp = null;
    if (hpArea) {
        hp = getHpPercentage(frame, frameWidth, hpArea);
        if (hp) {
            hpRectReset = 0;
        } else {
            hpRectReset++;
            if (hpRectReset === 100) {
                hpArea = null;
                hpRectReset = 0;
            }
        }
    }
    // Look for the "Red" color scheme to detect the hourglass reset.
    const colorDepth = 5;
    const colorInterval = 255 / (colorDepth - 1);
    let patternRect;
    let pattern = 0;
    const v = new Array(frameWidth);
    for (let x = 0; x < frameWidth; x++) {
        v[x] = new Array(frameHeight).fill(false);
    }
    for (let x = 0; x < frameWidth; x++) {
        for (let y = 0; y < frameHeight; y++) {
            if (!v[x][y]) {
                v[x][y] = true;
                let pos = (x + y * frameWidth) * 4;
                let r = Math.floor((frame[pos] / 256) * colorDepth) * colorInterval;
                let g = Math.floor((frame[pos + 1] / 256) * colorDepth) * colorInterval;
                let b = Math.floor((frame[pos + 2] / 256) * colorDepth) * colorInterval;
                if (r === 255 && g + b === 0) {
                    let count = 0;
                    let area = [x, x, y, y];
                    let queue = [[x, y]];
                    while (queue.length > 0) {
                        const q = queue.shift();
                        if (!q) {
                            continue;
                        }
                        pos = (q[0] + q[1] * frameWidth) * 4;
                        r = Math.floor((frame[pos] / 256) * colorDepth) * colorInterval;
                        g = Math.floor((frame[pos + 1] / 256) * colorDepth) * colorInterval;
                        b = Math.floor((frame[pos + 2] / 256) * colorDepth) * colorInterval;
                        if (r === 255 && g + b === 0) {
                            count++;
                            area[0] = Math.min(area[0], q[0]);
                            area[1] = Math.max(area[1], q[0]);
                            area[2] = Math.min(area[2], q[1]);
                            area[3] = Math.max(area[3], q[1]);
                            for (let i = -1; i <= 1; i++) {
                                for (let j = -1; j <= 1; j++) {
                                    if (0 <= q[0] + i && q[0] + i < frameWidth && 0 <= q[1] + j && q[1] + j < frameHeight && !v[q[0] + i][q[1] + j]) {
                                        v[q[0] + i][q[1] + j] = true;
                                        queue.push([q[0] + i, q[1] + j]);
                                    }
                                }
                            }
                        }
                    }
                    const ratio = count / (frameWidth * frameHeight);
                    if (ratio > 0.01) {
                        pattern += ratio;
                        if (!patternRect) {
                            patternRect = [];
                        }
                        patternRect.push([area[0], area[2], area[1] - area[0] + 1, area[3] - area[2] + 1]);
                    }
                }
            }
        }
    }
    self.postMessage({
        time,
        timeRect: timeArea,
        hp,
        hpRect: hpArea,
        pattern,
        patternRect,
    });
};
