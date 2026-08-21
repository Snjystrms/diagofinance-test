"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { parseAsInteger, useQueryState } from "nuqs";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
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
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Spinner } from "@/components/ui/spinner";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import { useAuth } from "@/contexts/auth-context";
import { adminNotificationApi, type AdminNotificationItem } from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import {
  Bell,
  CheckCircle2,
  Clock,
  Calendar,
  CheckCheck,
  RefreshCw,
} from "lucide-react";
import { formatApiDateTimeAsIST } from "@/lib/formatters";

/* ---------------- Types ---------------- */
type StatusFilter = "all" | "unread" | "read";

/* ---------------- Helpers ---------------- */
const formatDateTime = (dateString: string) => {
  try {
    return formatApiDateTimeAsIST(dateString);
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
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState("perPage", parseAsInteger.withDefault(20));
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

  const searchTermRef = useRef(searchTerm);
  useEffect(() => {
    searchTermRef.current = searchTerm;
  }, [searchTerm]);

  const skipNextEffectRef = useRef(false);

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

  const loadNotifications = useCallback(async (search?: string) => {
    if (!token || !canViewNotifications) return;

    try {
      setLoading(true);
      setLoadError(null);
      const response = await adminNotificationApi.getNotifications(token, {
        page,
        limit: perPage,
        status: statusFilter,
        search: (search ?? searchTermRef.current) || undefined,
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
        const failure = response.message || "Failed to load notifications";
        setLoadError(failure);
        toast.error(
          getAdminFriendlyErrorMessage(failure, {
            resource: "notifications",
            action: "load",
          })
        );
        setNotifications([]);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "notifications", action: "load" })
      );
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage, statusFilter, canViewNotifications]);

  // Reset to page 1 when status filter changes
  useEffect(() => {
    void setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (skipNextEffectRef.current) {
      skipNextEffectRef.current = false;
      return;
    }
    loadNotifications();
  }, [loadNotifications]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    void setPage(1);
    skipNextEffectRef.current = true;
    loadNotifications(value);
  }, [loadNotifications, setPage]);

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
          toast.error(
            getAdminFriendlyErrorMessage(response.message || "Failed to mark notification as read", {
              resource: "notifications",
              action: "update",
            })
          );
        }
      } catch (error) {
        console.error("Error marking notification as read:", error);
        toast.error(
          getAdminFriendlyErrorMessage(error, { resource: "notifications", action: "update" })
        );
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
        toast.error(
          getAdminFriendlyErrorMessage(
            response.message || "Failed to mark all notifications as read",
            {
              resource: "notifications",
              action: "update",
            }
          )
        );
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "notifications", action: "update" })
      );
    } finally {
      setMarkingAllRead(false);
    }
  }, [token, canMarkAllAsRead, loadNotifications]);

  const columns: ColumnDef<AdminNotificationItem>[] = useMemo(
    () => [
      {
        id: "id",
        header: "Sr. No.",
        accessorKey: "id",
        cell: ({ row, table }) => (
          <SerialNumberCell row={row} table={table} />
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
          <div className="max-w-[420px] min-w-0 whitespace-normal break-words lg:max-w-[640px]">
            <p className="text-sm leading-5">{row.original.message}</p>
          </div>
        ),
      },
      {
        id: "created_at",
        header: "Created At",
        accessorKey: "created_at",
        cell: ({ row }) => (
          <div className="flex min-w-[220px] items-center gap-2 whitespace-nowrap text-sm">
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
      <div className="px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          audience="admin"
          variant="panel"
          title="Access restricted"
          message="Your account does not have permission to view notifications."
        />
        </div>
    );
  }

  if (loadError && notifications.length === 0) {
    return (
      <div className="px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          error={loadError}
          audience="admin"
          variant="panel"
          resource="notifications"
          action="load"
          onRetry={() => {
            void loadNotifications();
          }}
        />
      </div>
    );
  }

  if (loading && notifications.length === 0) {
    return (
      
        <ListPageSkeleton
          statsCount={3}
          actionCount={2}
          columnCount={5}
          rowCount={10}
          filterPillCount={3}
        />
      
    );
  }

  return (
    
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="mb-1 flex items-center gap-2 text-3xl font-semibold text-foreground">
              <Bell className="h-6 w-6 text-primary" />
              All Notifications
            </h1>
            <p className="text-base text-muted-foreground">
              View and manage all system notifications
            </p>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex flex-col md:flex-row gap-4">
            
            {/* Search */}
            <div className="flex-1 flex items-center gap-2">
              <ApiSearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                onSearch={handleSearch}
                placeholder="Search notifications..."
                minimumLength={3}
                className="max-w-sm"
              />
            </div>
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
              <Button variant="outline" onClick={() => void loadNotifications()} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="h-6 w-6 text-primary" />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Total</p>
            </div>
            <p className="text-3xl font-semibold">{summary.total}</p>
          </div>
          <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Unread</p>
            </div>
            <p className="text-3xl font-semibold">
              {summary.unread}
            </p>
          </div>
          <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Read</p>
            </div>
            <p className="text-3xl font-semibold">
              {summary.read}
            </p>
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <AppDataTable<AdminNotificationItem>
            data={notifications}
            columns={columns}
            pageCount={pagination.total_pages}
            advanced
          />
        </div>
      </div>
    
  );
}


