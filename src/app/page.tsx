'use client';
import { useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { useEditorStore } from '@/store/useEditorStore';
import PdfPage from '@/components/editor/PdfPage';

export default function EditorPage() {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const { setPages } = useEditorStore();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data });
    const pdf = await loadingTask.promise;
    
    setPdfDoc(pdf);
    setPages(pdf.numPages);
  };

  return (
    <main className="min-h-screen bg-slate-100 p-10">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-xl shadow-md mb-10 flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-800">문항 추출 좌표 검증</h1>
          <input type="file" onChange={handleFile} accept="application/pdf" className="text-sm" />
        </div>

        {pdfDoc && [0, 1, 5].map((idx) => (
          <PdfPage key={idx} pageIndex={idx} pdfDoc={pdfDoc} />
        ))}
      </div>
    </main>
  );
}