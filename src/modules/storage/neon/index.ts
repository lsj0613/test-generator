import { PrismaClient } from "@prisma/client";

// Next.js 실시간 재로딩(HMR) 시 인스턴스 중복 생성을 방지하기 위한 싱글톤 패턴
const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
