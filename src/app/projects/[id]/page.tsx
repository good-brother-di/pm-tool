"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Search, X, Columns, Clock, BarChart3, Download, Filter, Sparkles, FolderSync } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KanbanBoard } from "@/components/kanban-board";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { TaskDetailSheet } from "@/components/task-detail-sheet";
import { GanttChart } from "@/components/gantt-chart";
import { ActivityLog } from "@/components/activity-log";
import type { Project, Task } from "@/types";

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [newTaskStatus, setNewTaskStatus] = useState("todo");

  // Task detail sheet
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"kanban" | "gantt" | "log">("kanban");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const reorderAbortRef = useRef<AbortController | null>(null);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${params.id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setProject(data);
      setTasks(data.tasks || []);
    } catch {
      router.push("/");
    }
  }, [params.id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleStatusChange(taskId: string, newStatus: string) {
    const prevTasks = tasksRef.current;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const maxOrder = prev
          .filter((p) => p.status === newStatus && p.id !== taskId)
          .reduce((max, p) => Math.max(max, p.sortOrder), -1);
        return { ...t, status: newStatus as Task["status"], sortOrder: maxOrder + 1 };
      })
    );
    try {
      const newSortOrder =
        prevTasks
          .filter((t) => t.status === newStatus && t.id !== taskId)
          .reduce((max, t) => Math.max(max, t.sortOrder), -1) + 1;
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, sortOrder: newSortOrder }),
      });
    } catch (err) {
      console.error("Status change failed:", err);
      setTasks(prevTasks);
    }
  }

  async function handleReorder(_columnStatus: string, orderedTaskIds: string[]) {
    const prevTasks = tasksRef.current;
    reorderAbortRef.current?.abort();
    const controller = new AbortController();
    reorderAbortRef.current = controller;
    setTasks((prev) =>
      prev.map((t) => {
        const idx = orderedTaskIds.indexOf(t.id);
        return idx !== -1 ? { ...t, sortOrder: idx } : t;
      })
    );
    try {
      await Promise.all(
        orderedTaskIds.map((taskId, idx) =>
          fetch(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sortOrder: idx }),
            signal: controller.signal,
          })
        )
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      console.error("Reorder failed:", err);
      setTasks(prevTasks);
    }
  }

  async function handleDelete(taskId: string) {
    const prevTasks = tasksRef.current;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    } catch (err) {
      console.error("Delete failed:", err);
      setTasks(prevTasks);
    }
  }

  async function handleCreateTask(data: {
    title: string;
    description: string;
    status: string;
    priority: string;
    tags: string[];
    dueDate: string;
  }) {
    const currentTasks = tasksRef.current;
    const maxOrder = currentTasks
      .filter((t) => t.status === data.status)
      .reduce((max, t) => Math.max(max, t.sortOrder), -1);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, projectId: params.id, sortOrder: maxOrder + 1 }),
      });
      if (res.ok) {
        const newTask = await res.json();
        setTasks((prev) => [...prev, newTask]);
      }
    } catch (err) {
      console.error("Create task failed:", err);
    }
  }

  async function handleTaskSave(id: string, data: Partial<Task>) {
    const prevTasks = tasksRef.current;
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
    try {
      await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setDetailOpen(false);
    } catch (err) {
      console.error("Task update failed:", err);
      setTasks(prevTasks);
    }
  }

  function handleTaskClick(task: Task) {
    setDetailTask(task);
    setDetailOpen(true);
  }

  async function handleTaskDeleteFromDetail(id: string) {
    setDetailOpen(false);
    await handleDelete(id);
  }

  async function handleGenerateReport() {
    setAiLoading(true);
    setAiReport(null);
    try {
      const res = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: params.id }),
      });
      const data = await res.json();
      setAiReport(data.report || data.error || "生成失败");
    } catch {
      setAiReport("AI 服务请求失败");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleObsidianSync() {
    setSyncMsg("同步中...");
    try {
      const res = await fetch("/api/obsidian/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: params.id }),
      });
      const data = await res.json();
      setSyncMsg(data.message || data.error || "同步完成");
    } catch {
      setSyncMsg("同步失败");
    }
  }

  function openCreateDialog(status: string) {
    setNewTaskStatus(status);
    setTaskDialogOpen(true);
  }

  const filteredTasks = (() => {
    let result = tasks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description || "").toLowerCase().includes(q)
      );
    }
    if (tagFilter.trim()) {
      const tag = tagFilter.toLowerCase();
      result = result.filter((t) => {
        try {
          const tags: string[] = JSON.parse(t.tags || "[]");
          return tags.some((tg) => tg.toLowerCase().includes(tag));
        } catch {
          return false;
        }
      });
    }
    return result;
  })();

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
            <ArrowLeft size={18} />
          </Button>
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
          <h1 className="text-lg font-bold text-foreground">{project.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => openCreateDialog("todo")} className="gap-1">
            <Plus size={14} />
            新建任务
          </Button>
          <div className="flex items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 h-8 w-48 lg:w-56 has-[:focus]:border-ring has-[:focus]:ring-3 has-[:focus]:ring-ring/50">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索任务..."
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Toolbar row */}
      <div className="flex items-center gap-1 px-4 py-1.5 border-b bg-muted/20">
        <span className="text-[11px] text-muted-foreground mr-2">导出:</span>
        <a
          href={`/api/export?projectId=${params.id}&format=csv`}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          download
        >
          CSV
        </a>
        <span className="text-muted-foreground/30 mx-1">|</span>
        <a
          href={`/api/export?projectId=${params.id}&format=markdown`}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          download
        >
          Markdown
        </a>
        <span className="w-px h-3 bg-border mx-2" />
        <button
          onClick={handleObsidianSync}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <FolderSync size={12} />
          {syncMsg ? syncMsg : "同步到 Obsidian"}
        </button>
        <span className="w-px h-3 bg-border mx-2" />
        <button
          onClick={handleGenerateReport}
          disabled={aiLoading}
          className="flex items-center gap-1 text-[11px] text-indigo-500 hover:text-indigo-600 transition-colors"
        >
          <Sparkles size={12} />
          {aiLoading ? "生成中..." : "AI 周报"}
        </button>
      </div>

      {/* View switcher tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/30">
        <button
          onClick={() => setView("kanban")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            view === "kanban" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Columns size={14} /> 看板
        </button>
        <button
          onClick={() => setView("gantt")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            view === "gantt" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 size={14} /> 甘特图
        </button>
        <button
          onClick={() => setView("log")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            view === "log" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock size={14} /> 活动
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <Filter size={12} className="text-muted-foreground" />
          <input
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="按标签筛选..."
            className="w-28 text-xs bg-transparent border-0 border-b border-transparent focus:border-border outline-none placeholder:text-muted-foreground"
          />
          {tagFilter && (
            <button onClick={() => setTagFilter("")} className="text-muted-foreground hover:text-foreground">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {aiReport && (
        <div className="p-4 border-b bg-indigo-50/50 dark:bg-indigo-950/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">AI 周报</h3>
            <button onClick={() => setAiReport(null)} className="text-xs text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          </div>
          <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
            {aiReport}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        {view === "kanban" && (
          <div className="p-4 h-full">
            <KanbanBoard
              tasks={filteredTasks}
              onStatusChange={handleStatusChange}
              onReorder={handleReorder}
              onDelete={handleDelete}
              onCreateTask={openCreateDialog}
              onTaskClick={handleTaskClick}
            />
          </div>
        )}
        {view === "gantt" && (
          <div className="p-4">
            <GanttChart tasks={filteredTasks} />
          </div>
        )}
        {view === "log" && (
          <div className="p-4">
            <ActivityLog projectId={params.id} />
          </div>
        )}
      </ScrollArea>

      <TaskDetailSheet
        task={detailTask}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onSave={handleTaskSave}
        onDelete={handleTaskDeleteFromDetail}
      />

      <CreateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        defaultStatus={newTaskStatus}
        projectId={params.id}
        onCreate={handleCreateTask}
      />
    </div>
  );
}
