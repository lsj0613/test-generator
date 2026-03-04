'use client';
import { useState, useEffect } from 'react';

interface Props {
  imageUrl: string;
  pageType: number;
  initialValues: number[];
  onSave: (vals: number[]) => void;
}

export default function LayoutEditor({ imageUrl, pageType, initialValues, onSave }: Props) {
  const [yValues, setYValues] = useState(initialValues);
  const [isDragging, setIsDragging] = useState<number | null>(null);

  useEffect(() => { setYValues(initialValues); }, [initialValues]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging === null) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    
    // 마우스의 상대적 위치(%) 계산 후 0~1000 단위로 변환
    const yRel = Math.round(((e.clientY - rect.top) / rect.height) * 1000);
    
    const next = [...yValues];
    next[isDragging] = Math.max(0, Math.min(1000, yRel));
    setYValues(next);
  };

  return (
    // aspect-ratio를 명시하거나, 내부 콘텐츠(img)에 의해 높이가 결정되도록 함
    <div className="relative w-full max-w-[850px] bg-white shadow-xl border border-slate-300 overflow-hidden">
      <img 
        src={imageUrl} 
        className="w-full h-auto block pointer-events-none" 
        alt="Original PDF Page"
        onLoad={(e) => {
          // 이미지 로드 시 실제 비율을 계산하여 좌표계 최적화 가능 (선택 사항)
        }}
      />

      <svg
        viewBox="0 0 1000 1000"
        preserveAspectRatio="none" // 0~1000 좌표를 이미지 전체 면적에 1:1 대응시킴
        className="absolute top-0 left-0 w-full h-full cursor-ns-resize"
        onMouseMove={handleMouseMove}
        onMouseUp={() => { setIsDragging(null); onSave(yValues); }}
        onMouseLeave={() => { setIsDragging(null); onSave(yValues); }}
      >
        {/* 가이드선 렌더링 로직 */}
      </svg>
    </div>
  );
}