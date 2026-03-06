"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import { useEditorStore } from "../store/useEditorStore";
import { PDF_CONFIG, BOUNDS, COLORS } from "@/lib/constants";
import { useCoordinateDrag } from "../hooks/useCoordinateDrag";
import { processAndUploadToR2Action } from "@/modules/question-extractor/actions/pdf-crop";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export default function PdfPage({ pageIndex, pdfDoc }: { pageIndex: number; pdfDoc: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // useCoordinateDrag에서 반환하는 containerRef를 실제 드래그가 일어날 부모 요소에 연결해야 합니다.
  const { containerRef, draggingIdx, setDraggingIdx } = useCoordinateDrag(pageIndex);
  
  const pageData = useEditorStore((state) => state.pages[pageIndex]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let active = true;
    const renderPage = async () => {
      if (!canvasRef.current || !pdfDoc) return;
      try {
        const page = await pdfDoc.getPage(pageIndex + 1);
        const viewport = page.getViewport({ scale: PDF_CONFIG.SCALE });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", { alpha: false });

        if (context && active) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({ canvasContext: context, viewport }).promise;
        }
      } catch (err) {
        console.error("PDF Render Error:", err);
      }
    };
    renderPage();
    return () => { active = false; };
  }, [pdfDoc, pageIndex]);

  if (!pageData) return null;

  return (
    // 전체 컨테이너 너비를 충분히 확보하여 줄바꿈 방지
    <div className="flex justify-center gap-12 mb-24 items-start font-sans relative max-w-[1200px] mx-auto">
      <div className="flex flex-col items-center">
        <div className="w-full mb-4 px-2 flex justify-start">
          <h2 className="text-xs font-black text-slate-900 bg-white px-3 py-1 rounded-full border shadow-sm">
            PAGE {pageIndex + 1}
          </h2>
        </div>

        {/* containerRef를 이곳에 설정하여 relativeY 계산의 기준점으로 삼음 */}
        <div
          ref={containerRef}
          className="relative shadow-xl border border-slate-200 bg-white overflow-hidden rounded-md select-none"
          style={{ 
            width: `${PDF_CONFIG.CONTAINER_WIDTH}px`, 
            aspectRatio: "1 / 1.414" // PDF_CONFIG.ASPECT_RATIO 대입
          }}
        >
          {/* 1. 배경 PDF (최하단) */}
          <canvas ref={canvasRef} className="w-full h-full pointer-events-none" />
          
          {/* 2. 가이드 라인 SVG (중간) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {[BOUNDS.LEFT_START, BOUNDS.LEFT_END, BOUNDS.RIGHT_START, BOUNDS.RIGHT_END].map((x) => (
              <line key={x} x1={`${x / 10}%`} y1="0" x2={`${x / 10}%`} y2="100%" stroke={COLORS.VERTICAL_LINE} strokeWidth="1" />
            ))}
            
            {pageData.coordinates.map((coord, i) => {
              const isFirstPage = pageIndex === 0;
              const x1 = isFirstPage ? (i === 0 ? BOUNDS.LEFT_START : BOUNDS.RIGHT_START) : BOUNDS.LEFT_START;
              const x2 = isFirstPage ? (i === 0 ? BOUNDS.LEFT_END : BOUNDS.RIGHT_END) : BOUNDS.RIGHT_END;
              const color = isFirstPage ? (i === 0 ? COLORS.LEFT_COLUMN : COLORS.RIGHT_COLUMN) : COLORS.DEFAULT_COLUMN;

              return (
                <line
                  key={i}
                  x1={`${x1 / 10}%`} y1={`${coord.y / 10}%`} x2={`${x2 / 10}%`} y2={`${coord.y / 10}%`}
                  stroke={color} 
                  strokeWidth={draggingIdx === i ? "2" : "1"}
                  strokeDasharray={draggingIdx === i ? "" : "4,3"}
                />
              );
            })}
          </svg>

          {/* 3. 실제 드래그 이벤트 수신 핸들 (최상단) */}
          <div className="absolute inset-0 z-20 pointer-events-none">
            {pageData.coordinates.map((coord, i) => {
              const isFirstPage = pageIndex === 0;
              const left = isFirstPage ? (i === 0 ? BOUNDS.LEFT_START : BOUNDS.RIGHT_START) : BOUNDS.LEFT_START;
              const width = isFirstPage ? (i === 0 ? BOUNDS.LEFT_END - BOUNDS.LEFT_START : BOUNDS.RIGHT_END - BOUNDS.RIGHT_START) : BOUNDS.RIGHT_END - BOUNDS.LEFT_START;
              
              return (
                <div
                  key={i}
                  className="absolute cursor-ns-resize group pointer-events-auto"
                  style={{ 
                    top: `${coord.y / 10}%`, 
                    left: `${left / 10}%`, 
                    width: `${width / 10}%`,
                    height: '24px', // 클릭 영역을 위해 높이 확보
                    transform: 'translateY(-50%)' // 선의 정중앙에 배치
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation(); // 부모 이벤트 간섭 방지
                    setDraggingIdx(i);
                  }}
                >
                  {/* 드래그 중이거나 호버 시 좌표 표시 */}
                  <div className={`absolute -top-6 right-0 text-[10px] font-mono px-2 py-0.5 rounded shadow-sm transition-all whitespace-nowrap ${draggingIdx === i ? "bg-slate-900 text-white opacity-100" : "bg-white/90 text-slate-500 opacity-0 group-hover:opacity-100 border"}`}>
                    Y:{Math.round(coord.y)}
                  </div>
                  {/* 클릭 가능한 영역 시각화 (디버깅용, 실제로는 투명) */}
                  <div className="w-full h-full hover:bg-indigo-500/10 transition-colors" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 우측 컨트롤 패널: 너비 확장(w-72 -> w-80) 및 레이아웃 조정 */}
      <div className="w-80 sticky top-12 shrink-0">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 border-b pb-2 mb-2">수동 좌표 추출</h3>
            <p className="text-xs text-slate-500 leading-relaxed break-keep">
              점선을 드래그하여 문항의 하단 경계(Y값)를 맞추세요. 설정된 좌표를 기준으로 이미지가 크롭됩니다.
            </p>
          </div>
          
          <div className="space-y-2 pt-2">
            <button
              onClick={() => setIsProcessing(true)} // 테스트용
              disabled={isProcessing}
              className="w-full py-3 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
            >
              {isProcessing ? "처리 중..." : "현재 좌표로 R2 업로드"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}