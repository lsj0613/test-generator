import {
  PDF_LAYOUT_CONFIG,
} from "@/lib/constants";
import { ExtractedQuestion, PageAnalysisResult } from "../types";
import { PdfPixelScanner } from "./pixel-scanner";

export const PdfLayoutCalculator = {
  calculate(
    colId: "left" | "right",
    analysis: PageAnalysisResult,
    pixelContext: { imageData: any; width: number; height: number }
  ): ExtractedQuestion[] {
    const { imageData, width, height } = pixelContext;
    const colConfig = PDF_LAYOUT_CONFIG.COLUMNS[colId];
    const colData = analysis[colId]; // analysis.left 또는 analysis.right
    const sortedQs = [...colData.questions].sort((a, b) => a.qNo - b.qNo);
    // 1. Y-Reference 기준선 감지
    const yRef = PdfPixelScanner.findYReference(imageData, width, height);

    const hasSpecialText = !!colData.Keyword;

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
      const yMin = PdfPixelScanner.findGapYMin(
        imageData,
        width,
        height,
        yStart,
        colId
      );
      results.push({
        qNo: q.qNo,
        point: q.point,
        rect: { x: xStart, y: yStart, w: xWidth, h: yMin - yStart },
      });
    } else if (sortedQs.length >= 2) {
      let nextYStart = yStart; // 다음 문항이 시작될 기준 좌표

      for (let j = 0; j < sortedQs.length; j++) {
        const q = sortedQs[j];
        const currentY = nextYStart; // 이전 문항의 yMin을 시작점으로 할당

        let yMin: number;
        if (j < sortedQs.length - 1) {
          // 현재 문항의 시작점 이후부터 스캔하여 공백(경계) 탐색
          // 텍스트 바로 위에서 멈추는 걸 방지하기 위해 최소한의 offset(예: 10)을 더해서 보낼 수도 있음
          yMin = PdfPixelScanner.findGapYMin(
            imageData,
            width,
            height,
            currentY + 5, // 픽셀 인식 간섭 방지 마진
            colId
          );
          nextYStart = yMin; // 이번에 찾은 경계를 다음 문항의 시작점으로 저장
        } else {
          yMin = 900;
        }

        results.push({
          qNo: q.qNo,
          point: q.point,
          rect: {
            x: xStart,
            y: currentY,
            w: xWidth,
            h: yMin - currentY,
          },
        });
      }
    }

    return results;
  },
};
