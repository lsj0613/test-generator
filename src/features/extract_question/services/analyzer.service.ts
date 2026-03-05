// src/services/analyzer.service.ts
import {
  BOUNDS,
  ANALYZER_CONFIG,
  PDF_CONFIG,
  SERVER_ONLY_CONFIG,
} from "@/lib/constants";

export const AnalyzerService = {
  /** 사용자가 제공한 analyzePdfText 로직 유지 */
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
      rows[Number(targetY)].push({ str: item.str, x: item.transform[4] });
    });

    const leftData: any[] = [];
    const rightData: any[] = [];

    Object.keys(rows).forEach((yKey) => {
      const rowItems = rows[Number(yKey)].sort((a, b) => a.x - b.x);
      const fullLineText = rowItems.map((i) => i.str).join("");
      const relX = (rowItems[0].x / width) * PDF_CONFIG.COORDINATE_MAX;
      const relY = (1 - Number(yKey) / height) * PDF_CONFIG.COORDINATE_MAX;

      const qMatch = fullLineText.match(ANALYZER_CONFIG.Q_NO_REGEX);
      if (qMatch) {
        const info = { no: parseInt(qMatch[1], 10), y: relY };
        if (relX < 500) leftData.push(info);
        else rightData.push(info);
      }
    });

    return {
      left: { questions: leftData },
      right: { questions: rightData },
      allTextItems: textContent.items,
    };
  },

  /** 기존 코드의 좌표 계산 비즈니스 로직 */
  calculateRects(
    col: "left" | "right",
    analysis: any,
    isSpecialPage: boolean,
    hasSpecialType: boolean,
    coords: any
  ) {
    const colData = analysis[col];
    const yStart = isSpecialPage
      ? hasSpecialType
        ? coords.p1LeftYmax
        : coords.p1RightYmax
      : hasSpecialType
      ? coords.p6Ymax
      : coords.p2Ymax;

    const xStart = col === "left" ? BOUNDS.LEFT_START : BOUNDS.RIGHT_START;
    const xWidth =
      col === "left"
        ? BOUNDS.LEFT_END - BOUNDS.LEFT_START
        : BOUNDS.RIGHT_END - BOUNDS.RIGHT_START;

    const sortedQs = [...colData.questions].sort((a, b) => a.y - b.y);
    const results = [];

    for (let j = 0; j < sortedQs.length; j++) {
      const q = sortedQs[j];
      let currentY = q.no === 30 ? SERVER_ONLY_CONFIG.Q30_SPECIAL_Y : yStart;
      let currentH = SERVER_ONLY_CONFIG.LIMIT_Y - currentY;

      if (sortedQs.length >= 2) {
        let yMid = sortedQs[1].y - 40;
        if (sortedQs[1].no === 30) yMid = SERVER_ONLY_CONFIG.Q30_SPECIAL_Y;

        if (j === 0) {
          currentH = yMid - currentY;
        } else {
          currentY = q.no === 30 ? SERVER_ONLY_CONFIG.Q30_SPECIAL_Y : yMid;
          currentH = SERVER_ONLY_CONFIG.LIMIT_Y - currentY;
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
