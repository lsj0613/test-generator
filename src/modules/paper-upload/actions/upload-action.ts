// src/modules/paper-upload/actions/upload-action.ts
"use server";

import * as pdfjs from "pdfjs-dist";
import { uploadToR2 } from "../services/r2-storage";
import { savePaperToNeon } from "../services/db-service";
import { PaperMetadataAnalyzer } from "../services/metadata-analyzer";

export async function uploadPaperAction(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) throw new Error("파일이 없습니다.");

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. PDF 로드 및 메타데이터 추출
    // Node.js 환경에서 pdfjs 로딩 (표준 경로 설정 필요)
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const firstPage = await pdf.getPage(1);
    const lastPage = await pdf.getPage(pdf.numPages);

    const metadata = await PaperMetadataAnalyzer.extract(firstPage, lastPage);

    // 2. R2 업로드 (folder/subject/fileName 구조)
    const fileUrl = await uploadToR2(
      buffer,
      file.name,
      metadata.subject,
      file.type
    );

    // 3. DB 저장
    const savedPaper = await savePaperToNeon(metadata, fileUrl);

    return { success: true, data: savedPaper };
  } catch (error: any) {
    console.error("Upload Action Error:", error.message);
    return {
      success: false,
      error: error.message || "업로드 중 오류가 발생했습니다.",
    };
  }
}
