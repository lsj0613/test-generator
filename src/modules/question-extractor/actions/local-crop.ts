// src/modules/question-extractor/actions/local-crop.ts
"use server";

import fs from "fs/promises";
import path from "path";
import { createCanvas } from "canvas"; // 🎯 픽셀 추출용 캔버스 임포트
import { R2Service } from "@/modules/storage/services/r2.service";
import { PdfProcessor } from "@/modules/question-extractor/services/pdf.service";
import { AnalyzerService } from "@/modules/question-extractor/services/analyzer.service";
import { PDF_CONFIG } from "@/lib/constants";

/**
 * 🎯 테스트 전용 설정 상수
 */
const TEST_CONFIG = {
  MANUAL_TEST_ID: "202507C" as string | null,
  PAGE_RANGE: [1, 2, 6, 12], 
  TARGET_COLUMNS: ["left", "right"] as ("left" | "right")[],
  FORCE_SPECIAL_PAGE: null as boolean | null,
  FORCE_SPECIAL_TYPE: null as boolean | null,
  VERBOSE: true
};

export async function processAndSaveToLocal(testId: string, coords: any) {
  try {
    const finalTestId = TEST_CONFIG.MANUAL_TEST_ID || testId;
    if (TEST_CONFIG.VERBOSE) console.log(`🚀 [LOCAL TEST] ${finalTestId} 처리 시작...`);

    const pdfBuffer = await R2Service.downloadPdf(finalTestId);
    const pdfDoc = await PdfProcessor.loadDocument(pdfBuffer);
    
    const yearMonth = finalTestId.substring(0, 6); 
    const tmpDir = path.join(process.cwd(), "testcropresults", yearMonth);
    await fs.mkdir(tmpDir, { recursive: true });

    let extractedCount = 0;
    const originSuffix = finalTestId.slice(-1).toUpperCase();
    const totalPages = pdfDoc.numPages;
    const pagesToProcess = TEST_CONFIG.PAGE_RANGE || Array.from({ length: totalPages }, (_, i) => i + 1);

    for (const pageNum of pagesToProcess) {
      if (pageNum > totalPages) continue;

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const { height, width } = viewport;

      // 🎯 [신규 로직] Y좌표 자동 스캔을 위한 1.0 배율 캔버스 렌더링 및 픽셀 추출
      const canvas: any = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext("2d");
      await page.render({ canvasContext: context, viewport }).promise;
      const imageData = context.getImageData(0, 0, viewport.width, viewport.height);
      
      const pixelContext = { imageData, width, height };

      // 텍스트 분석
      const analysis = await AnalyzerService.analyzePdfText(page);

      // 페이지 특성 판단
      let isSpecialPage = analysis.allTextItems.some(
        (item: any) =>
          (1 - item.transform[5] / height) * PDF_CONFIG.COORDINATE_MAX < 150 &&
          (item.str.includes("학년도") || item.str.includes("문제지"))
      );
      if (TEST_CONFIG.FORCE_SPECIAL_PAGE !== null) isSpecialPage = TEST_CONFIG.FORCE_SPECIAL_PAGE;

      for (const col of TEST_CONFIG.TARGET_COLUMNS) {
        const colItems = analysis.allTextItems.filter((item: any) => {
          const rx = (item.transform[4] / width) * PDF_CONFIG.COORDINATE_MAX;
          return col === "left" ? rx < 500 : rx >= 500;
        });
        
        const colText = colItems.map((item: any) => item.str).join("").replace(/\s+/g, "");
        let hasSpecialType = colText.includes("5지선다형") || colText.includes("단답형");
        if (TEST_CONFIG.FORCE_SPECIAL_TYPE !== null) hasSpecialType = TEST_CONFIG.FORCE_SPECIAL_TYPE;

        // 🎯 기존 coords 대신 pixelContext를 넘겨주어 자동 스캔 실행
        const rects = AnalyzerService.calculateRects(col, analysis, pageNum - 1, pixelContext);

        for (const item of rects) {
          // 크롭 단계에서는 CROP_RENDER_SCALE(5.0)의 고해상도로 렌더링되어 추출됩니다.
          const croppedBuffer = await PdfProcessor.crop(page, item.rect);
          
          const suffix = item.qNo <= 22 ? "D" : originSuffix;
          const fileName = `${yearMonth}${item.qNo.toString().padStart(2, "0")}${suffix}.png`;
          
          await fs.writeFile(path.join(tmpDir, fileName), croppedBuffer);
          extractedCount++;
        }
      }
    }

    if (TEST_CONFIG.VERBOSE) console.log(`✅ [LOCAL TEST] 완료: /testcropresults/${yearMonth} 폴더에 저장됨`);

    return { success: true, path: tmpDir, count: extractedCount };
  } catch (error: any) {
    console.error("로컬 추출 실패:", error);
    return { success: false, error: error.message };
  }
}