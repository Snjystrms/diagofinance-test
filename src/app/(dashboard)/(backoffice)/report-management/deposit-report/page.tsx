"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell, getSerialNumberFromRow } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  CalendarIcon,
  RefreshCw,
  Download,
  ChevronDown,
  BarChart3,
  X,
} from "lucide-react";

import {
  adminDepositReportApi,
  type DepositReportItem,
  type DepositReportListPayload,
} from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";
import { useAuth } from "@/contexts/auth-context";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import { ManualSortHeader } from "@/components/data-table/manual-sort-header";
import { ViewContentDialog } from "@/components/ui/view-content-dialog";

/* ---------------- Helpers ---------------- */
const fmtDateTime = (s?: string | null) => {
  if (!s) return "—";
  try {
    return formatDateTimeInIST(s);
  } catch {
    return s;
  }
};

const formatAmount = (amount: string | number) => {
  try {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  } catch {
    return String(amount);
  }
};

const statusBadge = (status: string | number) => {
  const statusStr = String(status);
  switch (statusStr) {
    case "1":
    case "approved":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300">
          Approved
        </Badge>
      );
    case "2":
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
          Rejected
        </Badge>
      );
    case "0":
    case "pending":
    default:
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300">
          Pending
        </Badge>
      );
  }
};

/* ---------------- Page ---------------- */
export default function ReportManagementPage() {
  const authCtx = useAuth?.();
  const { isManager, hasFeature } = useManagerPermissions();
  const canViewReport =
    !isManager || hasFeature("reportManagement", "depositReport");
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined"
      ? localStorage.getItem("auth_token") || ""
      : "");

  const [rows, setRows] = useState<DepositReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPerPage, setCurrentPerPage] = useState(10);

  // Filters
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString,
  );
  const [paymentMethodFilter, setPaymentMethodFilter] = useQueryState(
    "payment_method_id",
    parseAsString,
  );
  const [sourceFilter, setSourceFilter] = useQueryState(
    "source",
    parseAsString,
  );
  const [isIbFilter, setIsIbFilter] = useQueryState("is_ib", parseAsString);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [fromDateStr, setFromDateStr] = useQueryState(
    "from_date",
    parseAsString,
  );
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [toDateStr, setToDateStr] = useQueryState("to_date", parseAsString);
  const [sortBy, setSortBy] = useQueryState("sort_by", parseAsString);
  const [sortOrder, setSortOrder] = useQueryState("sort_order", parseAsString);

  // Search
  const [searchQuery, setSearchQuery] = useQueryState("search", parseAsString);
  const [searchInput, setSearchInput] = useState(searchQuery || "");

  useEffect(() => {
    setSearchInput(searchQuery || "");
  }, [searchQuery]);

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

  // Sync page and perPage from URL query params (single source of truth)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const page = parseInt(params.get("page") || "1", 10);
      const perPage = parseInt(params.get("perPage") || "10", 10);
      setCurrentPage(page);
      setCurrentPerPage(perPage);
    }
  }, [statusFilter, paymentMethodFilter, sourceFilter, isIbFilter, fromDateStr, toDateStr, sortBy, sortOrder, searchQuery]);

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

      const response = await adminDepositReportApi.list({
        token,
        // Only pass filter parameters if they are set
        status:
          statusFilter && statusFilter !== "all"
            ? Number(statusFilter)
            : undefined,
        payment_method_id:
          paymentMethodFilter && paymentMethodFilter !== "all"
            ? paymentMethodFilter
            : paymentMethodFilter === "all"
              ? "all"
              : undefined,
        from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
        page: currentPage,
        per_page: currentPerPage,
        search: searchQuery || undefined,
        sort_column: sortBy || undefined,
        sort_order: sortOrder
          ? (sortOrder.toUpperCase() as "ASC" | "DESC")
          : undefined,
        source:
          sourceFilter && sourceFilter !== "all" ? sourceFilter : undefined,
        is_ib:
          isIbFilter && isIbFilter !== "all" ? Number(isIbFilter) : undefined,
      });

      if (requestId !== requestIdRef.current) return;

      const payload = response as unknown as DepositReportListPayload;
      const reportItems = Array.isArray(payload?.data) ? payload.data : [];

      // Client-side status filtering as fallback (in case backend doesn't filter properly)
      let filteredItems = reportItems;
      if (statusFilter && statusFilter !== "all") {
        const targetStatus = Number(statusFilter);
        filteredItems = reportItems.filter((item) => Number(item.status) === targetStatus);
      }

      setRows(filteredItems);

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
      console.error("Failed to load deposit report:", error);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "deposit report",
          action: "load",
        }),
      );
      setRows([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    token,
    currentPage,
    currentPerPage,
    statusFilter,
    paymentMethodFilter,
    fromDate,
    toDate,
    sortBy,
    sortOrder,
    searchQuery,
    sourceFilter,
    isIbFilter,
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
    [],
  );

  const handleResetFilters = useCallback(() => {
    setStatusFilter(null);
    setPaymentMethodFilter(null);
    setSourceFilter(null);
    setIsIbFilter(null);
    setFromDate(undefined);
    setToDate(undefined);
    setSortBy(null);
    setSortOrder(null);
    setSearchInput("");
    setSearchQuery(null);
    // Reset page to 1 via URL
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("page", "1");
      window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    }
  }, [
    setStatusFilter,
    setPaymentMethodFilter,
    setSourceFilter,
    setIsIbFilter,
    setSortBy,
    setSortOrder,
    setSearchQuery,
  ]);

  const handleExport = useCallback(
    async (formatType: "xlsx" | "csv") => {
      if (!canViewReport) {
        toast.error("You do not have permission to export deposit report");
        return;
      }
      if (!token) {
        toast.error("Authentication required to export data");
        return;
      }
      const exportToastId = `export-${formatType}`;
      try {
        toast.loading(`Preparing ${formatType.toUpperCase()} export...`, {
          id: exportToastId,
        });

        const { blob, filename } = await adminDepositReportApi.export({
          token,
          format: formatType,
          status:
            statusFilter && statusFilter !== "all"
              ? Number(statusFilter)
              : undefined,
          payment_method_id:
            paymentMethodFilter && paymentMethodFilter !== "all"
              ? paymentMethodFilter
              : paymentMethodFilter === "all"
                ? "all"
                : undefined,
          from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
          to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
          search: searchQuery || undefined,
          source:
            sourceFilter && sourceFilter !== "all" ? sourceFilter : undefined,
          is_ib:
            isIbFilter && isIbFilter !== "all" ? Number(isIbFilter) : undefined,
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

        toast.success(`Successfully exported to ${filename}`, {
          id: exportToastId,
        });
      } catch (error: unknown) {
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "deposit report",
            action: "export",
          }),
          { id: exportToastId },
        );
      }
    },
    [
      canViewReport,
      token,
      statusFilter,
      paymentMethodFilter,
      fromDate,
      toDate,
      searchQuery,
      sourceFilter,
      isIbFilter,
    ],
  );

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter) count++;
    if (paymentMethodFilter) count++;
    if (sourceFilter) count++;
    if (isIbFilter) count++;
    if (fromDate) count++;
    if (toDate) count++;
    if (sortBy) count++;
    if (sortOrder) count++;
    if (searchQuery) count++;
    return count;
  }, [
    statusFilter,
    paymentMethodFilter,
    sourceFilter,
    isIbFilter,
    fromDate,
    toDate,
    sortBy,
    sortOrder,
    searchQuery,
  ]);

  const columns: ColumnDef<DepositReportItem>[] = useMemo(
    () => [
      {
        id: "sr_no",
        header: "Sr. No.",
        accessorKey: "id",
        cell: ({ row }) => {
          const serialNumber = (currentPage - 1) * currentPerPage + row.index + 1;
          return <SerialNumberCell serialNumber={serialNumber} className="font-mono text-sm" />;
        },
        enableSorting: false,
      },
      {
        id: "user",
        header: "User",
        accessorKey: "name",
        cell: ({ row }) => {
          const raw = row.original.name_email;
          if (!raw) return <span className="text-muted-foreground">-</span>;
          const [name, email] = raw.split("/");
          return (
            <div className="space-y-0.5">
              <div className="font-medium">{name || "-"}</div>
              <div className="text-xs text-muted-foreground">
                {email || "-"}
              </div>
            </div>
          );
        },
      },
      {
        id: "amount",
        header: () => (
          <ManualSortHeader sortKey="amount" title="Amount (USD)" />
        ),
        accessorKey: "amount",
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap">
            {formatAmount(row.original.amount)}
          </span>
        ),
      },
      {
        id: "comment",
        header: "Comment",
        accessorKey: "comment",
        cell: ({ row }) => (
          <ViewContentDialog
            content={row.original.comment}
            title="Deposit Comment"
            description="Full comment for this deposit"
            emptyLabel="—"
          />
        ),
      },
      {
        id: "payment_method",
        header: "Payment Method",
        accessorKey: "payment_method",
        cell: ({ row }) => {
          const method = row.original.payment_method;
          return method ? (
            <span className="text-sm">{method}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "transaction_hash",
        header: "Transaction Hash",
        accessorKey: "transaction_hash",
        cell: ({ row }) => {
          // const hash = row.original.transaction_hash;
          const reference = row.original.reference;
          if (!reference)
            return <span className="text-muted-foreground">—</span>;
          return (
            <span
              className="font-mono text-xs max-w-[200px] truncate block"
              title={String(reference)}
            >
              {reference}
            </span>
          );
        },
      },
      {
        id: "status",
        header: () => <ManualSortHeader sortKey="status" title="Status" />,
        accessorKey: "status",
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        id: "approved_by",
        header: "Action By",
        accessorKey: "approved_by",
        cell: ({ row }) => row.original.approved_by || "-",
      },
      {
        id: "created_at",
        header: () => <ManualSortHeader sortKey="created_at" title="Created" />,
        accessorKey: "created_at",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm whitespace-nowrap">
            <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>{fmtDateTime(row.original.created_at)}</span>
          </div>
        ),
      },
    ],
    [],
  );

  if (loading && rows.length === 0) {
    return (
      <ListPageSkeleton
        actionCount={2}
        columnCount={6}
        rowCount={10}
        filterPillCount={4}
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
          resource="deposit report"
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
          You do not have permission to view deposit report.
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
            Deposit Report
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage and view deposit transactions
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
              <DropdownMenuItem onClick={() => void handleExport("xlsx")}>
                Export Excel (.xlsx)
              </DropdownMenuItem>
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
      <div className="rounded-lg border bg-card p-5">
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
        <div className="min-w-[240px] flex-1">
          <ApiSearchBar
            value={searchInput}
            onChange={(value) => setSearchInput(value)}
            onSearch={(value) => {
              if (typeof window !== "undefined") {
                const params = new URLSearchParams(window.location.search);
                params.set("page", "1");
                window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
              }
              setSearchQuery(value.trim() || null);
            }}
            placeholder="Search by name, email..."
            minimumLength={3}
            delay={300}
          />
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="status-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Status
          </Label>
          <Select
            value={statusFilter || "all"}
            onValueChange={(value) => {
              setStatusFilter(value === "all" ? null : value);
              if (typeof window !== "undefined") {
                const params = new URLSearchParams(window.location.search);
                params.set("page", "1");
                window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
              }
            }}
          >
            <SelectTrigger id="status-filter" className="h-9 w-full">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="0">Pending</SelectItem>
              <SelectItem value="1">Approved</SelectItem>
              <SelectItem value="2">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="source-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Source
          </Label>
          <Select
            value={sourceFilter || "all"}
            onValueChange={(value) => {
              setSourceFilter(value === "all" ? null : value);
              if (typeof window !== "undefined") {
                const params = new URLSearchParams(window.location.search);
                params.set("page", "1");
                window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
              }
            }}
          >
            <SelectTrigger id="source-filter" className="h-9 w-full">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="bank">Bank</SelectItem>
              <SelectItem value="usdt">USDT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="ib-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Partner (IB)
          </Label>
          <Select
            value={isIbFilter || "all"}
            onValueChange={(value) => {
              setIsIbFilter(value === "all" ? null : value);
              if (typeof window !== "undefined") {
                const params = new URLSearchParams(window.location.search);
                params.set("page", "1");
                window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
              }
            }}
          >
            <SelectTrigger id="ib-filter" className="h-9 w-full">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="1">Only Partner (IB)</SelectItem>
              <SelectItem value="0">Only Clients</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={(date) => {
            handleDateChange(date, "from");
            if (typeof window !== "undefined") {
              const params = new URLSearchParams(window.location.search);
              params.set("page", "1");
              window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
            }
          }}
          onToDateChange={(date) => {
            handleDateChange(date, "to");
            if (typeof window !== "undefined") {
              const params = new URLSearchParams(window.location.search);
              params.set("page", "1");
              window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
            }
          }}
        />
        {activeFilterCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        ) : null}
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
          <AppDataTable<DepositReportItem>
            data={rows}
            columns={columns}
            pageCount={totalPages}
          />
        </div>
      </div>
    </div>
  );
}
