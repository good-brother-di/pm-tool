export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
  tasks?: Task[];
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "blocked" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null;
  tags: string;
  sortOrder: number;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_LABELS: Record<Task["status"], string> = {
  todo: "待办",
  in_progress: "进行中",
  blocked: "阻塞",
  done: "已完成",
};

export const PRIORITY_LABELS: Record<Task["priority"], string> = {
  low: "低",
  medium: "中",
  high: "高",
  urgent: "紧急",
};

export const PRIORITY_COLORS: Record<Task["priority"], string> = {
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export const PRIORITY_COLORS_FALLBACK = "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300";
