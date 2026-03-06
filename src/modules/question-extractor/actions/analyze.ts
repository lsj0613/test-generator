'use server';

import { R2Service } from "@/modules/storage/CloudflareR2/services/r2.service";
import { AnalysisResult } from "../types";
import { PdfProcessor } from "../services/pdfcrop.service";
import { PdfTextAnalyzer } from "../services/text-analyzer";



/**
 * paperId를 받아 R2에서 PDF를 다운로드하고, 
 * 서버 메모리 상에서 텍스트를 분석하여 결과를 반환합니다.
 */
export async function analyzePdfAction(
  paperId: string, 
  category: string = 'Integrated'
): Promise<AnalysisResult[]> {
  try {
    console.log(`[ACTION_START] PaperID: ${paperId} 분석 프로세스 시작`);

    // 1. R2에서 PDF 파일 다운로드 (Uint8Array 반환)
    const pdfBuffer = await R2Service.downloadPdf(paperId, category);

    // 2. 서버 사이드에서 PDF 문서 로드
    const pdfDoc = await PdfProcessor.loadDocument(pdfBuffer);
    const results: AnalysisResult[] = [];

    console.log(`[ACTION_PROCESSING] 총 ${pdfDoc.numPages} 페이지 분석 시작`);

    // 3. 각 페이지를 순회하며 분석 수행
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      
      // PdfTextAnalyzer는 PDFPageProxy를 인자로 받아 텍스트/좌표 분석 수행
      const analysis = await PdfTextAnalyzer.analyze(page);
      results.push(analysis);
      
      console.log(`[ACTION_PAGE_DONE] ${i}페이지 분석 완료`);
    }

    console.log(`[ACTION_SUCCESS] PaperID: ${paperId} 전체 분석 완료`);
    return results;

  } catch (error: any) {
    console.error("[ACTION_ERROR] PDF 분석 중 치명적 오류:", error);
    // 사용자에게 노출할 에러 메시지
    throw new Error(`서버에서 PDF를 분석하는 중 오류가 발생했습니다: ${error.message}`);
  }
}