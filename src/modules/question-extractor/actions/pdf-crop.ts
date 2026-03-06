// src/modules/question-extractor/actions.ts
"use server";

import { ExtractorTaskService } from "../services/extractor-task";


/**
 * 클라이언트에서 호출하는 서버 액션
 * @param paperId '202507C'
 */
export async function processAndUploadToR2Action(paperId: string) {
  try {
    // 비즈니스 로직 서비스를 호출
    await ExtractorTaskService.processPaper(paperId);
    
    return { success: true };
  } catch (error: any) {
    console.error("❌ 처리 실패:", error);
    // 에러 메시지만 추출하여 안전하게 반환
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "알 수 없는 에러가 발생했습니다." 
    };
  }
}