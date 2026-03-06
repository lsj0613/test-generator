// src/app/upload/page.tsx
"use client";

import { useState } from "react";
import { uploadRawPdfToR2 } from "@/modules/storage/actions/upload-pdf";

export default function UploadPage() {
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    
    const formData = new FormData(e.currentTarget);
    const result = await uploadRawPdfToR2(formData);

    if (result.success) {
      alert("DB 및 R2 업로드 완료!");
      // 추후 에디터 페이지로 리다이렉트 (e.g., router.push(`/test?id=${testId}`))
    } else {
      alert(`오류: ${result.error}`);
    }
    setIsUploading(false);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">원본 PDF 업로드</h1>
      <p className="text-slate-500 text-sm mb-8">시험지 PDF를 R2에 업로드하고 DB에 메타데이터를 등록합니다.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">카테고리 (과목)</label>
          <select name="category" className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="Calculus">미적분 (Calculus)</option>
            <option value="Statistics">확률과 통계 (Statistics)</option>
            <option value="Geometry">기하 (Geometry)</option>
            <option value="Common">공통 (Common)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">시험지 ID (예: 202509C)</label>
          <input type="text" name="testId" required placeholder="YYYYMM + Suffix" className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">PDF 파일 첨부</label>
          <input type="file" name="pdf" accept="application/pdf" required className="w-full p-3 border border-slate-200 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
        </div>

        <button type="submit" disabled={isUploading} className="w-full py-4 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 mt-4">
          {isUploading ? "처리 중..." : "업로드 및 DB 저장"}
        </button>
      </form>
    </div>
  );
}