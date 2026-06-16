import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url, "http://localhost");
    const projectId = url.searchParams.get("projectId");
    const where = projectId ? { projectId } : {};
    const tasks = await prisma.task.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(tasks);
  } catch (err) {
    console.error("GET /api/tasks error:", err);
    return NextResponse.json({ error: "获取任务列表失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "任务标题不能为空" }, { status: 400 });
    }
    if (!body.projectId) {
      return NextResponse.json({ error: "项目ID不能为空" }, { status: 400 });
    }

    // Validate dueDate
    let dueDate: Date | null = null;
    if (body.dueDate) {
      const parsed = new Date(body.dueDate);
      if (!isNaN(parsed.getTime())) {
        dueDate = parsed;
      }
    }

    // Calculate next sortOrder for the given status
    let sortOrder = body.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const maxTask = await prisma.task.findFirst({
        where: { projectId: body.projectId, status: body.status || "todo" },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      sortOrder = (maxTask?.sortOrder ?? -1) + 1;
    }

    const task = await prisma.task.create({
      data: {
        title: body.title.trim().slice(0, 500),
        description: (body.description || "").slice(0, 5000),
        status: body.status || "todo",
        priority: body.priority || "medium",
        projectId: body.projectId,
        dueDate,
        tags: JSON.stringify(body.tags || []),
        sortOrder,
      },
    });
    // Log activity
    try {
      await prisma.activityLog.create({
        data: {
          action: "created",
          entityType: "task",
          entityId: task.id,
          entityName: task.title,
          detail: `创建任务: ${task.title}`,
          projectId: task.projectId,
          taskId: task.id,
        },
      });
    } catch {}

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("POST /api/tasks error:", err);
    return NextResponse.json({ error: "创建任务失败" }, { status: 500 });
  }
}
