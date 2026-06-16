import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as fs from "node:fs";
import * as path from "node:path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const projectId = body.projectId as string;

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Obsidian vault path
    const vaultPath = body.vaultPath || "D:/严能的个人知识库";
    const pmDir = path.join(vaultPath, "05-项目管理", "01-看板");

    // Ensure directory exists
    fs.mkdirSync(pmDir, { recursive: true });

    const statusLabels: Record<string, string> = {
      todo: "待办", in_progress: "进行中", blocked: "阻塞", done: "已完成",
    };
    const priorityLabels: Record<string, string> = {
      low: "低", medium: "中", high: "高", urgent: "紧急",
    };

    // Build kanban-style Markdown
    const now = new Date().toISOString().slice(0, 16).replace("T", " ");
    let md = `---
kanban-plugin: board
domain: meta
tags: [项目管理, 看板]
project: "${project.name}"
synced: "${now}"
---

# ${project.name} - 项目看板

> 同步时间: ${now} | 任务总数: ${project.tasks.length}

`;

    const grouped: Record<string, typeof project.tasks> = {};
    for (const t of project.tasks) {
      (grouped[t.status] ||= []).push(t);
    }

    for (const status of ["todo", "in_progress", "blocked", "done"]) {
      const tasks = grouped[status] || [];
      md += `## ${statusLabels[status] || status}\n\n`;
      if (tasks.length === 0) {
        md += "\n";
        continue;
      }
      for (const t of tasks) {
        const pLabel = priorityLabels[t.priority] || t.priority;
        let tags = "";
        try { tags = JSON.parse(t.tags || "[]").join(" "); } catch { /* */ }
        const due = t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "";
        const dueStr = due ? ` 📅 ${due}` : "";
        md += `- [${t.status === "done" ? "x" : " "}] ${t.title} 🔴${pLabel}${dueStr}${tags ? " #" + tags.replace(/,/g, " #") : ""}\n`;
      }
      md += "\n";
    }

    md += `\n%% kanban:settings
\`\`\`
{"kanban-plugin":"board"}
\`\`\`
%%\n`;

    // Write to Obsidian vault
    const safeName = project.name.replace(/[<>:"/\\|?*]/g, "-");
    const filePath = path.join(pmDir, `pm-${safeName}-看板.md`);
    fs.writeFileSync(filePath, md, "utf-8");

    return NextResponse.json({
      success: true,
      path: filePath,
      message: `已同步到 ${filePath}`,
    });
  } catch (err) {
    console.error("Obsidian sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
