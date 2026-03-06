// src/modules/question-extractor/services/analyzer.service.ts
import { BOUNDS, ANALYZER_CONFIG, PDF_CONFIG } from "@/lib/constants";

/* ====================================================================
 * 1. Text Analyzer (단일 책임: 텍스트 추출 및 구조화)
 * ==================================================================== */
const PdfTextAnalyzer = {
  async analyze(page: any) {
    console.log(`[TextAnalyzer] 분석 시작 (페이지: ${page._pageIndex + 1})`);
    const textContent = await page.getTextContent();
    const { width, height } = page.getViewport({ scale: 1.0 });
    const rows: { [key: number]: any[] } = {};

    textContent.items.forEach((item: any) => {
      if (!item.str?.trim()) return;
      const roundedY = Math.round(item.transform[5]);
      const targetY =
        Object.keys(rows).find(
          (ry) => Math.abs(Number(ry) - roundedY) <= ANALYZER_CONFIG.ROW_THRESHOLD
        ) || roundedY;

      if (!rows[Number(targetY)]) rows[Number(targetY)] = [];
      rows[Number(targetY)].push({
        str: item.str,
        x: item.transform[4],
        relX: (item.transform[4] / width) * PDF_CONFIG.COORDINATE_MAX,
      });
    });

    const leftQs: any[] = []; const rightQs: any[] = [];
    const leftPoints: any[] = []; const rightPoints: any[] = [];

    Object.keys(rows).forEach((yKey) => {
      const rowItems = rows[Number(yKey)].sort((a, b) => a.x - b.x);
      const relY = (1 - Number(yKey) / height) * PDF_CONFIG.COORDINATE_MAX;

      const leftItems = rowItems.filter((i) => i.relX < 500);
      const rightItems = rowItems.filter((i) => i.relX >= 500);

      const processCol = (items: any[], qList: any[], pList: any[]) => {
        if (items.length === 0) return;
        const text = items.map((i) => i.str).join("");
        const qMatch = text.match(ANALYZER_CONFIG.Q_NO_REGEX);
        if (qMatch) qList.push({ no: parseInt(qMatch[1], 10), y: relY });
        const pMatch = text.match(/\[(\d+)점\]/);
        if (pMatch) pList.push({ val: parseInt(pMatch[1], 10), y: relY });
      };

      processCol(leftItems, leftQs, leftPoints);
      processCol(rightItems, rightQs, rightPoints);
    });

    const getCount = (qs: any[]): 1 | 2 | "Error" => [1, 2].includes(qs.length) ? qs.length as 1 | 2 : "Error";

    return {
      left: { column: "left" as const, questionCount: getCount(leftQs), questions: leftQs, points: leftPoints },
      right: { column: "right" as const, questionCount: getCount(rightQs), questions: rightQs, points: rightPoints },
      allTextItems: textContent.items,
    };
  }
};

/* ====================================================================
 * 2. Pixel Scanner (단일 책임: 픽셀 기반 Y좌표 정밀 스캔)
 * ==================================================================== */
const PdfPixelScanner = {
  /**
   * 규칙 1: 페이지 공통 Y기준값 찾기 (구분선 탐색)
   */
  findYReference(imageData: any, width: number, height: number): number {
    console.log("[PixelScanner] findYReference 스캔 시작...");
    const data = imageData.data;
    let foundDarkLine = false;
    const startX = Math.floor((150 / 1000) * width);
    const endX = Math.floor((495 / 1000) * width);
    const scanWidth = endX - startX + 1;
    const darkLineThreshold = scanWidth * 0.95;

    for (let y = 0; y < height; y++) {
      let nonWhiteCount = 0;
      for (let x = startX; x <= endX; x++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] > 0 && (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240)) {
          nonWhiteCount++;
        }
      }

      if (!foundDarkLine) {
        if (nonWhiteCount >= darkLineThreshold) {
          foundDarkLine = true;
          console.log(`[PixelScanner] 구분선(Dark Line) 발견: 픽셀 y=${y}`);
        }
      } else {
        if (nonWhiteCount === 0) {
          const yRefRel = (y / height) * PDF_CONFIG.COORDINATE_MAX;
          console.log(`[PixelScanner] Y기준점 확정 (구분선 아래 흰 줄): 상댓값 y=${yRefRel.toFixed(2)}`);
          return yRefRel;
        }
      }
    }
    throw new Error("Y-Reference 구분선을 감지하지 못했습니다. (150-495 영역에 가로선이 없거나 렌더링 오류)");
  },

  /**
   * 규칙 2: 특수 텍스트 블록 스킵 후 YMax 결정
   */
  findSkipBlockY(imageData: any, width: number, height: number, yRefRel: number, col: "left" | "right"): number {
    console.log(`[PixelScanner] [${col}] findSkipBlockY 스캔 시작 (기준: ${yRefRel.toFixed(2)})`);
    const data = imageData.data;
    let foundBlock = false;
    const xRange = col === "left" ? { start: 50, end: 495 } : { start: 505, end: 950 };
      
    const startX = Math.floor((xRange.start / 1000) * width);
    const endX = Math.floor((xRange.end / 1000) * width);
    const startY = Math.floor((yRefRel / PDF_CONFIG.COORDINATE_MAX) * height);

    for (let y = startY; y < height; y++) {
      let hasPixel = false;
      for (let x = startX; x <= endX; x++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] > 0 && (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240)) {
          hasPixel = true;
          break;
        }
      }

      if (!foundBlock) {
        if (hasPixel) {
          foundBlock = true;
          console.log(`[PixelScanner] [${col}] 콘텐츠 블록 시작점 발견: 픽셀 y=${y}`);
        }
      } else {
        if (!hasPixel) {
          const skipY = (y / height) * PDF_CONFIG.COORDINATE_MAX;
          console.log(`[PixelScanner] [${col}] 콘텐츠 블록 종료점 발견: 상댓값 y=${skipY.toFixed(2)}`);
          return skipY;
        }
      }
    }
    console.warn(`[PixelScanner] [${col}] 블록 종료점을 찾지 못했습니다. yRefRel 반환.`);
    return yRefRel;
  },

  /**
   * 규칙 YMin: 문항 1개일 때 하단 여백 스캔
   */
  findGapYMin(imageData: any, width: number, height: number, startYRel: number, col: "left" | "right"): number {
    console.log(`[PixelScanner] [${col}] findGapYMin 스캔 시작 (120px 여백 탐색)`);
    const data = imageData.data;
    const xRange = col === "left" ? { start: 50, end: 495 } : { start: 505, end: 950 };

    const startX = Math.floor((xRange.start / 1000) * width);
    const endX = Math.floor((xRange.end / 1000) * width);
    const startY = Math.floor((startYRel / PDF_CONFIG.COORDINATE_MAX) * height);
    const targetGapPx = Math.floor((120 / PDF_CONFIG.COORDINATE_MAX) * height);
    
    let whiteCount = 0;

    for (let y = startY; y < height; y++) {
      let isWhiteRow = true;
      for (let x = startX; x <= endX; x++) {
        const i = (y * width + x) * 4;
        if (data[i + 3] > 0 && (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240)) {
          isWhiteRow = false;
          break;
        }
      }

      if (isWhiteRow) {
        whiteCount++;
        if (whiteCount >= targetGapPx) {
          const gapY = ((y - whiteCount + 1) / height) * PDF_CONFIG.COORDINATE_MAX;
          console.log(`[PixelScanner] [${col}] 120 여백 지점 발견: 상댓값 y=${gapY.toFixed(2)}`);
          return gapY;
        }
      } else {
        whiteCount = 0;
      }
    }
    console.log(`[PixelScanner] [${col}] 여백을 찾지 못해 하단 900 적용`);
    return 900;
  }
};

/* ====================================================================
 * 3. Layout Calculator (단일 책임: 최종 직사각형 영역 계산)
 * ==================================================================== */
const PdfLayoutCalculator = {
  calculate(
    col: "left" | "right",
    analysis: any,
    pageIndex: number,
    pixelContext: { imageData: any; width: number; height: number }
  ) {
    const { imageData, width, height } = pixelContext;
    const colData = analysis[col];
    const sortedQs = [...colData.questions].sort((a, b) => a.y - b.y);

    console.log(`\n--- [Layout] Page:${pageIndex + 1} Col:${col} 분석 시작 ---`);

    // 1. 공통 Y기준값
    const yRef = PdfPixelScanner.findYReference(imageData, width, height);

    // 2. 🎯 ymax 결정: 특수 텍스트 존재 여부 정밀 확인
    const rawColText = analysis.allTextItems
      .filter((item: any) => {
        const rx = (item.transform[4] / width) * PDF_CONFIG.COORDINATE_MAX;
        return col === "left" ? rx < 500 : rx >= 500;
      })
      .map((item: any) => item.str)
      .join("");

    // 공백을 모두 제거하여 인식률 극대화
    const cleanText = rawColText.replace(/\s+/g, "");
    const hasSpecialText = cleanText.includes("단답형") || cleanText.includes("5지선다형");

    console.log(`[Layout] [${col}] RawText 추출 길이: ${rawColText.length}`);
    console.log(`[Layout] [${col}] CleanText 매칭용: ${cleanText.substring(0, 50)}...`);
    console.log(`[Layout] [${col}] 특수 텍스트(단답/5지) 발견 여부: ${hasSpecialText}`);

    const yStart = hasSpecialText 
      ? PdfPixelScanner.findSkipBlockY(imageData, width, height, yRef, col) 
      : yRef;

    console.log(`[Layout] [${col}] 최종 yStart: ${yStart.toFixed(2)}`);

    const xStart = col === "left" ? BOUNDS.LEFT_START : BOUNDS.RIGHT_START;
    const xWidth = col === "left" 
      ? BOUNDS.LEFT_END - BOUNDS.LEFT_START 
      : BOUNDS.RIGHT_END - BOUNDS.RIGHT_START;

    const results = [];

    // 3. 문항 수에 따른 처리
    if (sortedQs.length === 1) {
      const q = sortedQs[0];
      const yMin = PdfPixelScanner.findGapYMin(imageData, width, height, yStart, col);
      console.log(`[Layout] [${col}] 문항 1개 감지 (Q${q.no}). yMin 스캔 결과: ${yMin.toFixed(2)}`);
      results.push({ qNo: q.no, rect: { x: xStart, y: yStart, w: xWidth, h: yMin - yStart } });
    } else if (sortedQs.length >= 2) {
      console.log(`[Layout] [${col}] 문항 2개 감지 (${sortedQs.map(q => q.no).join(", ")}).`);
      for (let j = 0; j < sortedQs.length; j++) {
        const q = sortedQs[j];
        let currentY = j === 0 ? yStart : sortedQs[j].y - 40;
        let yMin = j < sortedQs.length - 1 ? sortedQs[j + 1].y - 40 : 900;
        
        console.log(`[Layout] [${col}] Q${q.no} 영역: y=${currentY.toFixed(2)} ~ ${yMin.toFixed(2)} (h=${(yMin-currentY).toFixed(2)})`);
        results.push({ qNo: q.no, rect: { x: xStart, y: currentY, w: xWidth, h: yMin - currentY } });
      }
    }

    return results;
  }
};

/* ====================================================================
 * 4. Facade Export
 * ==================================================================== */
export const AnalyzerService = {
  analyzePdfText: (page: any) => PdfTextAnalyzer.analyze(page),
  calculateRects: (col: "left" | "right", analysis: any, pageIndex: number, pixelContext: any) => 
    PdfLayoutCalculator.calculate(col, analysis, pageIndex, pixelContext)
};