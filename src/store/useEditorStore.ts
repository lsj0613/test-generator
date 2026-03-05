import { create } from "zustand";
import { PDF_CONFIG } from "@/lib/constants";

export interface AnalysisResult {
  column: "left" | "right";
  questionCount: 1 | 2 | "Error";
  questions: { no: number; y: number }[];
  points: { val: number; y: number }[];
}

interface PageData {
  coordinates: { y: number }[];
  analysis?: {
    left: AnalysisResult;
    right: AnalysisResult;
  };
}

interface EditorState {
  pages: PageData[];
  setPages: (count: number) => void;
  updateCoordinate: (pageIndex: number, coordIndex: number, y: number) => void;
  updateAnalysis: (
    pageIndex: number,
    data: { left: AnalysisResult; right: AnalysisResult }
  ) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  pages: [],
  setPages: (count) =>
    set({
      pages: Array.from({ length: count }, (_, i) => ({
        // 초기 좌표값을 PDF_CONFIG.DEFAULT_Y_COORD(190)으로 설정
        coordinates:
          i === 0
            ? [
                { y: PDF_CONFIG.DEFAULT_Y_COORD },
                { y: PDF_CONFIG.DEFAULT_Y_COORD },
              ]
            : i === 1 || i === 5
            ? [{ y: PDF_CONFIG.DEFAULT_Y_COORD }]
            : [],
      })),
    }),
  updateCoordinate: (pageIndex, coordIndex, y) =>
    set((state) => {
      const newPages = [...state.pages];
      if (newPages[pageIndex]) {
        newPages[pageIndex].coordinates[coordIndex] = { y };
      }
      return { pages: newPages };
    }),
  updateAnalysis: (pageIndex, data) =>
    set((state) => {
      const newPages = [...state.pages];
      if (newPages[pageIndex]) {
        newPages[pageIndex].analysis = data;
      }
      return { pages: newPages };
    }),
}));
