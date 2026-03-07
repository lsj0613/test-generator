import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";

/**
 * 1. 메타데이터 분석기 (PaperMetadataAnalyzer)
 */
export const PaperMetadataAnalyzer = {
  async extract(firstPage: any, lastPage: any, fileName: string): Promise<any> {
    const { height } = firstPage.getViewport({ scale: 1.0 });

    const getTopText = async (page: any, pageNum: number) => {
      const content = await page.getTextContent();
      const extracted = content.items
        .filter((item: any) => "str" in item && "transform" in item)
        .filter((item: any) => {
          const relY = (1 - item.transform[5] / height) * 1000;
          return relY <= 300;
        })
        .map((item: any) => item.str)
        .join("")
        .replace(/\s+/g, "");

      console.log(`\n[DEBUG] --- Page ${pageNum} Extracted Top Text ---`);
      console.log(extracted);
      console.log(`[DEBUG] ------------------------------------------\n`);

      return extracted;
    };

    const firstFullText = await getTopText(firstPage, 1);
    const lastFullText = await getTopText(lastPage, 0);

    // 0. '문제지' 텍스트 필수 검증 (hasPaper)
    const hasPaper = firstFullText.includes("문제지");
    if (!hasPaper) {
      throw new Error("문서 상단에서 '문제지' 텍스트를 찾을 수 없습니다.");
    }

    // 1. 시행 연도 추출
    const yearMatch = firstFullText.match(/(\d{4})(?:학년도|년)/);
    if (!yearMatch) {
      throw new Error("문서 상단에서 연도 정보를 찾을 수 없습니다.");
    }
    const yearValue = parseInt(yearMatch[1], 10);

    // 2. 키워드 분석
    const hasSuneung = firstFullText.includes("대학수학능력시험");
    const isSuneungStrict = firstFullText.includes("대학수학능력시험문제지");

    let grade: number;
    let month: number;
    let source: "평가원" | "교육청";

    // 3. 출처 및 시행 정보 판별
    if (hasSuneung) {
      source = "평가원";
      if (isSuneungStrict) {
        // grade = 3; // 기존 로직 주석 처리
        month = 11;
      } else {
        const monthMatch = firstFullText.match(/(\d{1,2})월/);
        if (!monthMatch) throw new Error("평가원 시행 월 인식 실패");
        month = parseInt(monthMatch[1], 10);
        // grade = 3; // 기존 로직 주석 처리

        // [추가된 로직] 평가원 모의평가(수능 제외)는 6월 또는 9월만 허용
        if (month !== 6 && month !== 9) {
          throw new Error(
            `부적절한 평가원 시행 월: ${month}월 (6, 9월만 가능)`
          );
        }
      }
    } else {
      source = "교육청";
      // const gradeMatch = firstFullText.match(/고(\d)/); // 기존 로직 주석 처리
      const monthMatch = firstFullText.match(/(\d{1,2})월/);
      // if (!gradeMatch || !monthMatch) throw new Error("교육청 정보 인식 실패"); // 기존 로직 주석 처리
      if (!monthMatch) throw new Error("교육청 정보 인식 실패");

      // grade = parseInt(gradeMatch[1], 10); // 기존 로직 주석 처리
      month = parseInt(monthMatch[1], 10);
    }

    // [수정 사항] grade를 상수 3으로 고정 (추후 변경 가능하도록)
    grade = 3;

    // 4. 과목 판별 로직
    let subject: string | null = null;
    let isFallback = false;

    if (lastFullText.includes("기하"))
      throw new Error("지원하지 않는 선택과목: 기하");

    if (/가\s?형/.test(lastFullText) || lastFullText.includes("가형"))
      subject = "가형";
    else if (/나\s?형/.test(lastFullText) || lastFullText.includes("나형"))
      subject = "나형";
    else if (/A\s?형/.test(lastFullText) || lastFullText.includes("A형"))
      subject = "A형";
    else if (/B\s?형/.test(lastFullText) || lastFullText.includes("B형"))
      subject = "B형";
    else if (lastFullText.includes("미적분")) subject = "미적분";
    else if (lastFullText.includes("확률과통계")) subject = "확률과통계";

    // 파일명 기반 Fallback
    if (!subject) {
      const nameToCheck = fileName ? fileName.toLowerCase() : "";
      if (nameToCheck.includes("mathga")) {
        subject = "가형";
        isFallback = true;
      } else if (nameToCheck.includes("mathna")) {
        subject = "나형";
        isFallback = true;
      }
    }

    if (!subject) throw new Error("과목명 인식 불가능");

    // [로직 고정] 평가원(수능/모평)은 무조건 학년도 - 1
    const actualYear = source === "평가원" ? yearValue - 1 : yearValue;

    return {
      year: actualYear,
      month,
      grade,
      source,
      subject,
      isFallback,
    };
  },
};
