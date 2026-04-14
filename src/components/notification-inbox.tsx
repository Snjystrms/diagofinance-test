"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  LucideIcon,
  Loader2,
  Trash2,
} from "lucide-react";
import { adminNotificationApi, notificationApi, type AdminNotificationItem, type NotificationItem } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

type NotificationInboxMode = "user" | "admin";

interface NotificationInboxProps {
  mode?: NotificationInboxMode;
}

type NotificationInboxItem = {
  id: number;
  message: string;
  timeAgo: string;
  createdAt: string;
  isRead: boolean;
  status: "read" | "unread";
};

const normalizeNotification = (
  item: NotificationItem | AdminNotificationItem,
  mode: NotificationInboxMode
): NotificationInboxItem => {
  if (mode === "admin") {
    const adminItem = item as AdminNotificationItem;
    return {
      id: adminItem.id,
      message: adminItem.message,
      timeAgo: adminItem.created_at,
      createdAt: adminItem.created_at,
      isRead: adminItem.status === 1,
      status: adminItem.status === 1 ? "read" : "unread",
    };
  }

  const userItem = item as NotificationItem;
  return {
    id: userItem.id,
    message: userItem.message,
    timeAgo: userItem.timeAgo,
    createdAt: userItem.createdAt,
    isRead: userItem.isRead,
    status: userItem.status,
  };
};

// Helper function to get icon based on notification message
const getNotificationIcon = (message: string): LucideIcon => {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("approved") || lowerMessage.includes("verified")) {
    return CheckCircle2;
  }
  if (lowerMessage.includes("rejected") || lowerMessage.includes("failed") || lowerMessage.includes("error")) {
    return XCircle;
  }
  if (lowerMessage.includes("deposit") || lowerMessage.includes("withdrawal") || lowerMessage.includes("transaction")) {
    return AlertCircle;
  }
  return Info;
};

export function NotificationInbox({ mode = "user" }: NotificationInboxProps) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationInboxItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [tab, setTab] = useState("all");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = tab === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;

    try {
      const response =
        mode === "admin"
          ? await adminNotificationApi.getUnreadCount(token)
          : await notificationApi.getUnreadCount(token);
      if (response.success && response.data) {
        setUnreadCount(response.data.unread_count || 0);
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, [token, mode]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response =
        mode === "admin"
          ? await adminNotificationApi.getNotifications(token, {
              page: 1,
              limit: 20,
              status: tab === "unread" ? "unread" : "all",
            })
          : await notificationApi.getNotifications(token);

      if (response.success && response.data) {
        setNotifications(
          (response.data.notifications || []).map((item) =>
            normalizeNotification(item, mode)
          )
        );

        if (response.data.summary) {
          setUnreadCount(response.data.summary.unread || 0);
        }
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [mode, tab, token]);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    if (token) {
      fetchUnreadCount();
      // Refresh count every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [token, fetchUnreadCount]);

  // Fetch notifications when popover opens
  useEffect(() => {
    if (isOpen && token) {
      fetchNotifications();
    }
  }, [isOpen, token, fetchNotifications]);

  const markAsRead = async (id: number) => {
    if (!token) return;

    if (mode === "admin") {
      try {
        await adminNotificationApi.markAsRead(id, token);
      } catch (error) {
        console.error("Failed to mark admin notification as read:", error);
      }
    }

    setNotifications((prev) => {
      const wasUnread = prev.find((n) => n.id === id)?.isRead === false;
      const updated = prev.map((n) =>
        n.id === id ? { ...n, isRead: true, status: "read" as const } : n
      );
      if (wasUnread) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      return updated;
    });
  };

  const markAllAsRead = async () => {
    if (!token || unreadCount === 0) return;

    setIsMarkingAll(true);
    try {
      const response =
        mode === "admin"
          ? await adminNotificationApi.markAllAsRead(token)
          : await notificationApi.markAllAsRead(token);

      if (response.success) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, isRead: true, status: "read" as const }))
        );
        setUnreadCount(0);
        toast.success(response.message || "All notifications marked as read");
      }
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all notifications as read");
    } finally {
      setIsMarkingAll(false);
    }
  };

  const deleteNotification = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token || mode === "admin") return;

    const notification = notifications.find((n) => n.id === id);
    const wasUnread = notification?.isRead === false;

    try {
      await notificationApi.deleteNotification(id, token);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      toast.success("Notification deleted");
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error("Failed to delete notification");
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="relative flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 min-w-5 h-5 px-1 flex items-center justify-center text-[10px]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        {/* Header with Tabs + Mark All */}
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between border-b px-3 py-2">
            <TabsList className="bg-transparent">
              <TabsTrigger value="all" className="text-sm">
                All
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-sm">
                Unread {unreadCount > 0 && <Badge className="ml-1 text-[10px]">{unreadCount}</Badge>}
              </TabsTrigger>
            </TabsList>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={isMarkingAll}
                className="text-xs font-medium text-muted-foreground hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMarkingAll ? "Marking..." : "Mark all as read"}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center px-3 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No {tab === "unread" ? "unread " : ""}notifications
              </div>
            ) : (
              filtered.map((n) => {
                const Icon = getNotificationIcon(n.message);
                return (
                  <div
                    key={n.id}
                    className="flex w-full items-start gap-3 border-b px-3 py-3 group"
                  >
                    <button
                      onClick={() => !n.isRead && markAsRead(n.id)}
                      className="flex-1 flex items-start gap-3 text-left"
                    >
                      <div className={cn(
                        "mt-1 flex-shrink-0",
                        !n.isRead ? "text-primary" : "text-muted-foreground"
                      )}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm break-words",
                            !n.isRead
                              ? "font-semibold text-foreground"
                              : "text-foreground"
                          )}
                        >
                          {n.message}
                        </p>
                        <p className="text-xs text-muted-foreground">{n.timeAgo}</p>
                      </div>
                      {!n.isRead && (
                        <span className="mt-1 inline-block size-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </button>
                    {mode !== "admin" && (
                      <button
                        onClick={(e) => deleteNotification(n.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 hover:bg-destructive/10 rounded"
                        aria-label="Delete notification"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Tabs>

      </PopoverContent>
    </Popover>
  );
}

