// src/modules/question-extractor/services/pdf.service.ts
import sharp from 'sharp';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import { createCanvas } from 'canvas';
import { SERVER_ONLY_CONFIG } from '@/lib/constants';
import { CropRect } from '../types';

const pdfWorker = require('pdfjs-dist/legacy/build/pdf.worker.js');
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const PdfProcessor = {
  async loadDocument(buffer: Uint8Array) {
    const pdfDoc = await pdfjsLib.getDocument({
      data: buffer,
      disableFontFace: true,
      stopAtErrors: true,
    }).promise;
    return pdfDoc;
  },

  async crop(page: any, r: CropRect): Promise<Buffer> {
    const scale = SERVER_ONLY_CONFIG.CROP_RENDER_SCALE;
    const viewport = page.getViewport({ scale });
    const canvas: any = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    // PDF 페이지를 캔버스에 렌더링
    await page.render({ canvasContext: context, viewport }).promise;

    // 1. Analyzer가 계산한 이론적(Theoretical) 블록 영역 좌표 계산
    const blockLeft = Math.round((r.x / 1000) * viewport.width);
    const blockTop = Math.round((r.y / 1000) * viewport.height);
    const blockWidth = Math.round((r.w / 1000) * viewport.width);
    const blockHeight = Math.round((r.h / 1000) * viewport.height);

    // 캔버스 범위를 벗어나지 않도록 안전 영역 확보
    const safeLeft = Math.max(0, blockLeft);
    const safeTop = Math.max(0, blockTop);
    const safeWidth = Math.min(blockWidth, viewport.width - safeLeft);
    const safeHeight = Math.min(blockHeight, viewport.height - safeTop);

    // 2. 🎯 Canvas 픽셀 데이터 직접 분석 (Pixel Scanning)
    // 해당 블록의 픽셀 배열을 가져와 콘텐츠가 존재하는 가장 타이트한 경계를 찾습니다.
    const imageData = context.getImageData(safeLeft, safeTop, safeWidth, safeHeight);
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

        // 알파 채널이 존재하고, RGB 중 하나라도 240 미만이면 콘텐츠로 간주 (임계값 240)
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

    // 4. 🎯 정밀 추출 및 절대 패딩(40px) 추가
    // 픽셀 스캔으로 얻은 정확한 경계만을 잘라낸 후, 사방에 40px을 연장합니다.
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