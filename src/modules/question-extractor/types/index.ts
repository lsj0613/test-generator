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


  export interface ExtractedQuestion {
    qNo: number;
    category: "Common" | "Calculus" | "Statistics";
    examDate: string;
    rect: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
  }
  
  export interface AnalysisResult {
    pageCategory: "Common" | "Calculus" | "Statistics";
    left: ColumnData;
    right: ColumnData;
    allTextItems: any[];
  }
  
  export interface ColumnData {
    column: "left" | "right";
    questionCount: 1 | 2 | "Error";
    questions: any[];
    points: any[];
    hasTypeKeyword: boolean;
  }