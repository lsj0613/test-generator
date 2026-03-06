import { TextItem, TextContent, PDFPageProxy } from "pdfjs-dist/types/src/display/api";
import { ANALYZER_CONFIG, PDF_CONFIG } from "@/lib/constants";
import { AnalysisResult, PdfTextItem } from "../types";

export const PdfTextAnalyzer = {
  async analyze(page: PDFPageProxy): Promise<AnalysisResult> {
    console.log(`[TextAnalyzer] 분석 시작 (페이지: ${page.pageNumber})`);
    
    const textContent: TextContent = await page.getTextContent();
    const { width, height } = page.getViewport({ scale: 1.0 });
    const rows: { [key: number]: PdfTextItem[] } = {};

    const rawItems = textContent.items as TextItem[];
    const fullText = rawItems.map((item) => item.str).join("");
    const sanitizedFullText = fullText.replace(/\s+/g, "");
    

    let pageCategory: AnalysisResult["pageCategory"] = "Common";
    const calculusKey = (ANALYZER_CONFIG.KEYWORDS.CALCULUS || "미적분").replace(/\s+/g, "");
    const statisticsKey = (ANALYZER_CONFIG.KEYWORDS.STATISTICS || "확률과통계").replace(/\s+/g, "");

    if (sanitizedFullText.includes(calculusKey)) {
      pageCategory = "Calculus";
    } else if (sanitizedFullText.includes(statisticsKey)) {
      pageCategory = "Statistics";
    }

    console.log(`[TextAnalyzer] 페이지 카테고리 판별 결과: ${pageCategory}`);

    rawItems.forEach((item: TextItem) => {
      if (!item.str?.trim()) return;
      
      const roundedY = Math.round(item.transform[5]);
      const targetY =
        Object.keys(rows).find(
          (ry) => Math.abs(Number(ry) - roundedY) <= ANALYZER_CONFIG.ROW_THRESHOLD
        ) || roundedY;

      const yKey = Number(targetY);
      if (!rows[yKey]) rows[yKey] = [];
      
      rows[yKey].push({
        str: item.str,
        transform: item.transform,
      });
    });

    const leftQs: { no: number; y: number }[] = []; 
    const rightQs: { no: number; y: number }[] = [];
    const leftPoints: { val: number; y: number }[] = []; 
    const rightPoints: { val: number; y: number }[] = [];

    let leftHasTypeKeyword = false;
    let rightHasTypeKeyword = false;

    Object.keys(rows).forEach((yKey) => {
      const rowItems = rows[Number(yKey)].sort((a, b) => a.transform[4] - b.transform[4]);
      const relY = (1 - Number(yKey) / height) * PDF_CONFIG.COORDINATE_MAX;

      const leftItems = rowItems.filter((i) => (i.transform[4] / width) * PDF_CONFIG.COORDINATE_MAX < 500);
      const rightItems = rowItems.filter((i) => (i.transform[4] / width) * PDF_CONFIG.COORDINATE_MAX >= 500);

      const processCol = (
        items: PdfTextItem[], 
        qList: { no: number; y: number }[], 
        pList: { val: number; y: number }[],
        side: "left" | "right"
      ) => {
        if (items.length === 0) return;
        const text = items.map((i) => i.str).join("");
        const sanitizedColText = text.replace(/\s+/g, "");
        
        const hasKeyword = sanitizedColText.includes("단답형") || sanitizedColText.includes("5지선다형");
        if (hasKeyword) {
          if (side === "left") leftHasTypeKeyword = true;
          else rightHasTypeKeyword = true;
        }

        const qMatch = text.match(ANALYZER_CONFIG.Q_NO_REGEX);
        if (qMatch) qList.push({ no: parseInt(qMatch[1], 10), y: relY });
        
        const pMatch = text.match(ANALYZER_CONFIG.POINT_REGEX);
        if (pMatch) pList.push({ val: parseInt(pMatch[1], 10), y: relY });
      };

      processCol(leftItems, leftQs, leftPoints, "left");
      processCol(rightItems, rightQs, rightPoints, "right");
    });

    const getCount = (qs: any[]): 1 | 2 | "Error" => [1, 2].includes(qs.length) ? qs.length as 1 | 2 : "Error";

    // --- 로그 출력 추가 구간 ---
    console.log(`[TextAnalyzer] [Left Column] 문제번호: ${leftQs.map(q => q.no).join(", ")}, 개수: ${leftQs.length}, 키워드포함: ${leftHasTypeKeyword}`);
    console.log(`[TextAnalyzer] [Right Column] 문제번호: ${rightQs.map(q => q.no).join(", ")}, 개수: ${rightQs.length}, 키워드포함: ${rightHasTypeKeyword}`);
    // -------------------------

    return {
      pageCategory,
      left: { 
        column: "left", 
        questionCount: getCount(leftQs), 
        questions: leftQs, 
        points: leftPoints,
        hasTypeKeyword: leftHasTypeKeyword
      },
      right: { 
        column: "right", 
        questionCount: getCount(rightQs), 
        questions: rightQs, 
        points: rightPoints,
        hasTypeKeyword: rightHasTypeKeyword
      },
      allTextItems: rawItems,
    };
  }
};