import sharp from 'sharp';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import { createCanvas, Canvas, CanvasRenderingContext2D, ImageData } from 'canvas';
import { SERVER_ONLY_CONFIG, PDF_CONFIG } from '@/lib/constants';
import { CropRect } from '../types';
import { PDFPageProxy, PDFDocumentProxy } from 'pdfjs-dist/types/src/display/api';
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
// Worker 설정 (Node.js 환경 대응)
//const pdfWorker = require('pdfjs-dist/legacy/build/pdf.worker.js');

export const PdfProcessor = {
  /**
   * PDF 문서를 로드하여 Proxy 객체 반환
   */
  async loadDocument(buffer: Uint8Array): Promise<PDFDocumentProxy> {
    const pdfDoc = await pdfjsLib.getDocument({
      data: buffer,
      disableFontFace: true,
      stopAtErrors: true,
    }).promise;
    return pdfDoc;
  },

  /**
   * PDF 페이지의 특정 영역(r)을 픽셀 단위로 분석하여 정밀 크롭
   */
  async crop(page: PDFPageProxy, r: CropRect): Promise<Buffer> {
    const scale = SERVER_ONLY_CONFIG.CROP_RENDER_SCALE;
    const viewport = page.getViewport({ scale });
    
    // canvas 라이브러리의 구체적 타입 적용
    const canvas: Canvas = createCanvas(viewport.width, viewport.height);
    const context: CanvasRenderingContext2D = canvas.getContext('2d');
    
    // PDF 페이지를 캔버스에 렌더링
    await page.render({ canvasContext: context as any, viewport }).promise;

    // 1. Analyzer가 계산한 이론적(Theoretical) 블록 영역 좌표 계산
    const blockLeft = Math.round((r.x / PDF_CONFIG.COORDINATE_MAX) * viewport.width);
    const blockTop = Math.round((r.y / PDF_CONFIG.COORDINATE_MAX) * viewport.height);
    const blockWidth = Math.round((r.w / PDF_CONFIG.COORDINATE_MAX) * viewport.width);
    const blockHeight = Math.round((r.h / PDF_CONFIG.COORDINATE_MAX) * viewport.height);

    // 캔버스 범위를 벗어나지 않도록 안전 영역 확보
    const safeLeft = Math.max(0, blockLeft);
    const safeTop = Math.max(0, blockTop);
    const safeWidth = Math.min(blockWidth, viewport.width - safeLeft);
    const safeHeight = Math.min(blockHeight, viewport.height - safeTop);

    // 2. 🎯 Canvas 픽셀 데이터 직접 분석 (Pixel Scanning)
    const imageData: ImageData = context.getImageData(safeLeft, safeTop, safeWidth, safeHeight);
    const data = imageData.data;
    
    let minX = safeWidth, minY = safeHeight, maxX = 0, maxY = 0;
    let hasContent = false;

    // 전체 픽셀을 순회하며 흰색이 아닌(콘텐츠) 픽셀의 최소/최대 좌표값 산출
    for (let y = 0; y < safeHeight; y++) {
      for (let x = 0; x < safeWidth; x++) {
        const i = (y * safeWidth + x) * 4;
        const rVal = data[i];
        const gVal = data[i + 1];
        const bVal = data[i + 2];
        const aVal = data[i + 3];

        // RGB 중 하나라도 240 미만이면 콘텐츠로 간주 (기존 임계값 유지)
        if (aVal > 0 && (rVal < 240 || gVal < 240 || bVal < 240)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          hasContent = true;
        }
      }
    }

    // 빈 여백만 있는 예외 상황 처리
    if (!hasContent) {
      minX = 0; minY = 0; maxX = safeWidth; maxY = safeHeight;
    }

    // 3. 실제 콘텐츠의 절대 경계(Absolute Bounds) 확정
    const contentLeft = safeLeft + minX;
    const contentTop = safeTop + minY;
    const contentWidth = (maxX - minX) + 1;
    const contentHeight = (maxY - minY) + 1;

    // 4. 🎯 정밀 추출 (Sharp 활용)
    const finalBuffer = await sharp(canvas.toBuffer('image/png'))
      .extract({
        left: contentLeft,
        top: contentTop,
        width: contentWidth,
        height: contentHeight
      })
      .png()
      .toBuffer();

    return finalBuffer;
  }
};