// src/modules/editor/store/useEditorStore.ts
import { create } from "zustand";
import { PDF_CONFIG } from "@/lib/constants";
import { ColumnAnalysis, Coordinate } from "@/modules/question-extractor/types";

interface PageData {
  coordinates: Coordinate[];
  analysis?: {
    left: ColumnAnalysis;
    right: ColumnAnalysis;
  };
}

interface EditorState {
  pages: PageData[];
  setPages: (count: number) => void;
  updateCoordinate: (pageIndex: number, coordIndex: number, y: number) => void;
  updateAnalysis: (
    pageIndex: number,
    data: { left: ColumnAnalysis; right: ColumnAnalysis }
  ) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  pages: [],
  setPages: (count) =>
    set({
      pages: Array.from({ length: count }, (_, i) => ({
        coordinates:
          i === 0
            ? [{ y: PDF_CONFIG.DEFAULT_Y_COORD }, { y: PDF_CONFIG.DEFAULT_Y_COORD }]
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