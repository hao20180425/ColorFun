/**
 * floodFill.js
 * ------------------------------------------------------------------
 * 泛洪填充（Flood Fill / 油漆桶）算法模块
 *
 * 适用场景：
 *   儿童涂色应用中，用户点击线稿内某个封闭区域，
 *   将该区域内所有相连的同色像素替换为指定颜色（支持覆盖已填色区域）。
 *
 * 设计要点：
 *   1. 基于"栈 (Stack)"的迭代实现，避免递归爆栈
 *      （Web 环境下递归深度通常 < 1 万，单张大图区域像素轻松超过 10 万）
 *   2. 支持颜色容差，用于跨过线稿抗锯齿边缘的渐变像素
 *   3. 运行时按"亮度阈值"判断深色边界，避免颜色越界覆盖到轮廓线上
 *   4. 设置最大填充像素数上限，保证极端情况下的性能与流畅度
 *   5. 使用 Uint8Array 作为 visited 标记，O(1) 查询、内存紧凑
 *
 * 关于"线条加粗膨胀预处理"为什么被移除：
 *   - 之前为了防止颜色从线条抗锯齿缝隙穿出，做了 3x3 邻域膨胀，把
 *     线条 1 像素邻域全部并入边界。
 *   - 但精细线稿（如蝴蝶翅膀花纹）线条间距可能只有 2~4 像素，膨胀后
 *     封闭小区域被完全堵死，导致用户点击该区域时算法直接判定起始点
 *     为边界、立即返回不填色。
 *   - 改进策略：提高扩散边界亮度（拦截抗锯齿灰边），起始点增加邻域
 *     暗色检测（点在线条/线边时拒绝），避免误触黑线后整图被染。
 * ------------------------------------------------------------------
 */

/** 内部拒绝原因 */
const RejectReason = {
    ON_LINE: 'on_line',
    OUT_OF_BOUNDS: 'out_of_bounds'
};

/* =====================================================================
 * 亮度阈值常量
 * ===================================================================== */

/**
 * 扩散时用于判断"线条边界"的亮度阈值。
 *   亮度 < BOUNDARY_BRIGHTNESS 视为边界，泛洪不会越过该像素。
 *   设为 140：覆盖 drawImage 缩放后常见的抗锯齿灰边（80~130），
 *   防止颜色沿线条光晕蔓延到其它区域或整幅背景。
 */
const BOUNDARY_BRIGHTNESS = 140;

/** 纯黑线芯：亮度低于此值直接拒绝起始 */
const START_DARK_REJECT = 60;

/**
 * 起始点"明确可填区域"阈值。亮度 >= 该值视为封闭区内的白/浅色，
 * 跳过邻域线条检测（避免小白色区域被附近线条误判）。
 */
const START_LIGHT_ALLOW = 180;

/** 邻域暗色判定：亮度低于此值的邻居计为"线条像素" */
const NEIGHBOR_DARK_THRESHOLD = 100;

/** 单次泛洪最多填充像素数（防止超大区域卡死） */
const MAX_FILL_PIXELS = 500000;

/** 分片任务默认每批处理的栈操作次数 */
const DEFAULT_BATCH_OPS = 12000;

/* =====================================================================
 * 工具函数
 * ===================================================================== */

/**
 * 计算 ITU-R BT.601 标准下的人眼感知亮度（0~255）。
 *
 * 公式：brightness = 0.299*R + 0.587*G + 0.114*B
 *   - 绿色权重最大、红色次之、蓝色最小，符合人眼锥状细胞分布
 *   - 比直接用 (R+G+B)/3 更接近"主观深浅"判断
 *
 * @param {number} r 红色通道 0~255
 * @param {number} g 绿色通道 0~255
 * @param {number} b 蓝色通道 0~255
 * @returns {number} 亮度值，范围 0~255
 */
function getBrightness(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * 判断两个 RGBA 颜色是否在容差范围内"相近"
 *
 * 这里使用「曼哈顿距离」（各通道差值绝对值之和）：
 *   - 计算更快（无需平方与开方）
 *   - 对儿童涂色这种"差不多就行"的场景已经足够
 *
 * @param {number} r1 颜色 1 的 R
 * @param {number} g1 颜色 1 的 G
 * @param {number} b1 颜色 1 的 B
 * @param {number} a1 颜色 1 的 A
 * @param {number} r2 颜色 2 的 R
 * @param {number} g2 颜色 2 的 G
 * @param {number} b2 颜色 2 的 B
 * @param {number} a2 颜色 2 的 A
 * @param {number} tolerance 容差阈值（曼哈顿距离总和）
 * @returns {boolean} 颜色相近返回 true
 */
function isColorSimilar(r1, g1, b1, a1, r2, g2, b2, a2, tolerance) {
    const diff =
        Math.abs(r1 - r2) +
        Math.abs(g1 - g2) +
        Math.abs(b1 - b2) +
        Math.abs(a1 - a2);
    return diff <= tolerance;
}

/**
 * 判断扩散时是否应视为线稿边界（不可穿越）
 * 深色但与当前区域目标色相近的像素 → 用户已填色，允许覆盖
 * 深色且与目标色不同 → 线稿/抗锯齿边，阻挡扩散
 */
function isLineBoundaryPixel(r, g, b, a, targetR, targetG, targetB, targetA, tolerance) {
    if (a < 10) return false;
    const brightness = getBrightness(r, g, b);
    if (brightness >= BOUNDARY_BRIGHTNESS) return false;
    if (isColorSimilar(r, g, b, a, targetR, targetG, targetB, targetA, tolerance)) {
        return false;
    }
    return true;
}

/**
 * 判断起始点是否落在线稿线条或抗锯齿边缘上（已填色区域允许作为起点）
 */
function isStartPointOnLine(data, width, height, sx, sy, r, g, b, a, tolerance) {
    if (a < 10) return false;

    const brightness = getBrightness(r, g, b);
    if (brightness < START_DARK_REJECT) return true;
    if (brightness >= START_LIGHT_ALLOW) return false;

    let lineNeighborCount = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = sx + dx;
            const ny = sy + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const idx = (ny * width + nx) * 4;
            const na = data[idx + 3];
            if (na < 10) continue;
            const nr = data[idx];
            const ng = data[idx + 1];
            const nb = data[idx + 2];
            if (getBrightness(nr, ng, nb) >= NEIGHBOR_DARK_THRESHOLD) continue;
            if (!isColorSimilar(nr, ng, nb, na, r, g, b, a, tolerance)) {
                lineNeighborCount++;
            }
        }
    }
    if (lineNeighborCount >= 2) return true;
    if (lineNeighborCount >= 1 && brightness < START_DARK_REJECT) return true;

    return false;
}

/* =====================================================================
 * 主函数：floodFill
 * ===================================================================== */

/**
 * 泛洪填充算法 - 基于栈的迭代实现
 *
 * @param {Uint8ClampedArray} data 像素数据数组（来自 ImageData.data）
 * @param {number} width 画布宽度（像素）
 * @param {number} height 画布高度（像素）
 * @param {number} startX 填充起始点 X 坐标
 * @param {number} startY 填充起始点 Y 坐标
 * @param {Array<number>} fillColor 填充颜色 [R, G, B, A]，每个值 0-255
 * @param {number} [tolerance=20] 颜色容差值，用于处理抗锯齿边缘
 *                                越小越严格，避免颜色穿透线条；过大会越界。
 * @returns {Uint8ClampedArray} 处理后的像素数据（原地修改）
 */
/**
 * 初始化泛洪填充任务状态
 * @returns {{ state: object } | { reason: string }}
 */
function createFloodFillState(data, width, height, startX, startY, fillColor, tolerance) {
    if (
        startX < 0 || startX >= width ||
        startY < 0 || startY >= height
    ) {
        return { reason: RejectReason.OUT_OF_BOUNDS };
    }

    const sx = Math.floor(startX);
    const sy = Math.floor(startY);

    const fillR = fillColor[0] ?? 0;
    const fillG = fillColor[1] ?? 0;
    const fillB = fillColor[2] ?? 0;
    const fillA = fillColor[3] ?? 255;

    const startIndex = (sy * width + sx) * 4;
    const targetR = data[startIndex];
    const targetG = data[startIndex + 1];
    const targetB = data[startIndex + 2];
    const targetA = data[startIndex + 3];

    if (isStartPointOnLine(data, width, height, sx, sy, targetR, targetG, targetB, targetA, tolerance)) {
        return { reason: RejectReason.ON_LINE };
    }

    const visited = new Uint8Array(width * height);
    const stack = [sy * width + sx];

    return {
        state: {
            data,
            width,
            height,
            visited,
            stack,
            targetR,
            targetG,
            targetB,
            targetA,
            fillR,
            fillG,
            fillB,
            fillA,
            tolerance,
            filledCount: 0
        }
    };
}

/**
 * 执行一批泛洪操作，返回是否已全部完成
 * @param {object} state createFloodFillState 的返回值
 * @param {number} maxOps 本批最多处理的栈弹出次数
 */
function floodFillProcessBatch(state, maxOps) {
    const {
        data, width, height, visited, stack,
        targetR, targetG, targetB, targetA,
        fillR, fillG, fillB, fillA, tolerance
    } = state;

    let ops = 0;
    while (stack.length > 0 && ops < maxOps && state.filledCount < MAX_FILL_PIXELS) {
        ops++;

        const pixelIndex = stack.pop();
        if (visited[pixelIndex] === 1) {
            continue;
        }
        visited[pixelIndex] = 1;

        const x = pixelIndex % width;
        const y = (pixelIndex - x) / width;

        if (x < 0 || x >= width || y < 0 || y >= height) {
            continue;
        }

        const dataIndex = pixelIndex * 4;
        const r = data[dataIndex];
        const g = data[dataIndex + 1];
        const b = data[dataIndex + 2];
        const a = data[dataIndex + 3];

        if (isLineBoundaryPixel(r, g, b, a, targetR, targetG, targetB, targetA, tolerance)) {
            continue;
        }

        if (!isColorSimilar(
            r, g, b, a,
            targetR, targetG, targetB, targetA,
            tolerance
        )) {
            continue;
        }

        data[dataIndex] = fillR;
        data[dataIndex + 1] = fillG;
        data[dataIndex + 2] = fillB;
        data[dataIndex + 3] = fillA;
        state.filledCount++;

        if (x > 0) {
            const leftIdx = pixelIndex - 1;
            if (visited[leftIdx] === 0) stack.push(leftIdx);
        }
        if (x < width - 1) {
            const rightIdx = pixelIndex + 1;
            if (visited[rightIdx] === 0) stack.push(rightIdx);
        }
        if (y > 0) {
            const upIdx = pixelIndex - width;
            if (visited[upIdx] === 0) stack.push(upIdx);
        }
        if (y < height - 1) {
            const downIdx = pixelIndex + width;
            if (visited[downIdx] === 0) stack.push(downIdx);
        }
    }

    return stack.length === 0 || state.filledCount >= MAX_FILL_PIXELS;
}

/**
 * 创建可分片执行的泛洪任务（微信小程序避免主线程长时间阻塞导致 timeout）
 * @returns {{ step: function(number): boolean } | null} step 返回 true 表示完成
 */
export function createFloodFillTask(data, width, height, startX, startY, fillColor, tolerance = 12) {
    const result = createFloodFillState(data, width, height, startX, startY, fillColor, tolerance);
    if (result.reason) {
        return null;
    }
    const state = result.state;
    return {
        step(maxOps = DEFAULT_BATCH_OPS) {
            return floodFillProcessBatch(state, maxOps);
        }
    };
}

