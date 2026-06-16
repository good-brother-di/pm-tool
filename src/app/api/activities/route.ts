import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url, "http://localhost");
    const projectId = url.searchParams.get("projectId");
    const limitRaw = parseInt(url.searchParams.get("limit") || "50");
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 200)) : 50;

    const where = projectId ? { projectId } : {};
    const activities = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return NextResponse.json(activities);
  } catch (err) {
    console.error("GET /api/activities error:", err);
    return NextResponse.json({ error: "获取活动日志失败" }, { status: 500 });
  }
}
