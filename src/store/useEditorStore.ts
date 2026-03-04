import { create } from 'zustand';

interface Coordinate { y: number }
interface PageData { coordinates: Coordinate[] }

interface EditorState {
  pages: PageData[];
  setPages: (count: number) => void;
  updateCoordinate: (pageIndex: number, coordIndex: number, y: number) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  pages: [],
  setPages: (count) => set({
    pages: Array.from({ length: count }, (_, i) => ({
      coordinates: i === 0 ? [{ y: 800 }, { y: 800 }] : (i === 1 || i === 5 ? [{ y: 500 }] : [])
    }))
  }),
  updateCoordinate: (pageIndex, coordIndex, y) => set((state) => {
    const newPages = [...state.pages];
    if (newPages[pageIndex]) {
      newPages[pageIndex].coordinates[coordIndex] = { y };
    }
    return { pages: newPages };
  }),
}));