// src/modules/paper-upload/services/db-service.ts
import { prisma } from "@/lib/prisma";
import { PaperAnalysisResult } from "../types";

export async function savePaperToNeon(
  metadata: PaperAnalysisResult,
  fileUrl: string
) {
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
