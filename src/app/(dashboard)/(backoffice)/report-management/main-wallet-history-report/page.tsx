"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
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
import { CalendarIcon, RefreshCw, Download, ChevronDown, History, X } from "lucide-react";

import {
  adminMainWalletHistoryReportApi,
  type MainWalletHistoryReportItem,
  type MainWalletHistoryReportListPayload,
} from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";
import { useAuth } from "@/contexts/auth-context";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import { ManualSortHeader } from "@/components/data-table/manual-sort-header";
import { ViewContentDialog } from "@/components/ui/view-content-dialog";

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
    return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 });
  } catch {
    return String(amount);
  }
};

const methodBadge = (method: string) => {
  const v = String(method || "").toLowerCase();
  if (v.includes("deposit")) return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{method}</Badge>;
  if (v.includes("withdraw")) return <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">{method}</Badge>;
  if (v.includes("transfer")) return <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">{method}</Badge>;
  return <Badge variant="outline">{method || "—"}</Badge>;
};

export default function MainWalletHistoryReportPage() {
  const authCtx = useAuth?.();
  const { isManager, hasFeature } = useManagerPermissions();
  const canViewReport = !isManager || hasFeature("reportManagement", "mainWalletHistoryReport");
  const ctxToken = authCtx?.token;
  const token = ctxToken || (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [rows, setRows] = useState<MainWalletHistoryReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [methodFilter, setMethodFilter] = useQueryState("method", parseAsString);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [fromDateStr, setFromDateStr] = useQueryState("from_date", parseAsString);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [toDateStr, setToDateStr] = useQueryState("to_date", parseAsString);
  const [sortBy, setSortBy] = useQueryState("sort_by", parseAsString);
  const [sortOrder, setSortOrder] = useQueryState("sort_order", parseAsString);

  const [searchQuery, setSearchQuery] = useQueryState("search", parseAsString);
  const [searchInput, setSearchInput] = useState(searchQuery || "");

  useEffect(() => {
    setSearchInput(searchQuery || "");
  }, [searchQuery]);

  useEffect(() => {
    if (fromDateStr) {
      const parsed = new Date(fromDateStr);
      if (!isNaN(parsed.getTime())) setFromDate(parsed);
    } else if (!fromDateStr) setFromDate(undefined);
  }, [fromDateStr]);

  useEffect(() => {
    if (toDateStr) {
      const parsed = new Date(toDateStr);
      if (!isNaN(parsed.getTime())) setToDate(parsed);
    } else if (!toDateStr) setToDate(undefined);
  }, [toDateStr]);

  useEffect(() => {
    if (fromDate) setFromDateStr(format(fromDate, "yyyy-MM-dd"));
    else setFromDateStr(null);
  }, [fromDate, setFromDateStr]);

  useEffect(() => {
    if (toDate) setToDateStr(format(toDate, "yyyy-MM-dd"));
    else setToDateStr(null);
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
      const response = await adminMainWalletHistoryReportApi.list({
        token,
        page,
        per_page: perPage,
        method: methodFilter && methodFilter !== "all" ? methodFilter : undefined,
        from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
        search: searchQuery || undefined,
        sort_column: sortBy || undefined,
        sort_order: sortOrder ? (sortOrder.toUpperCase() as "ASC" | "DESC") : undefined,
      });
      if (requestId !== requestIdRef.current) return;
      const payload = response as unknown as MainWalletHistoryReportListPayload;
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
      console.error("Failed to load main wallet history report:", error);
      setLoadError(error);
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "main wallet history report", action: "load" }));
      setRows([]);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [token, page, perPage, methodFilter, fromDate, toDate, sortBy, sortOrder, searchQuery]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleDateChange = useCallback((date: Date | undefined, type: "from" | "to") => {
    if (type === "from") setFromDate(date);
    else setToDate(date);
  }, []);

  const handleResetFilters = useCallback(() => {
    setMethodFilter(null);
    setFromDate(undefined);
    setToDate(undefined);
    setSortBy(null);
    setSortOrder(null);
    setSearchInput("");
    setSearchQuery(null);
    setPage(1);
  }, [setMethodFilter, setSortBy, setSortOrder, setSearchQuery, setPage]);

  const handleExport = useCallback(
    async (formatType: "xlsx" | "csv") => {
      if (!canViewReport) {
        toast.error("You do not have permission to export main wallet history report");
        return;
      }
      if (!token) {
        toast.error("Authentication required to export data");
        return;
      }
      const exportToastId = `export-${formatType}`;
      try {
        toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });
        const { blob, filename } = await adminMainWalletHistoryReportApi.export({
          token,
          format: formatType,
          method: methodFilter && methodFilter !== "all" ? methodFilter : undefined,
          from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
          to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
          search: searchQuery || undefined,
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
        toast.error(getAdminFriendlyErrorMessage(error, { resource: "main wallet history report", action: "export" }), { id: exportToastId });
      }
    },
    [canViewReport, token, methodFilter, fromDate, toDate, searchQuery]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (methodFilter) count++;
    if (fromDate) count++;
    if (toDate) count++;
    if (sortBy) count++;
    if (sortOrder) count++;
    if (searchQuery) count++;
    return count;
  }, [methodFilter, fromDate, toDate, sortBy, sortOrder, searchQuery]);

  const columns: ColumnDef<MainWalletHistoryReportItem>[] = useMemo(
    () => [
      {
        id: "id",
        header: () => <ManualSortHeader sortKey="id" title="Sr. No." />,
        accessorKey: "id",
        cell: ({ row, table }) => <SerialNumberCell row={row} table={table} className="font-mono text-sm" />,
      },
      {
        id: "user",
        header: "User",
        accessorKey: "name_email",
        cell: ({ row }) => {
          const raw = row.original.name_email || `${row.original.name || ""}/${row.original.email || ""}`;
          if (!raw || raw === "/") return <span className="text-muted-foreground">-</span>;
          const [name, email] = raw.split("/");
          return (
            <div className="space-y-0.5">
              <div className="font-medium">{name?.trim() || row.original.name || "-"}</div>
              <div className="text-xs text-muted-foreground">{email?.trim() || row.original.email || "-"}</div>
            </div>
          );
        },
      },
      {
        id: "method",
        header: "Method",
        accessorKey: "method",
        cell: ({ row }) => methodBadge(String(row.original.method || "")),
      },
      {
        id: "amount",
        header: () => <ManualSortHeader sortKey="amount" title="Amount (USD)" />,
        accessorKey: "amount",
        cell: ({ row }) => {
          const v = row.original.amount;
          const num = typeof v === "string" ? parseFloat(v) : Number(v);
          const isNegative = Number.isFinite(num) && num < 0;
          return <span className={`font-medium whitespace-nowrap ${isNegative ? "text-red-600" : "text-emerald-600"}`}>{formatAmount(v)}</span>;
        },
      },
      {
        id: "comment",
        header: "Comment",
        accessorKey: "comment",
        cell: ({ row }) => <ViewContentDialog content={row.original.comment} title="Comment" description="Full comment" emptyLabel="—" />,
      },
      {
        id: "approved_by",
        header: "Approved By",
        accessorKey: "approved_by",
        cell: ({ row }) => row.original.approved_by || "-",
      },
      {
        id: "date",
        header: () => <ManualSortHeader sortKey="created_at" title="Date" />,
        accessorKey: "created_at",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm whitespace-nowrap">
            <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>{fmtDateTime(row.original.created_at || row.original.date)}</span>
          </div>
        ),
      },
      {
        id: "marketing",
        header: "Marketing",
        accessorKey: "marketing_name",
        cell: ({ row }) => row.original.marketing_name || "-",
      },
    ],
    []
  );

  if (loadError && rows.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState error={loadError} audience="admin" variant="panel" resource="main wallet history report" action="load" onRetry={() => void loadReport()} />
      </div>
    );
  }

  if (!canViewReport) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">You do not have permission to view main wallet history report.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <History className="h-6 w-6 text-primary" />
            Main Wallet History Report
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">View main wallet deposit, withdrawal and transfer history</p>
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
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => void loadReport()} disabled={loading}>
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
              setPage(1);
              setSearchQuery(value.trim() || null);
            }}
            placeholder="Search by amount or description..."
            minimumLength={2}
            delay={300}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Method</Label>
          <Select value={methodFilter || "all"} onValueChange={(value) => { setMethodFilter(value === "all" ? null : value); setPage(1); }}>
            <SelectTrigger className="h-9 w-full min-w-[200px]">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="1">Deposit (1)</SelectItem>
              <SelectItem value="2">Withdrawal (2)</SelectItem>
              <SelectItem value="4">Deposit+Withdrawal+Transfers (4)</SelectItem>
              <SelectItem value="5">Transfers only (5)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={(date) => { handleDateChange(date, "from"); setPage(1); }}
          onToDateChange={(date) => { handleDateChange(date, "to"); setPage(1); }}
        />
        {activeFilterCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        ) : null}
      </div>
      </div>

      {loading && rows.length === 0 ? (
        <TableSectionSkeleton columnCount={7} />
      ) : (
      <div className="rounded-lg border bg-card">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Results</h2>
            <span className="text-xs text-muted-foreground">Showing {rows.length} of {total} results</span>
          </div>
          <AppDataTable<MainWalletHistoryReportItem> data={rows} columns={columns} pageCount={totalPages} />
        </div>
      </div>
      )}
    </div>
  );
}
