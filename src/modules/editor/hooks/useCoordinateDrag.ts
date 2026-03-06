// src/modules/editor/hooks/useCoordinateDrag.ts
import { useEffect, useRef, useState } from "react";
import { PDF_CONFIG } from "@/lib/constants";
import { useEditorStore } from "../store/useEditorStore";

export function useCoordinateDrag(pageIndex: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const updateCoordinate = useEditorStore((state) => state.updateCoordinate);

  useEffect(() => {
    if (draggingIdx === null) return;
    const handleGlobalMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeY = ((e.clientY - rect.top) / rect.height) * PDF_CONFIG.COORDINATE_MAX;
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

  return { containerRef, draggingIdx, setDraggingIdx };
}