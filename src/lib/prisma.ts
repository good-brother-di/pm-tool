import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "node:path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url && url.trim()) return url.trim();

  // Default: local SQLite
  const dbPath = path.resolve(process.cwd(), "prisma", "pm-tool.db");
  return `file:${dbPath}`;
}

function getAuthToken(): string | undefined {
  return process.env.DATABASE_AUTH_TOKEN || undefined;
}

function createPrismaClient(): PrismaClient {
  const dbUrl = getDatabaseUrl();
  const authToken = getAuthToken();

  const adapter = authToken
    ? new PrismaLibSql({ url: dbUrl, authToken })
    : new PrismaLibSql({ url: dbUrl });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
