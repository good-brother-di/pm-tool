import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const rawUrl = process.env.DATABASE_URL || "";
  const rawToken = process.env.DATABASE_AUTH_TOKEN || "";

  const safeEnv = {
    nodeEnv: process.env.NODE_ENV,
    hasDatabaseUrl: Boolean(rawUrl),
    databaseUrlPrefix: rawUrl ? rawUrl.slice(0, 18) : "",
    databaseUrlLooksLibsql: rawUrl.startsWith("libsql://"),
    databaseUrlContainsAuthToken: rawUrl.includes("authToken="),
    hasDatabaseAuthToken: Boolean(rawToken),
    databaseAuthTokenPrefix: rawToken ? rawToken.slice(0, 4) : "",
  };

  try {
    const projectCount = await prisma.project.count();
    const taskCount = await prisma.task.count();
    const activityCount = await prisma.activityLog.count();

    return NextResponse.json({
      ok: true,
      env: safeEnv,
      counts: {
        projects: projectCount,
        tasks: taskCount,
        activities: activityCount,
      },
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      env: safeEnv,
      errorName: err instanceof Error ? err.name : typeof err,
      errorMessage: err instanceof Error ? err.message : String(err),
      errorStackFirstLine: err instanceof Error && err.stack ? err.stack.split("\n")[0] : null,
    }, { status: 500 });
  }
}
