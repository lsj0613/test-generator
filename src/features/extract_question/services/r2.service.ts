// src/services/r2.service.ts
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2Service = {
  async downloadPdf(testId: string): Promise<Uint8Array> {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: `${testId}.pdf`,
      })
    );
    const buffer = await response.Body?.transformToByteArray();
    if (!buffer) throw new Error("PDF 데이터를 가져오지 못했습니다.");
    return buffer;
  },

  async uploadImage(
    testId: string,
    qNo: number,
    buffer: Buffer
  ): Promise<void> {
    const key = `extracted/${testId}/Q${qNo.toString().padStart(2, "0")}.png`;
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: "image/png",
      })
    );
  },
};
