// src/components/Toolbar.tsx
export default function Toolbar({ onNext, onPrev, isLastStep, isFirstStep }: any) {
  return (
    <div className="fixed bottom-8 bg-[#161922] border border-slate-800 px-6 py-3 rounded-2xl flex gap-4 shadow-2xl">
      {!isFirstStep && <button onClick={onPrev} className="text-slate-400 font-bold px-4">이전</button>}
      <button onClick={onNext} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold">
        {isLastStep ? '설정 완료 및 추출' : '다음 페이지'}
      </button>
    </div>
  );
}

