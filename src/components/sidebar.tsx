"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, Trash2, MoreHorizontal,
  Sun, Moon, GripVertical,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DndContext, closestCenter,
  KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { useTheme } from "next-themes";
import type { Project } from "@/types";

/** A single sortable project link */
function SortableProject({
  project,
  isActive,
  onDelete,
}: {
  project: Project;
  isActive: boolean;
  onDelete: (id: string) => void;
}) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const baseLink =
    "flex-1 min-w-0 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors";
  const inactiveLink =
    "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
  const activeLink =
    "bg-sidebar-accent text-sidebar-accent-foreground font-medium";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center ${isDragging ? "opacity-50" : ""}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-sidebar-foreground/20 hover:text-sidebar-foreground/50 shrink-0 transition-opacity cursor-grab active:cursor-grabbing touch-none"
        aria-label="拖拽排序"
      >
        <GripVertical size={12} />
      </button>

      <Link
        href={`/projects/${project.id}`}
        className={`${baseLink} ${isActive ? activeLink : inactiveLink}`}
      >
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: project.color }}
        />
        <span className="truncate">{project.name}</span>
        {project._count != null && (
          <span className="ml-auto text-[11px] text-sidebar-foreground/30 tabular-nums shrink-0">
            {project._count.tasks}
          </span>
        )}
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="opacity-0 group-hover:opacity-100 p-0.5 text-sidebar-foreground/40 hover:text-sidebar-foreground/70 shrink-0 transition-opacity bg-transparent border-0 cursor-pointer"
          aria-label="项目操作"
        >
          <MoreHorizontal size={12} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-red-600 text-xs"
            onClick={() => onDelete(project.id)}
          >
            <Trash2 size={12} className="mr-1" />
            删除项目
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function Sidebar() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      setError("加载项目失败");
    }
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  async function handleCreate(data: { name: string; description: string; color: string }) {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) fetchProjects();
    } catch (err) {
      console.error("Create project failed:", err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定要删除这个项目及所有任务吗？")) return;
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) fetchProjects();
    } catch (err) {
      console.error("Delete project failed:", err);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = projects.findIndex((p) => p.id === active.id);
    const newIndex = projects.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const prevProjects = [...projects];
    const reordered = arrayMove(projects, oldIndex, newIndex);
    setProjects(reordered);

    // Persist with rollback
    try {
      const res = await fetch("/api/projects/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((p) => p.id) }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch (err) {
      console.error("Reorder failed:", err);
      setProjects(prevProjects);
    }
  }

  const linkBase =
    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors";
  const linkInactive =
    "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
  const linkActive =
    "bg-sidebar-accent text-sidebar-accent-foreground font-medium";

  return (
    <aside className="w-56 bg-sidebar border-r border-sidebar-border flex flex-col shrink-0">
      <div className="px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <FolderKanban size={20} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="font-bold text-sidebar-foreground">PM Tool</span>
        </Link>
      </div>

      <div className="px-3 pb-1">
        <Link
          href="/"
          className={`${linkBase} ${pathname === "/" ? linkActive : linkInactive}`}
        >
          <LayoutDashboard size={16} className="shrink-0" />
          仪表盘
        </Link>
      </div>

      <Separator className="my-3" />

      <div className="px-3 flex-1 flex flex-col min-h-0">
        <div className="px-1 mb-2">
          <span className="text-[11px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
            项目列表
          </span>
        </div>
        <ScrollArea className="flex-1">
          {error ? (
            <p className="text-xs text-red-500 px-2 py-2">{error}</p>
          ) : projects.length === 0 ? (
            <p className="text-xs text-sidebar-foreground/30 px-2 py-4 text-center">
              暂无项目
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={projects.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0.5 pr-1">
                  {projects.map((project) => (
                    <SortableProject
                      key={project.id}
                      project={project}
                      isActive={pathname === `/projects/${project.id}`}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </ScrollArea>
      </div>

      <div className="px-3 py-2 border-t border-sidebar-border space-y-1.5">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full transition-colors"
          >
            {theme === "dark" ? <Sun size={14} className="shrink-0" /> : <Moon size={14} className="shrink-0" />}
            <span className="text-left">{theme === "dark" ? "浅色模式" : "深色模式"}</span>
          </button>
        )}
        <CreateProjectDialog onCreate={handleCreate} />
      </div>
    </aside>
  );
}
