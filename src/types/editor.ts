export interface Coordinate {
    y: number; // 0 ~ 1000 사이의 상대값
  }
  
  export interface PageData {
    image: string; // Base64 데이터
    coordinates: Coordinate[];
  }
  
  export interface EditorState {
    pages: PageData[];
    setPages: (pages: PageData[]) => void;
    updateCoordinate: (pageIndex: number, coordIndex: number, y: number) => void;
  }