// src/modules/paper-upload/components/PaperUploadForm.tsx
"use client";

import { useState } from "react";
import { uploadPaperAction } from "../actions/upload-action";

export default function PaperUploadForm() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;

    if (!file || file.type !== "application/pdf") {
      alert("PDF 파일만 업로드 가능합니다.");
      return;
    }

    setLoading(true);
    setMessage("분석 및 업로드 중...");

    try {
      const result = await uploadPaperAction(formData);
      if (result.success) {
        setMessage(
          `✅ 성공! ${result.data?.year}년 ${result.data?.month}월 시험지가 등록되었습니다.`
        );
      } else {
        setMessage(`❌ 실패: ${result.error}`);
      }
    } catch (err) {
      setMessage("❌ 시스템 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg bg-white shadow-sm max-w-md">
      <h2 className="text-xl font-bold mb-4">기출 PDF 업로드</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          name="file"
          accept=".pdf"
          disabled={loading}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md font-medium disabled:bg-gray-400 transition-colors"
        >
          {loading ? "처리 중..." : "시험지 등록하기"}
        </button>
      </form>
      {message && (
        <p className="mt-4 text-sm text-center font-medium">{message}</p>
      )}
    </div>
  );
}
