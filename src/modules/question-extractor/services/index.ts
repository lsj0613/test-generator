import { PdfLayoutCalculator } from "./layout-calculator";
import { ExtractedQuestion, PageAnalysisResult,  } from "../types";
import { PdfPageAnalyzer } from "./page-analyzer";

export const AnalyzerService = {
  analyzePdfText: (page: any): Promise<PageAnalysisResult> =>
    PdfPageAnalyzer.analyze(page),

  calculateRects: (
    col: "left" | "right",
    analysis: PageAnalysisResult,
    _pageIndex: number,
    examDate: string,
    pixelContext: any
  ): ExtractedQuestion[] =>
    PdfLayoutCalculator.calculate(col, analysis, examDate, pixelContext),
};
