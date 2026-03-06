/**
 * PDF 및 렌더링 관련 공통 설정
 */
export const PDF_CONFIG = {
  SCALE: 1.5,
  CONTAINER_WIDTH: 750,
  ASPECT_RATIO: "1 / 1.414",
  COORDINATE_MAX: 1000,
};

/**
 * 레이아웃 및 컬럼 좌표 설정 (B안 반영: 85 ~ 915)
 */
export const PDF_LAYOUT_CONFIG = {
  COLUMNS: {
    left: {
      id: "left" as const,
      xStart: 85, // B안: 여백을 더 넓게 확보 (85)
      xEnd: 495,
    },
    right: {
      id: "right" as const,
      xStart: 505,
      xEnd: 915, // B안: 여백을 더 넓게 확보 (915)
    },
  },
};

/**
 * 텍스트 분석 및 정규식 설정
 */
export const ANALYZER_CONFIG = {
  ROW_THRESHOLD: 5, // 행 판별 임계값 (5: 약간의 어긋남 허용)
  // 유연화된 정규식: 번호 뒤 공백, 점(.), 쉼표(,), 마침표 모두 대응
  Q_NO_REGEX: /^\s*(\d+)[.,\s]/, 
  // 배점 추출: [3점] 또는 3점 모두 대응
  POINT_REGEX: /\[?(\d+)\s*점\]?/, 
  Y_MIN_DEFAULT: 900,
  Q_Y_OFFSET: 40, 
  CATEGORY_SCAN_Y_MIN: 150, 
  KEYWORDS: {
    CALCULUS: "미적분",
    STATISTICS: "확률과통계",
  },
};

/**
 * 이미지 픽셀 스캔 및 공백 감지 설정
 */
export const SCANNER_CONFIG = {
  DARK_LINE_THRESHOLD_RATIO: 0.95,
  WHITE_PIXEL_THRESHOLD: 240,
  TARGET_GAP_REL: 120, // 공백 감지 최소 높이
  REF_LINE_SCAN_X: { start: 150, end: 495 },
};

/**
 * UI 가이드라인 및 시각화 색상
 */
export const COLORS = {
  VERTICAL_LINE: "#cbd5e1",
  LEFT_COLUMN: "#ef4444",
  RIGHT_COLUMN: "#3b82f6",
  DEFAULT_COLUMN: "#64748b",
  GUIDE_LINE_STOKE: "4,3",
};

/**
 * 서버 측 프로세싱 및 파일 경로 설정
 */
export const SERVER_ONLY_CONFIG = {
  LIMIT_Y: 900,
  Q30_SPECIAL_Y: 590,
  CROP_RENDER_SCALE: 5.0,
  RAW_PREFIX: "rawPDFs",
  EXTRACTED_PREFIX: "extracted",
};

/**
 * 하위 호환성 유지를 위한 BOUNDS 객체
 */
export const BOUNDS = {
  LEFT_START: PDF_LAYOUT_CONFIG.COLUMNS.left.xStart,
  LEFT_END: PDF_LAYOUT_CONFIG.COLUMNS.left.xEnd,
  RIGHT_START: PDF_LAYOUT_CONFIG.COLUMNS.right.xStart,
  RIGHT_END: PDF_LAYOUT_CONFIG.COLUMNS.right.xEnd,
  get L_WIDTH() { return this.LEFT_END - this.LEFT_START; },
  get R_WIDTH() { return this.RIGHT_END - this.RIGHT_START; },
};