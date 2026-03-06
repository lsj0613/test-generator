// src/modules/question-extractor/actions/local-crop.ts
"use server";

import fs from "fs/promises";
import path from "path";
import { R2Service } from "@/modules/storage/services/r2.service";
import { PdfProcessor } from "@/modules/question-extractor/services/pdf.service";
import { AnalyzerService } from "@/modules/question-extractor/services/analyzer.service";
import { PDF_CONFIG } from "@/lib/constants";

/**
 * 🎯 테스트 전용 설정 상수
 */
const TEST_CONFIG = {
  // 1. 수동 테스트 ID (null이 아니면 호출 시 전달된 값 대신 이 값을 사용)
  MANUAL_TEST_ID: "202507C" as string | null,

  // 2. 추출할 페이지 범위 (null이면 전체 페이지)
  PAGE_RANGE: [1, 3, 6, 9, 12], 
  
  // 3. 추출할 단 선택 (["left"], ["right"], ["left", "right"])
  TARGET_COLUMNS: ["left", "right"] as ("left" | "right")[],

  // 4. 감지 로직 강제 설정 (null이면 자동 감지)
  FORCE_SPECIAL_PAGE: null as boolean | null,
  FORCE_SPECIAL_TYPE: null as boolean | null,

  // 5. 상세 로그 출력 여부
  VERBOSE: true
};

/**
 * 로컬 테스트 추출 액션
 */
export async function processAndSaveToLocal(testId: string, coords: any) {
  try {
    const finalTestId = TEST_CONFIG.MANUAL_TEST_ID || testId;
    
    if (TEST_CONFIG.VERBOSE) console.log(`🚀 [LOCAL TEST] ${finalTestId} 처리 시작...`);

    const pdfBuffer = await R2Service.downloadPdf(finalTestId);
    const pdfDoc = await PdfProcessor.loadDocument(pdfBuffer);
    
    // 🎯 폴더 생성 규칙: testId의 앞 6자리(YYMM)만 사용
    const yearMonth = finalTestId.substring(0, 6); 
    const tmpDir = path.join(process.cwd(), "testcropresults", yearMonth);
    await fs.mkdir(tmpDir, { recursive: true });

    let extractedCount = 0;
    const totalPages = pdfDoc.numPages;
    const originSuffix = finalTestId.slice(-1).toUpperCase();

    const pagesToProcess = TEST_CONFIG.PAGE_RANGE || Array.from({ length: totalPages }, (_, i) => i + 1);

    for (const pageNum of pagesToProcess) {
      if (pageNum > totalPages) continue;

      const page = await pdfDoc.getPage(pageNum);
      const { height, width } = page.getViewport({ scale: 1.0 });
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

        const rects = AnalyzerService.calculateRects(col, analysis, isSpecialPage, hasSpecialType, coords);

        for (const item of rects) {
          const croppedBuffer = await PdfProcessor.crop(page, item.rect);
          
          // 🎯 파일명 규칙: 22번 이하는 D, 그 외는 원본 suffix
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