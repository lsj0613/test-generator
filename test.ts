// test-analyzer.ts
import { PdfTextAnalyzer } from "@/modules/question-extractor/services/page-analyzer";
import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";

async function runTest() {
  const pdfPath = path.resolve(process.cwd(), "test.pdf");

  if (!fs.existsSync(pdfPath)) {
    console.error("❌ 에러: 루트 디렉토리에 test.pdf 파일이 없습니다.");
    return;
  }

  try {
    console.log("🚀 PDF 분석 테스트 시작...");
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;

    console.log(`📄 총 페이지 수: ${pdf.numPages}`);

    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`\n--- [페이지 ${i} 분석] ---`);
      const page = await pdf.getPage(i);

      // 분석 실행
      const result = await PdfTextAnalyzer.analyze(page);

      // 상세 로그 출력
      printColumnLog("LEFT", result.left);
      printColumnLog("RIGHT", result.right);

      console.log(
        `📍 추출된 전체 텍스트 아이템 개수: ${result.allTextItems.length}`
      );
    }

    console.log("\n✅ 테스트 완료");
  } catch (error) {
    console.error("❌ 테스트 중 오류 발생:", error);
  }
}

function printColumnLog(side: string, data: any) {
  console.log(`[${side} Column]`);
  console.log(`  - 결과 상태: ${data.questionCount}`);
  console.log(
    `  - 키워드 발견: ${data.hasKeyword || "없음"} (Y: ${
      data.keywordY?.toFixed(2) || "N/A"
    })`
  );

  if (data.questions.length > 0) {
    data.questions.forEach((q: any, idx: number) => {
      console.log(
        `  - 문제 ${idx + 1}: 번호(${q.qNo}), 배점(${
          q.point
        }), 위치Y(${q.rect.y.toFixed(2)})`
      );
    });
  } else {
    console.log("  - 감지된 문제 없음");
  }
}

runTest();
