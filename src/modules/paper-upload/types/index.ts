// src/modules/paper-upload/types/index.ts

/**
 * Question 모델의 metadata 필드 구조
 */
export interface QuestionMetadata {
  answer: string; // 정답 (예: "5", "12")
  explanation?: string; // 해설 텍스트
  tags?: string[]; // ["함수", "킬러", "미적분"]
  coordinates?: {
    // 이미지 내 문제 위치 (필요 시)
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Submission 모델의 userAnswers 필드 구조 (배열 형태)
 */
export interface UserAnswerItem {
  questionId: string;
  userChoice: string;
  isCorrect: boolean;
}

export type UserAnswers = UserAnswerItem[];

/**
 * OCR 분석 결과 타입
 */
export interface PaperAnalysisResult {
  grade: number;
  year: number;
  month: number;
  source: string;
  subject: string;
}
