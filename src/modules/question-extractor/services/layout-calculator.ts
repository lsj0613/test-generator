import { PDF_LAYOUT_CONFIG, PDF_CONFIG, ANALYZER_CONFIG } from "@/lib/constants";
import { ExtractedQuestion, AnalysisResult } from "../types";
import { PdfPixelScanner } from "./pixel-scanner";

export const PdfLayoutCalculator = {
  calculate(
    colId: "left" | "right",
    analysis: AnalysisResult,
    examDate: string,
    pixelContext: { imageData: any; width: number; height: number }
  ): ExtractedQuestion[] {
    const { imageData, width, height } = pixelContext;
    const colConfig = PDF_LAYOUT_CONFIG.COLUMNS[colId];
    const colData = analysis[colId]; // analysis.left 또는 analysis.right
    const sortedQs = [...colData.questions].sort((a, b) => a.y - b.y);

    // 1. Y-Reference 기준선 감지
    const yRef = PdfPixelScanner.findYReference(imageData, width, height);

    /**
     * [수정 구간] 
     * 기존: rawColText를 직접 추출해서 "단답형/5지선다형"을 다시 검사함
     * 변경: PdfTextAnalyzer에서 이미 계산된 colData.hasTypeKeyword를 사용함
     */
    const hasSpecialText = colData.hasTypeKeyword;

    // 2. 시작 Y 좌표 결정 (특수 텍스트 포함 시 블록 건너뛰기 수행)
    const yStart = hasSpecialText 
      ? PdfPixelScanner.findSkipBlockY(imageData, width, height, yRef, colId) 
      : yRef;

    const xStart = colConfig.xStart;
    const xWidth = colConfig.xEnd - colConfig.xStart;

    const results: ExtractedQuestion[] = [];

    // 3. 문항 영역(Rect) 계산 로직 (기존 로직 절대 보존)
    if (sortedQs.length === 1) {
      const q = sortedQs[0];
      const yMin = PdfPixelScanner.findGapYMin(imageData, width, height, yStart, colId);
      results.push({ 
        qNo: q.no, 
        category: analysis.pageCategory,
        examDate,
        rect: { x: xStart, y: yStart, w: xWidth, h: yMin - yStart } 
      });
    } else if (sortedQs.length >= 2) {
      for (let j = 0; j < sortedQs.length; j++) {
        const q = sortedQs[j];
        let currentY = j === 0 ? yStart : sortedQs[j].y - ANALYZER_CONFIG.Q_Y_OFFSET;
        let yMin = j < sortedQs.length - 1 
          ? sortedQs[j + 1].y - ANALYZER_CONFIG.Q_Y_OFFSET 
          : ANALYZER_CONFIG.Y_MIN_DEFAULT;
        
        results.push({ 
          qNo: q.no, 
          category: analysis.pageCategory,
          examDate,
          rect: { x: xStart, y: currentY, w: xWidth, h: yMin - currentY } 
        });
      }
    }

    return results;
  }
};