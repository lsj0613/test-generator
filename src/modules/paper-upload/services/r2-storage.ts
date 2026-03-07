import { SERVER_ONLY_CONFIG } from "@/lib/constants";
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { PaperAnalysisResult } from "../types";

// 런타임 에러 방지를 위한 환경 변수 체크
const requiredEnv = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_DOMAIN",
];
requiredEnv.forEach((name) => {
  if (!process.env[name])
    throw new Error(`Missing environment variable: ${name}`);
});

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(
  file: Buffer,
  paperAnalysisResult: PaperAnalysisResult,
  contentType: string,
  folder: string = SERVER_ONLY_CONFIG.RAW_PREFIX
) {
  try {
    const { grade, year, month, subject } = paperAnalysisResult;
    const formattedMonth = String(month).padStart(2, "0");
    const fileName = `${year}${formattedMonth}.pdf`;

    // 1. Key 생성: folder/subject/cleanFileName (공백은 대시로 치환)
    const cleanFileName = fileName.replace(/\s+/g, "-");
    const key = `${folder}/고${grade}/${subject}/${cleanFileName}`;

    // 2. 중복 체크 (파일 존재 여부 확인)
    try {
      await r2.send(
        new HeadObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: key,
        })
      );
      // 에러가 발생하지 않고 여기까지 왔다면 파일이 이미 존재한다는 의미
      throw new Error(`FILE_ALREADY_EXISTS: ${key}`);
    } catch (err: any) {
      // 파일이 없을 때 발생하는 에러(NotFound)만 통과시키고, 그 외 에러는 상위로 던짐
      if (err.name !== "NotFound") {
        if (err.message.startsWith("FILE_ALREADY_EXISTS")) throw err;
        throw new Error(`R2 Check Error: ${err.message}`);
      }
    }

    // 3. 파일 업로드
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: file,
        ContentType: contentType,
      })
    );

    const baseUrl = process.env.R2_PUBLIC_DOMAIN!.replace(/\/$/, "");
    return `${baseUrl}/${key}`;
  } catch (error: any) {
    console.error("R2 Upload Logic Error:", error.message);
    throw error; // 상위 호출자(Service/Action)에게 에러 전달
  }
}
