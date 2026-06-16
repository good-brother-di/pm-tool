"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FolderKanban, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { startOfDay } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { Project, Task } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  todo: "#94a3b8",
  in_progress: "#3b82f6",
  blocked: "#ef4444",
  done: "#22c55e",
};

const STATUS_LABEL_MAP: Record<string, string> = {
  todo: "待办",
  in_progress: "进行中",
  blocked: "阻塞",
  done: "已完成",
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [projRes, taskRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/tasks"),
        ]);
        if (!projRes.ok || !taskRes.ok) throw new Error("加载失败");
        const [projData, taskData] = await Promise.all([projRes.json(), taskRes.json()]);
        if (!cancelled) { setProjects(projData); setTasks(taskData); setError(null); }
      } catch (err) {
        if (!cancelled) { console.error("Dashboard load failed:", err); setError("数据加载失败，请刷新重试"); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const allTasks = tasks;
  const todoTasks = allTasks.filter((t) => t.status === "todo");
  const blockedTasks = allTasks.filter((t) => t.status === "blocked");
  const doneTasks = allTasks.filter((t) => t.status === "done");
  const inProgressTasks = allTasks.filter((t) => t.status === "in_progress");

  const todayStart = startOfDay(new Date());
  const overdueTasks = allTasks.filter((t) => {
    if (!t.dueDate || t.status === "done") return false;
    return new Date(t.dueDate) < todayStart;
  });
  const blockedIds = new Set(blockedTasks.map((t) => t.id));
  const overdueOnly = overdueTasks.filter((t) => !blockedIds.has(t.id));

  // Pie chart data
  const pieData = [
    { name: "待办", value: todoTasks.length, color: STATUS_COLORS.todo },
    { name: "进行中", value: inProgressTasks.length, color: STATUS_COLORS.in_progress },
    { name: "阻塞", value: blockedTasks.length, color: STATUS_COLORS.blocked },
    { name: "已完成", value: doneTasks.length, color: STATUS_COLORS.done },
  ].filter((d) => d.value > 0);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (<Skeleton key={i} className="h-24 rounded-xl" />))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
          <CardContent className="py-6 text-center text-red-700 dark:text-red-400">
            <AlertTriangle className="mx-auto mb-2" size={24} />
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">仪表盘</h1>
          <p className="text-sm text-muted-foreground mt-1">项目管理概览</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">总任务</CardTitle>
              <FolderKanban size={16} className="text-indigo-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{allTasks.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">待办</CardTitle>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{todoTasks.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">阻塞</CardTitle>
              <AlertTriangle size={16} className="text-red-400" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{blockedTasks.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">完成率</CardTitle>
              <CheckCircle2 size={16} className="text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {allTasks.length > 0
                  ? Math.round((doneTasks.length / allTasks.length) * 100) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts + Lists */}
        <div className="grid grid-cols-2 gap-6">
          {/* Status Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">任务状态分布</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">暂无数据</p>
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name} ${value}`}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">活跃项目</CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  暂无项目，点击左侧「新建项目」创建
                </p>
              ) : (
                <div className="space-y-2">
                  {projects.filter((p) => p.status === "active").map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-sm font-medium flex-1 truncate">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p._count?.tasks || 0} 任务</span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Overdue & Blocked */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">⚠️ 过期 & 阻塞任务</CardTitle>
          </CardHeader>
          <CardContent>
            {blockedTasks.length === 0 && overdueOnly.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">一切正常 🎉</p>
            ) : (
              <div className="space-y-2">
                {blockedTasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950 text-sm">
                    <AlertTriangle size={14} className="text-red-400 shrink-0" />
                    <span className="flex-1 truncate">{task.title}</span>
                    <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-700 dark:text-red-400">阻塞</Badge>
                  </div>
                ))}
                {overdueOnly.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-950 text-sm">
                    <AlertTriangle size={14} className="text-orange-400 shrink-0" />
                    <span className="flex-1 truncate">{task.title}</span>
                    <Badge variant="secondary" className="text-[10px] bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400">过期</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
