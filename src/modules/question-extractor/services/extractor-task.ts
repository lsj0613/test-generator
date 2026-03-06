// src/modules/question-extractor/services/extractor-task.service.ts
import { createCanvas } from 'canvas';
import { SERVER_ONLY_CONFIG } from "@/lib/constants";
import { R2Service } from "@/modules/storage/CloudflareR2/services/r2.service";
import { PdfProcessor } from "../services/pdfcrop.service"; // 경로 유지
import { AnalyzerService } from "./index";
import { ExtractedQuestion } from "../types";

export const ExtractorTaskService = {
  /**
   * 단일 PDF 문서를 분석하고 개별 문항을 R2에 업로드하는 핵심 로직
   */
  async processPaper(paperId: string, category = 'Integrated'): Promise<void> {
    const pdfBuffer = await R2Service.downloadPdf(paperId, category);
    const pdfDoc = await PdfProcessor.loadDocument(pdfBuffer);

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      
      // 1. 렌더링 및 픽셀 데이터 추출
      const pixelContext = await this._preparePixelContext(page);

      // 2. 텍스트 분석
      const analysis = await AnalyzerService.analyzePdfText(page);

      // 3. 컬럼별 분석 및 업로드
      for (const col of ["left", "right"] as const) {
        const rects: ExtractedQuestion[] = AnalyzerService.calculateRects(
          col,
          analysis,
          i - 1,
          paperId,
          pixelContext
        );

        for (const item of rects) {
          const croppedBuffer = await PdfProcessor.crop(page, item.rect);
          await R2Service.uploadImage(paperId, item.qNo, croppedBuffer, item.category);
          console.log(`[Upload] 성공: ${paperId} - Q${item.qNo} (${item.category})`);
        }
      }
    }
  },

  /**
   * PDF 페이지를 캔버스에 렌더링하여 픽셀 데이터를 준비 (내부 헬퍼)
   */
  async _preparePixelContext(page: any) {
    const scale = SERVER_ONLY_CONFIG.CROP_RENDER_SCALE;
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    await page.render({ 
      canvasContext: context as any, 
      viewport 
    }).promise;      
    
    return {
      imageData: context.getImageData(0, 0, viewport.width, viewport.height),
      width: viewport.width,
      height: viewport.height
    };
  }
};