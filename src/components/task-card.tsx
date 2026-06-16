"use client";

import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Calendar, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import type { Task } from "@/types";
import { PRIORITY_LABELS, PRIORITY_COLORS, PRIORITY_COLORS_FALLBACK } from "@/types";

interface TaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onClick?: (task: Task) => void;
}

export function TaskCard({ task, onDelete, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const tags = useMemo(() => {
    try {
      return JSON.parse(task.tags || "[]") as string[];
    } catch {
      return [];
    }
  }, [task.tags]);

  const priorityColor =
    PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] ?? PRIORITY_COLORS_FALLBACK;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`group p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
      onClick={() => onClick?.(task)}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-muted-foreground hover:text-foreground shrink-0 touch-none"
          aria-label="拖拽排序"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-card-foreground truncate">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${priorityColor}`}>
              {PRIORITY_LABELS[task.priority as keyof typeof PRIORITY_LABELS] ?? task.priority}
            </Badge>
            {tags.filter(Boolean).slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                {tag}
              </Badge>
            ))}
            {task.dueDate && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5 ml-auto">
                <Calendar size={10} />
                {format(new Date(task.dueDate), "MM/dd")}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("确定要删除此任务吗？")) onDelete(task.id);
          }}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity shrink-0"
          aria-label="删除任务"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </Card>
  );
}
