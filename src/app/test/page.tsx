// src/app/test/page.tsx
"use client";

import { processAndUploadToR2 } from "@/modules/question-extractor/actions/pdf-crop";


export default function TestPage() {
  const handleTest = async () => {
    const coords = {
      p1LeftYmax: 220,
      p1RightYmax: 190,
      p2Ymax: 130,
      p6Ymax: 160,
    };

    // 🎯 'Calculus' 카테고리를 첫 번째 인수로 추가하여 3개의 인수를 전달합니다.
    const result = await processAndUploadToR2("202509C", coords);

    if (result.success) {
      // 결과 객체에 count가 있다면 표시하도록 수정 가능합니다.
      alert(`성공! 모든 문항이 R2에 업로드되었습니다.`);
    } else {
      alert(`실패: ${result.error}`);
    }
  };

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">
        R2 업로드 테스트 (실전 경로 적용)
      </h1>
      <button
        onClick={handleTest}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        PDF 크롭 및 R2 업로드 시작
      </button>
    </div>
  );
}
