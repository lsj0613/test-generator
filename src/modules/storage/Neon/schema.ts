import { 
    pgTable, 
    uuid, 
    text, 
    integer, 
    timestamp, 
    jsonb 
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
  
  /**
   * 1. 원본 시험지 관리 (Source Management)
   * PDF 파일 자체에 대한 정보를 담는 테이블입니다.
   */
  export const rawPapers = pgTable("raw_papers", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    grade: integer("grade"),            // 학년 (예: 3)
    year: integer("year"),              // 시행 연도 (예: 2024)
    month: integer("month"),            // 시행 월 (예: 6) - 기존 year 참조 오타 수정
    source: text("source"),             // 교육청, 평가원, 자체제작 등
    originalFileUrl: text("original_file_url"), // S3/R2 원본 PDF 경로
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });
  
  /**
   * 2. 개별 문항 뱅크 (Question Bank)
   * PdfProcessor를 통해 잘려진 개별 문제 이미지와 메타데이터를 저장합니다.
   */
  export const questions = pgTable("questions", {
    id: uuid("id").primaryKey().defaultRandom(),
    rawPaperId: uuid("raw_paper_id").references(() => rawPapers.id, { onDelete: 'cascade' }),
    questionNumber: integer("question_number"),
    imageUrl: text("image_url").notNull(),  // R2 Public URL 또는 Signed URL
    difficulty: text("difficulty"),         // 상, 중, 하
    tag: text("tag").array(),               // ['삼각함수', '미분', '킬러']
    metadata: jsonb("metadata"),            // { answer: "5", explanation: "...", coordinates: { x, y, w, h } }
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });
  
  /**
   * 3. 생성된 시험지 (Test Paper Generation)
   * 사용자가 문항 뱅크에서 문제를 골라 새롭게 조합한 시험지입니다.
   */
  export const testPapers = pgTable("test_papers", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });
  
  /**
   * 4. 시험지-문항 매핑 (Many-to-Many Join Table)
   * [중요] 특정 문제가 여러 시험지에 포함될 수 있도록 연결하는 테이블입니다.
   */
  export const testPaperItems = pgTable("test_paper_items", {
    id: uuid("id").primaryKey().defaultRandom(),
    testPaperId: uuid("test_paper_id").references(() => testPapers.id, { onDelete: 'cascade' }),
    questionId: uuid("question_id").references(() => questions.id, { onDelete: 'cascade' }),
    order: integer("order").notNull(),      // 해당 시험지 내에서의 문제 순서 (1번, 2번...)
  });
  
  // --- Relations (Drizzle Query API 전용 설정) ---
  
  export const rawPapersRelations = relations(rawPapers, ({ many }) => ({
    questions: many(questions),
  }));
  
  export const questionsRelations = relations(questions, ({ one, many }) => ({
    rawPaper: one(rawPapers, {
      fields: [questions.rawPaperId],
      references: [rawPapers.id],
    }),
    testPaperItems: many(testPaperItems),
  }));
  
  export const testPapersRelations = relations(testPapers, ({ many }) => ({
    items: many(testPaperItems),
  }));
  
  export const testPaperItemsRelations = relations(testPaperItems, ({ one }) => ({
    testPaper: one(testPapers, {
      fields: [testPaperItems.testPaperId],
      references: [testPapers.id],
    }),
    question: one(questions, {
      fields: [testPaperItems.questionId],
      references: [questions.id],
    }),
  }));