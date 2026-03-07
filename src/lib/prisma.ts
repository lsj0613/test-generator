// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"], // 콘솔에서 실제 SQL 쿼리를 볼 수 있어 디버깅에 유리합니다.
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
