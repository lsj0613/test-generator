// src/features/extract_question/services/r2.service.ts
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { SERVER_ONLY_CONFIG } from "@/lib/constants";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2Service = {
  /**
   * testId 끝자리를 기반으로 카테고리를 추론하여 PDF 다운로드
   * @param testId 예: 202507C, 202507S
   */
  async downloadPdf(testId: string): Promise<Uint8Array> {
    const suffix = testId.slice(-1).toUpperCase();
    
    // 🎯 파일명 끝자리에 따른 카테고리 자동 매핑
    const categoryMap: Record<string, string> = {
      'C': 'Calculus',
      'S': 'Statistics',
    };
    
    const category = categoryMap[suffix] || 'Common';
    const key = `${SERVER_ONLY_CONFIG.RAW_PREFIX}/${category}/${testId}.pdf`;

    const response = await s3.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }));

    const buffer = await response.Body?.transformToByteArray();
    if (!buffer) throw new Error("PDF 데이터를 가져오지 못했습니다.");
    return buffer;
  },

  /**
   * 규칙 적용 업로드: extracted/{YYMM}/{YYMM}{No}{Suffix}.png
   * 1~22번: D / 23~30번: 원본 suffix(C/S)
   */
  async uploadImage(testId: string, qNo: number, buffer: Buffer): Promise<void> {
    const yearMonth = testId.substring(0, 6); // '202507' 추출
    const originSuffix = testId.slice(-1).toUpperCase();
    
    // 🎯 규칙: 22번 이하는 공통(D), 그 외는 원본 시험지 성격(C/S)을 따름
    const suffix = qNo <= 22 ? "D" : originSuffix;
    
    const fileName = `${yearMonth}${qNo.toString().padStart(2, "0")}${suffix}`;
    const key = `${SERVER_ONLY_CONFIG.EXTRACTED_PREFIX}/${yearMonth}/${fileName}.png`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
    }));
  },
};