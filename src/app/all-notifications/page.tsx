"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";

import { AppDataTable } from "@/components/app-data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { MainLayout } from "@/components/main-layout";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import { useAuth } from "@/contexts/auth-context";
import { adminNotificationApi, type AdminNotificationItem } from "@/lib/api";
import {
  Bell,
  CheckCircle2,
  Clock,
  Calendar,
  Search,
  CheckCheck,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

/* ---------------- Types ---------------- */
type StatusFilter = "all" | "unread" | "read";

/* ---------------- Helpers ---------------- */
const formatDateTime = (dateString: string) => {
  try {
    return format(new Date(dateString), "MMM dd, yyyy HH:mm");
  } catch {
    return dateString;
  }
};

const getStatusBadge = (status: number) => {
  if (status === 1) {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Read
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300">
      <Clock className="h-3 w-3 mr-1" />
      Unread
    </Badge>
  );
};

/* ---------------- Page ---------------- */
export default function AllNotificationsPage() {
  const { token } = useAuth();
  const { isAdmin, isManager, hasFeature } = useManagerPermissions();

  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total: 0,
    total_pages: 1,
    has_more: false,
  });
  const [summary, setSummary] = useState({
    total: 0,
    unread: 0,
    read: 0,
  });
  const [markingRead, setMarkingRead] = useState<number | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Check permissions
  const canViewNotifications = useMemo(() => {
    if (isAdmin) return true;
    if (isManager) {
      return hasFeature("notifications", "viewNotifications");
    }
    return false;
  }, [isAdmin, isManager, hasFeature]);

  const canMarkAsRead = useMemo(() => {
    if (isAdmin) return true;
    if (isManager) {
      return hasFeature("notifications", "markAsRead");
    }
    return false;
  }, [isAdmin, isManager, hasFeature]);

  const canMarkAllAsRead = useMemo(() => {
    if (isAdmin) return true;
    if (isManager) {
      return hasFeature("notifications", "markAllAsRead");
    }
    return false;
  }, [isAdmin, isManager, hasFeature]);

  const loadNotifications = useCallback(async () => {
    if (!token || !canViewNotifications) return;

    try {
      setLoading(true);
      const response = await adminNotificationApi.getNotifications(token, {
        page,
        limit,
        status: statusFilter,
        search: searchTerm || undefined,
      });

      // apiCall returns ApiResponse<T>, so response.data is the data object
      if (response.success && response.data) {
        const data = response.data as {
          notifications?: AdminNotificationItem[];
          pagination?: typeof pagination;
          summary?: typeof summary;
        };
        setNotifications(data.notifications || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
        if (data.summary) {
          setSummary(data.summary);
        }
      } else {
        toast.error(response.message || "Failed to load notifications");
        setNotifications([]);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load notifications";
      toast.error(errorMessage);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, statusFilter, searchTerm, canViewNotifications]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = useCallback(
    async (notificationId: number) => {
      if (!token || !canMarkAsRead) return;

      try {
        setMarkingRead(notificationId);
        const response = await adminNotificationApi.markAsRead(notificationId, token);

        if (response.success) {
          toast.success(response.message || "Notification marked as read");
          // Update local state
          setNotifications((prev) =>
            prev.map((notif) =>
              notif.id === notificationId ? { ...notif, status: 1 } : notif
            )
          );
          // Update summary
          setSummary((prev) => ({
            ...prev,
            unread: Math.max(0, prev.unread - 1),
            read: prev.read + 1,
          }));
        } else {
          toast.error(response.message || "Failed to mark notification as read");
        }
      } catch (error) {
        console.error("Error marking notification as read:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to mark notification as read";
        toast.error(errorMessage);
      } finally {
        setMarkingRead(null);
      }
    },
    [token, canMarkAsRead]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    if (!token || !canMarkAllAsRead) return;

    try {
      setMarkingAllRead(true);
      const response = await adminNotificationApi.markAllAsRead(token);

      if (response.success) {
        const updatedCount = response.data?.updated_count || 0;
        toast.success(response.message || `${updatedCount} notification(s) marked as read`);
        // Reload notifications to get updated state
        await loadNotifications();
      } else {
        toast.error(response.message || "Failed to mark all notifications as read");
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to mark all notifications as read";
      toast.error(errorMessage);
    } finally {
      setMarkingAllRead(false);
    }
  }, [token, canMarkAllAsRead, loadNotifications]);

  const columns: ColumnDef<AdminNotificationItem>[] = useMemo(
    () => [
      {
        id: "id",
        header: "ID",
        accessorKey: "id",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        id: "message",
        header: "Message",
        accessorKey: "message",
        cell: ({ row }) => (
          <div className="max-w-2xl">
            <p className="text-sm">{row.original.message}</p>
          </div>
        ),
      },
      {
        id: "created_at",
        header: "Created At",
        accessorKey: "created_at",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDateTime(row.original.created_at)}</span>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const isRead = row.original.status === 1;
          const isMarking = markingRead === row.original.id;

          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMarkAsRead(row.original.id)}
              disabled={isRead || !canMarkAsRead || isMarking}
              className="h-8"
            >
              {isMarking ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {isRead ? "Read" : "Mark as Read"}
                </>
              )}
            </Button>
          );
        },
      },
    ],
    [handleMarkAsRead, markingRead, canMarkAsRead]
  );

  if (!canViewNotifications) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">
            You do not have permission to view notifications.
          </p>
        </div>
      </MainLayout>
    );
  }

  if (loading && notifications.length === 0) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <Spinner className="h-8 w-8" />
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-75"></div>
              <div className="relative flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg">
                <Bell className="h-8 w-8" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
                All Notifications
              </h1>
              <p className="text-lg text-muted-foreground">
                View and manage all system notifications
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Total</p>
            </div>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.total}</p>
          </div>
          <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Unread</p>
            </div>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {summary.unread}
            </p>
          </div>
          <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Read</p>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {summary.read}
            </p>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm font-medium whitespace-nowrap">
                Status:
              </label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="flex-1 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {canMarkAllAsRead && (
                <Button
                  variant="outline"
                  onClick={handleMarkAllAsRead}
                  disabled={markingAllRead || summary.unread === 0}
                  className="flex items-center gap-2"
                >
                  {markingAllRead ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                  Mark All as Read
                </Button>
              )}
              <Button variant="outline" onClick={loadNotifications} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Data Table */}
          <AppDataTable<AdminNotificationItem>
            data={notifications}
            columns={columns}
            pageCount={pagination.total_pages}
            advanced
          />
        </div>
      </div>
    </MainLayout>
  );
}

