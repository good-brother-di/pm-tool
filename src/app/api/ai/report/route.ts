import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    // Build task context
    const statusLabels: Record<string, string> = {
      todo: "待办", in_progress: "进行中", blocked: "阻塞", done: "已完成",
    };
    const priorityLabels: Record<string, string> = {
      low: "低", medium: "中", high: "高", urgent: "紧急",
    };

    const grouped: Record<string, string[]> = {};
    for (const t of project.tasks) {
      const status = statusLabels[t.status] || t.status;
      const priority = priorityLabels[t.priority] || t.priority;
      let tags = "";
      try { tags = JSON.parse(t.tags || "[]").join(", "); } catch { /* */ }
      const due = t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "无";
      const line = `- [${priority}] ${t.title} (${status}, 截止: ${due}${tags ? ", 标签: " + tags : ""})`;
      (grouped[status] ||= []).push(line);
    }

    let taskList = "";
    for (const [status, tasks] of Object.entries(grouped)) {
      taskList += `### ${status} (${tasks.length})\n${tasks.join("\n")}\n\n`;
    }

    const prompt = `你是一个项目管理助手。请根据以下项目数据，生成一份简洁的周报（中文）。

项目名称：${project.name}
总任务数：${project.tasks.length}
完成率：${project.tasks.length > 0 ? Math.round(project.tasks.filter(t => t.status === "done").length / project.tasks.length * 100) : 0}%

任务详情：
${taskList}

请生成包含以下内容的周报（Markdown格式）：
1. 本周概览（2-3句话总结）
2. 关键进展（已完成的重要事项）
3. 风险与阻塞（需要关注的问题）
4. 下周计划（建议优先处理的事项）

保持简洁，不超过500字。`;

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "DeepSeek API key not configured" }, { status: 500 });
    }

    const aiRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "你是一个专业的项目管理助手，生成中文周报。" },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("DeepSeek API error:", errText);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const aiData = await aiRes.json();
    const report = aiData.choices?.[0]?.message?.content || "AI 未能生成报告";

    return NextResponse.json({ report });
  } catch (err) {
    console.error("AI report error:", err);
    return NextResponse.json({ error: "Report generation failed" }, { status: 500 });
  }
}
