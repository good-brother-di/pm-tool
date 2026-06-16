import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "node:path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

type DbConfig = {
  url: string;
  authToken?: string;
};

function getDatabaseConfig(): DbConfig {
  let url = process.env.DATABASE_URL?.trim();

  if (!url) {
    // Default: local SQLite
    const dbPath = path.resolve(process.cwd(), "prisma", "pm-tool.db");
    return { url: `file:${dbPath}` };
  }

  // Prefer explicitly configured token, but also support authToken embedded in DATABASE_URL.
  let authToken = process.env.DATABASE_AUTH_TOKEN?.trim();

  if (url.includes("authToken=")) {
    try {
      const parsed = new URL(url);
      const tokenFromUrl = parsed.searchParams.get("authToken") || undefined;
      if (!authToken && tokenFromUrl) authToken = tokenFromUrl;

      // PrismaLibSql expects authToken as a separate option; remove it from URL.
      parsed.searchParams.delete("authToken");
      const query = parsed.searchParams.toString();
      url = `${parsed.protocol}//${parsed.host}${parsed.pathname}${query ? `?${query}` : ""}`;
    } catch {
      // Fallback for libsql URLs that URL() cannot parse in some runtimes.
      const [base, queryString] = url.split("?");
      const params = new URLSearchParams(queryString || "");
      const tokenFromUrl = params.get("authToken") || undefined;
      if (!authToken && tokenFromUrl) authToken = tokenFromUrl;
      params.delete("authToken");
      const query = params.toString();
      url = `${base}${query ? `?${query}` : ""}`;
    }
  }

  return authToken ? { url, authToken } : { url };
}

function createPrismaClient(): PrismaClient {
  const config = getDatabaseConfig();
  const adapter = new PrismaLibSql(config);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
