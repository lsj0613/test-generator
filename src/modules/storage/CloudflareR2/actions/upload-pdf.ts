// src/modules/storage/actions/upload-pdf.ts
"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { SERVER_ONLY_CONFIG } from "@/lib/constants";
// import { prisma } from "@/lib/prisma"; // DB 연결 시 주석 해제

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadRawPdfToR2(formData: FormData) {
  try {
    const file = formData.get("pdf") as File;
    const category = formData.get("category") as string;
    const testId = formData.get("testId") as string; // ex) 202507C

    if (!file || !category || !testId) throw new Error("필수 정보가 누락되었습니다.");

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `${SERVER_ONLY_CONFIG.RAW_PREFIX}/${category}/${testId}.pdf`;

    // 1. R2 원본 파일 업로드
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: "application/pdf",
    }));

    const r2Url = `https://${process.env.R2_PUBLIC_DOMAIN}/${key}`;

    // 2. 메타데이터 DB 저장 로직 (Prisma/Drizzle 연동)
    /* await prisma.testPaper.create({
      data: {
        id: testId,
        category: category,
        rawPdfUrl: r2Url,
        status: "UPLOADED", // 추후 "EXTRACTED" 등으로 상태값 변경
      }
    });
    */

    return { success: true, url: r2Url };
  } catch (error: any) {
    console.error("PDF 업로드 실패:", error);
    return { success: false, error: error.message };
  }
}