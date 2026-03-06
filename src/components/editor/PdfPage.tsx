"use client";

import { useRef, useEffect, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import { useEditorStore } from "@/store/useEditorStore";
import { PDF_CONFIG, BOUNDS, COLORS } from "@/lib/constants";
import { AnalyzerService } from "@/features/extract_question/services/analyzer.service"; // 추가

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export default function PdfPage({
  pageIndex,
  pdfDoc,
}: {
  pageIndex: number;
  pdfDoc: any;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const isRendering = useRef<boolean>(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const { pages, updateCoordinate, updateAnalysis } = useEditorStore();
  const pageData = pages[pageIndex];

  useEffect(() => {
    let active = true;
    const runProcess = async () => {
      if (!canvasRef.current || !pdfDoc || !active) return;
      if (renderTaskRef.current) await renderTaskRef.current.cancel();
      while (isRendering.current)
        await new Promise((res) => setTimeout(res, 50));
      if (!active || !canvasRef.current) return;

      try {
        isRendering.current = true;
        const page = await pdfDoc.getPage(pageIndex + 1);

        // PDF 렌더링
        const viewport = page.getViewport({ scale: PDF_CONFIG.SCALE });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", { alpha: false });
        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          renderTaskRef.current = page.render({
            canvasContext: context,
            viewport,
          });
          await renderTaskRef.current.promise;
        }

        // 렌더링 완료 후 자동 분석
        if (active) {
          setIsAnalyzing(true);

          // 🎯 AnalyzerService로부터 타입이 완벽히 정의된 결과 수신
          const results = await AnalyzerService.analyzePdfText(page);

          // 🎯 결과 객체를 있는 그대로 updateAnalysis에 전달
          updateAnalysis(pageIndex, {
            left: results.left,
            right: results.right,
          });

          setIsAnalyzing(false);
        }
      } catch (err: any) {
        if (err.name !== "RenderingCancelledException") console.error(err);
      } finally {
        isRendering.current = false;
        renderTaskRef.current = null;
      }
    };

    runProcess();
    return () => {
      active = false;
      if (renderTaskRef.current) renderTaskRef.current.cancel();
    };
  }, [pdfDoc, pageIndex]);

  useEffect(() => {
    if (draggingIdx === null) return;
    const handleGlobalMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeY =
        ((e.clientY - rect.top) / rect.height) * PDF_CONFIG.COORDINATE_MAX;
      updateCoordinate(
        pageIndex,
        draggingIdx,
        Math.max(0, Math.min(PDF_CONFIG.COORDINATE_MAX, relativeY))
      );
    };
    const handleGlobalUp = () => setDraggingIdx(null);
    window.addEventListener("mousemove", handleGlobalMove);
    window.addEventListener("mouseup", handleGlobalUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalUp);
    };
  }, [draggingIdx, pageIndex, updateCoordinate]);

  if (!pageData) return null;

  return (
    <div className="flex justify-center gap-10 mb-24 items-start font-sans">
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
          <span className="text-[10px] font-mono text-slate-400 tracking-widest">
            VECTOR MODE
          </span>
        </div>

        <div
          ref={containerRef}
          className="relative shadow-2xl border border-slate-200 bg-white overflow-hidden rounded-sm select-none"
          style={{
            width: `${PDF_CONFIG.CONTAINER_WIDTH}px`,
            aspectRatio: PDF_CONFIG.ASPECT_RATIO,
          }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full pointer-events-none"
          />
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* 세로 실선: 굵기는 유지하되 색상을 선명하게 수정 */}
            {[
              BOUNDS.LEFT_START,
              BOUNDS.LEFT_END,
              BOUNDS.RIGHT_START,
              BOUNDS.RIGHT_END,
            ].map((x) => (
              <line
                key={x}
                x1={`${x / 10}%`}
                y1="0"
                x2={`${x / 10}%`}
                y2="100%"
                stroke={COLORS.VERTICAL_LINE}
                strokeWidth="1"
              />
            ))}
            {pageData.coordinates.map((coord, i) => {
              let x1 =
                pageIndex === 0
                  ? i === 0
                    ? BOUNDS.LEFT_START
                    : BOUNDS.RIGHT_START
                  : BOUNDS.LEFT_START;
              let x2 =
                pageIndex === 0
                  ? i === 0
                    ? BOUNDS.LEFT_END
                    : BOUNDS.RIGHT_END
                  : BOUNDS.RIGHT_END;
              const color =
                pageIndex === 0
                  ? i === 0
                    ? COLORS.LEFT_COLUMN
                    : COLORS.RIGHT_COLUMN
                  : COLORS.DEFAULT_COLUMN;

              return (
                <line
                  key={i}
                  x1={`${x1 / 10}%`}
                  y1={`${coord.y / 10}%`}
                  x2={`${x2 / 10}%`}
                  y2={`${coord.y / 10}%`}
                  stroke={color}
                  strokeWidth={draggingIdx === i ? "2" : "1"}
                  strokeDasharray={
                    draggingIdx === i ? "" : COLORS.GUIDE_LINE_STOKE
                  }
                />
              );
            })}
          </svg>
          {pageData.coordinates.map((coord, i) => {
            let left =
              pageIndex === 0
                ? i === 0
                  ? BOUNDS.LEFT_START
                  : BOUNDS.RIGHT_START
                : BOUNDS.LEFT_START;
            let width =
              pageIndex === 0
                ? i === 0
                  ? BOUNDS.LEFT_END - BOUNDS.LEFT_START
                  : BOUNDS.RIGHT_END - BOUNDS.RIGHT_START
                : BOUNDS.RIGHT_END - BOUNDS.LEFT_START;
            return (
              <div
                key={i}
                className="absolute h-10 -translate-y-5 cursor-ns-resize group z-10"
                style={{
                  top: `${coord.y / 10}%`,
                  left: `${left / 10}%`,
                  width: `${width / 10}%`,
                }}
                onMouseDown={() => setDraggingIdx(i)}
              >
                <div
                  className={`absolute top-0 right-0 text-[10px] font-mono px-2 py-0.5 rounded shadow-sm transition-all ${
                    draggingIdx === i
                      ? "bg-slate-900 text-white scale-110"
                      : "bg-white/90 text-slate-500 opacity-0 group-hover:opacity-100 border"
                  }`}
                >
                  Y:{Math.round(coord.y)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 분석 결과 사이드바 */}
      <div className="w-72 sticky top-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">
              Analysis Overview
            </h3>
          </div>
          <ResultCard
            label="Left Column"
            data={pageData.analysis?.left}
            theme="indigo"
            loading={isAnalyzing}
          />
          <ResultCard
            label="Right Column"
            data={pageData.analysis?.right}
            theme="blue"
            loading={isAnalyzing}
          />
        </div>
      </div>
    </div>
  );
}

// ResultCard 컴포넌트는 이전과 동일하게 유지 (상수 적용 시 내부 로직 최적화 가능)
function ResultCard({ label, data, theme, loading }: any) {
  const isError = !data || data.questionCount === "Error";
  const themeClass = loading
    ? "bg-slate-50 border-slate-100 text-slate-400"
    : isError
    ? "bg-red-50 border-red-100 text-red-600"
    : theme === "indigo"
    ? "bg-indigo-50 border-indigo-100 text-indigo-700"
    : "bg-blue-50 border-blue-100 text-blue-700";

  return (
    <div
      className={`p-4 rounded-xl border-l-4 transition-all duration-300 ${themeClass} ${
        loading ? "animate-pulse" : "shadow-sm"
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <p className="text-[9px] font-black uppercase opacity-60 tracking-wider">
          {label}
        </p>
        {!loading && !isError && (
          <span className="bg-white/50 px-1.5 py-0.5 rounded text-[8px] font-bold">
            MATCHED
          </span>
        )}
      </div>
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] font-bold opacity-80">문항 수</span>
        <span className="text-3xl font-black font-mono tracking-tighter">
          {loading ? "--" : isError ? "0" : data.questionCount}
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-black/5 flex flex-col gap-2">
        <div className="flex justify-between text-[10px] font-bold opacity-60">
          <span>포인트</span>
          <span>
            {loading ? "-" : isError ? "0개" : `${data.points.length}개`}
          </span>
        </div>
        {!loading && !isError && data.points && (
          <div className="flex flex-wrap gap-1.5">
            {data.points.map((p: any, i: number) => (
              <span
                key={i}
                className="text-[9px] px-1.5 py-0.5 bg-white/60 rounded-md font-mono font-bold"
              >
                [{p.val}점]
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
