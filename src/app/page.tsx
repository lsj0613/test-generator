// src/app/page.tsx
import UploadZone from '@/components/UploadZone';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0F1117] flex flex-col items-center justify-center p-8">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <div className="text-center mb-16 space-y-4 relative z-10">
        <div className="inline-block px-4 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-full mb-4">
          <span className="text-blue-400 text-xs font-black uppercase tracking-[0.2em]">Next-Gen Question Extractor</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter italic">
          TEST-GEN <span className="text-blue-600">PRO</span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl font-medium max-w-xl mx-auto">
          AI의 모호함을 넘어서는 완벽한 레이아웃 템플릿 엔진.<br />
          단 4번의 설정으로 시험지 전체를 정밀하게 추출합니다.
        </p>
      </div>

      {/* Upload Component */}
      <div className="w-full flex justify-center relative z-10">
        <UploadZone />
      </div>

      {/* Footer / Stats */}
      <footer className="mt-24 flex gap-12 text-slate-600">
        <div className="text-center">
          <div className="text-white font-black text-xl">100%</div>
          <div className="text-[10px] font-bold uppercase tracking-widest">Accuracy</div>
        </div>
        <div className="text-center">
          <div className="text-white font-black text-xl">30s</div>
          <div className="text-[10px] font-bold uppercase tracking-widest">Processing</div>
        </div>
        <div className="text-center">
          <div className="text-white font-black text-xl">Auto</div>
          <div className="text-[10px] font-bold uppercase tracking-widest">Formatting</div>
        </div>
      </footer>
    </main>
  );
}