import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import { createCanvas } from 'canvas';

const CONFIG = {
  COORDS: {
    P1_LEFT_YMAX: 220,  
    P1_RIGHT_YMAX: 190, 
    P2_YMAX: 130,       
    P6_YMAX: 160,       
    LIMIT_Y: 900,       
    Q30_SPECIAL_Y: 590, 
  },
  BOUNDS: { leftStart: 55, leftEnd: 495, rightStart: 505, rightEnd: 945 },
  WORK: {
    PDF_PATH: path.join(process.cwd(), 'public/test.pdf'),
    OUTPUT_DIR: path.join(process.cwd(), 'idx-exports'),
    START_PAGE: 1,
    END_PAGE: 3, // 테스트를 위해 3페이지까지만
  },
  RENDER: { SCALE: 5.0 }
};

async function runDebugPipeline() {
  const { PDF_PATH: pdfPath, OUTPUT_DIR: outputDir, START_PAGE: start, END_PAGE: end } = CONFIG.WORK;
  if (!fs.existsSync(pdfPath)) return console.error("❌ PDF 실종");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdfDoc = await pdfjsLib.getDocument({ data, disableFontFace: true }).promise;

  for (let i = start - 1; i < Math.min(end, pdfDoc.numPages); i++) {
    const page = await pdfDoc.getPage(i + 1);
    const viewport1x = page.getViewport({ scale: 1.0 });
    const { width: pW, height: pH } = viewport1x;

    const textContent = await page.getTextContent();
    const validItems = textContent.items.filter((item): item is any => 'str' in item);
    
    // [LOG] 전체 텍스트 수 확인
    console.log(`\n[PAGE ${i + 1}] -------------------------------------------`);

    const filteredItems = validItems.filter((item) => {
      const relY = (1 - item.transform[5] / pH) * 1000;
      return relY <= CONFIG.COORDS.LIMIT_Y;
    });

    const analysis = getAnalysis(filteredItems, pW, pH);
    
    // 특수 페이지 판단 로그
    const topItems = filteredItems.filter(item => (1 - item.transform[5] / pH) * 1000 < 200);
    const topText = topItems.map(item => item.str).join(' ');
    const isSpecialPage = topText.includes('학년도') || topText.includes('문제지');
    console.log(`> 특수 페이지 판단: ${isSpecialPage ? 'YES (학년도/문제지 감지)' : 'NO'}`);
    console.log(`  └ 상단 텍스트: "${topText.substring(0, 50)}..."`);

    for (const col of ['left', 'right'] as const) {
      console.log(`\n  [${col.toUpperCase()}단 분석]`);
      
      const colItems = filteredItems.filter(item => {
        const relX = (item.transform[4] / pW) * 1000;
        // 디버깅을 위해 '5지'나 '단답'이라는 글자가 포함된 경우 X좌표 로그 출력
        if (item.str.includes('5지') || item.str.includes('단답')) {
          console.log(`    📍 키워드 발견: "${item.str}" (relX: ${Math.round(relX)})`);
        }
        return col === 'left' ? relX < 500 : relX >= 500;
      });

      const colText = colItems.map(item => item.str).join('');
      const hasSpecialType = colText.includes('5지선다형') || colText.includes('단답형');
      
      console.log(`    - 결합 텍스트: "${colText.substring(0, 60)}..."`);
      console.log(`    - 5지/단답 감지: ${hasSpecialType ? '✅ TRUE' : '❌ FALSE'}`);

      let yStart = isSpecialPage 
        ? (hasSpecialType ? CONFIG.COORDS.P1_LEFT_YMAX : CONFIG.COORDS.P1_RIGHT_YMAX) 
        : (hasSpecialType ? CONFIG.COORDS.P6_YMAX : CONFIG.COORDS.P2_YMAX);

      console.log(`    - 최종 적용 yStart: ${yStart}`);

      const sortedQs = [...analysis[col].questions].sort((a, b) => a.y - b.y);
      for (const q of sortedQs) {
        // 실제 크롭 로직은 기존과 동일
        const xStart = col === 'left' ? CONFIG.BOUNDS.leftStart : CONFIG.BOUNDS.rightStart;
        const xWidth = col === 'left' ? (CONFIG.BOUNDS.leftEnd - CONFIG.BOUNDS.leftStart) : (CONFIG.BOUNDS.rightEnd - CONFIG.BOUNDS.rightStart);
        
        let finalY = (q.no === 30) ? CONFIG.COORDS.Q30_SPECIAL_Y : yStart;
        let h = CONFIG.COORDS.LIMIT_Y - finalY;

        // 2문항인 경우의 높이 처리 (단순화된 기존 로직 유지)
        if (sortedQs.length >= 2 && q === sortedQs[0]) {
           let yMid = sortedQs[1].y - 40;
           if (sortedQs[1].no === 30) yMid = CONFIG.COORDS.Q30_SPECIAL_Y;
           h = yMid - finalY;
        } else if (sortedQs.length >= 2 && q === sortedQs[1]) {
           let yMid = sortedQs[1].y - 40;
           if (sortedQs[1].no === 30) yMid = CONFIG.COORDS.Q30_SPECIAL_Y;
           finalY = (q.no === 30) ? CONFIG.COORDS.Q30_SPECIAL_Y : yMid;
           h = CONFIG.COORDS.LIMIT_Y - finalY;
        }

        await executePureCrop(page, q.no, { x: xStart, y: finalY, w: xWidth, h }, outputDir);
      }
    }
  }
}

async function executePureCrop(page: any, qNo: number, rect: any, outputDir: string) {
  try {
    const scale = CONFIG.RENDER.SCALE;
    const viewport = page.getViewport({ scale });
    const canvas: any = createCanvas(viewport.width, viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    
    const left = Math.round((rect.x / 1000) * viewport.width);
    const top = Math.round((rect.y / 1000) * viewport.height);
    const width = Math.round((rect.w / 1000) * viewport.width);
    const height = Math.round((rect.h / 1000) * viewport.height);

    await sharp(canvas.toBuffer('image/png'))
      .extract({ left: Math.max(0, left), top: Math.max(0, top), width, height })
      .toFile(path.join(outputDir, `Q${qNo.toString().padStart(2, '0')}.png`));

    console.log(`    ✅ [Q${qNo}] 저장 (Y:${Math.round(rect.y)})`);
  } catch (err) { /* 에러 생략 */ }
}

function getAnalysis(items: any[], width: number, height: number) {
  const left: any[] = []; const right: any[] = [];
  const regex = /^\s*(\d+)[.,\s]/;
  items.forEach((item) => {
    const rx = (item.transform[4] / width) * 1000;
    const ry = (1 - item.transform[5] / height) * 1000;
    const m = item.str.match(regex);
    if (m) {
      const info = { no: parseInt(m[1]), y: ry };
      if (rx < 500) left.push(info); else right.push(info);
    }
  });
  return { left: { questions: left }, right: { questions: right } };
}

runDebugPipeline().catch(console.error);