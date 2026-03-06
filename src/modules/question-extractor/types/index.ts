// src/modules/question-extractor/types/index.ts

export interface PdfTextItem {
    str: string;
    transform: number[];
  }
  
  export interface QuestionNode {
    no: number;
    y: number;
  }
  
  export interface PointNode {
    val: number;
    y: number;
  }
  
  export interface ColumnAnalysis {
    column: "left" | "right";
    questionCount: 1 | 2 | "Error";
    questions: QuestionNode[];
    points: PointNode[];
  }
  
  export interface PageAnalysisResult {
    left: ColumnAnalysis;
    right: ColumnAnalysis;
    allTextItems: PdfTextItem[];
  }
  
  export interface CropRect {
    x: number;
    y: number;
    w: number;
    h: number;
  }
  
  export interface Coordinate {
    y: number;
  }