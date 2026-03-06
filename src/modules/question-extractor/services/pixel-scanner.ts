import { PDF_CONFIG, SCANNER_CONFIG, PDF_LAYOUT_CONFIG, ANALYZER_CONFIG } from "@/lib/constants";

export const PdfPixelScanner = {
  /**
   * Y-Reference 구분선(진한 가로선) 감지
   */
  findYReference(imageData: ImageData, width: number, height: number): number {
    const data = imageData.data;
    let foundDarkLine = false;

    // 상수 적용: REF_LINE_SCAN_X (150, 495)
    const startX = Math.floor((SCANNER_CONFIG.REF_LINE_SCAN_X.start / 1000) * width);
    const endX = Math.floor((SCANNER_CONFIG.REF_LINE_SCAN_X.end / 1000) * width);
    const scanWidth = endX - startX + 1;
    
    // 검은 선으로 판단할 픽셀 비율 임계값
    const darkLineThreshold = scanWidth * SCANNER_CONFIG.DARK_LINE_THRESHOLD_RATIO;

    for (let y = 0; y < height; y++) {
      let nonWhiteCount = 0;
      for (let x = startX; x <= endX; x++) {
        const i = (y * width + x) * 4;
        // 알파 채널이 있고, RGB 값이 임계값보다 낮은(어두운) 경우 카운트
        if (
          data[i + 3] > 0 && 
          (data[i] < SCANNER_CONFIG.WHITE_PIXEL_THRESHOLD || 
           data[i + 1] < SCANNER_CONFIG.WHITE_PIXEL_THRESHOLD || 
           data[i + 2] < SCANNER_CONFIG.WHITE_PIXEL_THRESHOLD)
        ) {
          nonWhiteCount++;
        }
      }

      if (!foundDarkLine) {
        if (nonWhiteCount >= darkLineThreshold) foundDarkLine = true;
      } else {
        // 어두운 선이 끝나는(흰색 줄이 나오는) 지점을 Reference Y로 반환
        if (nonWhiteCount === 0) return (y / height) * PDF_CONFIG.COORDINATE_MAX;
      }
    }
    throw new Error("Y-Reference 구분선을 감지하지 못했습니다.");
  },

  /**
   * 특정 컬럼에서 픽셀이 존재하는 블록을 건너뛰고 다음 공백 지점을 찾음
   */
  findSkipBlockY(
    imageData: ImageData, 
    width: number, 
    height: number, 
    yRefRel: number, 
    colId: "left" | "right"
  ): number {
    const data = imageData.data;
    let foundBlock = false;
    const colConfig = PDF_LAYOUT_CONFIG.COLUMNS[colId];
    
    const startX = Math.floor((colConfig.xStart / 1000) * width);
    const endX = Math.floor((colConfig.xEnd / 1000) * width);
    const startY = Math.floor((yRefRel / PDF_CONFIG.COORDINATE_MAX) * height);

    for (let y = startY; y < height; y++) {
      let hasPixel = false;
      for (let x = startX; x <= endX; x++) {
        const i = (y * width + x) * 4;
        if (
          data[i + 3] > 0 && 
          (data[i] < SCANNER_CONFIG.WHITE_PIXEL_THRESHOLD || 
           data[i + 1] < SCANNER_CONFIG.WHITE_PIXEL_THRESHOLD || 
           data[i + 2] < SCANNER_CONFIG.WHITE_PIXEL_THRESHOLD)
        ) { 
          hasPixel = true; 
          break; 
        }
      }

      if (!foundBlock) {
        if (hasPixel) foundBlock = true;
      } else {
        if (!hasPixel) return (y / height) * PDF_CONFIG.COORDINATE_MAX;
      }
    }
    return yRefRel;
  },

  /**
   * 문항 간의 최소 공백(TARGET_GAP)이 확보된 지점의 시작 Y를 탐색
   */
  findGapYMin(
    imageData: ImageData, 
    width: number, 
    height: number, 
    startYRel: number, 
    colId: "left" | "right"
  ): number {
    const data = imageData.data;
    const colConfig = PDF_LAYOUT_CONFIG.COLUMNS[colId];
    
    const startX = Math.floor((colConfig.xStart / 1000) * width);
    const endX = Math.floor((colConfig.xEnd / 1000) * width);
    const startY = Math.floor((startYRel / PDF_CONFIG.COORDINATE_MAX) * height);
    
    // 상대 좌표 기준 Gap 높이를 픽셀 단위로 변환
    const targetGapPx = Math.floor((SCANNER_CONFIG.TARGET_GAP_REL / PDF_CONFIG.COORDINATE_MAX) * height);
    
    let whiteCount = 0;
    for (let y = startY; y < height; y++) {
      let isWhiteRow = true;
      for (let x = startX; x <= endX; x++) {
        const i = (y * width + x) * 4;
        if (
          data[i + 3] > 0 && 
          (data[i] < SCANNER_CONFIG.WHITE_PIXEL_THRESHOLD || 
           data[i + 1] < SCANNER_CONFIG.WHITE_PIXEL_THRESHOLD || 
           data[i + 2] < SCANNER_CONFIG.WHITE_PIXEL_THRESHOLD)
        ) { 
          isWhiteRow = false; 
          break; 
        }
      }

      if (isWhiteRow) {
        whiteCount++;
        // 충분한 공백이 확보되면, 공백이 시작된 시점의 좌표를 반환
        if (whiteCount >= targetGapPx) {
          return ((y - whiteCount + 1) / height) * PDF_CONFIG.COORDINATE_MAX;
        }
      } else {
        whiteCount = 0;
      }
    }
    return ANALYZER_CONFIG.Y_MIN_DEFAULT;
  }
};