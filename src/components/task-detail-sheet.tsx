"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";
import type { Task } from "@/types";
import { STATUS_LABELS, PRIORITY_LABELS } from "@/types";

interface TaskDetailSheetProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

export function TaskDetailSheet({
  task,
  open,
  onOpenChange,
  onSave,
  onDelete,
}: TaskDetailSheetProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Task["status"]>("todo");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
      try {
        const tags = JSON.parse(task.tags || "[]") as string[];
        setTagInput(tags.join(", "));
      } catch {
        setTagInput("");
      }
    }
  }, [task]);

  if (!task) return null;

  const tags = tagInput
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);

  async function handleSave() {
    if (!title.trim() || saving) return;
    setSaving(true);
    await onSave(task!.id, {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      dueDate: dueDate || null,
      tags: tags as unknown as Task["tags"],
    });
    setSaving(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>编辑任务</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-6">
          {/* Title */}
          <div className="space-y-1.5">
            <Label>标题</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={500}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>描述</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={5000}
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>状态</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Task["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>优先级</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Task["priority"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label>截止日期</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>标签</Label>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="逗号分隔，如: 前端, 紧急"
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
              保存
            </Button>
            <Button
              variant="destructive"
              onClick={() => { if (confirm("确定要删除此任务吗？")) onDelete(task.id); }}
              className="shrink-0"
            >
              删除
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
