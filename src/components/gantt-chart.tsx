"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import {
  format, addDays, differenceInDays, startOfDay,
  endOfDay, isToday, eachDayOfInterval, addMonths,
  startOfMonth, endOfMonth, getDaysInMonth,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Task } from "@/types";

interface GanttChartProps {
  tasks: Task[];
}

const STATUS_COLORS: Record<string, string> = {
  todo: "#94a3b8",
  in_progress: "#3b82f6",
  blocked: "#ef4444",
  done: "#22c55e",
};

const STATUS_BG: Record<string, string> = {
  todo: "bg-slate-400 dark:bg-slate-600",
  in_progress: "bg-blue-500 dark:bg-blue-600",
  blocked: "bg-red-400 dark:bg-red-600",
  done: "bg-green-500 dark:bg-green-600",
};

export function GanttChart({ tasks }: GanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { monthColumns, dayWidth, totalDays, start, end, todayOffset } = useMemo(() => {
    const today = startOfDay(new Date());
    const tasksWithDue = tasks.filter((t) => t.dueDate);

    // Determine range
    const allDates = tasksWithDue.map((t) => new Date(t.dueDate!));
    const earliestDue = allDates.length > 0
      ? new Date(Math.min(...allDates.map((d) => d.getTime())))
      : today;
    const latestDue = allDates.length > 0
      ? new Date(Math.max(...allDates.map((d) => d.getTime())))
      : today;

    const rangeStart = addDays(
      new Date(Math.min(today.getTime(), earliestDue.getTime())),
      -3
    );
    const rangeEnd = addDays(
      new Date(Math.max(today.getTime(), latestDue.getTime())),
      7
    );

    // Snap to month boundaries
    const start = startOfMonth(rangeStart);
    const end = endOfMonth(rangeEnd);

    const totalDays = differenceInDays(end, start) + 1;
    const dayWidth = Math.max(16, Math.min(40, 800 / totalDays)); // 16-40px per day

    // Build month columns
    const months: { label: string; days: number; offset: number }[] = [];
    let cursor = start;
    while (cursor <= end) {
      const monthStart = startOfMonth(cursor);
      const monthEnd = endOfMonth(cursor);
      const offsetDays = differenceInDays(monthStart, start);
      const days = getDaysInMonth(cursor);
      months.push({
        label: format(cursor, "M月", { locale: zhCN }),
        days,
        offset: offsetDays,
      });
      cursor = addMonths(cursor, 1);
    }

    const todayOffset = differenceInDays(today, start);

    return { monthColumns: months, dayWidth, totalDays, start, end, todayOffset };
  }, [tasks]);

  // Scroll to today on mount
  useEffect(() => {
    if (scrollRef.current && dayWidth > 0) {
      const scrollTo = todayOffset * dayWidth - 200;
      scrollRef.current.scrollLeft = Math.max(0, scrollTo);
    }
  }, [dayWidth, todayOffset]);

  const chartWidth = totalDays * dayWidth;

  // Compute task bars
  const taskBars = useMemo(() => {
    return tasks.map((task) => {
      if (!task.dueDate) {
        return { task, left: 0, width: 0, hasDate: false, outOfRange: false };
      }
      const due = new Date(task.dueDate);
      const taskStart = addDays(due, -5);
      const left = Math.max(0, differenceInDays(taskStart, start));
      const right = Math.min(differenceInDays(due, start), totalDays);
      const width = Math.max(right - left, 1);
      const outOfRange = due < start || taskStart > end;
      return { task, left, width: outOfRange ? 0 : width, hasDate: true, outOfRange };
    });
  }, [tasks, start]);

  // Weekday header
  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

  return (
    <div className="flex flex-col h-full">
      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 text-xs text-muted-foreground border-b">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-400" /> 待办</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-500" /> 进行中</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-400" /> 阻塞</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-500" /> 已完成</span>
        <span className="flex-1" />
        <span className="text-[11px]">{format(start, "yyyy/MM/dd")} — {format(end, "yyyy/MM/dd")}</span>
      </div>

      {/* Scrollable chart area */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div style={{ width: chartWidth + 160, minWidth: "100%" }}>
          {/* Month header */}
          <div className="flex border-b sticky top-0 bg-background z-10">
            <div className="w-40 shrink-0 px-2 py-1.5 text-[10px] font-medium text-muted-foreground border-r" />
            <div className="relative flex-1" style={{ height: 28 }}>
              {monthColumns.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full flex items-center justify-center text-[10px] font-semibold text-muted-foreground border-r border-border"
                  style={{
                    left: m.offset * dayWidth,
                    width: m.days * dayWidth,
                  }}
                >
                  {m.label}
                </div>
              ))}
              {/* Today marker */}
              {todayOffset >= 0 && todayOffset < totalDays && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-500 z-20"
                  style={{ left: todayOffset * dayWidth + dayWidth / 2 }}
                >
                  <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500" />
                </div>
              )}
            </div>
          </div>

          {/* Task rows */}
          {tasks.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-12">
              暂无任务。创建任务并设置截止日期后，甘特图将在此显示。
            </div>
          ) : (
            taskBars.map(({ task, left, width, hasDate, outOfRange }, idx) => (
              <div
                key={task.id}
                className={`flex border-b border-border/50 ${idx % 2 === 0 ? "bg-muted/20" : ""}`}
              >
                {/* Task name */}
                <div className="w-40 shrink-0 px-2 py-2 flex items-center gap-1.5 border-r">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: STATUS_COLORS[task.status] || "#94a3b8" }}
                  />
                  <Tooltip>
                    <TooltipTrigger className="text-xs truncate text-left">
                      {task.title}
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="text-xs font-medium">{task.title}</p>
                      {task.dueDate && (
                        <p className="text-[10px] text-muted-foreground">
                          截止: {format(new Date(task.dueDate), "yyyy-MM-dd")}
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Bar area */}
                <div className="relative flex-1" style={{ height: 36 }}>
                  {/* Grid lines */}
                  {monthColumns.map((m, i) => (
                    <div
                      key={i}
                      className="absolute top-0 h-full border-r border-border/30"
                      style={{ left: m.offset * dayWidth }}
                    />
                  ))}

                  {/* Today line */}
                  {todayOffset >= 0 && todayOffset < totalDays && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-red-400/50 z-10"
                      style={{ left: todayOffset * dayWidth + dayWidth / 2 }}
                    />
                  )}

                  {/* Task bar */}
                  {(() => {
                    if (hasDate && !outOfRange) {
                      return (
                        <Tooltip>
                          <TooltipTrigger
                            className={`absolute top-1.5 h-6 rounded-sm ${STATUS_BG[task.status] || "bg-gray-400"} opacity-80 hover:opacity-100 transition-opacity`}
                            style={{
                              left: left * dayWidth + 2,
                              width: Math.max(width * dayWidth - 4, 4),
                            }}
                          />
                          <TooltipContent side="top">
                            <p className="text-xs font-medium">{task.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              截止: {format(new Date(task.dueDate!), "yyyy-MM-dd")}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }
                    if (hasDate && outOfRange) {
                      return (
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />
                          <span className="text-[10px] text-muted-foreground/40">超出范围</span>
                        </div>
                      );
                    }
                    return (
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                        <span className="text-[10px] text-muted-foreground/50">未设日期</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
