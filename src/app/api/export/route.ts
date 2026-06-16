import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function escapeCsv(str: string): string {
  // Prevent CSV injection: prefix cells starting with =, +, -, @
  if (/^[=+\-@]/.test(str)) str = "'" + str;
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url, "http://localhost");
    const format = url.searchParams.get("format") || "csv";
    const projectId = url.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    });

    if (!project) {
      return NextResponse.json({ error: "project not found" }, { status: 404 });
    }

    const statusLabels: Record<string, string> = {
      todo: "todo", in_progress: "in_progress", blocked: "blocked", done: "done",
    };
    const priorityLabels: Record<string, string> = {
      low: "low", medium: "medium", high: "high", urgent: "urgent",
    };

    if (format === "markdown") {
      let md = "# " + project.name + "\n\n";
      md += "> Export: " + new Date().toISOString().slice(0, 10) + "\n";
      md += "> Tasks: " + project.tasks.length + "\n\n";

      const grouped: Record<string, typeof project.tasks> = {};
      for (const t of project.tasks) {
        const arr = grouped[t.status] || [];
        arr.push(t);
        grouped[t.status] = arr;
      }

      for (const status of ["todo", "in_progress", "blocked", "done"]) {
        const ts = grouped[status] || [];
        md += "## " + (statusLabels[status] || status) + " (" + ts.length + ")\n\n";
        if (ts.length === 0) {
          md += "*none*\n\n";
          continue;
        }
        md += "| task | priority | tags | due |\n";
        md += "|------|----------|------|-----|\n";
        for (const t of ts) {
          let tags = "";
          try { tags = JSON.parse(t.tags || "[]").join(", "); } catch { /* */ }
          md += "| " + t.title.replace(/\|/g, "\\|") + " | " + (priorityLabels[t.priority] || t.priority) + " | " + tags + " | " + (t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "-") + " |\n";
        }
        md += "\n";
      }

      return new NextResponse(md, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": "attachment; filename=\"" + encodeURIComponent(project.name) + ".md\"",
        },
      });
    }

    // CSV
    const headers = ["title", "status", "priority", "tags", "dueDate", "description"];
    const rows = project.tasks.map((t) => {
      let tags = "";
      try { tags = JSON.parse(t.tags || "[]").join(";"); } catch { /* */ }
      return [
        escapeCsv(t.title),
        statusLabels[t.status] || t.status,
        priorityLabels[t.priority] || t.priority,
        tags,
        t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "",
        escapeCsv(t.description || ""),
      ];
    });

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"" + encodeURIComponent(project.name) + ".csv\"",
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
