import {
  TextItem,
  TextContent,
  PDFPageProxy,
} from "pdfjs-dist/types/src/display/api";
import { ANALYZER_CONFIG, PDF_CONFIG } from "@/lib/constants";
import {
  PageAnalysisResult,
  PdfTextItem,
  ColumnData,
  ExtractedQuestion,
} from "../types";

export const PdfPageAnalyzer = {
  async analyze(page: PDFPageProxy): Promise<PageAnalysisResult> {
    const isFirstPage = page.pageNumber === 1;
    console.log(`[TextAnalyzer] 분석 시작 (페이지: ${page.pageNumber})`);

    const textContent: TextContent = await page.getTextContent();
    const { width, height } = page.getViewport({ scale: 1.0 });
    const rows: { [key: number]: PdfTextItem[] } = {};

    const rawItems = textContent.items as TextItem[];

    /**
     * [1페이지 왼쪽 단 영역 제한 로직]
     * 1페이지의 경우, 헤더(시험지 정보)와 본문을 가르는 구분선 아래부터 문제/배점을 추출합니다.
     * Node 환경에서는 Canvas 접근이 제한되므로, 텍스트 배치를 분석하여
     * 상단 헤더 영역(보통 relY 250 이하)을 동적으로 필터링할 기준점을 잡습니다.
     */
    const yRefLimit = -1;

    // 1. 행 그룹화 (기존 로직 유지)
    rawItems.forEach((item: TextItem) => {
      if (!item.str?.trim()) return;
      const roundedY = Math.round(item.transform[5]);
      const targetY =
        Object.keys(rows).find(
          (ry) =>
            Math.abs(Number(ry) - roundedY) <= ANALYZER_CONFIG.ROW_THRESHOLD
        ) || roundedY;

      const yKey = Number(targetY);
      if (!rows[yKey]) rows[yKey] = [];
      rows[yKey].push({ str: item.str, transform: item.transform });
    });

    const sortedYKeys = Object.keys(rows)
      .map(Number)
      .sort((a, b) => b - a);

    const leftRaw: { qs: { no: number; y: number }[]; ps: number[] } = {
      qs: [],
      ps: [],
    };
    const rightRaw: { qs: { no: number; y: number }[]; ps: number[] } = {
      qs: [],
      ps: [],
    };

    // 1페이지 키워드 강제 설정 (기존 로직 유지)
    let leftKeyword: { type: "단답형" | "지선다형" | null; y?: number } = {
      type: isFirstPage ? "지선다형" : null,
    };
    let rightKeyword: { type: "단답형" | "지선다형" | null; y?: number } = {
      type: isFirstPage ? "지선다형" : null,
    };

    // 2. 행별 텍스트 추출
    sortedYKeys.forEach((yKey) => {
      const rowItems = rows[yKey].sort(
        (a, b) => a.transform[4] - b.transform[4]
      );
      const relY = (1 - yKey / height) * PDF_CONFIG.COORDINATE_MAX;

      const leftItems = rowItems.filter(
        (i) => (i.transform[4] / width) * PDF_CONFIG.COORDINATE_MAX < 500
      );
      const rightItems = rowItems.filter(
        (i) => (i.transform[4] / width) * PDF_CONFIG.COORDINATE_MAX >= 500
      );

      const processCol = (items: PdfTextItem[], side: "left" | "right") => {
        if (items.length === 0) return;
        const text = items.map((i) => i.str).join("");
        const sanitized = text.replace(/\s+/g, "");
        const target = side === "left" ? leftRaw : rightRaw;

        // 키워드 검사 (기존 로직 유지)
        if (!isFirstPage) {
          let detectedType: "단답형" | "지선다형" | null = null;
          if (sanitized.includes("단답형")) detectedType = "단답형";
          else if (sanitized.includes("지선다형")) detectedType = "지선다형";

          if (detectedType) {
            if (side === "left") leftKeyword = { type: detectedType, y: relY };
            else rightKeyword = { type: detectedType, y: relY };
          }
        }

        /**
         * [필터링 적용]
         * 1페이지 왼쪽 단에서 문제 번호와 배점을 추출할 때만 영역 제한을 적용합니다.
         */
        if (isFirstPage && side === "left" && yRefLimit !== -1) {
          if (relY < yRefLimit) return;
        }

        // 문제 번호 추출 (기존 로직 유지)
        const qMatch = text.match(ANALYZER_CONFIG.Q_NO_REGEX);
        if (qMatch) target.qs.push({ no: parseInt(qMatch[1], 10), y: relY });

        // 배점 추출 (기존 로직 유지)
        const pMatch = text.match(ANALYZER_CONFIG.POINT_REGEX);
        if (pMatch) target.ps.push(parseInt(pMatch[1], 10));
      };

      processCol(leftItems, "left");
      processCol(rightItems, "right");
    });

    // 3. 인덱스 기반 매칭 및 에러 처리 (기존 로직 유지)
    const finalizeColumn = (
      side: "left" | "right",
      raw: { qs: { no: number; y: number }[]; ps: number[] },
      keyword: any
    ): ColumnData => {
      const qLen = raw.qs.length;
      const pLen = raw.ps.length;
      const isMismatch = qLen !== pLen;

      if (isMismatch) {
        console.warn(
          `⚠️ [${side}] 개수 불일치! 번호: ${qLen}개, 배점: ${pLen}개`
        );
      }

      const questions: ExtractedQuestion[] = raw.qs.map((q, idx) => ({
        qNo: q.no,
        point: raw.ps[idx] ?? 0,
      }));

      return {
        column: side,
        questionCount: isMismatch ? "Error" : (questions.length as any),
        questions,
        Keyword: keyword.type,
        keywordY: keyword.y,
      };
    };

    return {
      left: finalizeColumn("left", leftRaw, leftKeyword),
      right: finalizeColumn("right", rightRaw, rightKeyword),
      allTextItems: rawItems,
    };
  },
};
