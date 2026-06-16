import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: { orderBy: { sortOrder: "asc" } },
        _count: { select: { tasks: true } },
      },
    });
    if (!project) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (err) {
    console.error("GET /api/projects/[id] error:", err);
    return NextResponse.json({ error: "获取项目失败" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: String(body.name).slice(0, 200) }),
        ...(body.description !== undefined && { description: String(body.description || "").slice(0, 1000) }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });
    return NextResponse.json(project);
  } catch (err) {
    console.error("PATCH /api/projects/[id] error:", err);
    return NextResponse.json({ error: "更新项目失败" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Check project exists first
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }

    // Cascade: delete all tasks of this project, then delete project
    await prisma.task.deleteMany({ where: { projectId: id } });
    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/projects/[id] error:", err);
    return NextResponse.json({ error: "删除项目失败" }, { status: 500 });
  }
}
