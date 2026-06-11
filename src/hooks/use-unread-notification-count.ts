"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { adminNotificationApi, notificationApi } from "@/lib/api";

type NotificationMode = "admin" | "user";

export function useUnreadNotificationCount(mode: NotificationMode) {
  const { token } = useAuth();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["sidebarUnreadNotifications", mode, token],
    queryFn: async () => {
      if (!token) return 0;
      try {
        const response =
          mode === "admin"
            ? await adminNotificationApi.getUnreadCount(token)
            : await notificationApi.getUnreadCount(token);
        return response.success && response.data
          ? response.data.unread_count || 0
          : 0;
      } catch {
        return 0;
      }
    },
    enabled: Boolean(token),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return unreadCount;
}
