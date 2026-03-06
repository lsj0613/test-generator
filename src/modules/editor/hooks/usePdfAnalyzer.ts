// src/modules/editor/hooks/usePdfAnalyzer.ts
import { useEffect, useRef, useState } from "react";
import { PDF_CONFIG } from "@/lib/constants";
import { useEditorStore } from "../store/useEditorStore";
// 🎯 서비스 직접 임포트 대신 서버 액션 임포트

export function usePdfAnalyzer(pdfDoc: any, pageIndex: number) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const isRendering = useRef<boolean>(false); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const updateAnalysis = useEditorStore((state) => state.updateAnalysis);

  useEffect(() => {
    let active = true;

    const runProcess = async () => {
      if (!canvasRef.current || !pdfDoc || !active) return;

      if (renderTaskRef.current) {
        try { await renderTaskRef.current.cancel(); } catch {}
      }
      
      while (isRendering.current) {
        await new Promise((res) => setTimeout(res, 50));
      }
      
      if (!active || !canvasRef.current) return;

      try {
        isRendering.current = true;
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
          
          // 🎯 중요: 클라이언트 사이드 pdf.js의 page 객체는 직렬화가 불가능할 수 있습니다.
          // 보통은 getTextContent() 결과를 넘기거나, 서버 액션 내부에서 
          // PDF를 다시 로드하여 처리하는 방식이 Next.js 16 표준에 더 가깝습니다.
          const textContent = await page.getTextContent(); 
          const results = await analyzePdfPageAction(textContent); 
          
          updateAnalysis(pageIndex, { left: results.left, right: results.right });
        }
      } catch (err: any) {
        if (err.name !== "RenderingCancelledException") {
          console.error(err);
        }
      } finally {
        isRendering.current = false;
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