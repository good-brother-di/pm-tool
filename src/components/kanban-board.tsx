"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/task-card";
import type { Task } from "@/types";
import { STATUS_LABELS } from "@/types";

const COLUMNS: { id: Task["status"]; color: string }[] = [
  { id: "todo", color: "bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700" },
  { id: "in_progress", color: "bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-800" },
  { id: "blocked", color: "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-800" },
  { id: "done", color: "bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-800" },
];

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onReorder: (columnStatus: string, orderedTaskIds: string[]) => void;
  onDelete: (taskId: string) => void;
  onCreateTask: (status: string) => void;
  onTaskClick: (task: Task) => void;
}

/**
 * Droppable column wrapper.
 * CRITICAL: disabled=true when column has items, so sortable task cards
 * take priority for collision detection. Column droppable only activates
 * when the column is EMPTY — allowing cross-column drops into empty columns.
 */
function DroppableColumn({
  id,
  className,
  children,
  isEmpty,
}: {
  id: Task["status"];
  className: string;
  children: React.ReactNode;
  isEmpty: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id, disabled: !isEmpty });
  return (
    <div
      ref={setNodeRef}
      className={`${className} transition-colors ${
        isOver ? "ring-2 ring-indigo-400 ring-inset" : ""
      }`}
    >
      {children}
    </div>
  );
}

export function KanbanBoard({
  tasks,
  onStatusChange,
  onReorder,
  onDelete,
  onCreateTask,
  onTaskClick,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getTasksByStatus = useCallback(
    (status: string) =>
      tasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [tasks]
  );

  /** Resolve whether the drop target is a column or a task */
  function resolveTarget(overId: string | number) {
    // Column?
    const col = COLUMNS.find((c) => c.id === overId);
    if (col) return { type: "column" as const, status: col.id };
    // Task?
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) return { type: "task" as const, status: overTask.status, taskId: overTask.id };
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  function handleDragOver(event: DragOverEvent) {
    if (!event.over) { setOverColumn(null); return; }
    const target = resolveTarget(event.over.id);
    setOverColumn(target?.status ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    setOverColumn(null);

    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const target = resolveTarget(over.id);
    if (!target) return;

    // ===== SAME column: reorder =====
    if (target.status === task.status) {
      const colTasks = getTasksByStatus(task.status);
      if (colTasks.length <= 1) return; // nothing to reorder

      // Dropped on another task in same column
      const oldIndex = colTasks.findIndex((t) => t.id === taskId);
      const newIndex = colTasks.findIndex((t) => t.id === target.taskId!);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(colTasks, oldIndex, newIndex);
        onReorder(task.status, reordered.map((t) => t.id));
      }
      return;
    }

    // ===== DIFFERENT column: change status =====
    onStatusChange(taskId, target.status);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-4 gap-4 h-full">
        {COLUMNS.map((col) => {
          const colTasks = getTasksByStatus(col.id);
          const isEmpty = colTasks.length === 0;
          return (
            <DroppableColumn
              key={col.id}
              id={col.id}
              isEmpty={isEmpty}
              className={`flex flex-col rounded-lg border ${col.color} min-h-[200px]`}
            >
              <div className="flex items-center justify-between p-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {STATUS_LABELS[col.id]}
                  </h3>
                  <span className="text-xs text-muted-foreground bg-background/20 px-1.5 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onCreateTask(col.id)}
                >
                  <Plus size={14} />
                </Button>
              </div>
              <SortableContext
                items={colTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDelete={onDelete}
                      onClick={onTaskClick}
                    />
                  ))}
                  {isEmpty && (
                    <div className="text-center text-xs text-muted-foreground py-8 pointer-events-none">
                      拖拽任务到此处
                    </div>
                  )}
                </div>
              </SortableContext>
            </DroppableColumn>
          );
        })}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 opacity-90">
            <TaskCard task={activeTask} onDelete={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
