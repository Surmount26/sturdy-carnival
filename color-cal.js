// 颜色计算器主JavaScript文件

// 全局变量
let sampleData = [];
let spectralData1 = null;
let spectralData2 = null;
let spectralChart = null;
let batchColorDifferenceResults = [];
let spectralChartMode = 'line'; // 当前光谱图类型（line/bar）
let selectedChromaticityIndex = null;

// 手动输入的样品数据（XYZ三刺激值）
let manualSamples = [
    { name: '样品1', X: '', Y: '', Z: '', color: null },
    { name: '样品2', X: '', Y: '', Z: '', color: null },
    { name: '样品3', X: '', Y: '', Z: '', color: null }
];

// 标签页切换
function switchTab(index) {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach((tab, i) => {
        if (i === index) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    contents.forEach((content, i) => {
        if (i === index) {
            content.classList.add('active');
            // 初始化特定标签页
            if (index === 0) {
                drawChromaticityDiagram();
            }
        } else {
            content.classList.remove('active');
        }
    });
}

// ==================== CIE xy 色品图 ====================

// 使用Canvas 2D的平滑曲线绘制（基于控制点）
function drawSmoothCurve(ctx, points, xToCanvas, yToCanvas) {
    if (points.length < 2) return;

    ctx.beginPath();

    if (points.length === 2) {
        // 只有两个点，直接画直线
        ctx.moveTo(xToCanvas(points[0].x), yToCanvas(points[0].y));
        ctx.lineTo(xToCanvas(points[1].x), yToCanvas(points[1].y));
    } else {
        // 使用Canvas内置的bezierCurveTo实现Catmull-Rom样条
        // 首先移动到第一个点
        ctx.moveTo(xToCanvas(points[0].x), yToCanvas(points[0].y));

        // 遍历每个点，使用二次贝塞尔曲线连接
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];

            // Catmull-Rom到贝塞尔曲线的转换
            // 控制点1 = p1 + (p2 - p0) / 6
            // 控制点2 = p2 - (p3 - p1) / 6
            const cp1x = xToCanvas(p1.x + (p2.x - p0.x) / 6);
            const cp1y = yToCanvas(p1.y + (p2.y - p0.y) / 6);
            const cp2x = xToCanvas(p2.x - (p3.x - p1.x) / 6);
            const cp2y = yToCanvas(p2.y - (p3.y - p1.y) / 6);

            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, xToCanvas(p2.x), yToCanvas(p2.y));
        }
    }

    ctx.stroke();
}

// ========== CIE 1931 XYZ 色匹配函数数据（用于精确色品图填充）==========
// 标准观察者数据：x̄(λ), ȳ(λ), z̄(λ)，对应波长 380nm - 780nm，步长 5nm
const CIE1931_CMF = [
    {lambda:380, x:0.001368, y:0.000039, z:0.006450},
    {lambda:385, x:0.002236, y:0.000064, z:0.010550},
    {lambda:390, x:0.004243, y:0.000120, z:0.020050},
    {lambda:395, x:0.007650, y:0.000217, z:0.036210},
    {lambda:400, x:0.014310, y:0.000396, z:0.067850},
    {lambda:405, x:0.023190, y:0.000640, z:0.110200},
    {lambda:410, x:0.043510, y:0.001210, z:0.207400},
    {lambda:415, x:0.077630, y:0.002180, z:0.371300},
    {lambda:420, x:0.134380, y:0.004000, z:0.645600},
    {lambda:425, x:0.214770, y:0.007300, z:1.039050},
    {lambda:430, x:0.283900, y:0.011600, z:1.385600},
    {lambda:435, x:0.328500, y:0.016840, z:1.622960},
    {lambda:440, x:0.348280, y:0.023000, z:1.747060},
    {lambda:445, x:0.348060, y:0.029800, z:1.782600},
    {lambda:450, x:0.336200, y:0.038000, z:1.772110},
    {lambda:455, x:0.318700, y:0.048000, z:1.686100},
    {lambda:460, x:0.290800, y:0.060000, z:1.528140},
    {lambda:465, x:0.251100, y:0.073900, z:1.287640},
    {lambda:470, x:0.195360, y:0.090980, z:1.041900},
    {lambda:475, x:0.142100, y:0.112600, z:0.812950},
    {lambda:480, x:0.095640, y:0.139020, z:0.616200},
    {lambda:485, x:0.057950, y:0.169300, z:0.465180},
    {lambda:490, x:0.032010, y:0.208020, z:0.353300},
    {lambda:495, x:0.014700, y:0.258600, z:0.272000},
    {lambda:500, x:0.004900, y:0.323000, z:0.212300},
    {lambda:505, x:0.002400, y:0.407300, z:0.158200},
    {lambda:510, x:0.009300, y:0.503000, z:0.111700},
    {lambda:515, x:0.029100, y:0.608200, z:0.078250},
    {lambda:520, x:0.063270, y:0.710000, z:0.057250},
    {lambda:525, x:0.109600, y:0.793200, z:0.042250},
    {lambda:530, x:0.165500, y:0.862000, z:0.029840},
    {lambda:535, x:0.225750, y:0.914850, z:0.020030},
    {lambda:540, x:0.290400, y:0.954000, z:0.013400},
    {lambda:545, x:0.359700, y:0.980300, z:0.008750},
    {lambda:550, x:0.433450, y:0.995000, z:0.005750},
    {lambda:555, x:0.512050, y:1.000000, z:0.003900},
    {lambda:560, x:0.594500, y:0.995000, z:0.002750},
    {lambda:565, x:0.678400, y:0.978600, z:0.002100},
    {lambda:570, x:0.762100, y:0.952000, z:0.001800},
    {lambda:575, x:0.842500, y:0.915400, z:0.001650},
    {lambda:580, x:0.916300, y:0.870000, z:0.001400},
    {lambda:585, x:0.978600, y:0.816300, z:0.001100},
    {lambda:590, x:1.026300, y:0.757000, z:0.001000},
    {lambda:595, x:1.056700, y:0.694900, z:0.000800},
    {lambda:600, x:1.062200, y:0.631000, z:0.000340},
    {lambda:605, x:1.045600, y:0.566800, z:0.000240},
    {lambda:610, x:1.002600, y:0.503000, z:0.000190},
    {lambda:615, x:0.938400, y:0.441200, z:0.000100},
    {lambda:620, x:0.854450, y:0.381000, z:0.000050},
    {lambda:625, x:0.751400, y:0.321000, z:0.000030},
    {lambda:630, x:0.642400, y:0.265000, z:0.000020},
    {lambda:635, x:0.541900, y:0.217000, z:0.000010},
    {lambda:640, x:0.447900, y:0.175000, z:0.000000},
    {lambda:645, x:0.360800, y:0.138200, z:0.000000},
    {lambda:650, x:0.283500, y:0.107000, z:0.000000},
    {lambda:655, x:0.218700, y:0.081600, z:0.000000},
    {lambda:660, x:0.164900, y:0.061000, z:0.000000},
    {lambda:665, x:0.121200, y:0.044580, z:0.000000},
    {lambda:670, x:0.087400, y:0.032000, z:0.000000},
    {lambda:675, x:0.063600, y:0.023200, z:0.000000},
    {lambda:680, x:0.046770, y:0.017000, z:0.000000},
    {lambda:685, x:0.032900, y:0.011920, z:0.000000},
    {lambda:690, x:0.022700, y:0.008210, z:0.000000},
    {lambda:695, x:0.015840, y:0.005723, z:0.000000},
    {lambda:700, x:0.011359, y:0.004102, z:0.000000},
    {lambda:705, x:0.008111, y:0.002929, z:0.000000},
    {lambda:710, x:0.005790, y:0.002091, z:0.000000},
    {lambda:715, x:0.004109, y:0.001484, z:0.000000},
    {lambda:720, x:0.002899, y:0.001047, z:0.000000},
    {lambda:725, x:0.002049, y:0.000740, z:0.000000},
    {lambda:730, x:0.001440, y:0.000520, z:0.000000},
    {lambda:735, x:0.001000, y:0.000361, z:0.000000},
    {lambda:740, x:0.000690, y:0.000249, z:0.000000},
    {lambda:745, x:0.000476, y:0.000172, z:0.000000},
    {lambda:750, x:0.000332, y:0.000120, z:0.000000},
    {lambda:755, x:0.000235, y:0.000085, z:0.000000},
    {lambda:760, x:0.000166, y:0.000060, z:0.000000},
    {lambda:765, x:0.000117, y:0.000042, z:0.000000},
    {lambda:770, x:0.000083, y:0.000030, z:0.000000},
    {lambda:775, x:0.000059, y:0.000021, z:0.000000},
    {lambda:780, x:0.000042, y:0.000015, z:0.000000}
];

// 判断点是否在CIE 1931色品图horseshoe边界内（使用光线投射算法）
function isInsideHorseshoe(x, y) {
    // horseshoe 形状：光谱轨迹（380-780nm） + 紫线（780->380）
    // 找到 y 坐标对应范围内的光谱轨迹边界

    // 快速排除明显在外部的点
    if (x < 0 || x > 0.8 || y < 0 || y > 0.9) return false;

    const spectralLocus = getCIESpectralLocus();
    const n = spectralLocus.length;

    // 光谱轨迹的 x,y 数组
    const polyX = spectralLocus.map(p => p.x);
    const polyY = spectralLocus.map(p => p.y);

    // 添加紫线段（从最后一个点回到第一个点）
    const allX = [...polyX, polyX[0]];
    const allY = [...polyY, polyY[0]];

    // 光线投射算法：水平射线向右
    let crossings = 0;
    for (let i = 0; i < allX.length - 1; i++) {
        const x1 = allX[i], y1 = allY[i];
        const x2 = allX[i + 1], y2 = allY[i + 1];

        // 如果线段与水平线相交
        if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
            const intersectX = x1 + (y - y1) * (x2 - x1) / (y2 - y1);
            if (x < intersectX) {
                crossings++;
            }
        }
    }

    return crossings % 2 === 1;
}

// 验证XYZ输入是否有效（非负且位于人眼可见色域内）
function validateXYZInput(X, Y, Z) {
    // 检查XYZ是否为负值
    if (X < 0 || Y < 0 || Z < 0) {
        return { valid: false, error: 'XYZ值不能为负数' };
    }

    // 计算色品坐标
    const sum = X + Y + Z;
    if (sum === 0) {
        return { valid: false, error: 'XYZ值不能同时为零' };
    }

    const cx = X / sum;
    const cy = Y / sum;

    // 检查点是否在色品图马蹄形内（人眼可见范围）
    if (!isInsideHorseshoe(cx, cy)) {
        return { valid: false, error: '该XYZ值对应颜色不在人眼可见色域内（位于CIE马蹄形之外）' };
    }

    return { valid: true };
}

// 绘制色品图填充 - CIE 1931 标准：像素级 xy→XYZ→sRGB 转换
function drawChromaticityFill(ctx, spectralLocus, xToCanvas, yToCanvas) {
    if (spectralLocus.length < 2) return;

    ctx.save();

    const canvas = ctx.canvas;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // 坐标范围（标准 CIE 1931 色品图范围）
    const xMin = 0, xMax = 0.8;
    const yMin = 0, yMax = 0.9;
    const padding = 80;
    const plotWidth = canvasWidth - 2 * padding;
    const plotHeight = canvasHeight - 2 * padding;

    // 使用 ImageData 批量写入像素（高性能）
    const imageData = ctx.createImageData(canvasWidth, canvasHeight);
    const data = imageData.data;

    // 遍历每个像素
    for (let py = 0; py < canvasHeight; py++) {
        for (let px = 0; px < canvasWidth; px++) {
            // 坐标转换：像素 → CIE xy 色品坐标
            const cx = xMin + (px - padding) * (xMax - xMin) / plotWidth;
            const cy = yMin + (canvasHeight - py - padding) * (yMax - yMin) / plotHeight;

            // 边界范围检查
            if (cx < 0 || cx > 0.8 || cy < 0 || cy > 0.9) continue;

            // 快速判断是否在 horseshoe 马蹄形区域内
            if (!isInsideHorseshoe(cx, cy)) continue;

            // CIE xy → XYZ 转换
            // 色品坐标公式：x = X/(X+Y+Z), y = Y/(X+Y+Z)
            // 设 Y = 1，则 X = x/y, Z = (1-x-y)/y
            if (cy < 0.0001) continue;
            let X = cx / cy;
            let Y = 1.0;
            let Z = (1 - cx - cy) / cy;

            // 归一化 XYZ，避免转换时数值过大（光谱区域 X,Y,Z 可能差异巨大）
            const maxXYZ = Math.max(X, Y, Z);
            if (maxXYZ > 0) {
                X /= maxXYZ;
                Y /= maxXYZ;
                Z /= maxXYZ;
            }

            // XYZ → 线性 sRGB (D65 白点，标准转换矩阵)
            let rLin = X * 3.2404542 + Y * -1.5371385 + Z * -0.4985314;
            let gLin = X * -0.9692660 + Y * 1.8760108 + Z * 0.0415560;
            let bLin = X * 0.0556434 + Y * -0.2040259 + Z * 1.0572252;

            // 色域裁剪：截断负值（光谱色域外的标准处理）
            rLin = Math.max(0, Math.min(1, rLin));
            gLin = Math.max(0, Math.min(1, gLin));
            bLin = Math.max(0, Math.min(1, bLin));

            // sRGB 伽马校正
            const gammaCorrect = (c) => {
                return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
            };
            let r = gammaCorrect(rLin);
            let g = gammaCorrect(gLin);
            let b = gammaCorrect(bLin);

            // 最终限制在 0-1 并写入像素
            const idx = (py * canvasWidth + px) * 4;
            data[idx]     = Math.round(Math.max(0, Math.min(1, r)) * 255);
            data[idx + 1] = Math.round(Math.max(0, Math.min(1, g)) * 255);
            data[idx + 2] = Math.round(Math.max(0, Math.min(1, b)) * 255);
            data[idx + 3] = 255;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    ctx.restore();
}

// 通过线性插值从CIE 1931 CMF获取任意波长的xyz值
function getCIEXYZAtLambda(lambda) {
    if (lambda <= 380) return { x: CIE1931_CMF[0].x, y: CIE1931_CMF[0].y, z: CIE1931_CMF[0].z };
    if (lambda >= 780) return { x: CIE1931_CMF[CIE1931_CMF.length - 1].x, y: CIE1931_CMF[CIE1931_CMF.length - 1].y, z: CIE1931_CMF[CIE1931_CMF.length - 1].z };

    // 在查找表中进行线性插值
    for (let i = 0; i < CIE1931_CMF.length - 1; i++) {
        if (lambda >= CIE1931_CMF[i].lambda && lambda <= CIE1931_CMF[i + 1].lambda) {
            const t = (lambda - CIE1931_CMF[i].lambda) / (CIE1931_CMF[i + 1].lambda - CIE1931_CMF[i].lambda);
            return {
                x: CIE1931_CMF[i].x + t * (CIE1931_CMF[i + 1].x - CIE1931_CMF[i].x),
                y: CIE1931_CMF[i].y + t * (CIE1931_CMF[i + 1].y - CIE1931_CMF[i].y),
                z: CIE1931_CMF[i].z + t * (CIE1931_CMF[i + 1].z - CIE1931_CMF[i].z)
            };
        }
    }
    return { x: 0, y: 0, z: 0 };
}

// CIE xy -> XYZ 转换
function xyYToXYZ(x, y, Y) {
    if (y === 0) return { X: 0, Y: 0, Z: 0 };
    return {
        X: Y * x / y,
        Y: Y,
        Z: Y * (1 - x - y) / y
    };
}

// XYZ -> sRGB 精确转换（带伽马校正）
function xyzToSRGB_gamma(X, Y, Z) {
    // 归一化到 0-1 范围（假设 Y 最大为 1.0）
    const xn = 95.047, yn = 100.000, zn = 108.883; // D65 白点
    let r = X * 3.2404542 + Y * -1.5371385 + Z * -0.4985314;
    let g = X * -0.9692660 + Y * 1.8760108 + Z * 0.0415560;
    let b = X * 0.0556434 + Y * -0.2040259 + Z * 1.0572252;

    // 伽马校正 sRGB
    const gammaCorrect = (c) => {
        if (c <= 0.0031308) return 12.92 * c;
        return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    };
    r = gammaCorrect(r);
    g = gammaCorrect(g);
    b = gammaCorrect(b);

    return {
        r: Math.max(0, Math.min(1, r)),
        g: Math.max(0, Math.min(1, g)),
        b: Math.max(0, Math.min(1, b))
    };
}

// 通过色品坐标 (x,y) 计算对应的RGB颜色（CIE 1931标准）
function chromaticityToRGB(x, y) {
    // 设定一个固定的亮度 Y=0.5 以便计算颜色
    const xyz = xyYToXYZ(x, y, 0.5);
    const srgb = xyzToSRGB_gamma(xyz.X, xyz.Y, xyz.Z);

    return {
        r: Math.round(srgb.r * 255),
        g: Math.round(srgb.g * 255),
        b: Math.round(srgb.b * 255)
    };
}

// 波长转RGB函数
function wavelengthToRGB(lambda) {
    let r, g, b;

    if (lambda >= 380 && lambda < 440) {
        r = -(lambda - 440) / (440 - 380);
        g = 0;
        b = 1;
    } else if (lambda >= 440 && lambda < 490) {
        r = 0;
        g = (lambda - 440) / (490 - 440);
        b = 1;
    } else if (lambda >= 490 && lambda < 510) {
        r = 0;
        g = 1;
        b = -(lambda - 510) / (510 - 490);
    } else if (lambda >= 510 && lambda < 580) {
        r = (lambda - 510) / (580 - 510);
        g = 1;
        b = 0;
    } else if (lambda >= 580 && lambda < 645) {
        r = 1;
        g = -(lambda - 645) / (645 - 580);
        b = 0;
    } else if (lambda >= 645 && lambda <= 700) {
        r = 1;
        g = 0;
        b = 0;
    } else {
        r = 0;
        g = 0;
        b = 0;
    }

    // 强度调整（边缘处减弱）
    let intensity = 1;
    if (lambda >= 380 && lambda < 420) {
        intensity = 0.3 + 0.7 * (lambda - 380) / (420 - 380);
    } else if (lambda >= 645 && lambda <= 700) {
        intensity = 0.3 + 0.7 * (700 - lambda) / (700 - 645);
    }

    return {
        r: Math.round(255 * Math.pow(r * intensity, 0.8)),
        g: Math.round(255 * Math.pow(g * intensity, 0.8)),
        b: Math.round(255 * Math.pow(b * intensity, 0.8))
    };
}

function drawChromaticityDiagram() {
    const canvas = document.getElementById('chromaticityCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 80;
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // 坐标转换函数
    const xMin = 0;
    const xMax = 0.8;
    const yMin = 0;
    const yMax = 0.9;
    const xRange = xMax - xMin;
    const yRange = yMax - yMin;
    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;
    
    const xToCanvas = (x) => padding + ((x - xMin) / xRange) * plotWidth;
    const yToCanvas = (y) => height - padding - ((y - yMin) / yRange) * plotHeight;

    // 绘制CIE 1931光谱轨迹填色（在绘制轮廓线之前）
    const spectralLocus = getCIESpectralLocus();
    drawChromaticityFill(ctx, spectralLocus, xToCanvas, yToCanvas);

    // 绘制CIE 1931光谱轨迹（使用Catmull-Rom样条插值平滑曲线）
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    // 使用Catmull-Rom样条绘制平滑曲线
    drawSmoothCurve(ctx, spectralLocus, xToCanvas, yToCanvas);
    
    // 连接首尾（紫色边界线）
    if (spectralLocus.length > 0) {
        ctx.beginPath();
        ctx.moveTo(xToCanvas(spectralLocus[0].x), yToCanvas(spectralLocus[0].y));
        ctx.lineTo(xToCanvas(spectralLocus[spectralLocus.length - 1].x),
                   yToCanvas(spectralLocus[spectralLocus.length - 1].y));
        ctx.stroke();
    }
    
    // 绘制坐标轴
    drawAxes(ctx, width, height, padding, xToCanvas, yToCanvas);
    
    // 绘制样品数据点（不连线）
    if (sampleData.length > 0) {
        drawSampleData(ctx, xToCanvas, yToCanvas);
    }

    // 绘制手动输入的样品色块（样品1、2、3）
    drawManualSampleBlocks(ctx, xToCanvas, yToCanvas);
}

function getCIESpectralLocus() {
    // CIE 1931标准观察者数据（关键点）
    return [
        
        { lambda: 380, x: 0.1741, y: 0.0050 },
        { lambda: 385, x: 0.1740, y: 0.0050 },
        { lambda: 390, x: 0.1738, y: 0.0049 },
        { lambda: 395, x: 0.1736, y: 0.0049 },
        { lambda: 400, x: 0.1733, y: 0.0048 },
        { lambda: 405, x: 0.1730, y: 0.0048 },
        { lambda: 410, x: 0.1726, y: 0.0048 },
        { lambda: 415, x: 0.1721, y: 0.0048 },
        { lambda: 420, x: 0.1714, y: 0.0051 },
        { lambda: 425, x: 0.1703, y: 0.0058 },
        { lambda: 430, x: 0.1689, y: 0.0069 },
        { lambda: 435, x: 0.1669, y: 0.0086 },
        { lambda: 440, x: 0.1644, y: 0.0109 },
        { lambda: 445, x: 0.1611, y: 0.0138 },
        { lambda: 450, x: 0.1566, y: 0.0177 },
        { lambda: 455, x: 0.1510, y: 0.0227 },
        { lambda: 460, x: 0.1440, y: 0.0297 },
        { lambda: 465, x: 0.1355, y: 0.0399 },
        { lambda: 470, x: 0.1241, y: 0.0578 },
        { lambda: 475, x: 0.1096, y: 0.0868 },
        { lambda: 480, x: 0.0913, y: 0.1327 },
        { lambda: 485, x: 0.0687, y: 0.2007 },
        { lambda: 490, x: 0.0454, y: 0.2950 },
        { lambda: 495, x: 0.0235, y: 0.4127 },
        { lambda: 500, x: 0.0082, y: 0.5384 },
        { lambda: 505, x: 0.0039, y: 0.6548 },
        { lambda: 510, x: 0.0139, y: 0.7502 },
        { lambda: 515, x: 0.0389, y: 0.8120 },
        { lambda: 520, x: 0.0743, y: 0.8338 },
        { lambda: 525, x: 0.1142, y: 0.8262 },
        { lambda: 530, x: 0.1547, y: 0.8059 },
        { lambda: 535, x: 0.1929, y: 0.7816 },
        { lambda: 540, x: 0.2296, y: 0.7543 },
        { lambda: 545, x: 0.2658, y: 0.7243 },
        { lambda: 550, x: 0.3016, y: 0.6923 },
        { lambda: 555, x: 0.3373, y: 0.6589 },
        { lambda: 560, x: 0.3731, y: 0.6245 },
        { lambda: 565, x: 0.4087, y: 0.5896 },
        { lambda: 570, x: 0.4441, y: 0.5547 },
        { lambda: 575, x: 0.4788, y: 0.5202 },
        { lambda: 580, x: 0.5125, y: 0.4866 },
        { lambda: 585, x: 0.5448, y: 0.4544 },
        { lambda: 590, x: 0.5752, y: 0.4242 },
        { lambda: 595, x: 0.6029, y: 0.3965 },
        { lambda: 600, x: 0.6270, y: 0.3725 },
        { lambda: 605, x: 0.6482, y: 0.3514 },
        { lambda: 610, x: 0.6658, y: 0.3340 },
        { lambda: 615, x: 0.6801, y: 0.3197 },
        { lambda: 620, x: 0.6915, y: 0.3083 },
        { lambda: 625, x: 0.7006, y: 0.2993 },
        { lambda: 630, x: 0.7079, y: 0.2920 },
        { lambda: 635, x: 0.7140, y: 0.2859 },
        { lambda: 640, x: 0.7219, y: 0.2809 },
        { lambda: 645, x: 0.7230, y: 0.2770 },
        { lambda: 650, x: 0.7260, y: 0.2740 },
        { lambda: 655, x: 0.7283, y: 0.2717 },
        { lambda: 660, x: 0.7300, y: 0.2700 },
        { lambda: 665, x: 0.7311, y: 0.2689 },
        { lambda: 670, x: 0.7320, y: 0.2680 },
        { lambda: 675, x: 0.7327, y: 0.2673 },
        { lambda: 680, x: 0.7334, y: 0.2666 },
        { lambda: 685, x: 0.7340, y: 0.2660 },
        { lambda: 690, x: 0.7344, y: 0.2656 },
        { lambda: 695, x: 0.7346, y: 0.2654 },
        { lambda: 700, x: 0.7347, y: 0.2653 },
        { lambda: 705, x: 0.7340, y: 0.2660 },
        { lambda: 710, x: 0.7334, y: 0.2666 },
        { lambda: 715, x: 0.7327, y: 0.2673 },
        { lambda: 720, x: 0.7320, y: 0.2680 },
        { lambda: 725, x: 0.7311, y: 0.2689 },
        { lambda: 730, x: 0.7300, y: 0.2700 },
        { lambda: 735, x: 0.7283, y: 0.2717 },
        { lambda: 740, x: 0.7260, y: 0.2740 },
        { lambda: 745, x: 0.7230, y: 0.2770 },
        { lambda: 750, x: 0.7219, y: 0.2809 },
        { lambda: 755, x: 0.7140, y: 0.2859 },
        { lambda: 760, x: 0.7079, y: 0.2920 },
        { lambda: 765, x: 0.7006, y: 0.2993 },
        { lambda: 770, x: 0.6915, y: 0.3083 },
        { lambda: 780, x: 0.7347, y: 0.2653 }
    ];
}

function drawAxes(ctx, width, height, padding, xToCanvas, yToCanvas) {
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    
    // X轴
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Y轴
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(padding, padding);
    ctx.stroke();
    
    // 刻度
    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    
    for (let i = 0; i <= 8; i++) {
        const xVal = i * 0.1;
        const cx = xToCanvas(xVal);
        ctx.beginPath();
        ctx.moveTo(cx, height - padding - 5);
        ctx.lineTo(cx, height - padding + 5);
        ctx.stroke();
        ctx.fillText(xVal.toFixed(1), cx, height - padding + 20);
    }
    
    ctx.textAlign = 'right';
    for (let i = 0; i <= 9; i++) {
        const yVal = i * 0.1;
        const cy = yToCanvas(yVal);
        ctx.beginPath();
        ctx.moveTo(padding - 5, cy);
        ctx.lineTo(padding + 5, cy);
        ctx.stroke();
        ctx.fillText(yVal.toFixed(1), padding - 10, cy + 4);
    }
    
    // 轴标签
    ctx.textAlign = 'center';
    ctx.fillText('x', width / 2, height - padding / 2);
    ctx.save();
    ctx.translate(padding / 2, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('y', 0, 0);
    ctx.restore();
}

// 绘制手动输入的样品色块
function drawManualSampleBlocks(ctx, xToCanvas, yToCanvas) {
    ctx.save();

    manualSamples.forEach((sample, idx) => {
        if (sample.X === '' || sample.Y === '' || sample.Z === '') return;

        const X = parseFloat(sample.X);
        const Y = parseFloat(sample.Y);
        const Z = parseFloat(sample.Z);
        if (isNaN(X) || isNaN(Y) || isNaN(Z)) return;

        const xn = 95.047, yn = 100.0, zn = 108.883;
        let sumXYZ = X + Y + Z;
        if (sumXYZ === 0) return;

        const cx = X / sumXYZ;
        const cy = Y / sumXYZ;

        const px = xToCanvas(cx);
        const py = yToCanvas(cy);

        // 检查是否为不可见色（人眼不可见）
        if (!isInsideHorseshoe(cx, cy)) {
            // 用红色X标记不可见色
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(px - 8, py - 8);
            ctx.lineTo(px + 8, py + 8);
            ctx.moveTo(px + 8, py - 8);
            ctx.lineTo(px - 8, py + 8);
            ctx.stroke();

            // 红色圆圈标记
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.stroke();

            // 标注名称（红色）
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(sample.name + '(不可见)', px, py - 18);
            return;
        }

        const sRGB = xyzToSRGB_gamma(X, Y, Z);
        if (!sRGB) return;

        const { r, g, b } = sRGB;
        const rgbStr = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
        sample.color = rgbStr;

        ctx.fillStyle = rgbStr;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#333';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sample.name, px, py - 18);
    });

    ctx.restore();
}

// 更新手动输入样品的色块显示
function updateManualSampleColorBlocks() {
    const container = document.getElementById('manualSampleColorBlocks');
    if (!container) return;

    container.innerHTML = '';

    manualSamples.forEach((sample, idx) => {
        const div = document.createElement('div');
        div.style.display = 'inline-block';
        div.style.textAlign = 'center';
        div.style.margin = '10px';

        const block = document.createElement('div');
        block.id = `sampleBlock${idx + 1}`;
        block.style.width = '80px';
        block.style.height = '80px';
        block.style.border = '2px solid #333';
        block.style.borderRadius = '8px';
        block.style.background = sample.color || '#f0f0f0';
        block.style.marginBottom = '5px';

        const label = document.createElement('div');
        label.style.fontWeight = '600';
        label.style.fontSize = '0.9em';
        label.textContent = sample.name;

        div.appendChild(block);
        div.appendChild(label);
        container.appendChild(div);
    });
}

// 当XYZ输入变化时更新色块
function onManualSampleXYZChange() {
    manualSamples.forEach((sample, idx) => {
        const XInput = document.getElementById(`sample${idx + 1}X`);
        const YInput = document.getElementById(`sample${idx + 1}Y`);
        const ZInput = document.getElementById(`sample${idx + 1}Z`);
        const block = document.getElementById(`sampleBlock${idx + 1}`);
        const errorSpan = document.getElementById(`sample${idx + 1}XYZError`);

        const X = XInput.value;
        const Y = YInput.value;
        const Z = ZInput.value;

        sample.X = X;
        sample.Y = Y;
        sample.Z = Z;

        // 重置输入框样式
        XInput.style.borderColor = '#ddd';
        YInput.style.borderColor = '#ddd';
        ZInput.style.borderColor = '#ddd';
        if (errorSpan) {
            errorSpan.style.display = 'none';
            errorSpan.textContent = '';
        }

        // 如果输入为空，跳过验证
        if (X === '' || Y === '' || Z === '') {
            sample.color = null;
            sample.visible = false;
            block.style.background = '#f0f0f0';
            block.style.borderColor = '#333';
            return;
        }

        const XVal = parseFloat(X);
        const YVal = parseFloat(Y);
        const ZVal = parseFloat(Z);

        // 检查是否为有效数字
        if (isNaN(XVal) || isNaN(YVal) || isNaN(ZVal)) {
            XInput.style.borderColor = '#ff0000';
            YInput.style.borderColor = '#ff0000';
            ZInput.style.borderColor = '#ff0000';
            sample.color = null;
            sample.visible = false;
            block.style.background = '#f0f0f0';
            block.style.borderColor = '#ff0000';
            if (errorSpan) {
                errorSpan.textContent = '请输入有效数字';
                errorSpan.style.display = 'block';
            }
            return;
        }

        // 验证XYZ
        const validation = validateXYZInput(XVal, YVal, ZVal);

        if (!validation.valid) {
            // 标红输入框并显示错误
            XInput.style.borderColor = '#ff0000';
            YInput.style.borderColor = '#ff0000';
            ZInput.style.borderColor = '#ff0000';
            sample.visible = false;
            sample.color = null;
            block.style.background = '#f0f0f0';
            block.style.borderColor = '#ff0000';

            // 显示错误提示
            if (errorSpan) {
                errorSpan.textContent = validation.error;
                errorSpan.style.display = 'block';
            }
            alert(validation.error);
        } else {
            // 有效输入，更新颜色
            sample.visible = true;

            const rgb = xyzToSRGB_gamma(XVal, YVal, ZVal);
            if (rgb) {
                sample.color = `rgb(${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)})`;
                block.style.background = sample.color;
                block.style.borderColor = '#333';
            }
        }
    });

    if (typeof drawChromaticityDiagram === 'function') {
        drawChromaticityDiagram();
    }
}

function drawSampleData(ctx, xToCanvas, yToCanvas) {
    if (sampleData.length === 0) return;

    const xData = sampleData.map(p => p.x);
    const yData = sampleData.map(p => p.y);

    // 计算分析数据
    const analysisData = calculateTrajectoryAnalysis(xData, yData);

    // 绘制分析线条
    drawAnalysisLines(ctx, xToCanvas, yToCanvas, xData, yData, analysisData);

    // 只绘制数据点，不连线
    sampleData.forEach((point, idx) => {
        const cx = xToCanvas(point.x);
        const cy = yToCanvas(point.y);
        
        ctx.fillStyle = '#ff0000';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // 标注样品名称
        if (sampleData.length <= 50) {
            ctx.fillStyle = '#333';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'left';
            const label = point.name || `P${idx + 1}`;
            ctx.fillText(label, cx + 8, cy + 4);
        }
    });

    // 高亮被选中的点
    if (selectedChromaticityIndex !== null && sampleData[selectedChromaticityIndex]) {
        const point = sampleData[selectedChromaticityIndex];
        const cx = xToCanvas(point.x);
        const cy = yToCanvas(point.y);
        ctx.strokeStyle = '#ff6b9d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function calculateTrajectoryAnalysis(xData, yData) {
    const n = xData.length;
    if (n < 2) return null;
    
    const sumX = xData.reduce((a, b) => a + b, 0);
    const sumY = yData.reduce((a, b) => a + b, 0);
    const sumXY = xData.reduce((sum, x, i) => sum + x * yData[i], 0);
    const sumX2 = xData.reduce((sum, x) => sum + x * x, 0);
    
    // 线性拟合
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // 计算R²
    const yMean = sumY / n;
    const ssRes = xData.reduce((sum, x, i) => {
        const yPred = slope * x + intercept;
        return sum + Math.pow(yData[i] - yPred, 2);
    }, 0);
    const ssTot = yData.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;
    
    // 色品中心
    const centerX = 0.33;
    const centerY = 0.33;
    
    // 计算起点到终点的距离（判断是否有明确方向）
    const startToEndDistance = Math.sqrt(
        Math.pow(xData[xData.length - 1] - xData[0], 2) + 
        Math.pow(yData[yData.length - 1] - yData[0], 2)
    );
    
    // 标准差
    const meanX = sumX / n;
    const meanY = sumY / n;
    const stdX = Math.sqrt(xData.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0) / n);
    const stdY = Math.sqrt(yData.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0) / n);
    const maxStd = Math.max(stdX, stdY);
    
    // 判断1: 接近直线且朝向某一色品坐标
    // 条件：R² > 0.92 且 起点到终点距离 > 0.01（有明确方向）
    const isLinear = rSquared > 0.92 && startToEndDistance > 0.01;
    
    // 判断2: 围绕基准坐标小幅度波动
    // 条件：标准差小（maxStd < 0.015）且 不是直线
    const isStable = maxStd < 0.015 && !isLinear;
    
    return {
        isLinear: isLinear,
        isCurvedAwayFromCenter: false,
        slope: slope,
        intercept: intercept,
        rSquared: rSquared,
        centerX: centerX,
        centerY: centerY,
        isStable: isStable,
        meanX: meanX,
        meanY: meanY,
        stdX: stdX,
        stdY: stdY,
        targetX: xData[xData.length - 1],
        targetY: yData[yData.length - 1],
        startToEndDistance: startToEndDistance
    };
}

function drawAnalysisLines(ctx, xToCanvas, yToCanvas, xData, yData, analysisData) {
    if (!analysisData) return;
    
    // 1. 如果接近直线，绘制拟合直线并标注方向
    if (analysisData.isLinear) {
        // 计算直线的起点和终点（扩展范围）
        const xMin = Math.min(...xData);
        const xMax = Math.max(...xData);
        const xRange = xMax - xMin;
        const xStart = Math.max(0, xMin - xRange * 0.2);
        const xEnd = Math.min(0.8, xMax + xRange * 0.2);
        
        const yStart = analysisData.slope * xStart + analysisData.intercept;
        const yEnd = analysisData.slope * xEnd + analysisData.intercept;
        
        // 绘制拟合直线
        ctx.strokeStyle = '#ff6b9d';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(xToCanvas(xStart), yToCanvas(yStart));
        ctx.lineTo(xToCanvas(xEnd), yToCanvas(yEnd));
        ctx.stroke();
        ctx.setLineDash([]);
        
        // 绘制方向箭头（指向目标坐标）
        const targetCx = xToCanvas(analysisData.targetX);
        const targetCy = yToCanvas(analysisData.targetY);
        const dx = xData[xData.length - 1] - xData[0];
        const dy = yData[yData.length - 1] - yData[0];
        const angle = Math.atan2(dy, dx);
        
        // 绘制箭头
        ctx.strokeStyle = '#ff6b9d';
        ctx.fillStyle = '#ff6b9d';
        ctx.lineWidth = 2;
        const arrowLength = 20;
        const arrowAngle = Math.PI / 6;
        
        ctx.beginPath();
        ctx.moveTo(targetCx, targetCy);
        ctx.lineTo(
            targetCx - arrowLength * Math.cos(angle - arrowAngle),
            targetCy + arrowLength * Math.sin(angle - arrowAngle)
        );
        ctx.moveTo(targetCx, targetCy);
        ctx.lineTo(
            targetCx - arrowLength * Math.cos(angle + arrowAngle),
            targetCy + arrowLength * Math.sin(angle + arrowAngle)
        );
        ctx.stroke();
        
        // 标注目标坐标
        ctx.fillStyle = '#ff6b9d';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`目标: (${analysisData.targetX.toFixed(3)}, ${analysisData.targetY.toFixed(3)})`, 
                     targetCx + 10, targetCy - 5);
    }
    
    // 2. 如果曲线且远离色品中心，绘制从中心到数据点的距离线和趋势
    if (analysisData.isCurvedAwayFromCenter) {
        const centerCx = xToCanvas(analysisData.centerX);
        const centerCy = yToCanvas(analysisData.centerY);
        
        // 绘制中心点
        ctx.fillStyle = '#999';
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerCx, centerCy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // 标注"色品中心"
        ctx.fillStyle = '#666';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('色品中心', centerCx, centerCy - 10);
        
        // 绘制从中心到起点和终点的距离线
        const firstCx = xToCanvas(xData[0]);
        const firstCy = yToCanvas(yData[0]);
        const lastCx = xToCanvas(xData[xData.length - 1]);
        const lastCy = yToCanvas(yData[yData.length - 1]);
        
        // 起点距离线（浅色）
        ctx.strokeStyle = '#ffcc80';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(centerCx, centerCy);
        ctx.lineTo(firstCx, firstCy);
        ctx.stroke();
        
        // 终点距离线（深色，表示远离）
        ctx.strokeStyle = '#ff9800';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerCx, centerCy);
        ctx.lineTo(lastCx, lastCy);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // 标注距离变化
        const initialDistance = Math.sqrt(Math.pow(xData[0] - analysisData.centerX, 2) + 
                                         Math.pow(yData[0] - analysisData.centerY, 2));
        const finalDistance = Math.sqrt(Math.pow(xData[xData.length - 1] - analysisData.centerX, 2) + 
                                        Math.pow(yData[yData.length - 1] - analysisData.centerY, 2));
        ctx.fillStyle = '#ff9800';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`距离变化: ${initialDistance.toFixed(3)} → ${finalDistance.toFixed(3)}`, 
                     lastCx + 10, lastCy);
    }
}

function handleExcelFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        alert('不支持的文件格式，请上传 .xlsx 或 .xls 格式的Excel文件');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onerror = function() {
        alert('读取文件失败，请检查文件是否损坏');
    };
    
    reader.onload = function(e) {
        try {
            if (!e.target || !e.target.result) {
                throw new Error('文件读取结果为空');
            }
            
            const data = new Uint8Array(e.target.result);
            if (data.length === 0) {
                throw new Error('文件内容为空');
            }
            
            const workbook = XLSX.read(data, { type: 'array' });
            
            if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('Excel文件中没有工作表');
            }
            
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            if (!firstSheet) {
                throw new Error('无法读取第一个工作表');
            }
            
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null });
            
            if (!jsonData || !Array.isArray(jsonData)) {
                throw new Error('Excel数据转换失败');
            }
            
            parseExcelData(jsonData);
        } catch (error) {
            console.error('Excel读取错误:', error);
            alert('读取Excel文件失败: ' + (error.message || '未知错误'));
        }
    };
    
    reader.readAsArrayBuffer(file);
}

function parseExcelData(jsonData) {
    // 检查数据有效性
    if (!jsonData || !Array.isArray(jsonData) || jsonData.length < 1) {
        alert('Excel数据格式错误：数据为空或格式不正确');
        return;
    }
    
    // 检查第一行是否存在且为数组
    if (!jsonData[0] || !Array.isArray(jsonData[0])) {
        alert('Excel数据格式错误：第一行数据无效');
        return;
    }
    
    // 解析表头
    const headerRow = jsonData[0].map(cell => {
        if (cell === null || cell === undefined) return '';
        return String(cell).toLowerCase().trim();
    });
    
    // 查找X、Y、Z列（XYZ三刺激值格式）
    let XIndex = -1, YIndex = -1, ZIndex = -1;
    // 查找x、y列（直接色品坐标格式）
    let xIndex = -1, yIndex = -1;
    // 查找样品名列
    let nameIndex = -1;
    
    for (let i = 0; i < headerRow.length; i++) {
        const cellValue = headerRow[i];
        if (!cellValue || typeof cellValue !== 'string') continue;
        
        // 匹配样品名/名称列
        if (nameIndex === -1 && (cellValue.includes('样品') || cellValue.includes('名称') || cellValue.includes('name'))) {
            nameIndex = i;
        }
        
        // 匹配XYZ大写列（三刺激值）
        if (XIndex === -1 && cellValue === 'x') {
            XIndex = i;
        } else if (YIndex === -1 && cellValue === 'y') {
            YIndex = i;
        } else if (ZIndex === -1 && cellValue === 'z') {
            ZIndex = i;
        }
        
        // 匹配xy小写列（色品坐标）- 只有当不是XYZ时才匹配
        if (xIndex === -1 && cellValue.includes('x') && cellValue !== 'x' && !cellValue.includes('样品')) {
            xIndex = i;
        }
        if (yIndex === -1 && cellValue.includes('y') && cellValue !== 'y' && cellValue !== 'xyz' && !cellValue.includes('样品')) {
            yIndex = i;
        }
    }
    
    // 判断数据格式：XYZ三刺激值 或 xy色品坐标
    const isXYZFormat = (XIndex !== -1 && YIndex !== -1 && ZIndex !== -1);
    const isxyFormat = (xIndex !== -1 && yIndex !== -1);
    
    // 调试信息
    console.log('表头:', headerRow);
    console.log('XYZ格式:', isXYZFormat, 'X:', XIndex, 'Y:', YIndex, 'Z:', ZIndex);
    console.log('xy格式:', isxyFormat, 'x:', xIndex, 'y:', yIndex);
    console.log('样品名:', nameIndex);
    
    sampleData = [];
    let skipCount = 0;
    let xyzSum = 0;
    
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !Array.isArray(row) || row.length < 2) {
            skipCount++;
            continue;
        }
        
        let x, y;
        
        if (isXYZFormat) {
            // XYZ三刺激值格式：转换为xy色品坐标
            const X = parseFloat(row[XIndex]);
            const Y = parseFloat(row[YIndex]);
            const Z = parseFloat(row[ZIndex]);
            
            if (isNaN(X) || isNaN(Y) || isNaN(Z)) {
                skipCount++;
                continue;
            }
            
            const sum = X + Y + Z;
            if (sum === 0) {
                skipCount++;
                continue;
            }
            
            x = X / sum;
            y = Y / sum;
            xyzSum += sum;
        } else if (isxyFormat) {
            // 直接xy色品坐标格式
            const xVal = parseFloat(row[xIndex]);
            const yVal = parseFloat(row[yIndex]);
            
            if (isNaN(xVal) || isNaN(yVal)) {
                skipCount++;
                continue;
            }
            
            x = xVal;
            y = yVal;
        } else {
            // 没有找到标准列，使用前几列（跳过样品名）
            const startCol = (nameIndex !== -1) ? nameIndex + 1 : 0;
            if (row.length > startCol + 1) {
                const xVal = parseFloat(row[startCol]);
                const yVal = parseFloat(row[startCol + 1]);
                
                if (isNaN(xVal) || isNaN(yVal)) {
                    skipCount++;
                    continue;
                }
                
                x = xVal;
                y = yVal;
                
                // 判断是否为XYZ格式（值较大）或xy格式（值在0-1之间）
                if (x > 1 || y > 1) {
                    // 按XYZ处理
                    const Z = parseFloat(row[startCol + 2]) || 0;
                    const sum = x + y + Z;
                    if (sum > 0) {
                        x = x / sum;
                        y = y / sum;
                    }
                }
            } else {
                skipCount++;
                continue;
            }
        }
        
        // 验证xy坐标有效性
        if (!isNaN(x) && !isNaN(y) && x >= 0 && x <= 1 && y >= 0 && y <= 1) {
            const sampleName = (nameIndex !== -1 && row[nameIndex]) ? String(row[nameIndex]) : `样品${sampleData.length + 1}`;
            sampleData.push({ x, y, name: sampleName });
        } else {
            skipCount++;
        }
    }
    
    console.log('解析完成:', sampleData.length, '个有效数据点');
    console.log('跳过:', skipCount, '行无效数据');
    
    if (sampleData.length === 0) {
        alert('未找到有效的色品坐标数据。\n\n请确保Excel文件包含：\n1. XYZ三刺激值格式（X, Y, Z列），或\n2. xy色品坐标格式（x, y列，范围0-1）');
        return;
    }
    
    drawChromaticityDiagram();
    alert(`成功导入 ${sampleData.length} 个数据点${skipCount > 0 ? `（跳过 ${skipCount} 行无效数据）` : ''}`);
}

function analyzeTrajectory() {
    if (sampleData.length < 2) {
        document.getElementById('trajectoryAnalysis').style.display = 'none';
        return;
    }
    
    const xData = sampleData.map(p => p.x);
    const yData = sampleData.map(p => p.y);
    
    const analysisData = calculateTrajectoryAnalysis(xData, yData);
    if (!analysisData) {
        document.getElementById('trajectoryAnalysis').style.display = 'none';
        return;
    }
    
    let analysis = '<h3 style="margin-bottom: 20px; color: #333;">样品线条轨迹分析结果</h3>';
    analysis += '<div style="display: grid; gap: 15px;">';
    
    // 基础统计信息
    analysis += `<div style="padding: 15px; background: #f9f9f9; border-radius: 4px; border-left: 3px solid #999;">
        <strong style="color: #666;">基础统计</strong><br>
        <span style="font-size: 0.9em;">线性拟合度 (R²): ${analysisData.rSquared.toFixed(4)}</span><br>
        <span style="font-size: 0.9em;">数据点数: ${xData.length}</span>
    </div>`;
    
    // 1. 判断：接近直线且朝向某一色品坐标
    if (analysisData.isLinear) {
        const dx = xData[xData.length - 1] - xData[0];
        const dy = yData[yData.length - 1] - yData[0];
        const direction = Math.atan2(dy, dx) * 180 / Math.PI;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        analysis += `<div style="padding: 15px; background: #fff5f8; border-radius: 4px; border-left: 4px solid #ff6b9d;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 1.2em; margin-right: 8px;">✓</span>
                <strong style="color: #ff6b9d; font-size: 1.1em;">轨迹接近直线，朝向目标色品坐标</strong>
            </div>
            <div style="margin-left: 28px; line-height: 1.8;">
                <div><strong>方向角度:</strong> ${direction.toFixed(2)}°</div>
                <div><strong>目标坐标:</strong> (${analysisData.targetX.toFixed(3)}, ${analysisData.targetY.toFixed(3)})</div>
                <div><strong>移动距离:</strong> ${distance.toFixed(4)}</div>
                <div style="margin-top: 10px; padding: 10px; background: white; border-radius: 4px; color: #ff6b9d; font-weight: 600;">
                    📊 分析结论：该样品的对应色墨用量逐渐增多
                </div>
            </div>
        </div>`;
    }
    
    // 2. 判断：围绕基准坐标小幅度波动
    else if (analysisData.isStable) {
        const maxStd = Math.max(analysisData.stdX, analysisData.stdY);
        
        analysis += `<div style="padding: 15px; background: #f1f8f4; border-radius: 4px; border-left: 4px solid #4caf50;">
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 1.2em; margin-right: 8px;">✓</span>
                <strong style="color: #4caf50; font-size: 1.1em;">轨迹围绕基准坐标小幅度波动</strong>
            </div>
            <div style="margin-left: 28px; line-height: 1.8;">
                <div><strong>基准坐标:</strong> (${analysisData.meanX.toFixed(3)}, ${analysisData.meanY.toFixed(3)})</div>
                <div><strong>X坐标标准差:</strong> ${analysisData.stdX.toFixed(4)}</div>
                <div><strong>Y坐标标准差:</strong> ${analysisData.stdY.toFixed(4)}</div>
                <div><strong>最大波动范围:</strong> ±${maxStd.toFixed(4)}</div>
                <div style="margin-top: 10px; padding: 10px; background: white; border-radius: 4px; color: #4caf50; font-weight: 600;">
                    📊 分析结论：该样品颜色整体稳定
                </div>
            </div>
        </div>`;
    }
    
    // 如果都不符合，显示一般信息
    else {
        analysis += `<div style="padding: 15px; background: #f0f0f0; border-radius: 4px; border-left: 4px solid #999;">
            <div style="margin-bottom: 10px;">
                <strong>轨迹特征分析</strong>
            </div>
            <div style="line-height: 1.8; font-size: 0.95em;">
                <div>线性拟合度: ${analysisData.rSquared.toFixed(4)} ${analysisData.rSquared > 0.85 ? '(接近线性)' : '(非线性)'}</div>
                <div>坐标波动范围: ±${Math.max(analysisData.stdX, analysisData.stdY).toFixed(4)}</div>
                <div style="margin-top: 10px; color: #666; font-style: italic;">
                    轨迹特征不明显，需要更多数据点进行准确分析
                </div>
            </div>
        </div>`;
    }
    
    analysis += '</div>';
    
    document.getElementById('analysisText').innerHTML = analysis;
    document.getElementById('trajectoryAnalysis').style.display = 'block';
}

// 文件拖拽支持
document.addEventListener('DOMContentLoaded', function() {
    // LAB色差计算Excel文件拖拽
    const labExcelUpload = document.getElementById('labExcelUpload');
    if (labExcelUpload) {
        labExcelUpload.addEventListener('dragover', (e) => {
            e.preventDefault();
            labExcelUpload.classList.add('dragover');
        });
        
        labExcelUpload.addEventListener('dragleave', () => {
            labExcelUpload.classList.remove('dragover');
        });
        
        labExcelUpload.addEventListener('drop', (e) => {
            e.preventDefault();
            labExcelUpload.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    try {
                        const data = new Uint8Array(event.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                        parseLABExcelData(jsonData);
                    } catch (error) {
                        alert('读取Excel文件失败: ' + error.message);
                    }
                };
                reader.readAsArrayBuffer(file);
            }
        });
    }
    
    // CIE xy色品图文件拖拽
    const excelUpload = document.getElementById('excelUpload');
    if (excelUpload) {
        excelUpload.addEventListener('dragover', (e) => {
            e.preventDefault();
            excelUpload.classList.add('dragover');
        });
        
        excelUpload.addEventListener('dragleave', () => {
            excelUpload.classList.remove('dragover');
        });
        
        excelUpload.addEventListener('drop', (e) => {
            e.preventDefault();
            excelUpload.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    try {
                        const data = new Uint8Array(event.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                        parseExcelData(jsonData);
                    } catch (error) {
                        alert('读取Excel文件失败: ' + error.message);
                    }
                };
                reader.readAsArrayBuffer(file);
            }
        });
    }
    
    // 光谱反射率文件拖拽
    const spectralUpload = document.getElementById('spectralUpload');
    if (spectralUpload) {
        spectralUpload.addEventListener('dragover', (e) => {
            e.preventDefault();
            spectralUpload.classList.add('dragover');
        });
        
        spectralUpload.addEventListener('dragleave', () => {
            spectralUpload.classList.remove('dragover');
        });
        
        spectralUpload.addEventListener('drop', (e) => {
            e.preventDefault();
            spectralUpload.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                const fakeEvent = { target: { files: [file] } };
                handleSpectralFile(fakeEvent);
            }
        });
    }

    // 色品图交互：点击 & 悬停显示数据
    const chromaCanvas = document.getElementById('chromaticityCanvas');
    if (chromaCanvas) {
        chromaCanvas.addEventListener('click', handleChromaticityClick);
        chromaCanvas.addEventListener('mousemove', handleChromaticityHover);
        chromaCanvas.addEventListener('mouseleave', () => {
           const tooltip = document.getElementById('chromaticityTooltip');
           if (tooltip) tooltip.style.display = 'none';
           if (selectedChromaticityIndex !== null) {
               selectedChromaticityIndex = null;
               drawChromaticityDiagram();
           }
        });
    }
});

// ==================== 色差计算 ====================

function updateColorSwatches() {
    const stdL = parseFloat(document.getElementById('stdL').value);
    const stdA = parseFloat(document.getElementById('stdA').value);
    const stdB = parseFloat(document.getElementById('stdB').value);
    
    const samL = parseFloat(document.getElementById('samL').value);
    const samA = parseFloat(document.getElementById('samA').value);
    const samB = parseFloat(document.getElementById('samB').value);
    
    if (!isNaN(stdL) && !isNaN(stdA) && !isNaN(stdB)) {
        const stdRGB = labToRgb(stdL, stdA, stdB);
        document.getElementById('standardColorSwatch').style.backgroundColor = 
            rgbToHex(stdRGB.r, stdRGB.g, stdRGB.b);
    }
    
    if (!isNaN(samL) && !isNaN(samA) && !isNaN(samB)) {
        const samRGB = labToRgb(samL, samA, samB);
        document.getElementById('sampleColorSwatch').style.backgroundColor = 
            rgbToHex(samRGB.r, samRGB.g, samRGB.b);
    }
}

function calculateColorDifference() {
    const stdL = parseFloat(document.getElementById('stdL').value);
    const stdA = parseFloat(document.getElementById('stdA').value);
    const stdB = parseFloat(document.getElementById('stdB').value);
    
    const samL = parseFloat(document.getElementById('samL').value);
    const samA = parseFloat(document.getElementById('samA').value);
    const samB = parseFloat(document.getElementById('samB').value);
    
    const decmcCoeff = document.getElementById('decmcCoeff').value || '1:1';
    
    if (isNaN(stdL) || isNaN(stdA) || isNaN(stdB) || 
        isNaN(samL) || isNaN(samA) || isNaN(samB)) {
        alert('请输入有效的LAB值');
        return;
    }
    
    // 解析CMC系数
    const cmcParts = decmcCoeff.split(':');
    const cmcL = parseFloat(cmcParts[0]) || 2.0;
    const cmcC = parseFloat(cmcParts[1]) || 1.0;
    
    const deabDelta = calculateDEab(stdL, stdA, stdB, samL, samA, samB);
    const cie94Delta = calculateCIE94(stdL, stdA, stdB, samL, samA, samB);
    const cmcDelta = calculateCMC(stdL, stdA, stdB, samL, samA, samB, cmcL, cmcC);
    const de2000Delta = calculateDE2000(stdL, stdA, stdB, samL, samA, samB);
    
    // 更新颜色色块
    updateColorSwatches();
    
    const resultsDiv = document.getElementById('differenceResults');
    resultsDiv.innerHTML = `
        <table class="result-table">
            <thead>
                <tr>
                    <th>色差公式</th>
                    <th>色差值</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td class="formula-name">ΔE*ab (CIE 1976)</td>
                    <td class="delta-value">${deabDelta.toFixed(2)}</td>
                </tr>
                <tr>
                    <td class="formula-name">ΔE*94 (CIE 1994)</td>
                    <td class="delta-value">${cie94Delta.toFixed(2)}</td>
                </tr>
                <tr>
                    <td class="formula-name">ΔE*CMC(l:c)</td>
                    <td class="delta-value">${cmcDelta.toFixed(2)}</td>
                </tr>
                <tr>
                    <td class="formula-name">ΔE*00 (CIE 2000)</td>
                    <td class="delta-value">${de2000Delta.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
    `;
}

function handleLABExcelFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        alert('不支持的文件格式，请上传 .xlsx 或 .xls 格式的Excel文件');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onerror = function() {
        alert('读取文件失败，请检查文件是否损坏');
    };
    
    reader.onload = function(e) {
        try {
            if (!e.target || !e.target.result) {
                throw new Error('文件读取结果为空');
            }
            
            const data = new Uint8Array(e.target.result);
            if (data.length === 0) {
                throw new Error('文件内容为空');
            }
            
            const workbook = XLSX.read(data, { type: 'array' });
            
            if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('Excel文件中没有工作表');
            }
            
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            if (!firstSheet) {
                throw new Error('无法读取第一个工作表');
            }
            
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null });
            
            if (!jsonData || !Array.isArray(jsonData)) {
                throw new Error('Excel数据转换失败');
            }
            
            parseLABExcelData(jsonData);
        } catch (error) {
            console.error('Excel读取错误:', error);
            alert('读取Excel文件失败: ' + (error.message || '未知错误'));
        }
    };
    
    reader.readAsArrayBuffer(file);
}

function parseLABExcelData(jsonData) {
    // 检查数据有效性
    if (!jsonData || !Array.isArray(jsonData) || jsonData.length < 1) {
        alert('Excel数据格式错误：数据为空或格式不正确');
        return;
    }
    
    // 检查第一行是否存在且为数组
    if (!jsonData[0] || !Array.isArray(jsonData[0])) {
        alert('Excel数据格式错误：第一行数据无效');
        return;
    }
    
    // 安全处理表头行
    const headerRow = jsonData[0].map(cell => {
        if (cell === null || cell === undefined) return '';
        return String(cell).toLowerCase().trim();
    });
    
    // 安全查找标准LAB列
    let stdLIndex = -1;
    let stdAIndex = -1;
    let stdBIndex = -1;
    
    for (let i = 0; i < headerRow.length; i++) {
        const cellValue = headerRow[i];
        if (cellValue && typeof cellValue === 'string') {
            if (stdLIndex === -1 && (cellValue.includes('标准l') || cellValue.includes('stdl') || cellValue.includes('标准 l'))) {
                stdLIndex = i;
            }
            if (stdAIndex === -1 && (cellValue.includes('标准a') || cellValue.includes('stda') || cellValue.includes('标准 a'))) {
                stdAIndex = i;
            }
            if (stdBIndex === -1 && (cellValue.includes('标准b') || cellValue.includes('stdb') || cellValue.includes('标准 b'))) {
                stdBIndex = i;
            }
        }
    }
    
    // 安全查找样品LAB列
    let samLIndex = -1;
    let samAIndex = -1;
    let samBIndex = -1;
    
    for (let i = 0; i < headerRow.length; i++) {
        const cellValue = headerRow[i];
        if (cellValue && typeof cellValue === 'string') {
            if (samLIndex === -1 && (cellValue.includes('样品l') || cellValue.includes('sampl') || cellValue.includes('样品 l')) && !cellValue.includes('标准')) {
                samLIndex = i;
            }
            if (samAIndex === -1 && (cellValue.includes('样品a') || cellValue.includes('sampa') || cellValue.includes('样品 a')) && !cellValue.includes('标准')) {
                samAIndex = i;
            }
            if (samBIndex === -1 && (cellValue.includes('样品b') || cellValue.includes('sampb') || cellValue.includes('样品 b')) && !cellValue.includes('标准')) {
                samBIndex = i;
            }
        }
    }
    
    // 如果没找到，尝试查找L, a, b列（可能是前6列：标准L,标准a,标准b,样品L,样品a,样品b）
    let dataStart = 1;
    if (stdLIndex === -1 || stdAIndex === -1 || stdBIndex === -1 || 
        samLIndex === -1 || samAIndex === -1 || samBIndex === -1) {
        // 检查第一行是否是数据
        if (jsonData.length > 0 && jsonData[0].length >= 6 &&
            !isNaN(parseFloat(jsonData[0][0])) &&
            !isNaN(parseFloat(jsonData[0][1])) &&
            !isNaN(parseFloat(jsonData[0][2]))) {
            dataStart = 0;
            stdLIndex = 0;
            stdAIndex = 1;
            stdBIndex = 2;
            samLIndex = 3;
            samAIndex = 4;
            samBIndex = 5;
        } else if (jsonData.length > 0 && jsonData[0].length >= 3) {
            // 只有样品值，使用输入的标准值
            dataStart = 0;
            stdLIndex = -1; // 使用输入框中的标准值
            stdAIndex = -1;
            stdBIndex = -1;
            samLIndex = 0;
            samAIndex = 1;
            samBIndex = 2;
        } else {
            alert('未找到有效的LAB数据列。请确保Excel文件包含标准Lab值和样品Lab值。');
            return;
        }
    }
    
    const decmcCoeff = document.getElementById('decmcCoeff').value || '1:1';
    const cmcParts = decmcCoeff.split(':');
    const cmcL = parseFloat(cmcParts[0]) || 2.0;
    const cmcC = parseFloat(cmcParts[1]) || 1.0;
    
    // 获取标准值（如果Excel中没有，使用输入框的值）
    let stdL, stdA, stdB;
    if (stdLIndex === -1) {
        stdL = parseFloat(document.getElementById('stdL').value);
        stdA = parseFloat(document.getElementById('stdA').value);
        stdB = parseFloat(document.getElementById('stdB').value);
        if (isNaN(stdL) || isNaN(stdA) || isNaN(stdB)) {
            alert('Excel文件中没有标准Lab值，请在输入框中输入标准Lab值');
            return;
        }
    }
    
    batchColorDifferenceResults = [];
    
    for (let i = dataStart; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !Array.isArray(row) || row.length < 3) continue;
        
        // 获取标准值
        if (stdLIndex !== -1) {
            const stdLVal = row[stdLIndex];
            const stdAVal = row[stdAIndex];
            const stdBVal = row[stdBIndex];
            
            if (stdLVal === null || stdLVal === undefined || 
                stdAVal === null || stdAVal === undefined || 
                stdBVal === null || stdBVal === undefined) {
                continue;
            }
            
            stdL = parseFloat(stdLVal);
            stdA = parseFloat(stdAVal);
            stdB = parseFloat(stdBVal);
        }
        
        // 获取样品值
        const samLVal = row[samLIndex];
        const samAVal = row[samAIndex];
        const samBVal = row[samBIndex];
        
        if (samLVal === null || samLVal === undefined || 
            samAVal === null || samAVal === undefined || 
            samBVal === null || samBVal === undefined) {
            continue;
        }
        
        const samL = parseFloat(samLVal);
        const samA = parseFloat(samAVal);
        const samB = parseFloat(samBVal);
        
        if (isNaN(stdL) || isNaN(stdA) || isNaN(stdB) || 
            isNaN(samL) || isNaN(samA) || isNaN(samB)) {
            continue;
        }
        
        // 计算色差
        const deabDelta = calculateDEab(stdL, stdA, stdB, samL, samA, samB);
        const cie94Delta = calculateCIE94(stdL, stdA, stdB, samL, samA, samB);
        const cmcDelta = calculateCMC(stdL, stdA, stdB, samL, samA, samB, cmcL, cmcC);
        const de2000Delta = calculateDE2000(stdL, stdA, stdB, samL, samA, samB);
        
        batchColorDifferenceResults.push({
            stdL: stdL.toFixed(2),
            stdA: stdA.toFixed(2),
            stdB: stdB.toFixed(2),
            samL: samL.toFixed(2),
            samA: samA.toFixed(2),
            samB: samB.toFixed(2),
            deab: deabDelta.toFixed(2),
            cie94: cie94Delta.toFixed(2),
            cmc: cmcDelta.toFixed(2),
            de2000: de2000Delta.toFixed(2)
        });
    }
    
    if (batchColorDifferenceResults.length === 0) {
        alert('未找到有效的LAB数据');
        return;
    }
    
    displayBatchResults();
    document.getElementById('exportBtn').style.display = 'inline-block';
    alert(`成功导入并计算 ${batchColorDifferenceResults.length} 组色差数据`);
}

function displayBatchResults() {
    const tbody = document.getElementById('batchResultsBody');
    tbody.innerHTML = '';
    
    batchColorDifferenceResults.forEach((result, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>L*: ${result.stdL}, a*: ${result.stdA}, b*: ${result.stdB}</td>
            <td>L*: ${result.samL}, a*: ${result.samA}, b*: ${result.samB}</td>
            <td class="delta-value">${result.deab}</td>
            <td class="delta-value">${result.cie94}</td>
            <td class="delta-value">${result.cmc}</td>
            <td class="delta-value">${result.de2000}</td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('batchResults').style.display = 'block';
}

function clearBatchResults() {
    batchColorDifferenceResults = [];
    document.getElementById('batchResults').style.display = 'none';
    document.getElementById('exportBtn').style.display = 'none';
}

function exportBatchResults() {
    if (batchColorDifferenceResults.length === 0) {
        alert('没有可导出的数据');
        return;
    }
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    
    // 准备数据
    const wsData = [
        ['序号', '标准L*', '标准a*', '标准b*', '样品L*', '样品a*', '样品b*', 
         'ΔE*ab', 'ΔE*94', 'ΔE*CMC', 'ΔE*00']
    ];
    
    batchColorDifferenceResults.forEach((result, index) => {
        wsData.push([
            index + 1,
            parseFloat(result.stdL),
            parseFloat(result.stdA),
            parseFloat(result.stdB),
            parseFloat(result.samL),
            parseFloat(result.samA),
            parseFloat(result.samB),
            parseFloat(result.deab),
            parseFloat(result.cie94),
            parseFloat(result.cmc),
            parseFloat(result.de2000)
        ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, '色差计算结果');
    
    // 导出文件
    const fileName = `色差计算结果_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

function calculateDEab(l1, a1, b1, l2, a2, b2) {
    // CIE 1976 ΔE*ab公式
    const dL = l1 - l2;
    const da = a1 - a2;
    const db = b1 - b2;
    return Math.sqrt(dL * dL + da * da + db * db);
}

function calculateCMC(l1, a1, b1, l2, a2, b2, l = 2.0, c = 1.0) {
    
    const dL = l1 - l2;
    const da = a1 - a2;
    const db = b1 - b2;
    
    const c1 = Math.sqrt(a1 * a1 + b1 * b1);
    const c2 = Math.sqrt(a2 * a2 + b2 * b2);
    const dC = c1 - c2;
    const dH = Math.sqrt(da * da + db * db - dC * dC);
    
    const sl = l1 >= 16 ? 0.040975 * l1 / (1 + 0.01765 * l1) : 0.511;
    const sc = 0.0638 * c1 / (1 + 0.0131 * c1) + 0.638;
    
    let h1 = Math.atan2(b1, a1) * 180 / Math.PI;
    if (h1 < 0) h1 += 360;
    
    let f = 1.0;
    if (164 <= h1 && h1 <= 345) {
        f = Math.sqrt(c1 * c1 * c1 * c1 / (c1 * c1 * c1 * c1 + 1900));
    }
    
    const t = 0.36 + Math.abs(0.4 * Math.cos((h1 + 35) * Math.PI / 180));
    const sh = sc * (f * t + 1 - f);
    
    return Math.sqrt(Math.pow(dL / (l * sl), 2) + Math.pow(dC / (c * sc), 2) + Math.pow(dH / sh, 2));
}

function calculateCIE94(l1, a1, b1, l2, a2, b2) {
    const dL = l1 - l2;
    const da = a1 - a2;
    const db = b1 - b2;
    
    const c1 = Math.sqrt(a1 * a1 + b1 * b1);
    const c2 = Math.sqrt(a2 * a2 + b2 * b2);
    const dC = c1 - c2;
    const dH = Math.sqrt(da * da + db * db - dC * dC);
    
    const kl = 1.0;
    const kc = 1.0;
    const kh = 1.0;
    const k1 = 0.045;
    const k2 = 0.015;
    
    const sl = 1.0;
    const sc = 1 + k1 * c1;
    const sh = 1 + k2 * c1;
    
    return Math.sqrt(Math.pow(dL / (kl * sl), 2) + Math.pow(dC / (kc * sc), 2) + Math.pow(dH / (kh * sh), 2));
}

function calculateDE2000(l1, a1, b1, l2, a2, b2) {
    const dL = l1 - l2;
    const da = a1 - a2;
    const db = b1 - b2;
    
    const c1 = Math.sqrt(a1 * a1 + b1 * b1);
    const c2 = Math.sqrt(a2 * a2 + b2 * b2);
    const c_avg = (c1 + c2) / 2;
    
    const g = 0.5 * (1 - Math.sqrt(Math.pow(c_avg, 7) / (Math.pow(c_avg, 7) + Math.pow(25, 7))));
    
    const a1_prime = (1 + g) * a1;
    const a2_prime = (1 + g) * a2;
    
    const c1_prime = Math.sqrt(a1_prime * a1_prime + b1 * b1);
    const c2_prime = Math.sqrt(a2_prime * a2_prime + b2 * b2);
    const c_avg_prime = (c1_prime + c2_prime) / 2;
    
    let h1_prime = Math.atan2(b1, a1_prime) * 180 / Math.PI;
    if (h1_prime < 0) h1_prime += 360;
    let h2_prime = Math.atan2(b2, a2_prime) * 180 / Math.PI;
    if (h2_prime < 0) h2_prime += 360;
    
    let dh_prime;
    if (Math.abs(h1_prime - h2_prime) <= 180) {
        dh_prime = h2_prime - h1_prime;
    } else if (h2_prime - h1_prime > 180) {
        dh_prime = h2_prime - h1_prime - 360;
    } else {
        dh_prime = h2_prime - h1_prime + 360;
    }
    
    const dH_prime = 2 * Math.sqrt(c1_prime * c2_prime) * Math.sin(dh_prime * Math.PI / 360);
    
    const l_avg = (l1 + l2) / 2;
    let h_avg_prime = (h1_prime + h2_prime) / 2;
    if (Math.abs(h1_prime - h2_prime) > 180) {
        h_avg_prime = (h1_prime + h2_prime + 360) / 2;
    }
    
    const t = 1 - 0.17 * Math.cos((h_avg_prime - 30) * Math.PI / 180) +
              0.24 * Math.cos(2 * h_avg_prime * Math.PI / 180) +
              0.32 * Math.cos((3 * h_avg_prime + 6) * Math.PI / 180) -
              0.20 * Math.cos((4 * h_avg_prime - 63) * Math.PI / 180);
    
    const delta_theta = 30 * Math.exp(-Math.pow((h_avg_prime - 275) / 25, 2));
    const rc = 2 * Math.sqrt(Math.pow(c_avg_prime, 7) / (Math.pow(c_avg_prime, 7) + Math.pow(25, 7)));
    const rt = -Math.sin(2 * delta_theta * Math.PI / 180) * rc;
    
    const sl = 1 + (0.015 * Math.pow(l_avg - 50, 2)) / Math.sqrt(20 + Math.pow(l_avg - 50, 2));
    const sc = 1 + 0.045 * c_avg_prime;
    const sh = 1 + 0.015 * c_avg_prime * t;
    
    const kl = 1.0;
    const kc = 1.0;
    const kh = 1.0;
    
    const dL_prime = l1 - l2;
    const dC_prime = c1_prime - c2_prime;
    
    const term1 = Math.pow(dL_prime / (kl * sl), 2);
    const term2 = Math.pow(dC_prime / (kc * sc), 2);
    const term3 = Math.pow(dH_prime / (kh * sh), 2);
    const term4 = rt * (dC_prime / (kc * sc)) * (dH_prime / (kh * sh));
    
    return Math.sqrt(term1 + term2 + term3 + term4);
}

// ==================== 光谱反射率 ====================

function handleSpectralFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    
    // 检查文件类型
    const supportedFormats = ['.xlsx', '.xls', '.csv', '.qtx'];
    if (!supportedFormats.includes(fileExtension)) {
        alert('不支持的文件格式。请上传 .xlsx、.xls、.csv 或 .qtx 格式的文件');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onerror = function() {
        alert('读取文件失败，请检查文件是否损坏');
    };
    
    reader.onload = function(e) {
        try {
            if (!e.target || !e.target.result) {
                throw new Error('文件读取结果为空');
            }
            
            // 处理CSV文件
            if (fileExtension === '.csv') {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim());
                
                if (lines.length < 2) {
                    throw new Error('CSV文件数据不足');
                }
                
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                const wlIndex = headers.findIndex(h => h.includes('wavelength') || h.includes('波长') || h.includes('wl') || h === 'nm');
                const refIndices = [];
                
                headers.forEach((h, idx) => {
                    if (idx !== wlIndex && (h.includes('reflectance') || h.includes('反射率') || h.includes('ref'))) {
                        refIndices.push(idx);
                    }
                });
                
                if (wlIndex === -1 || refIndices.length === 0) {
                    alert('CSV文件必须包含波长和反射率列。请确保表头包含"波长"、"wavelength"、"wl"、"nm"和"反射率"、"reflectance"、"ref"等关键词');
                    return;
                }
                
                // 限制最多读取2组数据
                if (refIndices.length > 2) {
                    refIndices = refIndices.slice(0, 2);
                }
                
                // 读取所有反射率数据
                spectralData1 = [];
                spectralData2 = null;
                const spectralDataArrays = refIndices.map(() => []);
                
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',');
                    const wlVal = values[wlIndex];
                    if (!wlVal) continue;
                    
                    const wl = parseFloat(wlVal);
                    if (isNaN(wl)) continue;
                    
                    refIndices.forEach((refIndex, idx) => {
                        const refVal = values[refIndex];
                        if (refVal) {
                            const ref = parseFloat(refVal);
                            if (!isNaN(ref)) {
                                spectralDataArrays[idx].push({ wavelength: wl, reflectance: ref });
                            }
                        }
                    });
                }
                
                // 分配数据到spectralData1和spectralData2
                spectralData1 = spectralDataArrays[0] || [];
                spectralData2 = spectralDataArrays[1] || null;
                
                if (spectralData1.length === 0) {
                    alert('未找到有效的光谱数据。请检查CSV文件格式是否正确');
                    return;
                }
                
                plotSpectralData();
            }
            // 处理QTX文件（文本格式）
            else if (fileExtension === '.qtx') {
                const text = e.target.result;
                const lines = text.split(/[\r\n]+/).filter(line => line.trim());
                
                spectralData1 = [];
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line || line.startsWith('#')) continue;
                    
                    const parts = line.split(/[\s,\t]+/).filter(p => p.trim());
                    if (parts.length >= 2) {
                        const wl = parseFloat(parts[0]);
                        const ref = parseFloat(parts[1]);
                        if (!isNaN(wl) && !isNaN(ref)) {
                            spectralData1.push({ wavelength: wl, reflectance: ref });
                        }
                    }
                }
                
                if (spectralData1.length === 0) {
                    alert('QTX文件格式无法识别。请确保文件包含波长和反射率数据，每行格式为：波长 反射率');
                    return;
                }
                spectralData2 = null;
                plotSpectralData();
            }
            // 处理Excel文件（.xlsx, .xls）
            else {
                const dataArray = new Uint8Array(e.target.result);
                if (dataArray.length === 0) {
                    throw new Error('文件内容为空');
                }
                
                const workbook = XLSX.read(dataArray, { type: 'array' });
                
                if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                    throw new Error('Excel文件中没有工作表');
                }
                
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                if (!firstSheet) {
                    throw new Error('无法读取第一个工作表');
                }
                
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null });
                
                if (!jsonData || !Array.isArray(jsonData) || jsonData.length < 2) {
                    throw new Error('Excel数据格式错误：数据不足');
                }
                
                // 检查第一行是否存在且为数组
                if (!jsonData[0] || !Array.isArray(jsonData[0])) {
                    throw new Error('Excel数据格式错误：第一行数据无效');
                }
                
                // 安全处理表头行
                const headerRow = jsonData[0].map(cell => {
                    if (cell === null || cell === undefined) return '';
                    return String(cell).toLowerCase().trim();
                });
                
                // 安全查找波长列和所有反射率列
                let wlIndex = -1;
                let refIndices = []; // 存储所有反射率列的索引
                
                for (let i = 0; i < headerRow.length; i++) {
                    const cellValue = headerRow[i];
                    if (cellValue && typeof cellValue === 'string') {
                        if (wlIndex === -1 && (cellValue.includes('wavelength') || cellValue.includes('波长') || cellValue.includes('wl') || cellValue === 'nm')) {
                            wlIndex = i;
                        }
                        if (cellValue.includes('reflectance') || cellValue.includes('反射率') || cellValue.includes('ref')) {
                            refIndices.push(i);
                        }
                    }
                }
                
                // 如果没找到表头，尝试使用前几列
                if (wlIndex === -1 || refIndices.length === 0) {
                    // 检查第一行是否是数据
                    if (jsonData.length > 0 && jsonData[0].length >= 2 &&
                        !isNaN(parseFloat(jsonData[0][0])) &&
                        !isNaN(parseFloat(jsonData[0][1]))) {
                        wlIndex = 0;
                        refIndices = [1]; // 只取第二列作为第一组数据
                    } else {
                        alert('Excel文件必须包含波长和反射率列。请确保表头包含"波长"、"wavelength"、"wl"、"nm"或"反射率"、"reflectance"、"ref"等关键词');
                        return;
                    }
                }
                
                // 限制最多读取2组数据
                if (refIndices.length > 2) {
                    refIndices = refIndices.slice(0, 2);
                }
                
                // 读取所有反射率数据
                spectralData1 = [];
                spectralData2 = null;
                
                const spectralDataArrays = refIndices.map(() => []);
                
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row || !Array.isArray(row)) continue;
                    
                    const wlVal = row[wlIndex];
                    if (wlVal === null || wlVal === undefined) continue;
                    
                    const wl = parseFloat(wlVal);
                    if (isNaN(wl)) continue;
                    
                    refIndices.forEach((refIndex, idx) => {
                        const refVal = row[refIndex];
                        if (refVal !== null && refVal !== undefined) {
                            const ref = parseFloat(refVal);
                            if (!isNaN(ref)) {
                                spectralDataArrays[idx].push({ wavelength: wl, reflectance: ref });
                            }
                        }
                    });
                }
                
                // 分配数据到spectralData1和spectralData2
                spectralData1 = spectralDataArrays[0] || [];
                spectralData2 = spectralDataArrays[1] || null;
                
                // 按波长排序
                if (spectralData1.length > 0) {
                    spectralData1.sort((a, b) => a.wavelength - b.wavelength);
                }
                if (spectralData2 && spectralData2.length > 0) {
                    spectralData2.sort((a, b) => a.wavelength - b.wavelength);
                }
                
                if (spectralData1.length === 0) {
                    alert('未找到有效的光谱数据。请检查文件格式是否正确');
                    return;
                }
                
                plotSpectralData();
            }
        } catch (error) {
            console.error('文件读取错误:', error);
            alert('读取文件失败: ' + (error.message || '未知错误'));
        }
    };
    
    // 根据文件类型选择读取方式
    if (fileExtension === '.csv' || fileExtension === '.qtx') {
        reader.readAsText(file);
    } else {
        reader.readAsArrayBuffer(file);
    }
}

function plotManualSpectral() {
    const wlStart = parseInt(document.getElementById('wlStart').value);
    const wlEnd = parseInt(document.getElementById('wlEnd').value);
    const reflectanceText1 = document.getElementById('reflectanceInput1').value.trim();
    const reflectanceText2 = document.getElementById('reflectanceInput2').value.trim();
    
    if (!reflectanceText1 && !reflectanceText2) {
        alert('请至少输入一组反射率值');
        return;
    }
    
    spectralData1 = null;
    spectralData2 = null;
    
    if (reflectanceText1) {
        const reflectanceValues1 = reflectanceText1
            .split(/[,\n]/)
            .map(v => parseFloat(v.trim()))
            .filter(v => !isNaN(v));
        
        if (reflectanceValues1.length > 0) {
            const step = reflectanceValues1.length > 1 ? (wlEnd - wlStart) / (reflectanceValues1.length - 1) : 0;
            spectralData1 = reflectanceValues1.map((ref, i) => ({
                wavelength: wlStart + i * step,
                reflectance: ref
            }));
        }
    }
    
    if (reflectanceText2) {
        const reflectanceValues2 = reflectanceText2
            .split(/[,\n]/)
            .map(v => parseFloat(v.trim()))
            .filter(v => !isNaN(v));
        
        if (reflectanceValues2.length > 0) {
            const step = reflectanceValues2.length > 1 ? (wlEnd - wlStart) / (reflectanceValues2.length - 1) : 0;
            spectralData2 = reflectanceValues2.map((ref, i) => ({
                wavelength: wlStart + i * step,
                reflectance: ref
            }));
        }
    }
    
    if (!spectralData1 && !spectralData2) {
        alert('无效的反射率值');
        return;
    }
    
    plotSpectralData();
}

function plotSpectralData() {
    if ((!spectralData1 || spectralData1.length === 0) && (!spectralData2 || spectralData2.length === 0)) return;
    
    const canvas = document.getElementById('spectralChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (spectralChart) {
        spectralChart.destroy();
    }
    
    const markerData = [];
    const datasets = [];
    
    // 处理样品1数据
    if (spectralData1 && spectralData1.length > 0) {
        const wavelengths1 = spectralData1.map(d => d.wavelength);
        const reflectances1 = spectralData1.map(d => {
            const val = d.reflectance > 1 ? d.reflectance / 100 : d.reflectance;
            return Math.max(0, Math.min(1, val));
        });
        
        if (spectralChartMode === 'bar') {
            datasets.push({
                type: 'bar',
                label: '样品1',
                data: wavelengths1.map((wl, i) => ({ x: wl, y: reflectances1[i] })),
                backgroundColor: 'rgba(102, 126, 234, 0.35)',
                borderColor: '#667eea',
                borderWidth: 1,
                barPercentage: 0.4,
                categoryPercentage: 0.8
            });
            datasets.push({
                type: 'line',
                label: '样品1趋势',
                data: wavelengths1.map((wl, i) => ({ x: wl, y: reflectances1[i] })),
                borderColor: '#667eea',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                borderWidth: 2,
                order: 0
            });
        } else {
            datasets.push({
                type: 'line',
                label: '样品1',
                data: wavelengths1.map((wl, i) => ({ x: wl, y: reflectances1[i] })),
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                showLine: true
            });
        }
    }
    
    // 处理样品2数据
    if (spectralData2 && spectralData2.length > 0) {
        const wavelengths2 = spectralData2.map(d => d.wavelength);
        const reflectances2 = spectralData2.map(d => {
            const val = d.reflectance > 1 ? d.reflectance / 100 : d.reflectance;
            return Math.max(0, Math.min(1, val));
        });
        
        if (spectralChartMode === 'bar') {
            datasets.push({
                type: 'bar',
                label: '样品2',
                data: wavelengths2.map((wl, i) => ({ x: wl, y: reflectances2[i] })),
                backgroundColor: 'rgba(255, 107, 157, 0.35)',
                borderColor: '#ff6b9d',
                borderWidth: 1,
                barPercentage: 0.4,
                categoryPercentage: 0.8
            });
            datasets.push({
                type: 'line',
                label: '样品2趋势',
                data: wavelengths2.map((wl, i) => ({ x: wl, y: reflectances2[i] })),
                borderColor: '#ff6b9d',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                borderWidth: 2,
                order: 0
            });
        } else {
            datasets.push({
                type: 'line',
                label: '样品2',
                data: wavelengths2.map((wl, i) => ({ x: wl, y: reflectances2[i] })),
                borderColor: '#ff6b9d',
                backgroundColor: 'rgba(255, 107, 157, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                showLine: true
            });
        }
    }

    datasets.push({
        label: '选中点',
        data: markerData,
        borderColor: '#ff6b9d',
        backgroundColor: '#ff6b9d',
        pointRadius: 8,
        pointHoverRadius: 10,
        pointStyle: 'circle',
        showLine: false,
        order: 2
    });
    
    spectralChart = new Chart(ctx, {
        type: spectralChartMode === 'bar' ? 'bar' : 'line',
        data: { datasets },
        options: {
            parsing: false,
            responsive: true,
            maintainAspectRatio: false,
            backgroundColor: 'white', // 设置背景为白色
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: '波长 (nm)',
                        font: {
                            size: 12
                        }
                    },
                    ticks: {
                        maxTicksLimit: 10,
                        callback: function(value) {
                            return Number(value).toFixed(0);
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '反射率',
                        font: {
                            size: 12
                        }
                    },
                    min: 0.0,
                    max: 1.0,
                    ticks: {
                        stepSize: 0.1,
                        callback: function(value) {
                            return value.toFixed(1);
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const wavelength = context.parsed.x;
                            return `波长: ${wavelength.toFixed(2)} nm, 反射率: ${context.parsed.y.toFixed(4)}`;
                        }
                    }
                }
            },
            onClick: function(event, elements) {
                // 合并所有波长数据
                let allWavelengths = [];
                let allReflectances = [];
                let dataSource = null;
                
                if (spectralData1 && spectralData1.length > 0) {
                    allWavelengths = spectralData1.map(d => d.wavelength);
                    allReflectances = spectralData1.map(d => d.reflectance > 1 ? d.reflectance / 100 : d.reflectance);
                    dataSource = spectralData1;
                }
                if (spectralData2 && spectralData2.length > 0) {
                    allWavelengths = allWavelengths.concat(spectralData2.map(d => d.wavelength));
                    allReflectances = allReflectances.concat(spectralData2.map(d => d.reflectance > 1 ? d.reflectance / 100 : d.reflectance));
                }
                
                let selectedIndex = -1;
                
                if (elements.length > 0) {
                    const element = elements[0];
                    selectedIndex = element.index;
                } else {
                    // 如果没有点击到数据点，尝试找到最近的点
                    const chart = spectralChart;
                    const canvasPosition = Chart.helpers.getRelativePosition(event, chart);
                    const dataX = chart.scales.x.getValueForPixel(canvasPosition.x);
                    
                    // 找到最接近的波长点
                    let minDistance = Math.abs(allWavelengths[0] - dataX);
                    selectedIndex = 0;
                    
                    for (let i = 1; i < allWavelengths.length; i++) {
                        const distance = Math.abs(allWavelengths[i] - dataX);
                        if (distance < minDistance) {
                            minDistance = distance;
                            selectedIndex = i;
                        }
                    }
                }
                
                if (selectedIndex >= 0 && selectedIndex < allWavelengths.length) {
                    const wavelength = allWavelengths[selectedIndex];
                    const normalizedReflectance = allReflectances[selectedIndex];
                    const sourceData = dataSource || spectralData2;
                    const originalReflectance = sourceData[selectedIndex % sourceData.length].reflectance;
                    
                    // 更新标记点数据集，只显示被点击的点
                    const newMarkerData = [{ x: wavelength, y: normalizedReflectance }];
                    
                    // 更新图表数据（标记点始终位于最后一个数据集）
                    const markerDatasetIndex = spectralChart.data.datasets.length - 1;
                    spectralChart.data.datasets[markerDatasetIndex].data = newMarkerData;
                    spectralChart.update();
                    
                    // 显示数据提示
                    alert(`数据点信息：\n波长: ${wavelength.toFixed(2)} nm\n反射率: ${originalReflectance.toFixed(4)}`);
                }
            }
        }
    });
    
    // 计算XYZ和LAB值
    calculateSpectralXYZLAB();
}

function calculateSpectralXYZLAB() {
    // 计算样品1的XYZ和LAB
    if (spectralData1 && spectralData1.length > 0) {
        calculateOneSpectral('xyzValues1', 'labValues1', 'colorBlock1', spectralData1);
    } else {
        document.getElementById('xyzValues1').textContent = '-';
        document.getElementById('labValues1').textContent = '-';
        document.getElementById('colorBlock1').style.display = 'none';
    }
    
    // 计算样品2的XYZ和LAB
    if (spectralData2 && spectralData2.length > 0) {
        calculateOneSpectral('xyzValues2', 'labValues2', 'colorBlock2', spectralData2);
    } else {
        document.getElementById('xyzValues2').textContent = '-';
        document.getElementById('labValues2').textContent = '-';
        document.getElementById('colorBlock2').style.display = 'none';
    }
    
    // 显示结果区域
    if ((spectralData1 && spectralData1.length > 0) || (spectralData2 && spectralData2.length > 0)) {
        document.getElementById('spectralResults').style.display = 'block';
        document.getElementById('spectralResultsPlaceholder').style.display = 'none';
    } else {
        document.getElementById('spectralResults').style.display = 'none';
        document.getElementById('spectralResultsPlaceholder').style.display = 'block';
    }
}

function calculateOneSpectral(xyzId, labId, colorBlockId, spectralData) {
    const wavelengths = spectralData.map(d => d.wavelength);
    const reflectances = spectralData.map(d => {
        return d.reflectance > 1 ? d.reflectance / 100 : d.reflectance;
    });
    
    let X = 0, Y = 0, Z = 0;
    let sumY = 0;
    
    wavelengths.forEach((wl, i) => {
        if (wl >= 380 && wl <= 780) {
            const x_bar = Math.exp(-0.5 * Math.pow((wl - 600) / 100, 2)) * 1.5;
            const y_bar = Math.exp(-0.5 * Math.pow((wl - 555) / 100, 2)) * 2.0;
            const z_bar = Math.exp(-0.5 * Math.pow((wl - 445) / 100, 2)) * 1.8;
            const illuminant = 1.0;
            
            X += x_bar * illuminant * reflectances[i];
            Y += y_bar * illuminant * reflectances[i];
            Z += z_bar * illuminant * reflectances[i];
            sumY += y_bar * illuminant;
        }
    });
    
    const k = 100 / sumY;
    X *= k;
    Y *= k;
    Z *= k;
    
    const xn = 95.047, yn = 100.000, zn = 108.883;
    const x = X / xn;
    const y = Y / yn;
    const z = Z / zn;
    
    const fx = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x + 16/116);
    const fy = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y + 16/116);
    const fz = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z + 16/116);
    
    const L = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const b = 200 * (fy - fz);
    
    document.getElementById(xyzId).textContent = `${X.toFixed(2)}, ${Y.toFixed(2)}, ${Z.toFixed(2)}`;
    document.getElementById(labId).textContent = `${L.toFixed(2)}, ${a.toFixed(2)}, ${b.toFixed(2)}`;
    
    const colorBlock = document.getElementById(colorBlockId);
    if (colorBlock) {
        const rgb = xyzToRgb(X, Y, Z);
        const hexColor = rgbToHex(rgb.r, rgb.g, rgb.b);
        console.log(`Color block ${colorBlockId}: RGB(${rgb.r}, ${rgb.g}, ${rgb.b}) -> ${hexColor}`);
        colorBlock.style.backgroundColor = hexColor;
        colorBlock.style.display = 'block';
        colorBlock.style.visibility = 'visible';
    } else {
        console.error(`Color block element ${colorBlockId} not found!`);
    }
}

function labToRgb(L, a, b) {
    // LAB转XYZ
    const xn = 95.047, yn = 100.000, zn = 108.883; // D65
    
    const fy = (L + 16) / 116;
    const fx = a / 500 + fy;
    const fz = fy - b / 200;
    
    const xr = fx > 0.206897 ? fx * fx * fx : (fx - 16/116) / 7.787;
    const yr = fy > 0.206897 ? fy * fy * fy : (fy - 16/116) / 7.787;
    const zr = fz > 0.206897 ? fz * fz * fz : (fz - 16/116) / 7.787;
    
    const X = xr * xn;
    const Y = yr * yn;
    const Z = zr * zn;
    
    return xyzToRgb(X, Y, Z);
}

function xyzToRgb(X, Y, Z) {
    // XYZ转sRGB (D65白点)
    // 归一化XYZ值
    const x = X / 100.0;
    const y = Y / 100.0;
    const z = Z / 100.0;
    
    // 使用sRGB转换矩阵 (D65)
    let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
    let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
    let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;
    
    // 先将线性RGB值裁剪到0-1范围
    r = Math.max(0, Math.min(1, r));
    g = Math.max(0, Math.min(1, g));
    b = Math.max(0, Math.min(1, b));
    
    // 伽马校正（线性RGB到sRGB）
    const gammaCorrect = (val) => {
        return val > 0.0031308 ? 1.055 * Math.pow(val, 1/2.4) - 0.055 : 12.92 * val;
    };
    
    r = gammaCorrect(r);
    g = gammaCorrect(g);
    b = gammaCorrect(b);
    
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

// ==================== 工具函数 ====================

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = Math.max(0, Math.min(255, x)).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
}

// HSL转Hex颜色
function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

// 光谱反射率标签页切换
function switchSpectralTab(index) {
    const tabs = document.querySelectorAll('.spectral-tab');
    const contents = document.querySelectorAll('.spectral-tab-content');
    
    tabs.forEach((tab, i) => {
        if (i === index) {
            tab.classList.add('active');
            tab.style.borderBottomColor = '#ff6b9d';
            tab.style.color = '#333';
            tab.style.fontWeight = '600';
        } else {
            tab.classList.remove('active');
            tab.style.borderBottomColor = 'transparent';
            tab.style.color = '#666';
            tab.style.fontWeight = '500';
        }
    });
    
    contents.forEach((content, i) => {
        if (i === index) {
            content.style.display = 'block';
        } else {
            content.style.display = 'none';
        }
    });
}

// 切换光谱图显示类型（折线 / 柱状）
function switchSpectralChartMode(mode) {
    if (mode !== 'line' && mode !== 'bar') return;
    spectralChartMode = mode;

    const lineBtn = document.getElementById('chartTypeLine');
    const barBtn = document.getElementById('chartTypeBar');
    if (lineBtn && barBtn) {
        if (mode === 'line') {
            lineBtn.classList.add('active');
            barBtn.classList.remove('active');
        } else {
            barBtn.classList.add('active');
            lineBtn.classList.remove('active');
        }
    }

    // 重绘图表以应用新的类型
    plotSpectralData();
}

// 内部：根据鼠标位置更新色品图高亮与提示
function updateChromaticityTooltip(event) {
    const canvas = document.getElementById('chromaticityCanvas');
    const tooltip = document.getElementById('chromaticityTooltip');
    if (!canvas || !tooltip || sampleData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const posX = event.clientX - rect.left;
    const posY = event.clientY - rect.top;

    const padding = 80;
    const xMin = 0, xMax = 0.8;
    const yMin = 0, yMax = 0.9;
    const width = canvas.width;
    const height = canvas.height;
    const plotWidth = width - 2 * padding;
    const plotHeight = height - 2 * padding;

    const xToCanvas = (x) => padding + ((x - xMin) / (xMax - xMin)) * plotWidth;
    const yToCanvas = (y) => height - padding - ((y - yMin) / (yMax - yMin)) * plotHeight;

    // 找到最近的数据点
    let nearestIndex = -1;
    let minDist = Infinity;
    const threshold = 14; // 像素半径阈值

    sampleData.forEach((pt, idx) => {
        const cx = xToCanvas(pt.x);
        const cy = yToCanvas(pt.y);
        const dist = Math.hypot(cx - posX, cy - posY);
        if (dist < minDist) {
            minDist = dist;
            nearestIndex = idx;
        }
    });

    if (nearestIndex === -1 || minDist > threshold) {
        if (selectedChromaticityIndex !== null) {
            selectedChromaticityIndex = null;
            tooltip.style.display = 'none';
            drawChromaticityDiagram();
        }
        return;
    }

    if (selectedChromaticityIndex === nearestIndex) {
        // 已经是当前点，只更新位置即可
    } else {
        selectedChromaticityIndex = nearestIndex;
        drawChromaticityDiagram();
    }

    const target = sampleData[nearestIndex];
    const tooltipX = xToCanvas(target.x);
    const tooltipY = yToCanvas(target.y);

    tooltip.innerHTML = `序号: ${nearestIndex + 1}<br>x: ${target.x.toFixed(4)}<br>y: ${target.y.toFixed(4)}`;
    tooltip.style.left = `${tooltipX}px`;
    tooltip.style.top = `${tooltipY}px`;
    tooltip.style.display = 'block';
}

// 点击时也触发（可选）
function handleChromaticityClick(event) {
    updateChromaticityTooltip(event);
}

// 悬停时触发
function handleChromaticityHover(event) {
    updateChromaticityTooltip(event);
}

// 放大光谱图表
function zoomSpectralChart() {
    if ((!spectralData1 || spectralData1.length === 0) && (!spectralData2 || spectralData2.length === 0)) {
        alert('没有可放大的图表数据');
        return;
    }
    
    const modal = document.getElementById('spectralZoomModal');
    if (!modal) return;
    
    // 如果已有放大图表，先销毁
    if (window.spectralChartZoom) {
        window.spectralChartZoom.destroy();
        window.spectralChartZoom = null;
    }
    
    // 显示模态框
    modal.classList.add('show');
    
    // 使用requestAnimationFrame确保DOM已更新
    requestAnimationFrame(() => {
        setTimeout(() => {
            const canvas = document.getElementById('spectralChartZoom');
            if (!canvas) {
                console.error('找不到canvas元素');
                return;
            }
            
            // 设置canvas的实际尺寸
            canvas.width = 800;
            canvas.height = 500;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('无法获取canvas上下文');
                return;
            }
        
        const zoomDatasets = [];
        
        // 样品1数据
        if (spectralData1 && spectralData1.length > 0) {
            const wavelengths1 = spectralData1.map(d => d.wavelength);
            const reflectances1 = spectralData1.map(d => {
                const val = d.reflectance > 1 ? d.reflectance / 100 : d.reflectance;
                return Math.max(0, Math.min(1, val));
            });
            
            if (spectralChartMode === 'bar') {
                zoomDatasets.push({
                    type: 'bar',
                    label: '样品1',
                    data: wavelengths1.map((wl, i) => ({ x: wl, y: reflectances1[i] })),
                    backgroundColor: 'rgba(102, 126, 234, 0.35)',
                    borderColor: '#667eea',
                    borderWidth: 1,
                    barPercentage: 0.4,
                    categoryPercentage: 0.8
                });
                zoomDatasets.push({
                    type: 'line',
                    label: '样品1趋势',
                    data: wavelengths1.map((wl, i) => ({ x: wl, y: reflectances1[i] })),
                    borderColor: '#667eea',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    borderWidth: 2,
                    order: 0
                });
            } else {
                zoomDatasets.push({
                    type: 'line',
                    label: '样品1',
                    data: wavelengths1.map((wl, i) => ({ x: wl, y: reflectances1[i] })),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    showLine: true
                });
            }
        }
        
        // 样品2数据
        if (spectralData2 && spectralData2.length > 0) {
            const wavelengths2 = spectralData2.map(d => d.wavelength);
            const reflectances2 = spectralData2.map(d => {
                const val = d.reflectance > 1 ? d.reflectance / 100 : d.reflectance;
                return Math.max(0, Math.min(1, val));
            });
            
            if (spectralChartMode === 'bar') {
                zoomDatasets.push({
                    type: 'bar',
                    label: '样品2',
                    data: wavelengths2.map((wl, i) => ({ x: wl, y: reflectances2[i] })),
                    backgroundColor: 'rgba(255, 107, 157, 0.35)',
                    borderColor: '#ff6b9d',
                    borderWidth: 1,
                    barPercentage: 0.4,
                    categoryPercentage: 0.8
                });
                zoomDatasets.push({
                    type: 'line',
                    label: '样品2趋势',
                    data: wavelengths2.map((wl, i) => ({ x: wl, y: reflectances2[i] })),
                    borderColor: '#ff6b9d',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    borderWidth: 2,
                    order: 0
                });
            } else {
                zoomDatasets.push({
                    type: 'line',
                    label: '样品2',
                    data: wavelengths2.map((wl, i) => ({ x: wl, y: reflectances2[i] })),
                    borderColor: '#ff6b9d',
                    backgroundColor: 'rgba(255, 107, 157, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    showLine: true
                });
            }
        }
        
        const markerDataZoom = [];

        try {
            window.spectralChartZoom = new Chart(ctx, {
                type: spectralChartMode === 'bar' ? 'bar' : 'line',
                data: { datasets: zoomDatasets },
                options: {
                    parsing: false,
                    responsive: true,
                    maintainAspectRatio: false,
                    backgroundColor: 'white', // 设置背景为白色
                    animation: {
                        duration: 300
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            title: {
                                display: true,
                                text: '波长 (nm)',
                                font: {
                                    size: 14
                                }
                            },
                            ticks: {
                                maxTicksLimit: 15,
                                callback: function(value) {
                                    return Number(value).toFixed(0);
                                }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: '反射率',
                                font: {
                                    size: 14
                                }
                            },
                            min: 0.0,
                            max: 1.0,
                            ticks: {
                                stepSize: 0.1,
                                callback: function(value) {
                                    return value.toFixed(1);
                                }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    const wavelength = context.parsed.x;
                                    return `波长: ${wavelength.toFixed(2)} nm, 反射率: ${context.parsed.y.toFixed(4)}`;
                                }
                            }
                        }
                    },
                    onClick: function(event, elements) {
                        // 合并所有波长数据
                        let allWavelengths = [];
                        let allReflectances = [];
                        let dataSource = null;
                        
                        if (spectralData1 && spectralData1.length > 0) {
                            allWavelengths = spectralData1.map(d => d.wavelength);
                            allReflectances = spectralData1.map(d => d.reflectance > 1 ? d.reflectance / 100 : d.reflectance);
                            dataSource = spectralData1;
                        }
                        if (spectralData2 && spectralData2.length > 0) {
                            allWavelengths = allWavelengths.concat(spectralData2.map(d => d.wavelength));
                            allReflectances = allReflectances.concat(spectralData2.map(d => d.reflectance > 1 ? d.reflectance / 100 : d.reflectance));
                        }
                        
                        let selectedIndex = -1;

                        if (elements.length > 0) {
                            selectedIndex = elements[0].index;
                        } else {
                            // 如果没有点击到数据点，尝试找到最近的点
                            const chart = window.spectralChartZoom;
                            const canvasPosition = Chart.helpers.getRelativePosition(event, chart);
                            const dataX = chart.scales.x.getValueForPixel(canvasPosition.x);

                            let minDistance = Math.abs(allWavelengths[0] - dataX);
                            selectedIndex = 0;

                            for (let i = 1; i < allWavelengths.length; i++) {
                                const distance = Math.abs(allWavelengths[i] - dataX);
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    selectedIndex = i;
                                }
                            }
                        }

                        if (selectedIndex >= 0 && selectedIndex < allWavelengths.length) {
                            const wavelength = allWavelengths[selectedIndex];
                            const normalizedReflectance = allReflectances[selectedIndex];
                            const sourceData = dataSource || spectralData2;
                            const originalReflectance = sourceData[selectedIndex % sourceData.length].reflectance;

                            // 更新标记点，只显示选中的点
                            const newMarkerData = [{ x: wavelength, y: normalizedReflectance }];
                            const markerDatasetIndex = window.spectralChartZoom.data.datasets.length - 1;
                            window.spectralChartZoom.data.datasets[markerDatasetIndex].data = newMarkerData;
                            window.spectralChartZoom.update();

                            // 显示数据提示
                            alert(`数据点信息：\n波长: ${wavelength.toFixed(2)} nm\n反射率: ${originalReflectance.toFixed(4)}`);
                        }
                    }
                }
            });
            
            // 强制更新图表
            window.spectralChartZoom.update();
        } catch (error) {
            console.error('创建图表失败:', error);
            alert('创建放大图表失败: ' + error.message);
        }
        }, 150); // 延迟150ms确保模态框已完全显示
    });
}

// 关闭放大视图
function closeSpectralZoom() {
    const modal = document.getElementById('spectralZoomModal');
    if (modal) {
        modal.classList.remove('show');
    }
    if (window.spectralChartZoom) {
        window.spectralChartZoom.destroy();
        window.spectralChartZoom = null;
    }
}

// 显示光谱数据表格
function showSpectralDataTable() {
    if ((!spectralData1 || spectralData1.length === 0) && (!spectralData2 || spectralData2.length === 0)) {
        alert('没有可显示的数据');
        return;
    }
    
    const modal = document.getElementById('spectralDataModal');
    const tbody = document.getElementById('spectralDataTableBody');
    
    if (!modal || !tbody) return;
    
    // 清空表格
    tbody.innerHTML = '';
    
    // 填充样品1数据
    if (spectralData1 && spectralData1.length > 0) {
        spectralData1.forEach((item) => {
            const row = document.createElement('tr');
            const reflectance = item.reflectance > 1 ? item.reflectance / 100 : item.reflectance;
            
            row.innerHTML = `
                <td style="padding: 10px; border-bottom: 1px solid #eee;">样品1</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-family: monospace;">${item.wavelength.toFixed(2)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-family: monospace;">${reflectance.toFixed(4)}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // 填充样品2数据
    if (spectralData2 && spectralData2.length > 0) {
        spectralData2.forEach((item) => {
            const row = document.createElement('tr');
            const reflectance = item.reflectance > 1 ? item.reflectance / 100 : item.reflectance;
            
            row.innerHTML = `
                <td style="padding: 10px; border-bottom: 1px solid #eee;">样品2</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-family: monospace;">${item.wavelength.toFixed(2)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; font-family: monospace;">${reflectance.toFixed(4)}</td>
            `;
            tbody.appendChild(row);
        });
    }
    
    modal.classList.add('show');
}

// 关闭数据表格
function closeSpectralDataTable() {
    const modal = document.getElementById('spectralDataModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// 导出光谱数据为Excel
function exportSpectralData() {
    if ((!spectralData1 || spectralData1.length === 0) && (!spectralData2 || spectralData2.length === 0)) {
        alert('没有可导出的数据');
        return;
    }
    
    // 准备数据
    const data = [
        ['样品', '波长 (nm)', '反射率']
    ];
    
    if (spectralData1 && spectralData1.length > 0) {
        spectralData1.forEach((item) => {
            const reflectance = item.reflectance > 1 ? item.reflectance / 100 : item.reflectance;
            data.push(['样品1', item.wavelength, reflectance]);
        });
    }
    
    if (spectralData2 && spectralData2.length > 0) {
        spectralData2.forEach((item) => {
            const reflectance = item.reflectance > 1 ? item.reflectance / 100 : item.reflectance;
            data.push(['样品2', item.wavelength, reflectance]);
        });
    }
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // 设置列宽
    ws['!cols'] = [
        { wch: 10 }, // 样品
        { wch: 15 }, // 波长
        { wch: 15 }  // 反射率
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, '光谱数据');
    
    // 导出文件
    const fileName = `光谱数据_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
}

// 下载光谱图表
function downloadSpectralChart() {
    if (!spectralChart) {
        alert('没有可下载的图表');
        return;
    }
    
    const canvas = document.getElementById('spectralChart');
    if (!canvas) return;
    
    // 创建临时canvas用于下载（带白色背景）
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // 填充白色背景
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // 绘制原始图表
    tempCtx.drawImage(canvas, 0, 0);
    
    // 转换为blob并下载
    tempCanvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `光谱曲线图_${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
        URL.revokeObjectURL(url);
    }, 'image/png');
}

// 点击模态框外部关闭
document.addEventListener('click', function(e) {
    const zoomModal = document.getElementById('spectralZoomModal');
    const dataModal = document.getElementById('spectralDataModal');
    
    if (zoomModal && e.target === zoomModal) {
        closeSpectralZoom();
    }
    
    if (dataModal && e.target === dataModal) {
        closeSpectralDataTable();
    }
});

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    drawChromaticityDiagram(); // 初始化色品图
});

// ==================== CIE Lab 3D 可视化模块 ====================

// 全局变量
let lab3dVisualizer = null;
let currentIlluminant = 'D50'; // 当前白点
let sampleCounter = 0; // 样品计数器（用于ID）

// 白点数据
const WHITE_POINTS = {
    D50: { Xn: 96.422, Yn: 100.000, Zn: 82.521 },
    D65: { Xn: 95.047, Yn: 100.000, Zn: 108.883 }
};

// XYZ -> CIE Lab 转换函数（严格遵循指定公式）
function xyzToLab(X, Y, Z, illuminant = 'D50') {
    const { Xn, Yn, Zn } = WHITE_POINTS[illuminant];
    
    // 归一化
    const xr = X / Xn;
    const yr = Y / Yn;
    const zr = Z / Zn;
    
    // 非线性压缩函数 f(t)
    const delta = 6/29;
    const delta3 = delta * delta * delta;
    const f = (t) => t > delta3 ? Math.pow(t, 1/3) : (7.787 * t + 16/116);
    
    const fx = f(xr);
    const fy = f(yr);
    const fz = f(zr);
    
    // Lab计算
    const L = 116 * fy - 16;
    const a = 500 * (fx - fy);
    const b = 200 * (fy - fz);
    
    return {
        L: parseFloat(L.toFixed(2)),
        a: parseFloat(a.toFixed(2)),
        b: parseFloat(b.toFixed(2))
    };
}

// Lab -> XYZ 转换（用于颜色渲染）
function labToXYZ(L, a, b, illuminant = 'D50') {
    const { Xn, Yn, Zn } = WHITE_POINTS[illuminant];
    
    const fy = (L + 16) / 116;
    const fx = a / 500 + fy;
    const fz = fy - b / 200;
    
    const fInv = (t) => t > 0.206897 ? t * t * t : (t - 16/116) / 7.787;
    
    const xr = fInv(fx);
    const yr = fInv(fy);
    const zr = fInv(fz);
    
    return {
        X: parseFloat((xr * Xn).toFixed(2)),
        Y: parseFloat((yr * Yn).toFixed(2)),
        Z: parseFloat((zr * Zn).toFixed(2))
    };
}

// XYZ -> RGB 转换（用于颜色显示）
function xyzToRgbForDisplay(X, Y, Z) {
    // 归一化到 0-1 范围（假设 Y 最大为 100）
    const x = X / 100.0;
    const y = Y / 100.0;
    const z = Z / 100.0;
    
    // 使用 sRGB 转换矩阵 (D65)
    let r = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
    let g = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
    let b = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;
    
    // 伽马校正 sRGB
    const gammaCorrect = (c) => {
        if (c <= 0.0031308) return 12.92 * c;
        return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    };
    
    r = gammaCorrect(r);
    g = gammaCorrect(g);
    b = gammaCorrect(b);
    
    return {
        r: Math.max(0, Math.min(1, r)),
        g: Math.max(0, Math.min(1, g)),
        b: Math.max(0, Math.min(1, b))
    };
}

// 验证Lab输入（标红无效值）
function validateLabInput(input) {
    const value = parseFloat(input.value);
    const label = input.previousElementSibling?.textContent;

    if (input.value === '') {
        input.style.borderColor = '#ddd';
        input.title = '';
        return false;
    }

    // L* 范围: 0-100, a*和b* 范围: -128到127
    let valid = false;
    let validRange = '';

    if (label === 'L*') {
        valid = value >= 0 && value <= 100;
        validRange = '0-100';
    } else {
        valid = value >= -128 && value <= 127;
        validRange = '-128~127';
    }

    if (valid) {
        input.style.borderColor = '#4CAF50';
        input.title = '';
    } else {
        input.style.borderColor = '#ff4444';
        input.title = `${label}有效范围: ${validRange}`;
    }
    return valid;
}

// 添加样品（支持多个Lab点，自动生成凸包）
// name: 样品名称
// points: Lab点数组 [{L, a, b}, ...]
// color: 颜色
// opacity: 透明度
function addSample(name, points, color = null, opacity = 0.8) {
    sampleCounter++;
    const sampleId = sampleCounter;
    const container = document.getElementById('samplesContainer');

    // 生成随机颜色（如果未指定）
    if (!color) {
        const hue = Math.floor(Math.random() * 360);
        color = hslToHex(hue, 70, 50);
    }

    // 创建样品卡片
    const card = document.createElement('div');
    card.className = 'sample-card';
    card.setAttribute('data-sample-id', sampleId);
    card.style.cssText = 'margin-bottom: 10px; padding: 10px; background: white; border: 1px solid #ddd; border-radius: 6px; display: flex; align-items: center; gap: 10px;';

    card.innerHTML = `
        <input type="checkbox" class="sample-visible" checked onchange="lab3dVisualizer.toggleSampleVisibility(${sampleId}, this.checked)"
            style="cursor: pointer; width: 18px; height: 18px;">
        <div style="width: 20px; height: 20px; background: ${color}; border-radius: 4px; border: 1px solid #ccc; flex-shrink: 0;"></div>
        <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</div>
            <div style="font-size: 0.75em; color: #888;">${points.length} 个点</div>
        </div>
        <div style="display: flex; align-items: center; gap: 5px;">
            <input type="range" class="sample-opacity" min="0" max="100" value="${opacity * 100}"
                oninput="updateSampleOpacityFromRow(this); lab3dVisualizer.setSampleOpacity(${sampleId}, this.value / 100)"
                style="width: 60px; cursor: pointer;">
            <span style="font-size: 0.75em; color: #666; width: 32px;">${Math.round(opacity * 100)}%</span>
        </div>
        <button onclick="deleteSample(this)" style="padding: 4px 8px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75em;">删除</button>
    `;

    container.appendChild(card);
    updateSamplesList();

    // 更新3D场景（创建凸包）
    lab3dVisualizer?.updateSample(sampleId, {
        name: name,
        points: points,
        color: color,
        opacity: opacity
    });

    return sampleId;
}

// 更新透明度显示
function updateSampleOpacityFromRow(slider) {
    const card = slider.closest('.sample-card');
    const opacitySpan = card.querySelector('.opacity-value') || card.querySelector('span:last-of-type');
    if (opacitySpan) {
        opacitySpan.textContent = slider.value + '%';
    }
}

// 删除样品
function deleteSample(btn) {
    const card = btn.closest('.sample-card');
    const sampleId = parseInt(card.getAttribute('data-sample-id'));
    card.remove();
    lab3dVisualizer?.removeSample(sampleId);
    updateSamplesList();
}

// 清空所有样品
function clearAllSamples() {
    document.getElementById('samplesContainer').innerHTML = '';
    sampleCounter = 0;
    lab3dVisualizer?.clearAllSamples();
}

// 切换白点
function setIlluminant(type) {
    currentIlluminant = type;

    // 更新按钮样式
    const btnD50 = document.getElementById('btnD50');
    const btnD65 = document.getElementById('btnD65');
    if (type === 'D50') {
        btnD50.className = 'btn';
        btnD50.style.background = '#ff6b9d';
        btnD65.className = 'btn btn-secondary';
        btnD65.style.background = '';
    } else {
        btnD50.className = 'btn btn-secondary';
        btnD50.style.background = '';
        btnD65.className = 'btn';
        btnD65.style.background = '#ff6b9d';
    }

    const wp = WHITE_POINTS[type];
    document.getElementById('illuminantInfo').textContent =
        `当前：${type} (Xn=${wp.Xn.toFixed(2)}, Yn=${wp.Yn.toFixed(2)}, Zn=${wp.Zn.toFixed(2)})`;

    // 重新计算所有样品
    document.querySelectorAll('.sample-input-row').forEach(row => {
        calculateSampleLab(row);
    });
}

function updateSampleOpacityLabel() {
    document.getElementById('sampleOpacityValue').textContent = document.getElementById('sampleOpacity').value;
}

function updateAllSampleStyles() {
    const opacity = document.getElementById('sampleOpacity').value / 100;
    lab3dVisualizer?.setAllSampleOpacity(opacity);
}

// 视角复位
function resetCameraView() {
    lab3dVisualizer?.resetCamera();
}

// 导出高清图片
function exportHighResImage() {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '导出中...';
    
    setTimeout(() => {
        lab3dVisualizer?.exportImage(3840, 2160);
        btn.disabled = false;
        btn.textContent = '导出4K图片';
    }, 100);
}

// 批量导入Lab Excel/CSV文件（按样品分列格式）
function handleLab3dExcelFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onerror = function() {
        alert('读取文件失败，请检查文件是否损坏');
    };

    reader.onload = function(e) {
        try {
            if (!e.target || !e.target.result) {
                throw new Error('文件读取结果为空');
            }

            let rawData = [];

            // 根据文件类型选择读取方式
            if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
                // CSV/TXT 文件直接解析文本
                const data = e.target.result;
                rawData = data.split('\n').map(line => line.split(/[,;\t]/).map(c => String(c || '').trim()));
            } else {
                // Excel 文件使用 SheetJS 库解析
                const data = new Uint8Array(e.target.result);
                if (data.length === 0) {
                    throw new Error('文件内容为空');
                }

                const workbook = XLSX.read(data, { type: 'array' });

                if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                    throw new Error('Excel文件中没有工作表');
                }

                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                if (!firstSheet) {
                    throw new Error('无法读取第一个工作表');
                }

                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null });

                if (!jsonData || !Array.isArray(jsonData)) {
                    throw new Error('Excel数据转换失败');
                }

                rawData = jsonData.map(row => Array.isArray(row) ? row.map(c => c === null || c === undefined ? '' : String(c)) : [String(row)]);
            }

            if (rawData.length < 2) {
                throw new Error('数据行数不足（需要至少1行表头 + 1行数据）');
            }

            // 询问导入模式：清空+导入 或 追加
            const choice = confirm('点击"确定"清空现有数据后导入\n点击"取消"追加到现有数据');

            if (choice) {
                // 清空现有数据
                document.getElementById('samplesContainer').innerHTML = '';
                sampleCounter = 0;
            }

            // 解析表头（第0行）识别样品
            const header = rawData[0];
            const samples = []; // { name, L_col, a_col, b_col }

            // 检测格式：纵向格式 vs 横向格式
            // 纵向格式：A=序号/空白, B=L*, C=a*, D=b* (然后可能重复)
            // 横向格式：样品名, 样品1 L*, 样品1 a*, 样品1 b*, 样品2 L*, ...
            const headerLower = header.map(h => String(h || '').trim().toLowerCase());

            // 检查是否为纵向格式
            // 纵向格式特点：只有少数几列，每列依次是 L, a, b 循环
            const nonEmptyCols = headerLower.filter(h => h !== '' && h !== '样品名' && h !== '样品' && h !== 'name' && h !== '编号' && h !== 'no' && h !== 'id');
            const hasL = nonEmptyCols.some(h => h.includes('l'));
            const hasA = nonEmptyCols.some(h => h.includes('a'));
            const hasB = nonEmptyCols.some(h => h.includes('b'));

            if (nonEmptyCols.length <= 4 && hasL && hasA && hasB) {
                // 纵向格式：按列分组，每组 L/a/b 纵向排列
                // 格式: [空白或序号], L*, a*, b* 或 [空白], L*, a*, b*, [空白], L*, a*, b*
                let colIndex = 0;
                let sampleIdx = 0;

                while (colIndex < header.length) {
                    const lHeader = headerLower[colIndex] || '';
                    const aHeader = headerLower[colIndex + 1] || '';
                    const bHeader = headerLower[colIndex + 2] || '';
                    const nextLHeader = colIndex + 3 < header.length ? headerLower[colIndex + 3] : '';

                    // 检查是否是 L, a, b 组
                    const isLCol = lHeader.includes('l');
                    const isACol = aHeader.includes('a');
                    const isBCol = bHeader.includes('b');

                    if (isLCol && isACol && isBCol) {
                        // 找到一个有效的 L/a/b 组
                        const sampleName = sampleIdx === 0 ? '样品1' : `样品${sampleIdx + 1}`;
                        samples.push({
                            name: sampleName,
                            L_col: colIndex,
                            a_col: colIndex + 1,
                            b_col: colIndex + 2,
                            isVertical: true
                        });
                        sampleIdx++;
                        colIndex += 3;

                        // 检查是否有分隔列（空白），如果有则跳过
                        while (colIndex < header.length && (headerLower[colIndex] === '' || headerLower[colIndex] === '样品名' || headerLower[colIndex] === '样品')) {
                            colIndex++;
                        }
                    } else {
                        // 不是 L/a/b 组，可能是序号列，跳过
                        colIndex++;
                    }
                }

                // 如果只找到一个样品，可能是单组纵向数据（序号, L, a, b）
                if (samples.length === 0) {
                    // 尝试直接从 B, C, D 列读取
                    samples.push({
                        name: '样品1',
                        L_col: 1,
                        a_col: 2,
                        b_col: 3,
                        isVertical: true
                    });
                }
            } else {
                // 横向格式：扫描表头，识别 "L*", "a*", "b*" 列
                // 格式：样品名, 样品1 L*, 样品1 a*, 样品1 b*, 样品2 L*, ...
                let currentSample = null;

                for (let col = 0; col < header.length; col++) {
                    const cell = String(header[col] || '').toLowerCase();

                    if (cell === '样品名' || cell === '样品' || cell === 'name' || cell === '') {
                        if (currentSample) {
                            samples.push(currentSample);
                        }
                        currentSample = { name: '', L_col: -1, a_col: -1, b_col: -1, isVertical: false };
                        if (cell && cell !== '' && cell !== '样品名' && cell !== '样品' && cell !== 'name') {
                            currentSample.name = header[col];
                        }
                    } else if (cell.includes('l*') || cell.includes('l')) {
                        if (currentSample) {
                            currentSample.L_col = col;
                        }
                    } else if (cell.includes('a*') || cell.includes('a')) {
                        if (currentSample) {
                            currentSample.a_col = col;
                        }
                    } else if (cell.includes('b*') || cell.includes('b')) {
                        if (currentSample) {
                            currentSample.b_col = col;
                        }
                    }
                }
                if (currentSample) {
                    samples.push(currentSample);
                }
            }

            if (samples.length === 0) {
                throw new Error('未识别到有效的样品列\n\n支持以下格式：\n横向：样品名, 样品1 L*, 样品1 a*, 样品1 b*, 样品2 L*, ...\n纵向：序号, L*, a*, b*（每个样品纵向排列）');
            }

            // 初始化每个样品的数据点数组
            samples.forEach(sample => {
                sample.points = [];
            });

            let imported = 0;
            let errors = 0;

            // 解析数据行（从第1行开始）
            for (let rowIdx = 1; rowIdx < rawData.length; rowIdx++) {
                const row = rawData[rowIdx];
                if (!row || row.length === 0) continue;

                // 过滤空行
                const hasData = row.some(cell => cell && cell.trim() !== '');
                if (!hasData) continue;

                // 遍历每个样品，收集数据点
                samples.forEach((sample, sampleIdx) => {
                    const L = parseFloat(row[sample.L_col]);
                    const a = parseFloat(row[sample.a_col]);
                    const b = parseFloat(row[sample.b_col]);

                    // 检查是否为有效数值
                    if (isNaN(L) || isNaN(a) || isNaN(b)) {
                        errors++;
                        return;
                    }

                    // 验证数据范围
                    if (L < 0 || L > 100 || a < -128 || a > 127 || b < -128 || b > 127) {
                        errors++;
                        return;
                    }

                    // 收集点
                    sample.points.push({ L, a, b });
                });
            }

            // 为每个样品生成颜色并添加
            samples.forEach((sample, sampleIdx) => {
                if (sample.points.length > 0) {
                    const hue = (sampleIdx * 137) % 360;
                    const color = hslToHex(hue, 70, 50);
                    addSample(sample.name, sample.points, color);
                    imported++;
                }
            });

            alert(`导入完成：成功 ${imported} 个样品（含 ${errors} 个无效数据点）`);

            // 同步更新全局透明度
            const globalOpacity = document.getElementById('sampleOpacity').value / 100;
            lab3dVisualizer?.setAllSampleOpacity(globalOpacity);

        } catch (err) {
            alert('导入失败：' + err.message);
            console.error(err);
        }
    };

    // 根据文件类型选择读取方式
    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        reader.readAsText(file, 'UTF-8');
    } else {
        reader.readAsArrayBuffer(file);
    }

    event.target.value = ''; // 重置文件输入
}

// 更新样品列表面板（现在只是更新计数显示）
function updateSamplesList() {
    const container = document.getElementById('samplesContainer');
    const cards = container.querySelectorAll('.sample-card');
    // 不需要做任何事，addSample 已经创建了卡片
}

// ==================== 凸包算法（Andrew's Monotone Chain）====================

// 2D叉积：OA × OB
function cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

// 计算点集的凸包（Andrew算法）
// 输入：points - {x, y} 数组
// 输出：凸包顶点数组（按逆时针顺序）
function convexHull(points) {
    if (points.length < 3) return points.slice();

    // 按x坐标排序，如果x相同则按y排序
    points.sort(function(a, b) {
        if (a.x !== b.x) return a.x - b.x;
        return a.y - b.y;
    });

    const n = points.length;
    const lower = [];
    for (let i = 0; i < n; i++) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) {
            lower.pop();
        }
        lower.push(points[i]);
    }

    const upper = [];
    for (let i = n - 1; i >= 0; i--) {
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) {
            upper.pop();
        }
        upper.push(points[i]);
    }

    // 移除最后一个点（因为它与第一个点重复）
    lower.pop();
    upper.pop();

    return lower.concat(upper);
}

// ==================== Three.js 3D 可视化类 ====================

class Lab3DVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.container = this.canvas.parentElement;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.samples = new Map(); // sampleId -> { mesh, points, convexHull, data }
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.init();
        this.createAxes();
        this.animate();

        // 隐藏加载提示
        const loading = document.getElementById('lab3dLoading');
        if (loading) loading.style.display = 'none';

        // 绑定点击事件
        this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    }
    
    init() {
        // 场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);
        
        // 相机（等轴测视角）
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.set(220, 180, 220);
        this.camera.lookAt(0, 50, 0);
        
        // 渲染器
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas, 
            antialias: true,
            preserveDrawingBuffer: true // 允许导出图片
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // 控制器
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
        this.controls.minDistance = 50;
        this.controls.maxDistance = 500;
        this.controls.target.set(0, 50, 0);
        
        // 光照
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 200, 100);
        this.scene.add(directionalLight);
        
        // 响应窗口大小
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    // 创建坐标轴
    createAxes() {
        const axisLength = 160;
        
        // L*轴（垂直Y轴向上和向下）
        const lOrigin = new THREE.Vector3(0, 0, 0);
        const lDir = new THREE.Vector3(0, 1, 0);
        const lNegDir = new THREE.Vector3(0, -1, 0);
        const lAxis = new THREE.ArrowHelper(lDir, lOrigin, axisLength, 0x000000, 10, 8);
        const lNegAxis = new THREE.ArrowHelper(lNegDir, lOrigin, axisLength, 0x888888, 10, 8);
        this.scene.add(lAxis);
        this.scene.add(lNegAxis);
        
        // a*轴（水平X轴，向右为红，向左为绿）
        const aOrigin = new THREE.Vector3(0, 0, 0);
        const aDir = new THREE.Vector3(1, 0, 0);
        const aNegDir = new THREE.Vector3(-1, 0, 0);
        const aAxis = new THREE.ArrowHelper(aDir, aOrigin, axisLength, 0xff0000, 10, 8);
        const aNegAxis = new THREE.ArrowHelper(aNegDir, aOrigin, axisLength, 0x00ff00, 10, 8);
        this.scene.add(aAxis);
        this.scene.add(aNegAxis);
        
        // b*轴（水平Z轴，向前为黄，向后为蓝）
        const bOrigin = new THREE.Vector3(0, 0, 0);
        const bDir = new THREE.Vector3(0, 0, 1);
        const bNegDir = new THREE.Vector3(0, 0, -1);
        const bAxis = new THREE.ArrowHelper(bDir, bOrigin, axisLength, 0xffff00, 10, 8);
        const bNegAxis = new THREE.ArrowHelper(bNegDir, bOrigin, axisLength, 0x0000ff, 10, 8);
        this.scene.add(bAxis);
        this.scene.add(bNegAxis);
        
        // 添加轴标签
        this.addAxisLabel('L*', new THREE.Vector3(0, axisLength + 20, 0), '#000000');
        this.addAxisLabel('-L*', new THREE.Vector3(0, -axisLength - 20, 0), '#888888');
        this.addAxisLabel('+a', new THREE.Vector3(axisLength + 20, 0, 0), '#ff0000');
        this.addAxisLabel('-a', new THREE.Vector3(-axisLength - 20, 0, 0), '#00ff00');
        this.addAxisLabel('+b', new THREE.Vector3(0, 0, axisLength + 20), '#ffff00');
        this.addAxisLabel('-b', new THREE.Vector3(0, 0, -axisLength - 20), '#0000ff');
    }
    
    // 创建轴标签精灵
    addAxisLabel(text, position, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // 设置文字样式（直接使用hex颜色字符串）
        context.fillStyle = color;
        context.font = 'bold 36px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 128, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture, 
            transparent: true,
            depthTest: false,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(position);
        sprite.scale.set(40, 10, 1);
        
        this.scene.add(sprite);
    }

    // 更新单个样品（创建凸包多边形）
    updateSample(sampleId, data) {
        const { name, points, color, opacity } = data;

        // 移除旧mesh
        if (this.samples.has(sampleId)) {
            this.removeSample(sampleId);
        }

        // 创建组来包含所有元素（凸包面、边界线、顶点）
        const group = new THREE.Group();
        group.name = `Sample-${sampleId}`;
        group.userData.sampleId = sampleId;
        group.userData.name = name;

        // 将Lab点转换为3D坐标
        // L*轴向上，a*轴向右，b*轴向前
        const points3D = points.map(p => new THREE.Vector3(p.a, p.L, p.b));

        if (points3D.length < 3) {
            // 如果点少于3个，创建球体标记
            if (points3D.length === 1) {
                const sphereGeom = new THREE.SphereGeometry(3, 32, 32);
                const material = new THREE.MeshPhongMaterial({
                    color: new THREE.Color(color),
                    transparent: true,
                    opacity: opacity,
                    emissive: new THREE.Color(0xffffff),
                    emissiveIntensity: 0.2
                });
                const mesh = new THREE.Mesh(sphereGeom, material);
                mesh.position.copy(points3D[0]);
                mesh.userData.sampleId = sampleId;
                mesh.userData.name = name;
                mesh.userData.lab = { L: points[0].L, a: points[0].a, b: points[0].b };
                group.add(mesh);
            }
        } else {
            // 计算凸包（在a-b平面上）
            // 使用Andrew算法计算凸包
            const points2D = points.map(p => ({ x: p.a, y: p.b }));
            const hull2D = convexHull(points2D);

            // 将凸包顶点映射回3D
            // 首先计算凸包顶点在原始点中的对应关系
            const hullIndices = [];
            hull2D.forEach(hullPoint => {
                for (let i = 0; i < points.length; i++) {
                    if (Math.abs(points[i].a - hullPoint.x) < 0.001 &&
                        Math.abs(points[i].b - hullPoint.y) < 0.001) {
                        hullIndices.push(i);
                        break;
                    }
                }
            });

            const hull3D = hullIndices.map(i => points3D[i]);

            // 1. 凸包填充面 - 已禁用（禁止面与面之间的连线）
            // const center = new THREE.Vector3();
            // hull3D.forEach(p => center.add(p));
            // center.divideScalar(hull3D.length);
            // const positions = [];
            // const normals = [];
            // for (let i = 0; i < hull3D.length; i++) {
            //     const p1 = hull3D[i];
            //     const p2 = hull3D[(i + 1) % hull3D.length];
            //     positions.push(center.x, center.y, center.z);
            //     positions.push(p1.x, p1.y, p1.z);
            //     positions.push(p2.x, p2.y, p2.z);
            //     const edge1 = new THREE.Vector3().subVectors(p1, center);
            //     const edge2 = new THREE.Vector3().subVectors(p2, center);
            //     const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
            //     normals.push(normal.x, normal.y, normal.z);
            //     normals.push(normal.x, normal.y, normal.z);
            //     normals.push(normal.x, normal.y, normal.z);
            // }
            // const faceGeometry = new THREE.BufferGeometry();
            // faceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            // faceGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
            // const faceMaterial = new THREE.MeshPhongMaterial({
            //     color: new THREE.Color(color),
            //     transparent: true,
            //     opacity: opacity,
            //     side: THREE.DoubleSide,
            //     depthWrite: false
            // });
            // const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
            // faceMesh.userData.sampleId = sampleId;
            // group.add(faceMesh);

            // 2. 凸包边界线 - 已禁用（禁止点与点之间连线）
            // const linePositions = [];
            // for (let i = 0; i < hull3D.length; i++) {
            //     const p1 = hull3D[i];
            //     const p2 = hull3D[(i + 1) % hull3D.length];
            //     linePositions.push(p1.x, p1.y, p1.z);
            //     linePositions.push(p2.x, p2.y, p2.z);
            // }
            // const lineGeometry = new THREE.BufferGeometry();
            // lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
            // const lineMaterial = new THREE.LineBasicMaterial({
            //     color: new THREE.Color(color),
            //     linewidth: 2
            // });
            // const line = new THREE.LineSegments(lineGeometry, lineMaterial);
            // line.userData.sampleId = sampleId;
            // group.add(line);

            // 3. 创建顶点标记（显示所有数据点）
            points3D.forEach(p => {
                const sphereGeom = new THREE.SphereGeometry(2, 16, 16);
                const material = new THREE.MeshPhongMaterial({
                    color: new THREE.Color(color),
                    transparent: true,
                    opacity: 1.0
                });
                const mesh = new THREE.Mesh(sphereGeom, material);
                mesh.position.copy(p);
                mesh.userData.sampleId = sampleId;
                group.add(mesh);
            });
        }

        this.scene.add(group);

        this.samples.set(sampleId, {
            group: group,
            points: points3D,
            data: { name, points, color, opacity }
        });
    }

    // 移除样品
    removeSample(sampleId) {
        if (this.samples.has(sampleId)) {
            const sample = this.samples.get(sampleId);
            if (sample.group) {
                this.scene.remove(sample.group);
                // 遍历删除所有几何体和材质
                sample.group.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            }
            this.samples.delete(sampleId);
        }
    }

    // 清空所有样品
    clearAllSamples() {
        this.samples.forEach((sample, sampleId) => {
            this.removeSample(sampleId);
        });
    }

    // 设置所有样品透明度
    setAllSampleOpacity(opacity) {
        this.samples.forEach(sample => {
            if (sample.group) {
                sample.group.traverse(child => {
                    if (child.material && child.material.transparent) {
                        child.material.opacity = opacity;
                        child.material.needsUpdate = true;
                    }
                });
            }
        });
    }

    // 设置单个样品透明度
    setSampleOpacity(sampleId, opacity) {
        if (this.samples.has(sampleId)) {
            const sample = this.samples.get(sampleId);
            if (sample.group) {
                sample.group.traverse(child => {
                    if (child.material && child.material.transparent) {
                        child.material.opacity = opacity;
                        child.material.needsUpdate = true;
                    }
                });
            }
        }
    }

    // 切换样品可见性
    toggleSampleVisibility(sampleId, visible) {
        if (this.samples.has(sampleId)) {
            const sample = this.samples.get(sampleId);
            if (sample.group) sample.group.visible = visible;
        }
    }
    
    // 视角复位
    resetCamera() {
        this.camera.position.set(220, 180, 220);
        this.camera.lookAt(0, 50, 0);
        this.controls.target.set(0, 50, 0);
        this.controls.update();
    }
    
    // 导出高清图片
    exportImage(width, height) {
        // 保存原始状态
        const originalSize = {
            w: this.renderer.domElement.width,
            h: this.renderer.domElement.height
        };
        
        // 临时调整渲染器大小
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        // 渲染一帧
        this.renderer.render(this.scene, this.camera);
        
        // 获取图像数据
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = `CIE-Lab-3D-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.png`;
        link.href = dataURL;
        link.click();
        
        // 恢复原始大小
        this.renderer.setSize(originalSize.w, originalSize.h);
        this.camera.aspect = originalSize.w / originalSize.h;
        this.camera.updateProjectionMatrix();
    }
    
    // 窗口大小调整
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    // 动画循环
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    // 画布点击事件（显示样品信息）
    onCanvasClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // 检测与所有样品的交叉
        const allObjects = [];
        this.samples.forEach(s => {
            if (s.group) {
                s.group.traverse(child => {
                    if (child.isMesh) {
                        allObjects.push(child);
                    }
                });
            }
        });

        const intersects = this.raycaster.intersectObjects(allObjects, false);

        const tooltip = document.getElementById('lab3dTooltip');
        if (intersects.length > 0) {
            const obj = intersects[0].object;
            const sampleId = obj.userData.sampleId;
            const sample = this.samples.get(sampleId);

            if (sample && sample.data) {
                const { name, points } = sample.data;
                const pointCount = points.length;
                tooltip.innerHTML = `
                    <strong>${name}</strong><br>
                    ${pointCount} 个数据点
                `;
                tooltip.style.display = 'block';
                tooltip.style.left = (event.clientX - rect.left + 15) + 'px';
                tooltip.style.top = (event.clientY - rect.top + 15) + 'px';
            }
        } else {
            tooltip.style.display = 'none';
        }
    }
}

// ==================== 初始化与标签页切换 ====================

let initCalled = false;

// 标签页切换时初始化3D场景
const originalSwitchTab = window.switchTab || function() {};
window.switchTab = function(index) {
    originalSwitchTab(index);
    if (index === 1) { // CIE Lab标签页
        if (!lab3dVisualizer) {
            setTimeout(() => {
                lab3dVisualizer = new Lab3DVisualizer('lab3dCanvas');
            }, 100);
        }
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化时不添加默认样品，等待用户导入
});
