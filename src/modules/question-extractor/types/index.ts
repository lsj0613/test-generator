// src/modules/question-extractor/types/index.ts

export interface PdfTextItem {
  str: string;
  transform: number[];
}

export interface Coordinate {
  y: number;
}

export interface PageAnalysisResult {
  left: ColumnData;
  right: ColumnData;
  allTextItems: any[];
}

export interface ColumnData {
  column: "left" | "right";
  questionCount: 1 | 2 | "Error";
  questions: ExtractedQuestion[];
  Keyword: "단답형" | "지선다형" | null;
  keywordY?: number;
}

export interface ExtractedQuestion {
  qNo: number;
  point: number;
  rect?: CropRect;
}

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
