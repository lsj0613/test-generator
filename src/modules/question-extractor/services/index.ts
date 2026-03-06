
import { PdfTextAnalyzer } from "./text-analyzer";
import { PdfLayoutCalculator } from "./layout-calculator";
import { ExtractedQuestion, AnalysisResult } from "../types";

export const AnalyzerService = {
  analyzePdfText: (page: any): Promise<AnalysisResult> => 
    PdfTextAnalyzer.analyze(page),
    
  calculateRects: (
    col: "left" | "right", 
    analysis: AnalysisResult, 
    _pageIndex: number, 
    examDate: string, 
    pixelContext: any
  ): ExtractedQuestion[] => 
    PdfLayoutCalculator.calculate(col, analysis, examDate, pixelContext)
};

