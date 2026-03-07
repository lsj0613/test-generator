import "dotenv/config";
import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import { PrismaClient } from "@prisma/client";
import { PaperMetadataAnalyzer } from "@/modules/paper-upload/services/metadata-analyzer";
import { uploadToR2 } from "@/modules/paper-upload/services/r2-storage";
// 주의: uploadToR2 함수가 위치한 정확한 경로로 수정해야 합니다.

// 1. DB 연결: Prisma Client 인스턴스 생성
const prisma = new PrismaClient();

// 2. 서비스 함수: 추출된 메타데이터와 R2 URL을 기반으로 Supabase(PostgreSQL)에 RawPaper 레코드 생성
async function saveRawPaperToDB(metadata: any, fileUrl: string) {
  return await prisma.rawPaper.create({
    data: {
      grade: metadata.grade,
      year: metadata.year,
      month: metadata.month,
      source: metadata.source,
      subject: metadata.subject,
      originalFileUrl: fileUrl,
    },
  });
}

// 3. 상위 함수 수정
async function processAllPapers() {
  const rootDir = process.cwd();
  const pdfDir = path.join(rootDir, "rawPDFs");
  const failedDir = path.join(pdfDir, "failed");
  const filenameBaseDir = path.join(pdfDir, "extracted_by_filename");

  const stats = {
    total: 0,
    success: 0,
    failed: 0,
    byMethod: { text: 0, filename: 0 },
    bySubject: {} as Record<string, number>,
  };

  if (!fs.existsSync(pdfDir)) return console.error("❌ rawPDFs 폴더 없음");
  [failedDir, filenameBaseDir].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  const files = fs
    .readdirSync(pdfDir)
    .filter(
      (f) =>
        f.toLowerCase().endsWith(".pdf") &&
        fs.lstatSync(path.join(pdfDir, f)).isFile()
    );

  stats.total = files.length;
  console.log(`📂 시작: 총 ${stats.total}개 파일 발견\n`);

  for (const file of files) {
    const filePath = path.join(pdfDir, file);
    if (!fs.existsSync(filePath)) continue;

    // 로컬 이동 후 에러 발생 시 롤백 처리를 위해 변수를 스코프 상단에 선언
    let finalLocalPath = "";

    try {
      const data = new Uint8Array(fs.readFileSync(filePath));
      const loadingTask = pdfjsLib.getDocument({
        data,
        cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/",
        cMapPacked: true,
      });

      const pdf = await loadingTask.promise;
      const metadata = await PaperMetadataAnalyzer.extract(
        await pdf.getPage(1),
        await pdf.getPage(pdf.numPages),
        file
      );

      const targetRootDir = metadata.isFallback ? filenameBaseDir : pdfDir;
      const successSubDir = path.join(
        targetRootDir,
        `고${metadata.grade}`,
        metadata.subject
      );

      if (!fs.existsSync(successSubDir))
        fs.mkdirSync(successSubDir, { recursive: true });

      const newFileName = `${metadata.year}${String(metadata.month).padStart(
        2,
        "0"
      )}.pdf`;
      finalLocalPath = path.join(successSubDir, newFileName);

      // --- [기존 로직 유지] 파일명 변경 및 폴더 이동 ---
      fs.renameSync(filePath, finalLocalPath);

      // --- [신규 로직 추가] 위치가 변경된 파일을 R2에 업로드하고 DB에 저장 ---
      const movedFileBuffer = fs.readFileSync(finalLocalPath);

      const r2Url = await uploadToR2(
        movedFileBuffer,
        metadata,
        "application/pdf"
      );

      await saveRawPaperToDB(metadata, r2Url);
      // -----------------------------------------------------------------

      stats.success++;
      if (metadata.isFallback) stats.byMethod.filename++;
      else stats.byMethod.text++;
      stats.bySubject[metadata.subject] =
        (stats.bySubject[metadata.subject] || 0) + 1;

      console.log(
        `✅ [${
          metadata.isFallback ? "FILE" : "TEXT"
        }] ${newFileName} 정리 및 원격 저장 완료`
      );
    } catch (e: any) {
      stats.failed++;
      console.error(`❌ [FAIL] ${file}: ${e.message}`);

      // 에러 발생 시 파일 이동 처리 (기존 로직 보존 및 무결성 강화)
      if (fs.existsSync(filePath)) {
        // renameSync 실행 전 실패한 경우
        fs.renameSync(filePath, path.join(failedDir, file));
      } else if (finalLocalPath && fs.existsSync(finalLocalPath)) {
        // 로컬 이동은 성공했으나 R2 업로드나 DB 저장 단계에서 실패한 경우 파일 복구(롤백)
        fs.renameSync(finalLocalPath, path.join(failedDir, file));
      }
    }
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 작업 결과 보고서");
  console.log(
    `- 전체: ${stats.total} | 성공: ${stats.success} | 실패: ${stats.failed}`
  );
  console.log(
    `- 분석 모드: [텍스트] ${stats.byMethod.text} / [파일명] ${stats.byMethod.filename}`
  );
  console.log("- 과목별 성공:");
  Object.entries(stats.bySubject).forEach(([k, v]) =>
    console.log(`  * ${k}: ${v}개`)
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🎉 작업 종료");

  // 모든 작업이 끝나면 안전하게 DB 연결 해제
  await prisma.$disconnect();
}

// 스크립트 실행 중 치명적인 에러 발생 시에도 DB 연결을 종료하도록 처리
processAllPapers().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
