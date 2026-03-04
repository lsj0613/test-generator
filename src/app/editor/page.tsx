// src/app/editor/page.tsx
import LayoutEditorContainer from '@/components/LayoutEditorContainer';

export default function EditorPage() {
  return (
    <main className="min-h-screen bg-[#0F1117] text-slate-200">
      {/* 상단 헤더 - 상용 앱 스타일 */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#161922]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">T</div>
          <h1 className="text-lg font-semibold tracking-tight">Layout Editor</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-medium text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
            Draft Mode
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* 사이드바 가이드 (추후 단계 표시용) */}
        <nav className="w-64 border-r border-slate-800 p-6 hidden lg:flex flex-col gap-8 bg-[#161922]">
          <section>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">설정 단계</h2>
            <div className="space-y-2">
              {[1, 6, 9, 12].map((p, i) => (
                <div key={p} className="flex items-center gap-3 p-2 text-sm text-slate-400">
                   <span className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center text-[10px]">{i+1}</span>
                   Page {p}
                </div>
              ))}
            </div>
          </section>
        </nav>

        {/* 중앙 에디터 영역 - 여기서 Container를 호출합니다 */}
        <section className="flex-1 overflow-y-auto p-8 flex justify-center bg-black/20">
          <LayoutEditorContainer />
        </section>
      </div>
    </main>
  );
}