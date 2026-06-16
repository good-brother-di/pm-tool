import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: "libsql://pm-tool-good-brother-di.aws-ap-northeast-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODE1OTY1NjcsImlkIjoiMDE5ZWNmNmQtNTkwMS03ZThjLTg0ZTgtMzc0NDY2ZDg2YTExIiwicmlkIjoiMmY1OGMzYjQtZmFkYS00OWYyLTgxNmQtM2FjNWM0M2Q5ZTJhIn0.K4R8hxYOAhsaXn6-o1YH6W4PCaMdaTN9BIAvQU2bpqXfi8CNOcT3pb0QjMEyoXQtS3pxuRTTvfqFmm4DVVQhAg",
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
