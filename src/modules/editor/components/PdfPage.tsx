// src/modules/editor/components/PdfPage.tsx
"use client";

import { useState } from "react";
import * as pdfjs from "pdfjs-dist";
import { useEditorStore } from "../store/useEditorStore";
import { PDF_CONFIG, BOUNDS, COLORS } from "@/lib/constants";
import { usePdfAnalyzer } from "../hooks/usePdfAnalyzer";
import { useCoordinateDrag } from "../hooks/useCoordinateDrag";
import { ColumnAnalysis } from "@/modules/question-extractor/types";

// 액션 임포트
import { processAndUploadToR2 } from "@/modules/question-extractor/actions/pdf-crop";
import { processAndSaveToLocal } from "@/modules/question-extractor/actions/local-crop";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export default function PdfPage({ pageIndex, pdfDoc }: { pageIndex: number; pdfDoc: any }) {
  const { canvasRef, isAnalyzing } = usePdfAnalyzer(pdfDoc, pageIndex);
  const { containerRef, draggingIdx, setDraggingIdx } = useCoordinateDrag(pageIndex);
  const pageData = useEditorStore((state) => state.pages[pageIndex]);
  const pages = useEditorStore((state) => state.pages);

  const [isProcessing, setIsProcessing] = useState(false);

  if (!pageData) return null;

  // 🎯 좌표 추출 헬퍼: DEFAULT_Y_COORD 대신 UI(스토어)의 값을 엄격히 검증
  const getCoordsPayload = () => {
    const p1 = pages[0]?.coordinates;
    const p2 = pages[1]?.coordinates;
    const p6 = pages[5]?.coordinates;

    // 필수 좌표가 하나라도 누락되었는지 확인 (undefined 체크)
    if (
      p1?.[0]?.y === undefined || 
      p1?.[1]?.y === undefined || 
      p2?.[0]?.y === undefined || 
      p6?.[0]?.y === undefined
    ) {
      throw new Error("필수 가이드라인 좌표(1, 2, 6페이지)가 설정되지 않았습니다. 모든 가이드라인을 확인해 주세요.");
    }

    return {
      p1LeftYmax: p1[0].y,
      p1RightYmax: p1[1].y,
      p2Ymax: p2[0].y,
      p6Ymax: p6[0].y,
    };
  };

  const handleAction = async (type: "local" | "r2") => {
    setIsProcessing(true);
    const testId = "202509C"; // 추후 동적 라우팅 파라미터로 대체

    try {
      // 🎯 좌표 검증 실행
      const coords = getCoordsPayload();

      if (type === "local") {
        const result = await processAndSaveToLocal(testId, coords);
        if (result.success) {
          alert(`로컬 저장 완료: ${result.path} (${result.count}개 문항)`);
        } else {
          alert(`실패: ${result.error}`);
        }
      } else {
        const result = await processAndUploadToR2(testId, coords);
        if (result.success) {
          alert("R2 업로드 완료!");
        } else {
          alert(`실패: ${result.error}`);
        }
      }
    } catch (error: any) {
      // 🎯 검증 실패 시 에러 메시지 출력
      alert(error.message || "처리 중 알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex justify-center gap-10 mb-24 items-start font-sans relative">
      {/* 중앙 PDF 캔버스 영역 */}
      <div className="flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-4 px-2">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-black text-slate-900 bg-white px-3 py-1 rounded-full border shadow-sm">
              PAGE {pageIndex + 1}
            </h2>
            {isAnalyzing && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 animate-pulse">
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span>
                ANALYZING...
              </span>
            )}
          </div>
        </div>

        <div
          ref={containerRef}
          className="relative shadow-lg border border-slate-200 bg-white overflow-hidden rounded-md select-none"
          style={{ width: `${PDF_CONFIG.CONTAINER_WIDTH}px`, aspectRatio: PDF_CONFIG.ASPECT_RATIO }}
        >
          <canvas ref={canvasRef} className="w-full h-full pointer-events-none" />
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {[BOUNDS.LEFT_START, BOUNDS.LEFT_END, BOUNDS.RIGHT_START, BOUNDS.RIGHT_END].map((x) => (
              <line key={x} x1={`${x / 10}%`} y1="0" x2={`${x / 10}%`} y2="100%" stroke={COLORS.VERTICAL_LINE} strokeWidth="1" />
            ))}
            {pageData.coordinates.map((coord, i) => {
              let x1 = pageIndex === 0 ? (i === 0 ? BOUNDS.LEFT_START : BOUNDS.RIGHT_START) : BOUNDS.LEFT_START;
              let x2 = pageIndex === 0 ? (i === 0 ? BOUNDS.LEFT_END : BOUNDS.RIGHT_END) : BOUNDS.RIGHT_END;
              const color = pageIndex === 0 ? (i === 0 ? COLORS.LEFT_COLUMN : COLORS.RIGHT_COLUMN) : COLORS.DEFAULT_COLUMN;

              return (
                <line
                  key={i}
                  x1={`${x1 / 10}%`} y1={`${coord.y / 10}%`} x2={`${x2 / 10}%`} y2={`${coord.y / 10}%`}
                  stroke={color} strokeWidth={draggingIdx === i ? "2" : "1"}
                  strokeDasharray={draggingIdx === i ? "" : COLORS.GUIDE_LINE_STOKE}
                />
              );
            })}
          </svg>
          {pageData.coordinates.map((coord, i) => {
            let left = pageIndex === 0 ? (i === 0 ? BOUNDS.LEFT_START : BOUNDS.RIGHT_START) : BOUNDS.LEFT_START;
            let width = pageIndex === 0 ? (i === 0 ? BOUNDS.LEFT_END - BOUNDS.LEFT_START : BOUNDS.RIGHT_END - BOUNDS.RIGHT_START) : BOUNDS.RIGHT_END - BOUNDS.LEFT_START;
            return (
              <div
                key={i}
                className="absolute h-10 -translate-y-5 cursor-ns-resize group z-10"
                style={{ top: `${coord.y / 10}%`, left: `${left / 10}%`, width: `${width / 10}%` }}
                onMouseDown={() => setDraggingIdx(i)}
              >
                <div className={`absolute top-0 right-0 text-[10px] font-mono px-2 py-0.5 rounded shadow-sm transition-all ${draggingIdx === i ? "bg-slate-900 text-white scale-110" : "bg-white/90 text-slate-500 opacity-0 group-hover:opacity-100 border"}`}>
                  Y:{Math.round(coord.y)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 우측 사이드바 및 액션 패널 */}
      <div className="w-72 sticky top-12 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <ResultCard label="Left Column" data={pageData.analysis?.left} theme="indigo" loading={isAnalyzing} />
          <ResultCard label="Right Column" data={pageData.analysis?.right} theme="blue" loading={isAnalyzing} />
        </div>

        {/* 추출 컨트롤 패널 */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col gap-3">
          <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mb-1">추출 컨트롤</h3>
          
          <button
            onClick={() => handleAction("local")}
            disabled={isProcessing}
            className="w-full py-2.5 bg-slate-100 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            {isProcessing ? "처리 중..." : "로컬 테스트 추출 (.tmp)"}
          </button>
          
          <button
            onClick={() => handleAction("r2")}
            disabled={isProcessing}
            className="w-full py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {isProcessing ? "업로드 중..." : "Cloudflare R2 실배포"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, data, theme, loading }: { label: string; data?: ColumnAnalysis; theme: string; loading: boolean }) {
  const isError = !data || data.questionCount === "Error";
  const themeClass = loading ? "bg-slate-50 border-slate-100 text-slate-400" : isError ? "bg-red-50 border-red-100 text-red-600" : theme === "indigo" ? "bg-indigo-50 border-indigo-100 text-indigo-700" : "bg-blue-50 border-blue-100 text-blue-700";

  return (
    <div className={`p-4 rounded-xl border-l-4 transition-all duration-300 ${themeClass} ${loading ? "animate-pulse" : "shadow-sm"}`}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-[9px] font-black uppercase opacity-60 tracking-wider">{label}</p>
      </div>
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] font-bold opacity-80">문항 수</span>
        <span className="text-3xl font-black font-mono tracking-tighter">{loading ? "--" : isError ? "0" : data.questionCount}</span>
      </div>
      <div className="mt-3 pt-3 border-t border-black/5 flex flex-col gap-2">
        <div className="flex justify-between text-[10px] font-bold opacity-60">
          <span>포인트</span>
          <span>{loading ? "-" : isError ? "0개" : `${data?.points.length}개`}</span>
        </div>
      </div>
    </div>
  );
}