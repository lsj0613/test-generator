// src/features/extract_question/services/analyzer.service.ts
import {
  BOUNDS,
  ANALYZER_CONFIG,
  PDF_CONFIG,
  SERVER_ONLY_CONFIG,
} from "@/lib/constants";

export const AnalyzerService = {
  /** [기존 analyzePdfText 로직은 유지 - 인식률 복구 버전] */
  async analyzePdfText(page: any) {
    const textContent = await page.getTextContent();
    const { width, height } = page.getViewport({ scale: 1.0 });
    const rows: { [key: number]: any[] } = {};

    textContent.items.forEach((item: any) => {
      if (!item.str?.trim()) return;
      const roundedY = Math.round(item.transform[5]);
      const targetY =
        Object.keys(rows).find(
          (ry) =>
            Math.abs(Number(ry) - roundedY) <= ANALYZER_CONFIG.ROW_THRESHOLD
        ) || roundedY;

      if (!rows[Number(targetY)]) rows[Number(targetY)] = [];
      rows[Number(targetY)].push({
        str: item.str,
        x: item.transform[4],
        relX: (item.transform[4] / width) * PDF_CONFIG.COORDINATE_MAX,
      });
    });

    const leftQs: any[] = [];
    const rightQs: any[] = [];
    const leftPoints: any[] = [];
    const rightPoints: any[] = [];

    Object.keys(rows).forEach((yKey) => {
      const rowItems = rows[Number(yKey)].sort((a, b) => a.x - b.x);
      const relY = (1 - Number(yKey) / height) * PDF_CONFIG.COORDINATE_MAX;

      const leftItems = rowItems.filter((i) => i.relX < 500);
      const rightItems = rowItems.filter((i) => i.relX >= 500);

      const processCol = (items: any[], qList: any[], pList: any[], col: "left" | "right") => {
        if (items.length === 0) return;
        const text = items.map((i) => i.str).join("");
        const qMatch = text.match(ANALYZER_CONFIG.Q_NO_REGEX);
        if (qMatch) {
          qList.push({ no: parseInt(qMatch[1], 10), y: relY });
        }
        const pMatch = text.match(/\[(\d+)점\]/);
        if (pMatch) {
          pList.push({ val: parseInt(pMatch[1], 10), y: relY });
        }
      };

      processCol(leftItems, leftQs, leftPoints, "left");
      processCol(rightItems, rightQs, rightPoints, "right");
    });

    const getCount = (qs: any[]): 1 | 2 | "Error" => {
      if (qs.length === 1 || qs.length === 2) return qs.length as 1 | 2;
      return "Error";
    };

    return {
      left: { column: "left" as const, questionCount: getCount(leftQs), questions: leftQs, points: leftPoints },
      right: { column: "right" as const, questionCount: getCount(rightQs), questions: rightQs, points: rightPoints },
      allTextItems: textContent.items,
    };
  },

  /** 🎯 수정된 좌표 계산 비즈니스 로직 */
  calculateRects(
    col: "left" | "right",
    analysis: any,
    isSpecialPage: boolean,
    hasSpecialType: boolean,
    coords: any
  ) {
    const colData = analysis[col];
    // 페이지 타입에 따른 상단 시작점(ymax) 결정
    const yStart = isSpecialPage
      ? hasSpecialType ? coords.p1LeftYmax : coords.p1RightYmax
      : hasSpecialType ? coords.p6Ymax : coords.p2Ymax;

    const xStart = col === "left" ? BOUNDS.LEFT_START : BOUNDS.RIGHT_START;
    const xWidth = col === "left" 
      ? BOUNDS.LEFT_END - BOUNDS.LEFT_START 
      : BOUNDS.RIGHT_END - BOUNDS.RIGHT_START;

    const sortedQs = [...colData.questions].sort((a, b) => a.y - b.y);
    const results = [];

    for (let j = 0; j < sortedQs.length; j++) {
      const q = sortedQs[j];
      
      // 🎯 [수정] 30번 문항 로직: 
      // 시작점(ymax)은 일반 yStart를 쓰되, 끝점(ymin)만 590으로 고정
      let currentY = yStart; 
      let currentH = (q.no === 30) 
        ? (SERVER_ONLY_CONFIG.Q30_SPECIAL_Y - yStart) 
        : (SERVER_ONLY_CONFIG.LIMIT_Y - yStart);

      // 해당 단에 문항이 2개인 경우 (경계점 yMid 계산)
      if (sortedQs.length >= 2) {
        let yMid = sortedQs[1].y - 40;
        // 30번이 아래에 있을 경우 경계점은 590으로 설정
        if (sortedQs[1].no === 30) yMid = SERVER_ONLY_CONFIG.Q30_SPECIAL_Y;

        if (j === 0) {
          // 위 문항: 시작점(currentY)부터 경계점(yMid)까지
          currentH = yMid - currentY;
        } else {
          // 아래 문항: 경계점(yMid)부터 시작
          currentY = yMid;
          // 🎯 [수정] 아래 문항이 30번일 경우 끝점은 590, 아니면 LIMIT_Y(900)
          currentH = (q.no === 30) 
            ? (SERVER_ONLY_CONFIG.Q30_SPECIAL_Y - currentY) 
            : (SERVER_ONLY_CONFIG.LIMIT_Y - currentY);
        }
      }

      if (currentH > 0) {
        results.push({
          qNo: q.no,
          rect: { x: xStart, y: currentY, w: xWidth, h: currentH },
        });
      }
    }
    return results;
  },
};