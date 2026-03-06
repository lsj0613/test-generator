import { 
    pgTable, 
    uuid, 
    text, 
    integer, 
    timestamp, 
    jsonb 
  } from "drizzle-orm/pg-core";
  
  /**
   * 1. 원본 시험지 관리 (Raw Source)
   * PDF 업로드 기록 및 메타데이터를 보관합니다.
   */
  export const rawPapers = pgTable("raw_papers", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    grade: integer("grade"),            // 학년 (필터링용)
    year: integer("year"),              // 시행 연도 (필터링용)
    month: integer("month"),            // 시행 월 (필터링용)
    source: text("source"),             // 교육청, 평가원 등
    originalFileUrl: text("original_file_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });
  
  /**
   * 2. 개별 문항 뱅크 (Question Bank)
   * 필터링이 필요한 핵심 정보는 '컬럼'으로, 
   * 채점/출력에만 쓰이는 정보는 'metadata(jsonb)'에 담습니다.
   */
  export const questions = pgTable("questions", {
    id: uuid("id").primaryKey().defaultRandom(),
    rawPaperId: uuid("raw_paper_id").references(() => rawPapers.id, { onDelete: 'cascade' }),
    
    // [필터링/검색용 컬럼] - 인덱스를 타고 빠르게 검색하기 위함
    subject: text("subject"),           // 미적분, 확통, 기하 등
    difficulty: text("difficulty"),     // 상, 중, 하
    questionNumber: integer("question_number"),
    
    // [데이터/이미지]
    imageUrl: text("image_url").notNull(),
    
    // [채점 및 해설용 데이터] - 검색 조건으로 쓰이지 않으므로 jsonb에 통합
    // { answer: "5", explanation: "...", tags: ["함수", "킬러"], coordinates: {...} }
    metadata: jsonb("metadata").notNull(), 
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });
  
  /**
   * 3. 사용자 생성 시험지 (Generated Test Paper)
   * 연결 테이블 없이 배열 방식으로 문항 ID 리스트를 관리합니다.
   */
  export const testPapers = pgTable("test_papers", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    
    /**
     * 🎯 핵심 포인트: 문제 ID들을 순서대로 배열에 저장
     * 채점 시 이 배열의 ID들을 순회하며 metadata의 answer와 대조합니다.
     */
    questionIds: uuid("question_ids").array().notNull(),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });
  
  /**
   * 4. 사용자 응답/채점 기록 (User Submissions)
   * 사용자가 생성된 시험지를 풀고 제출한 기록을 보관합니다.
   */
  export const submissions = pgTable("submissions", {
    id: uuid("id").primaryKey().defaultRandom(),
    testPaperId: uuid("test_paper_id").references(() => testPapers.id, { onDelete: 'cascade' }),
    
    /**
     * [응답 데이터 구조 예시]
     * [{ questionId: "...", userChoice: "5", isCorrect: true }, ...]
     */
    userAnswers: jsonb("user_answers").notNull(),
    
    score: integer("score"),            // 최종 점수
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });