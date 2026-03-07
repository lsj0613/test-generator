import "dotenv/config";
import fs from "fs";
import path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import { PaperMetadataAnalyzer } from "@/modules/paper-upload/services/metadata-analyzer";

// 경로 확인 필요

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
      const finalLocalPath = path.join(successSubDir, newFileName);

      fs.renameSync(filePath, finalLocalPath);

      stats.success++;
      if (metadata.isFallback) stats.byMethod.filename++;
      else stats.byMethod.text++;
      stats.bySubject[metadata.subject] =
        (stats.bySubject[metadata.subject] || 0) + 1;

      console.log(
        `✅ [${metadata.isFallback ? "FILE" : "TEXT"}] ${newFileName} 정리 완료`
      );
    } catch (e: any) {
      stats.failed++;
      console.error(`❌ [FAIL] ${file}: ${e.message}`);
      if (fs.existsSync(filePath)) {
        fs.renameSync(filePath, path.join(failedDir, file));
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
}

processAllPapers().catch(console.error);
