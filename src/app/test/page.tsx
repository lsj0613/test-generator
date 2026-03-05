// src/app/test/page.tsx
'use client';

import { processAndUploadToR2 } from "@/actions/pdf-crop";


export default function TestPage() {
  const handleTest = async () => {
    // 1. 실제 public 폴더에 test.pdf가 있는지 확인하세요.
    // 2. 사용자님이 알아낸 최적의 좌표값을 넣습니다.
    const coords = {
      p1LeftYmax: 220,
      p1RightYmax: 190,
      p2Ymax: 130,
      p6Ymax: 160
    };

    const result = await processAndUploadToR2('202509C', coords);
    
    if (result.success) {
      alert(`성공! 개의 문항이 R2에 업로드되었습니다.`);
    } else {
      alert(`실패: ${result.error}`);
    }
  };

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold mb-4">R2 업로드 테스트</h1>
      <button 
        onClick={handleTest}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        PDF 크롭 및 R2 업로드 시작
      </button>
    </div>
  );
}