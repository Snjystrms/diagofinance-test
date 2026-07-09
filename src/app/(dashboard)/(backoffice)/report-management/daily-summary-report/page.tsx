"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { CalendarIcon, RefreshCw, Download, ChevronDown, BarChart3, TrendingUp, TrendingDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  adminDailySummaryReportApi,
  type DailySummaryReportItem,
  type DailySummaryReportListPayload,
} from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";
import { useAuth } from "@/contexts/auth-context";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";

/* ---------------- Helpers ---------------- */
const fmtDate = (s?: string | null) => {
  if (!s) return "—";
  try {
    return format(new Date(s), "MMM dd, yyyy");
  } catch {
    return s;
  }
};

const formatAmount = (amount: string | number) => {
  try {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return String(amount);
  }
};

/* ---------------- Page ---------------- */
export default function DailySummaryReportPage() {
  const authCtx = useAuth?.();
  const { isManager, hasFeature } = useManagerPermissions();
  const canViewReport = !isManager || hasFeature("reportManagement", "dailySummaryReport");
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [rows, setRows] = useState<DailySummaryReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [fromDateStr, setFromDateStr] = useQueryState(
    "from_date",
    parseAsString
  );
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [toDateStr, setToDateStr] = useQueryState("to_date", parseAsString);
  
  const [sortColumn, setSortColumn] = useQueryState(
    "sort_column",
    parseAsString
  );
  const [sortOrder, setSortOrder] = useQueryState<"ASC" | "DESC">(
    "sort_order",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseAsString.withDefault("DESC") as any
  );

  // Sync table sorting state with API sort params
  const [sortState] = useQueryState("sort", parseAsString);

  useEffect(() => {
    if (sortState && typeof sortState === 'string') {
      // Parse sort state: format is "column.direction"
      const parts = sortState.split(".");
      if (parts.length === 2) {
        const [col, dir] = parts;
        setSortColumn(col || null);
        setSortOrder((dir === "asc" ? "ASC" : "DESC") as "ASC" | "DESC");
      }
    } else {
      // No sorting applied
      setSortColumn(null);
      setSortOrder(null);
    }
  }, [sortState, setSortColumn, setSortOrder]);

  // Sync date state with query params
  useEffect(() => {
    if (fromDateStr) {
      const parsed = new Date(fromDateStr);
      if (!isNaN(parsed.getTime())) {
        setFromDate(parsed);
      }
    }
  }, [fromDateStr]);

  useEffect(() => {
    if (toDateStr) {
      const parsed = new Date(toDateStr);
      if (!isNaN(parsed.getTime())) {
        setToDate(parsed);
      }
    }
  }, [toDateStr]);

  // Update query params when dates change
  useEffect(() => {
    if (fromDate) {
      setFromDateStr(format(fromDate, "yyyy-MM-dd"));
    } else {
      setFromDateStr(null);
    }
  }, [fromDate, setFromDateStr]);

  useEffect(() => {
    if (toDate) {
      setToDateStr(format(toDate, "yyyy-MM-dd"));
    } else {
      setToDateStr(null);
    }
  }, [toDate, setToDateStr]);

  const requestIdRef = useRef(0);

  const loadReport = useCallback(async () => {
    if (!token) {
      setRows([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);
      setLoadError(null);

      const response = await adminDailySummaryReportApi.list({
        token,
        page,
        per_page: perPage,
        from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
        sort_column: sortColumn || undefined,
        sort_order: sortOrder || undefined,
      });

      if (requestId !== requestIdRef.current) return;

      const payload = response as unknown as DailySummaryReportListPayload;
      const reportItems = Array.isArray(payload?.data) ? payload.data : [];

      setRows(reportItems);

      const paginationData = payload?.pagination;
      if (paginationData) {
        setTotalPages(paginationData.last_page ?? 1);
        setTotal(paginationData.total ?? 0);
      } else {
        setTotalPages(1);
        setTotal(reportItems.length);
      }
    } catch (error: unknown) {
      if (requestId !== requestIdRef.current) return;
      console.error("Failed to load daily summary report:", error);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "daily summary report",
          action: "load",
        })
      );
      setRows([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    token,
    page,
    perPage,
    fromDate,
    toDate,
    sortColumn,
    sortOrder,
  ]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleDateChange = useCallback(
    (date: Date | undefined, type: "from" | "to") => {
      if (type === "from") {
        setFromDate(date);
      } else {
        setToDate(date);
      }
    },
    []
  );

  const handleResetFilters = useCallback(() => {
    setFromDate(undefined);
    setToDate(undefined);
    setSortColumn(null);
    setSortOrder(null);
    setPage(1);
  }, [
    setSortColumn,
    setSortOrder,
    setPage,
  ]);

  const handleExport = useCallback(async (formatType: "xlsx" | "csv") => {
    if (!canViewReport) {
      toast.error("You do not have permission to export daily summary report");
      return;
    }
    if (!token) {
      toast.error("Authentication required to export data");
      return;
    }
    const exportToastId = `export-${formatType}`;
    try {
      toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });
      
      const { blob, filename } = await adminDailySummaryReportApi.export({
        token,
        format: formatType,
        from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
        sort_column: sortColumn || undefined,
        sort_order: sortOrder || undefined,
      });

      if (blob.size === 0) {
        toast.error("No data to export", { id: exportToastId });
        return;
      }

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);

      toast.success(`Successfully exported to ${filename}`, { id: exportToastId });
    } catch (error: unknown) {
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "daily summary report",
          action: "export",
        }),
        { id: exportToastId }
      );
    }
  }, [canViewReport, token, fromDate, toDate, sortColumn, sortOrder]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (fromDate) count++;
    if (toDate) count++;
    return count;
  }, [fromDate, toDate]);

  const columns: ColumnDef<DailySummaryReportItem>[] = useMemo(
    () => [
      {
        id: "id",
        header: "Sr. No.",
        accessorKey: "sr_no",
        cell: ({ row, table }) => (
          <SerialNumberCell row={row} table={table} className="font-mono text-sm" />
        ),
      },
      {
        id: "date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        accessorKey: "date",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm whitespace-nowrap">
            <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium">{fmtDate(row.original.date)}</span>
          </div>
        ),
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: "total_deposits",
        header: "Total Deposits",
        accessorKey: "total_deposits",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm whitespace-nowrap">
            <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
            <span className="font-medium text-green-600">${formatAmount(row.original.total_deposits)}</span>
          </div>
        ),
      },
      {
        id: "total_withdrawals",
        header: "Total Withdrawals",
        accessorKey: "total_withdrawals",
        cell: ({ row }) => {
          const amount = row.original.total_withdrawals;
          const absAmount = Math.abs(amount);
          return (
            <div className="flex items-center gap-1 text-sm whitespace-nowrap">
              <TrendingDown className="h-4 w-4 text-red-600 flex-shrink-0" />
              <span className="font-medium text-red-600">-${formatAmount(absAmount)}</span>
            </div>
          );
        },
      },
      {
        id: "ib_rewards",
        header: "IB Rewards",
        accessorKey: "ib_rewards",
        cell: ({ row }) => (
          <span className="font-semibold text-primary whitespace-nowrap">${formatAmount(row.original.ib_rewards)}</span>
        ),
      },
      {
        id: "credit_deposits",
        header: "Credit Deposits",
        accessorKey: "credit_deposits",
        cell: ({ row }) => (
          <span className="font-medium text-blue-600 whitespace-nowrap">${formatAmount(row.original.credit_deposits)}</span>
        ),
      },
      {
        id: "credit_withdrawals",
        header: "Credit Withdrawals",
        accessorKey: "credit_withdrawals",
        cell: ({ row }) => {
          const amount = row.original.credit_withdrawals;
          const absAmount = Math.abs(amount);
          return (
            <span className="font-medium text-orange-600 whitespace-nowrap">-${formatAmount(absAmount)}</span>
          );
        },
      },
      {
        id: "new_registrations",
        header: "New Registrations",
        accessorKey: "new_registrations",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm">
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium">{row.original.new_registrations}</span>
          </div>
        ),
      },
    ],
    []
  );

  if (loading && rows.length === 0) {
    return (
      <ListPageSkeleton
        actionCount={2}
        columnCount={8}
        rowCount={10}
        filterPillCount={3}
      />
    );
  }

  if (loadError && rows.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          error={loadError}
          audience="admin"
          variant="panel"
          resource="daily summary report"
          action="load"
          onRetry={() => {
            void loadReport();
          }}
        />
      </div>
    );
  }

  if (!canViewReport) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          You do not have permission to view daily summary report.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <BarChart3 className="h-6 w-6 text-primary" />
            Daily Summary Report
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View daily transaction summaries and registration metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void handleExport("xlsx")}>Export Excel (.xlsx)</DropdownMenuItem>
              {/* <DropdownMenuItem onClick={() => void handleExport("csv")}>Export CSV (.csv)</DropdownMenuItem> */}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            size="sm"
            onClick={loadReport} 
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="rounded-lg border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <CalendarIcon className="h-4 w-4" />
            Filters
          </h2>
          {activeFilterCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              Reset
            </Button>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={(date) => {
              handleDateChange(date, "from");
              setPage(1);
            }}
            onToDateChange={(date) => {
              handleDateChange(date, "to");
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="rounded-lg border bg-card">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Results</h2>
            <span className="text-xs text-muted-foreground">
              Showing {rows.length} of {total} results
            </span>
          </div>

          {/* Data Table */}
          <AppDataTable<DailySummaryReportItem>
            data={rows}
            columns={columns}
            pageCount={totalPages}
          />
        </div>
      </div>
    </div>
  );
}