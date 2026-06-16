import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "node:path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string {
  let url = process.env.DATABASE_URL;
  if (!url || !url.trim()) {
    // Default: local SQLite
    const dbPath = path.resolve(process.cwd(), "prisma", "pm-tool.db");
    return `file:${dbPath}`;
  }
  url = url.trim();

  // If a separate auth token is provided and URL doesn't already have one,
  // append it as a query parameter
  const authToken = process.env.DATABASE_AUTH_TOKEN?.trim();
  if (authToken && !url.includes("authToken=")) {
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}authToken=${authToken}`;
  }

  return url;
}

function createPrismaClient(): PrismaClient {
  const dbUrl = getDatabaseUrl();
  const adapter = new PrismaLibSql({ url: dbUrl });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
