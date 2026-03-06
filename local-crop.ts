import * as dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

// 1. 환경 변수 로드 (최상단 실행)
const envPath = path.resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

console.log("🔍 [DEBUG] 환경 변수 점검:");
console.log("- Access Key Loaded:", !!process.env.R2_ACCESS_KEY_ID);
console.log("- Secret Key Loaded:", !!process.env.R2_SECRET_ACCESS_KEY);

// 2. 테스트 설정
const TEST_CONFIG = {
  PAPER_ID: "202507C",
  CATEGORY: "Calculus",
  PAGE_RANGE: [1, 2,4, 6,9, 12], 
  VERBOSE: true
};

/**
 * R2Service.uploadImage와 동일한 파일명/경로 생성 로직
 */
function getLocalPath(paperId: string, qNo: number, category: string, extractedPrefix: string): { dir: string, fileName: string } {
  const yearMonth = paperId.substring(0, 6);
  let suffix: string;
  switch (category) {
    case "Common": suffix = "D"; break;
    case "Calculus": suffix = "C"; break;
    case "Statistics": suffix = "S"; break;
    default: suffix = "N"; break;
  }
  const fileName = `${yearMonth}${qNo.toString().padStart(2, "0")}${suffix}.png`;
  const dir = path.join(process.cwd(), "test-results", extractedPrefix, yearMonth);
  return { dir, fileName };
}

/**
 * 로컬 테스트 실행 함수
 */
export async function runLocalTest() {
  const { PAPER_ID, CATEGORY, PAGE_RANGE, VERBOSE } = TEST_CONFIG;
  
  try {
    // 🎯 3. 환경 변수 로드 후 서비스 모듈을 Dynamic Import
    // import()는 해당 라인이 실행될 때 모듈을 가져오므로 호이스팅 문제를 피할 수 있습니다.
    const fs = await import("fs/promises");
    const { createCanvas } = await import("canvas");
    const { R2Service } = await import("@/modules/storage/CloudflareR2/services/r2.service");
    const { PdfProcessor } = await import("@/modules/question-extractor/services/pdfcrop.service");
    const { AnalyzerService } = await import("@/modules/question-extractor/services"); 
    const { SERVER_ONLY_CONFIG } = await import("@/lib/constants");

    console.log(`\n🚀 [LOCAL TEST] ${PAPER_ID} 프로세스 시작...`);

    // 1. R2에서 PDF 다운로드
    const pdfBuffer = await R2Service.downloadPdf(PAPER_ID, CATEGORY);
    const pdfDoc = await PdfProcessor.loadDocument(pdfBuffer);
    
    const pagesToProcess = PAGE_RANGE || Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1);
    let totalSaved = 0;

    for (const pageNum of pagesToProcess) {
      const page = await pdfDoc.getPage(pageNum);
      
      // 2. 픽셀 컨텍스트 준비
      const scale = SERVER_ONLY_CONFIG.CROP_RENDER_SCALE;
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context as any, viewport }).promise;      
      
      const pixelContext = {
        imageData: context.getImageData(0, 0, viewport.width, viewport.height),
        width: viewport.width,
        height: viewport.height
      };

      // 3. 텍스트 분석
      const analysis = await AnalyzerService.analyzePdfText(page);

      // 4. 컬럼별 분석 및 로컬 저장
      for (const col of ["left", "right"] as const) {
        const rects = AnalyzerService.calculateRects(
          col,
          analysis,
          pageNum - 1,
          PAPER_ID,
          pixelContext
        );

        for (const item of rects) {
          // 크롭 로직
          const croppedBuffer = await PdfProcessor.crop(page, item.rect);
          
          // 경로 생성 및 저장
          const { dir, fileName } = getLocalPath(
            PAPER_ID, 
            item.qNo, 
            item.category, 
            SERVER_ONLY_CONFIG.EXTRACTED_PREFIX
          );
          await fs.mkdir(dir, { recursive: true });
          
          const filePath = path.join(dir, fileName);
          await fs.writeFile(filePath, croppedBuffer);
          
          if (VERBOSE) console.log(`   [SUCCESS] Q${item.qNo} (${item.category}) -> ${fileName}`);
          totalSaved++;
        }
      }
    }

    console.log(`\n✅ 완료: 총 ${totalSaved}개 문항이 /test-results 에 저장되었습니다.\n`);

  } catch (error: any) {
    console.error(`\n❌ 에러 상세 로그:`);
    console.error(`- Message: ${error.message}`);
    console.error(`- Stack: ${error.stack}`);
  }
}

// 스크립트 실행
runLocalTest();