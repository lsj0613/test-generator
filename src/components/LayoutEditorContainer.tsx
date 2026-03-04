'use client';
import { useLayoutStore } from '@/store/useLayoutStore';
import LayoutEditor from './LayoutEditor';
import Toolbar from './Toolbar';

export default function LayoutEditorContainer() {
  const { currentPageIndex, imageUrls, pages, yConfigs, setYValues, nextStep, prevStep } = useLayoutStore();

  if (imageUrls.length === 0) return <div className="text-white p-20">파일을 먼저 업로드하세요.</div>;

  const currentPage = pages[currentPageIndex];
  
  return (
    <div className="flex flex-col items-center gap-10 w-full py-10">
      <div className="text-center">
        <h2 className="text-5xl font-black text-white italic tracking-tighter">PAGE {currentPage}</h2>
        <p className="text-slate-500 mt-2 font-medium">수평선을 드래그하여 문항의 경계선을 지정하세요.</p>
      </div>

      <LayoutEditor 
        imageUrl={imageUrls[currentPageIndex]} 
        pageType={currentPage}
        initialValues={yConfigs[currentPage]}
        onSave={(vals) => setYValues(currentPage, vals)} 
      />

      <Toolbar 
        onNext={nextStep} 
        onPrev={prevStep} 
        isLastStep={currentPageIndex === 2}
        isFirstStep={currentPageIndex === 0}
      />
    </div>
  );
}