// src/components/UploadZone.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { processPdfForEditor } from '@/app/actions';
import { useLayoutStore } from '@/store/useLayoutStore';

export default function UploadZone() {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const setImageUrls = useLayoutStore((state) => state.setImageUrls);
  const router = useRouter();

  const handleUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('PDF 파일만 업로드 가능합니다.');
      return;
    }
  
    setIsUploading(true);
    console.log("📤 서버로 파일 전송 시작...");
  
    const formData = new FormData();
    formData.append('file', file);
  
    try {
      const result = await processPdfForEditor(formData);
      
      // 클라이언트 로그 확인 (브라우저 F12 콘솔 확인)
      console.log("📥 서버 응답 수신:", result);
  
      if (result.success && result.imageUrls) {
        console.log(`✅ 이미지 ${result.imageUrls.length}개 수신 완료. 스토어 저장 중...`);
        
        setImageUrls(result.imageUrls);
        
        // Zustand에 저장이 잘 되었는지 확인 후 이동
        setTimeout(() => {
          console.log("🚀 페이지 이동 시도 (/editor)");
          router.push('/editor');
          
          // 2초 뒤에도 페이지가 안 바뀌면 강제 새로고침 이동 (최후의 수단)
          setTimeout(() => {
            if (window.location.pathname !== '/editor') {
              console.log("⚠️ router.push 실패, 강제 location 이동 실행");
              window.location.href = '/editor';
            }
          }, 2000);
        }, 100);
  
      } else {
        alert(result.error || '파일 처리 실패');
      }
    } catch (err) {
      console.error('❌ 클라이언트 에러:', err);
      alert('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="w-full max-w-2xl px-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={onDrop}
        className={`
          relative group cursor-pointer transition-all duration-300
          p-12 border-2 border-dashed rounded-[2rem]
          flex flex-col items-center gap-6 text-center
          ${isDragOver 
            ? 'border-blue-500 bg-blue-500/10 scale-[1.02]' 
            : 'border-slate-700 bg-[#161922] hover:border-slate-500'
          }
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        {/* Decorative Icon */}
        <div className={`
          w-24 h-24 rounded-3xl flex items-center justify-center text-5xl
          transition-all duration-500 shadow-2xl
          ${isUploading ? 'animate-bounce bg-blue-600' : 'bg-slate-800 group-hover:bg-blue-600/20 group-hover:rotate-6'}
        `}>
          {isUploading ? '⏳' : '📄'}
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-black text-white tracking-tight">
            {isUploading ? '분석 중...' : '시험지 PDF 업로드'}
          </h3>
          <p className="text-slate-400 font-medium">
            파일을 드래그하거나 클릭하여 시작하세요
          </p>
        </div>

        {/* Status Indicator */}
        {isUploading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
            </div>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">
              Processing 1, 6, 9, 12 pages...
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-800/50 px-4 py-2 rounded-full">
            PDF only • MAX 50MB
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
      </div>
      
      {/* 가이드 문구 */}
      <p className="mt-8 text-center text-slate-500 text-sm">
        업로드 시 자동으로 1, 6, 9, 12페이지의 레이아웃 설정을 시작합니다.
      </p>
    </div>
  );
}