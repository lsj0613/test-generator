// src/app/actions/pdf-action.ts
"use server";

import { R2Service } from "@/features/extract_question/services/r2.service";
import { PdfProcessor } from "@/features/extract_question/services/pdf.service";
import { AnalyzerService } from "@/features/extract_question/services/analyzer.service";
import { PDF_CONFIG } from "@/lib/constants";

/**
 * @param testId '202507C' (끝자리 문자로 카테고리 자동 판단)
 * @param coords UI에서 조정된 좌표 객체
 */
export async function processAndUploadToR2(
  testId: string,
  coords: any
) {
  try {
    // 🎯 서비스 내부 로직을 통해 카테고리별 경로에서 PDF 다운로드
    const pdfBuffer = await R2Service.downloadPdf(testId);
    const pdfDoc = await PdfProcessor.loadDocument(pdfBuffer);

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const { height, width } = page.getViewport({ scale: 1.0 });

      // 1. 텍스트 분석 (문항 번호 및 배점 추출)
      const analysis = await AnalyzerService.analyzePdfText(page);

      // 2. 페이지 특성 판단 (상단 150 영역 내 '학년도' 등 확인)
      const isSpecialPage = analysis.allTextItems.some(
        (item: any) =>
          (1 - item.transform[5] / height) * PDF_CONFIG.COORDINATE_MAX < 150 &&
          (item.str.includes("학년도") || item.str.includes("문제지"))
      );

      for (const col of ["left", "right"] as const) {
        // 3. 해당 단의 텍스트만 모아서 특수 타입(5지/단답) 확인
        const colText = analysis.allTextItems
          .filter((item: any) => {
            const rx = (item.transform[4] / width) * PDF_CONFIG.COORDINATE_MAX;
            return col === "left" ? rx < 500 : rx >= 500;
          })
          .map((item: any) => item.str)
          .join("")
          .replace(/\s+/g, "");

        const hasSpecialType =
          colText.includes("5지선다형") || colText.includes("단답형");

        // 4. 좌표 계산
        const rects = AnalyzerService.calculateRects(
          col,
          analysis,
          isSpecialPage,
          hasSpecialType,
          coords
        );

        // 5. 자르기 및 업로드 (파일명 규칙 자동 적용)
        for (const item of rects) {
          const croppedBuffer = await PdfProcessor.crop(page, item.rect);
          await R2Service.uploadImage(testId, item.qNo, croppedBuffer);
        }
      }
    }
    return { success: true };
  } catch (error: any) {
    console.error("❌ 처리 실패:", error);
    return { success: false, error: error.message };
  }
}