// src/app/actions/pdf-action.ts
"use server";

import { R2Service } from "@/features/extract_question/services/r2.service";
import { PdfProcessor } from "@/features/extract_question/services/pdf.service";
import { AnalyzerService } from "@/features/extract_question/services/analyzer.service";
import { PDF_CONFIG } from "@/lib/constants";

export async function processAndUploadToR2(testId: string, coords: any) {
  try {
    const pdfBuffer = await R2Service.downloadPdf(testId);
    const pdfDoc = await PdfProcessor.loadDocument(pdfBuffer);

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const { height } = page.getViewport({ scale: 1.0 });

      // 1. 텍스트 분석
      const analysis = await AnalyzerService.analyzePdfText(page);

      // 2. 페이지 특성 판단 (상단 텍스트 및 특수 타입 확인)
      const topText = analysis.allTextItems
        .filter(
          (item: any) =>
            (1 - item.transform[5] / height) * PDF_CONFIG.COORDINATE_MAX < 150
        )
        .map((item: any) => item.str)
        .join(" ");
      const isSpecialPage =
        topText.includes("학년도") || topText.includes("문제지");

      for (const col of ["left", "right"] as const) {
        const colTextClean = analysis.allTextItems
          .filter((item: any) => {
            const rx =
              (item.transform[4] / page.getViewport({ scale: 1.0 }).width) *
              PDF_CONFIG.COORDINATE_MAX;
            return col === "left" ? rx < 500 : rx >= 500;
          })
          .map((item: any) => item.str)
          .join("")
          .replace(/\s+/g, "");

        const hasSpecialType =
          colTextClean.includes("5지선다형") || colTextClean.includes("단답형");

        // 3. 좌표 계산
        const rects = AnalyzerService.calculateRects(
          col,
          analysis,
          isSpecialPage,
          hasSpecialType,
          coords
        );

        // 4. 자르기 및 업로드
        for (const item of rects) {
          const croppedBuffer = await PdfProcessor.crop(page, item.rect);
          await R2Service.uploadImage(testId, item.qNo, croppedBuffer);
        }
      }
    }
    return { success: true };
  } catch (error: any) {
    console.error("Processing failed:", error);
    return { success: false, error: error.message };
  }
}