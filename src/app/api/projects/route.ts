import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      include: { _count: { select: { tasks: true } } },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(projects);
  } catch (err) {
    console.error("GET /api/projects error:", err);
    return NextResponse.json({ error: "获取项目列表失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "项目名称不能为空" }, { status: 400 });
    }
    const project = await prisma.project.create({
      data: {
        name: body.name.trim().slice(0, 200),
        description: (body.description || "").slice(0, 1000),
        color: body.color || "#6366f1",
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("POST /api/projects error:", err);
    return NextResponse.json({ error: "创建项目失败" }, { status: 500 });
  }
}
