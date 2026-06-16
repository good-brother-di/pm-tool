import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = String(body.title).slice(0, 500);
    if (body.description !== undefined) data.description = String(body.description || "").slice(0, 5000);
    if (body.status !== undefined) data.status = body.status;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.projectId !== undefined) data.projectId = body.projectId;
    if (body.dueDate !== undefined) {
      if (body.dueDate === null) {
        data.dueDate = null;
      } else {
        const parsed = new Date(body.dueDate);
        if (!isNaN(parsed.getTime())) data.dueDate = parsed;
      }
    }
    if (body.tags !== undefined) data.tags = JSON.stringify(body.tags);

    const task = await prisma.task.update({ where: { id }, data });

    // Log activity for status/title changes (use !== undefined, not truthy check)
    const hasStatusChange = body.status !== undefined;
    const hasTitleChange = body.title !== undefined;
    if (hasStatusChange || hasTitleChange) {
      try {
        const detailParts: string[] = [];
        if (hasStatusChange) detailParts.push(`状态 → ${body.status}`);
        if (hasTitleChange) detailParts.push("标题已更新");
        await prisma.activityLog.create({
          data: {
            action: hasStatusChange ? "moved" : "updated",
            entityType: "task",
            entityId: task.id,
            entityName: body.title || task.title,
            detail: detailParts.join("; ") || "任务已更新",
            projectId: task.projectId,
            taskId: task.id,
          },
        });
      } catch {}
    }

    return NextResponse.json(task);
  } catch (err) {
    console.error("PATCH /api/tasks/[id] error:", err);
    return NextResponse.json({ error: "更新任务失败" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    // Get task info before deleting for log
    const task = await prisma.task.findUnique({ where: { id } });
    await prisma.task.delete({ where: { id } });

    if (task) {
      try {
        await prisma.activityLog.create({
          data: {
            action: "deleted",
            entityType: "task",
            entityId: id,
            entityName: task.title,
            detail: `删除任务: ${task.title}`,
            projectId: task.projectId,
          },
        });
      } catch {}
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/tasks/[id] error:", err);
    return NextResponse.json({ error: "删除任务失败" }, { status: 500 });
  }
}
