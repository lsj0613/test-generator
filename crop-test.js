const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const AI_DATA = {
    LEFT: [
        { q_num: 1, y_range: [234, 318] },
        { q_num: 2, y_range: [544, 610] }
    ],
    RIGHT: [
        { q_num: 3, y_range: [196, 262] },
        { q_num: 4, y_range: [418, 845] }
    ]
};

const COL_X = {
    LEFT:  { min: 55, max: 485 },
    RIGHT: { min: 515, max: 945 }
};

const WHITE_LEVEL = 252; // 평가원 PDF용 정밀 임계값
const toPx = (rel, total) => Math.floor((rel / 1000) * total);

function isRowWhite(data, width) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    return (sum / data.length) >= WHITE_LEVEL;
}

async function cropProcess() {
    const inputPath = './test.png';
    const outputDir = './output';
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const image = sharp(inputPath);
    const { width, height } = await image.metadata();

    console.log(`\n🚀 [분석 시작] 해상도: ${width}x${height}`);

    for (const side of ['LEFT', 'RIGHT']) {
        const xRange = COL_X[side];
        
        for (const item of AI_DATA[side]) {
            console.log(`\n--- Q${item.q_num} (${side}) 처리 ---`);

            const left = toPx(xRange.min, width);
            const colWidth = toPx(xRange.max - xRange.min, width);
            
            // 분석 범위를 상단 200px, 하단 400px 더 넓게 잡아 '흰 줄'을 찾을 공간 확보
            const scanTopRel = Math.max(0, item.y_range[0] - 50); // 상단 약 250px 여유
            const scanBottomRel = Math.min(1000, item.y_range[1] + 150); // 하단 약 750px 여유
            
            const pTop = toPx(scanTopRel, height);
            const pHeight = toPx(scanBottomRel - scanTopRel, height);

            const strip = await image.clone()
                .extract({ left, top: pTop, width: colWidth, height: pHeight })
                .grayscale().raw().toBuffer({ resolveWithObject: true });

            const { data, info } = strip;
            const aiYMinInStrip = toPx(item.y_range[0], height) - pTop;
            const aiYMaxInStrip = toPx(item.y_range[1], height) - pTop;

            // 1. 상단 스캔 (Upward): AI 좌표부터 위로 올라가며 첫 흰 줄 찾기
            let finalTopInStrip = aiYMinInStrip;
            for (let y = aiYMinInStrip; y >= 0; y--) {
                const row = data.slice(y * info.width, (y + 1) * info.width);
                if (isRowWhite(row, info.width)) {
                    finalTopInStrip = y;
                    break;
                }
                finalTopInStrip = y;
            }

            // 2. 하단 스캔 (Downward): AI 좌표부터 내려가며 큰 공백(5%) 찾기
            let finalBottomInStrip = aiYMaxInStrip;
            let whiteCount = 0;
            const gapLimit = Math.floor(height * 0.05); // 5% 여백 임계값

            for (let y = aiYMaxInStrip; y < info.height; y++) {
                const row = data.slice(y * info.width, (y + 1) * info.width);
                if (isRowWhite(row, info.width)) {
                    whiteCount++;
                } else {
                    finalBottomInStrip = y;
                    whiteCount = 0;
                }
                if (whiteCount > gapLimit) break;
            }

            // 3. 최종 절대 좌표 계산
            const finalTop = pTop + finalTopInStrip;
            const finalBottom = pTop + finalBottomInStrip;
            const finalHeight = finalBottom - finalTop + 5; // 하단 여유 5px

            // [안전 가드] 이미지 경계를 넘지 않도록 제한
            const safeTop = Math.max(0, Math.floor(finalTop));
            const safeHeight = Math.min(Math.floor(finalHeight), height - safeTop);
            const safeLeft = Math.max(0, Math.floor(left));
            const safeWidth = Math.min(Math.floor(colWidth), width - safeLeft);

            console.log(`📍 결과: Top ${safeTop}, Height ${safeHeight} (Gap Limit: ${gapLimit}px)`);

            try {
                await image.clone()
                    .extract({ left: safeLeft, top: safeTop, width: safeWidth, height: safeHeight })
                    .trim({
                        background: { r: 255, g: 255, b: 255, alpha: 1 }, // 흰색 배경 기준
                        threshold: 10 // 255에서 10만큼의 오차(245~255)는 모두 여백으로 간주하고 깎음
                    })
                                        .toFile(path.join(outputDir, `q_${item.q_num}.png`));
                console.log(`✅ q_${item.q_num}.png 저장 성공`);
            } catch (err) {
                console.error(`❌ q_${item.q_num} 실패: ${err.message}`);
            }
        }
    }
}

cropProcess().catch(console.error);