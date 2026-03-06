// src/modules/editor/hooks/usePdfAnalyzer.ts
import { useEffect, useRef, useState } from "react";
import { PDF_CONFIG } from "@/lib/constants";
import { useEditorStore } from "../store/useEditorStore";
import { AnalyzerService } from "@/modules/question-extractor/services/analyzer.service";

export function usePdfAnalyzer(pdfDoc: any, pageIndex: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  
  // 🎯 누락되었던 렌더링 상태 추적(Lock) 변수 복구
  const isRendering = useRef<boolean>(false); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const updateAnalysis = useEditorStore((state) => state.updateAnalysis);

  useEffect(() => {
    let active = true;

    const runProcess = async () => {
      if (!canvasRef.current || !pdfDoc || !active) return;

      // 🎯 기존에 작성하셨던 완벽한 취소 및 대기(Lock) 로직 복구
      if (renderTaskRef.current) {
        await renderTaskRef.current.cancel();
      }
      while (isRendering.current) {
        await new Promise((res) => setTimeout(res, 50));
      }
      if (!active || !canvasRef.current) return;

      try {
        isRendering.current = true; // 렌더링 락(Lock) 걸기
        const page = await pdfDoc.getPage(pageIndex + 1);
        const viewport = page.getViewport({ scale: PDF_CONFIG.SCALE });
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d", { alpha: false });

        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          renderTaskRef.current = page.render({ canvasContext: context, viewport });
          await renderTaskRef.current.promise;
        }

        if (active) {
          setIsAnalyzing(true);
          const results = await AnalyzerService.analyzePdfText(page);
          updateAnalysis(pageIndex, { left: results.left, right: results.right });
        }
      } catch (err: any) {
        // 취소로 인한 정상적인 에러는 무시
        if (err.name !== "RenderingCancelledException") {
          console.error(err);
        }
      } finally {
        isRendering.current = false; // 렌더링 락(Lock) 해제
        renderTaskRef.current = null;
        if (active) setIsAnalyzing(false);
      }
    };

    runProcess();

    return () => {
      active = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, pageIndex, updateAnalysis]);

  return { canvasRef, isAnalyzing };
}