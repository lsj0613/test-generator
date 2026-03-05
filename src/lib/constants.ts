export const PDF_CONFIG = {
  SCALE: 1.5,
  CONTAINER_WIDTH: 750,
  ASPECT_RATIO: "1 / 1.414",
  COORDINATE_MAX: 1000,
  DEFAULT_Y_COORD: 190, // 요청하신 초기값 190 설정
};

export const BOUNDS = {
  LEFT_START: 85,
  LEFT_END: 495,
  RIGHT_START: 505,
  RIGHT_END: 915,
};

export const ANALYZER_CONFIG = {
  ROW_THRESHOLD: 3,
  Q_NO_REGEX: /^\s*(\d+)[.,\s]/,
  POINT_REGEX: /(\d+)\s*점/,
};

export const COLORS = {
  // 가시성 개선을 위해 기존 #f1f5f9(slate-100)에서 #cbd5e1(slate-300)으로 상향
  VERTICAL_LINE: "#cbd5e1",
  LEFT_COLUMN: "#ef4444", // Red-500
  RIGHT_COLUMN: "#3b82f6", // Blue-500
  DEFAULT_COLUMN: "#64748b", // Slate-500
  GUIDE_LINE_STOKE: "4,3",
};

export const SERVER_ONLY_CONFIG = {
  LIMIT_Y: 900,
  Q30_SPECIAL_Y: 590,
  CROP_RENDER_SCALE: 5.0, // 고해상도 추출용
};