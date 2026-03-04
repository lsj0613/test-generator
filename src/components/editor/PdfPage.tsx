'use client';
import { useRef, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { useEditorStore } from '@/store/useEditorStore';

// [중요] Worker 설정
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export default function PdfPage({ pageIndex, pdfDoc }: { pageIndex: number; pdfDoc: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const { pages, updateCoordinate } = useEditorStore();
  const pageData = pages[pageIndex];

  const BOUNDS = { LEFT_START: 55, LEFT_END: 495, RIGHT_START: 505, RIGHT_END: 945 };

  useEffect(() => {
    const renderPage = async () => {
      if (!canvasRef.current || !pdfDoc) return;

      if (renderTaskRef.current) {
        try {
          await renderTaskRef.current.cancel();
        } catch (e) { /* 무시 */ }
      }

      try {
        const page = await pdfDoc.getPage(pageIndex + 1);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { alpha: false });

        if (!context) return;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        renderTaskRef.current = page.render({ canvasContext: context, viewport });
        await renderTaskRef.current.promise;
        renderTaskRef.current = null;
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Render Error:', err);
        }
      }
    };

    renderPage();

    return () => {
      if (renderTaskRef.current) renderTaskRef.current.cancel();
    };
  }, [pdfDoc, pageIndex]);

  const handleMouseMove = (e: React.MouseEvent, coordIndex: number) => {
    if (e.buttons !== 1 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeY = ((e.clientY - rect.top) / rect.height) * 1000;
    updateCoordinate(pageIndex, coordIndex, Math.max(0, Math.min(1000, relativeY)));
  };

  if (!pageData) return null;

  return (
    <div className="flex flex-col items-center gap-2 mb-10">
      <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Page {pageIndex + 1}</p>
      <div 
        ref={containerRef}
        className="relative shadow-sm border border-slate-200 select-none bg-white"
        style={{ width: '800px', aspectRatio: '1 / 1.414' }}
      >
        <canvas ref={canvasRef} className="w-full h-full" />
        
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {[BOUNDS.LEFT_START, BOUNDS.LEFT_END, BOUNDS.RIGHT_START, BOUNDS.RIGHT_END].map((x) => (
            <line key={x} x1={`${x / 10}%`} y1="0" x2={`${x / 10}%`} y2="100%" 
              stroke="#e2e8f0" strokeWidth="1" />
          ))}

          {pageData.coordinates.map((coord, i) => {
            let x1 = `${BOUNDS.LEFT_START / 10}%`;
            let x2 = `${BOUNDS.RIGHT_END / 10}%`;

            if (pageIndex === 0) {
              x1 = i === 0 ? `${BOUNDS.LEFT_START / 10}%` : `${BOUNDS.RIGHT_START / 10}%`;
              x2 = i === 0 ? `${BOUNDS.LEFT_END / 10}%` : `${BOUNDS.RIGHT_END / 10}%`;
            }

            return (
              <line key={i} x1={x1} y1={`${coord.y / 10}%`} x2={x2} y2={`${coord.y / 10}%`}
                stroke={pageIndex === 0 ? (i === 0 ? "#ef4444" : "#3b82f6") : "#64748b"} 
                strokeWidth="1" strokeDasharray="4,2" />
            );
          })}
        </svg>

        {/* 수정된 드래그 핸들러 영역 */}
        {pageData.coordinates.map((coord, i) => {
          let left = `${BOUNDS.LEFT_START / 10}%`;
          let width = `${(BOUNDS.RIGHT_END - BOUNDS.LEFT_START) / 10}%`;

          if (pageIndex === 0) {
            left = i === 0 ? `${BOUNDS.LEFT_START / 10}%` : `${BOUNDS.RIGHT_START / 10}%`;
            width = i === 0 ? `${(BOUNDS.LEFT_END - BOUNDS.LEFT_START) / 10}%` : `${(BOUNDS.RIGHT_END - BOUNDS.RIGHT_START) / 10}%`;
          }

          return (
            <div key={i} className="absolute h-8 -translate-y-4 cursor-ns-resize group"
              style={{ top: `${coord.y / 10}%`, left, width }}
              onMouseMove={(e) => handleMouseMove(e, i)}
            >
              <div className="absolute right-0 top-0 bg-slate-800 text-white text-[9px] px-1 rounded opacity-0 group-hover:opacity-100">
                {Math.round(coord.y)}
              </div>
            </div>
          ); // 여기서 정상적으로 닫힘
        })}
      </div>
    </div>
  );
}