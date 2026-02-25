"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bell,
  FileCheck,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
interface NotificationItem {
  id: string;
  type: "review" | "comment" | "harvest";
  title: string;
  description: string;
  href: string;
  timestamp: Date;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

const STORAGE_KEY = "nextkan-dismissed-notifications";
const POLL_INTERVAL = 60_000;

function getDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function setDismissedIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

const typeIcons: Record<NotificationItem["type"], typeof Bell> = {
  review: FileCheck,
  comment: MessageSquare,
  harvest: AlertTriangle,
};

export function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(
        data.items.map((item: NotificationItem) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }))
      );
    } catch {
      // Silently fail — notifications are non-critical
    }
  }, []);

  useEffect(() => {
    setDismissed(getDismissedIds());
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const activeCount = items.filter((i) => !dismissed.has(i.id)).length;

  const handleDismissAll = () => {
    const allIds = new Set(items.map((i) => i.id));
    setDismissed(allIds);
    setDismissedIds(allIds);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {activeCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 size-5 p-0 text-[10px] flex items-center justify-center"
            >
              {activeCount > 9 ? "9+" : activeCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {items.length > 0 && (
            <button
              onClick={handleDismissAll}
              className="text-xs text-text-muted hover:text-foreground"
            >
              Dismiss all
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-text-muted">
            No notifications
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {items.map((item) => {
              const Icon = typeIcons[item.type];
              const isDismissed = dismissed.has(item.id);
              return (
                <a
                  key={item.id}
                  href={item.href}
                  className={`flex items-start gap-3 px-3 py-2 hover:bg-accent text-sm ${
                    isDismissed ? "opacity-50" : ""
                  }`}
                >
                  <Icon className="size-4 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{item.title}</div>
                    <div className="text-text-muted text-xs">
                      {item.description} &middot;{" "}
                      {formatRelativeDate(item.timestamp)}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
