"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Clock, Plus, Edit3, Trash2, ArrowRight } from "lucide-react";

interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  detail: string | null;
  createdAt: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  created: <Plus size={14} className="text-green-500" />,
  updated: <Edit3 size={14} className="text-blue-500" />,
  moved: <ArrowRight size={14} className="text-indigo-500" />,
  deleted: <Trash2 size={14} className="text-red-500" />,
  completed: <div className="w-3.5 h-3.5 rounded-full bg-green-500" />,
};

interface ActivityLogProps {
  projectId?: string;
}

export function ActivityLog({ projectId }: ActivityLogProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const url = projectId
          ? `/api/activities?projectId=${projectId}&limit=50`
          : "/api/activities?limit=50";
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (!cancelled) setActivities(data);
      } catch (err) {
        console.error("Activity log load failed:", err);
        if (!cancelled) setActivities([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-3 p-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">暂无活动记录</p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="mt-0.5 shrink-0">
                {ACTION_ICONS[activity.action] || <Clock size={14} className="text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{activity.entityName}</span>
                  {activity.detail && (
                    <span className="text-muted-foreground ml-2 text-xs">
                      {activity.detail}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(activity.createdAt), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}
