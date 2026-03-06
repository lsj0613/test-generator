// src/lib/constants.ts

export const PDF_CONFIG = {
  SCALE: 1.5,
  CONTAINER_WIDTH: 750,
  ASPECT_RATIO: "1 / 1.414",
  COORDINATE_MAX: 1000,
  DEFAULT_Y_COORD: 190,
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
  POINT_REGEX: /\[?(\d+)\s*점\]?/, // [3점] 또는 3점 모두 대응
};

export const COLORS = {
  VERTICAL_LINE: "#cbd5e1",
  LEFT_COLUMN: "#ef4444",
  RIGHT_COLUMN: "#3b82f6",
  DEFAULT_COLUMN: "#64748b",
  GUIDE_LINE_STOKE: "4,3",
};

export const SERVER_ONLY_CONFIG = {
  LIMIT_Y: 900,
  Q30_SPECIAL_Y: 590,
  CROP_RENDER_SCALE: 5.0,
  RAW_PREFIX: "rawPDFs",
  EXTRACTED_PREFIX: "extracted",
};
