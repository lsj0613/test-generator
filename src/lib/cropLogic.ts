export function generateCropMap(pages: any[]): any[] {
    const cropMap: any[] = [];
    
    // 1, 2, 6페이지에서 사용자가 설정한 기준 좌표 (없을 시 기본값)
    const p1LeftYmax = pages[0]?.coordinates[0]?.y || 180;
    const p1RightYmax = pages[0]?.coordinates[1]?.y || 180;
    const p2Ymax = pages[1]?.coordinates[0]?.y || 130;
    const p6Ymax = pages[5]?.coordinates[0]?.y || 130;
  
    const BOUNDS = { LEFT_START: 55, LEFT_END: 495, RIGHT_START: 505, RIGHT_END: 945 };
    const BOTTOM_LIMIT = 920; // 하단 자르기 한계점
  
    pages.forEach((page, pageIdx) => {
      if (!page.analysis) return;
  
      const isSpecialPage = page.rawText?.includes('학년도') || page.rawText?.includes('문제지');
  
      ['left', 'right'].forEach((col) => {
        const colData = page.analysis[col as 'left' | 'right'];
        if (colData.questionCount === 'Error') return;
  
        const hasSpecialType = page.rawText?.includes('5지선다형') || page.rawText?.includes('단답형');
  
        // [규칙 적용] yStart 결정
        let yStart = isSpecialPage 
          ? (hasSpecialType ? p1LeftYmax : p1RightYmax) 
          : (hasSpecialType ? p6Ymax : p2Ymax);
  
        const xStart = col === 'left' ? BOUNDS.LEFT_START : BOUNDS.RIGHT_START;
        const xWidth = col === 'left' ? (BOUNDS.LEFT_END - BOUNDS.LEFT_START) : (BOUNDS.RIGHT_END - BOUNDS.RIGHT_START);
  
        // 문항 번호순 정렬
        const sortedQs = [...colData.questions].sort((a, b) => a.y - b.y);
  
        if (colData.questionCount === 1 && sortedQs.length >= 1) {
          cropMap.push({
            pageIndex: pageIdx,
            qNo: sortedQs[0].no,
            rect: { x: xStart, y: yStart, w: xWidth, h: Math.max(100, BOTTOM_LIMIT - yStart) }
          });
        } 
        else if (colData.questionCount === 2 && sortedQs.length >= 2) {
          const lowerQ = sortedQs[1];
          // 아랫 문제 번호 Y값 - 40 (경계점)
          let yMid = lowerQ.y - 40;
          
          // yMid가 yStart보다 작아지는 논리 오류 방지
          if (yMid <= yStart) yMid = yStart + (BOTTOM_LIMIT - yStart) / 2;
  
          // 위 문항
          cropMap.push({
            pageIndex: pageIdx,
            qNo: sortedQs[0].no,
            rect: { x: xStart, y: yStart, w: xWidth, h: Math.max(50, yMid - yStart) }
          });
  
          // 아래 문항
          cropMap.push({
            pageIndex: pageIdx,
            qNo: lowerQ.no,
            rect: { x: xStart, y: yMid, w: xWidth, h: Math.max(50, BOTTOM_LIMIT - yMid) }
          });
        }
      });
    });
  
    return cropMap;
  }