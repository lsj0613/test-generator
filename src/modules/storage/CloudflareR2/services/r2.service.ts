import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { SERVER_ONLY_CONFIG } from "@/lib/constants";

// 환경 변수 검증 및 할당
const accessKey = process.env.R2_ACCESS_KEY_ID?.trim();
const secretKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
const accountId = process.env.R2_ACCOUNT_ID?.trim();
const bucketName = process.env.R2_BUCKET_NAME?.trim();

if (!accessKey || !secretKey || !accountId || !bucketName) {
  console.error("[R2_SERVICE_ERROR] 환경 변수가 설정되지 않았습니다.");
  throw new Error("❌ R2 설정값이 누락되었습니다. .env.local 파일을 확인하세요.");
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
  forcePathStyle: true,
});

export const R2Service = {
  /**
   * paperId와 카테고리를 기반으로 PDF 다운로드
   */
  async downloadPdf(paperId: string, category = 'Integrated'): Promise<Uint8Array> {
    const key = `${SERVER_ONLY_CONFIG.RAW_PREFIX}/${category}/${paperId}.pdf`;
    
    console.log(`[R2_DOWNLOAD_START] Target: ${key} | Bucket: ${bucketName}`);

    try {
      const response = await s3.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      }));

      const buffer = await response.Body?.transformToByteArray();
      if (!buffer) {
        throw new Error(`[R2_DOWNLOAD_EMPTY] 데이터가 비어있습니다. Key: ${key}`);
      }

      console.log(`[R2_DOWNLOAD_SUCCESS] Size: ${buffer.length} bytes | Key: ${key}`);
      return buffer;
    } catch (error: any) {
      console.error(`[R2_DOWNLOAD_FAILED] Key: ${key}`, {
        message: error.message,
        code: error.$metadata?.httpStatusCode,
      });
      throw error;
    }
  },

  /**
   * 규칙 적용 업로드: extracted/{YYMM}/{YYMM}{No}{Suffix}.png
   */
  async uploadImage(
    paperId: string, 
    qNo: number, 
    buffer: Buffer | Uint8Array, 
    category: "공통" | "미적분" | "확률과통계" | string
  ): Promise<string> {
    const yearMonth = paperId.substring(0, 6);
    
    // 접미사 결정 로직
    const suffixMap: Record<string, string> = {
      "공통": "D",
      "미적분": "C",
      "확률과통계": "S",
    };
    const suffix = suffixMap[category] || "N";
    
    const fileName = `${yearMonth}${qNo.toString().padStart(2, "0")}${suffix}`;
    const key = `${SERVER_ONLY_CONFIG.EXTRACTED_PREFIX}/${yearMonth}/${fileName}.png`;

    console.log(`[R2_UPLOAD_START] Destination: ${key} | Category: ${category}`);

    try {
      await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: "image/png",
        // 1인 개발 시 캐싱 설정을 추가하면 비용과 성능 면에서 유리합니다.
        CacheControl: "public, max-age=31536000, immutable",
      }));

      const publicUrl = `${process.env.R2_PUBLIC_DOMAIN}/${key}`;
      console.log(`[R2_UPLOAD_SUCCESS] URL: ${publicUrl}`);
      
      return publicUrl; // 업로드 후 접근 가능한 URL을 반환하는 것이 Next.js 개발 시 편리합니다.
    } catch (error: any) {
      console.error(`[R2_UPLOAD_FAILED] Key: ${key}`, {
        message: error.message,
        requestId: error.$metadata?.requestId,
      });
      throw error;
    }
  },
};