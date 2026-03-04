import { create } from 'zustand';

interface LayoutState {
  imageUrls: string[];
  currentPageIndex: number;
  pages: number[]; // [1, 2, 6]
  // yConfigs: { [pageNumber]: [y1, y2, ...] } (0~1000 상대좌표)
  yConfigs: Record<number, number[]>;
  setImageUrls: (urls: string[]) => void;
  setYValues: (page: number, values: number[]) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  imageUrls: [],
  currentPageIndex: 0,
  pages: [1, 2, 6],
  yConfigs: { 1: [300, 300], 2: [500], 6: [500] },
  setImageUrls: (urls) => set({ imageUrls: urls }),
  setYValues: (page, values) => set((state) => ({
    yConfigs: { ...state.yConfigs, [page]: values }
  })),
  nextStep: () => set((state) => ({ currentPageIndex: Math.min(state.currentPageIndex + 1, 2) })),
  prevStep: () => set((state) => ({ currentPageIndex: Math.max(state.currentPageIndex - 1, 0) })),
}));