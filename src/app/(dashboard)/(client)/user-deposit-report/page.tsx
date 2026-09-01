"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { ClientTablePageSkeleton } from "@/components/loading/client-page-skeletons";
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
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Card, CardContent } from "@/components/ui/card";
import {
  CalendarIcon,
  RefreshCw,
  ArrowDownToLine,
  Download,
  ChevronDown,
  X,
} from "lucide-react";

import {
  userReportApi,
  type UserDepositReportItem,
  type UserDepositReportPayload,
} from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";
import { useAuth } from "@/contexts/auth-context";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";
import { ManualSortHeader } from "@/components/data-table/manual-sort-header";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { ViewContentDialog } from "@/components/ui/view-content-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const statusBadge = (status: number | string) => {
  const v = String(status).toLowerCase();
  if (v === "1" || v === "approved") {
    return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-800">Approved</Badge>;
  }
  if (v === "2" || v === "rejected") {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800">Pending</Badge>;
};

const sourceBadge = (source: string) => {
  const v = String(source || "").toLowerCase();
  const map: Record<string, string> = {
    online: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
    bank: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
    usdt: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    manual: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  };
  const className = map[v];
  return className ? <Badge className={className}>{source}</Badge> : <Badge variant="outline">{source || "—"}</Badge>;
};

export default function UserDepositReportPage() {
  const authCtx = useAuth?.();
  const ctxToken = authCtx?.token;
  const token = ctxToken || (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [rows, setRows] = useState<UserDepositReportItem[]>([]);
  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [sourceFilter, setSourceFilter] = useQueryState("source", parseAsString);
  const [statusFilter, setStatusFilter] = useQueryState("status", parseAsString);
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
      const response = await userReportApi.deposit.list({
        token,
        page,
        per_page: perPage,
        source: sourceFilter || undefined,
        status: statusFilter || undefined,
        from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
        search: searchQuery || undefined,
        sort_column: sortBy || undefined,
        sort_order: sortOrder ? (sortOrder.toUpperCase() as "ASC" | "DESC") : undefined,
      });
      if (requestId !== requestIdRef.current) return;
      const payload = response as unknown as UserDepositReportPayload;
      const reportItems = Array.isArray(payload?.data) ? payload.data : [];
      setRows(reportItems);
      if (typeof payload?.total_amount === "number") setTotalAmount(payload.total_amount);
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
      console.error("Failed to load user deposit report:", error);
      setLoadError(error);
      toast.error(getFriendlyErrorMessage(error, { resource: "deposit report", action: "load" }));
      setRows([]);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [token, page, perPage, sourceFilter, statusFilter, fromDate, toDate, sortBy, sortOrder, searchQuery]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleResetFilters = useCallback(() => {
    setSourceFilter(null);
    setStatusFilter(null);
    setFromDate(undefined);
    setToDate(undefined);
    setSortBy(null);
    setSortOrder(null);
    setSearchInput("");
    setSearchQuery(null);
    setPage(1);
  }, [setSourceFilter, setStatusFilter, setSortBy, setSortOrder, setSearchQuery, setPage]);

  const handleExport = useCallback(
    async (formatType: "xlsx" | "csv") => {
      if (!token) {
        toast.error("Authentication required to export data");
        return;
      }
      const exportToastId = `export-${formatType}`;
      try {
        toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });
        const { blob, filename } = await userReportApi.deposit.export({
          token,
          format: formatType,
          source: sourceFilter && sourceFilter !== "all" ? sourceFilter : undefined,
          status: statusFilter || undefined,
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
        toast.error(getFriendlyErrorMessage(error, { resource: "deposit report", action: "export" }), { id: exportToastId });
      }
    },
    [token, sourceFilter, statusFilter, fromDate, toDate, searchQuery],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (sourceFilter) count++;
    if (statusFilter) count++;
    if (fromDate) count++;
    if (toDate) count++;
    if (sortBy) count++;
    if (sortOrder) count++;
    if (searchQuery) count++;
    return count;
  }, [sourceFilter, statusFilter, fromDate, toDate, sortBy, sortOrder, searchQuery]);

  const columns: ColumnDef<UserDepositReportItem>[] = useMemo(
    () => [
      {
        id: "id",
        header: () => <ManualSortHeader sortKey="id" title="Sr. No." />,
        accessorKey: "id",
        cell: ({ row, table }) => <SerialNumberCell row={row} table={table} className="font-mono text-sm" />,
      },
      {
        id: "source",
        header: () => <ManualSortHeader sortKey="source" title="Source" />,
        accessorKey: "source",
        cell: ({ row }) => sourceBadge(row.original.source),
      },
      {
        id: "payment_method",
        header: "Method",
        accessorKey: "payment_method",
        cell: ({ row }) => row.original.payment_method || "—",
      },
      {
        id: "amount",
        header: () => <ManualSortHeader sortKey="amount" title="Amount" />,
        accessorKey: "amount",
        cell: ({ row }) => <span className="font-medium whitespace-nowrap text-emerald-600">{formatAmount(row.original.amount)}</span>,
      },
      {
        id: "reference",
        header: "Reference",
        accessorKey: "reference",
        cell: ({ row }) => {
          const v = row.original.reference;
          if (!v) return <span className="text-muted-foreground">—</span>;
          return <span className="font-mono text-xs max-w-[220px] truncate block" title={String(v)}>{String(v)}</span>;
        },
      },
      {
        id: "comment",
        header: "Comment",
        accessorKey: "comment",
        cell: ({ row }) => <ViewContentDialog content={row.original.comment} title="Comment" description="Full comment" emptyLabel="—" />,
      },
      {
        id: "mr5_login",
        header: "MT5 Login",
        accessorKey: "mt5_login",
        cell: ({ row }) => row.original.mt5_login ?? row.original.mt5_account_id ?? "—",
      },
      {
        id: "status",
        header: () => <ManualSortHeader sortKey="status" title="Status" />,
        accessorKey: "status",
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        id: "created_at",
        header: () => <ManualSortHeader sortKey="created_at" title="Date" />,
        accessorKey: "created_at",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm whitespace-nowrap">
            <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>{fmtDateTime(row.original.created_at)}</span>
          </div>
        ),
      },
    ],
    []
  );

  if (loading && rows.length === 0) {
    return <ClientTablePageSkeleton columnCount={6} rowCount={8} />;
  }

  if (loadError && rows.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState error={loadError} audience="client" variant="panel" resource="deposit report" action="load" onRetry={() => void loadReport()} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <ArrowDownToLine className="h-6 w-6 text-primary" />
            Deposit Report
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your deposit history across all funding sources</p>
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
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => void loadReport()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {totalAmount !== null ? (
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
            <div>
              <div className="text-xs font-medium text-muted-foreground">Total Deposited</div>
              <div className="text-2xl font-semibold text-emerald-600">{formatAmount(totalAmount)}</div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
        <div className="min-w-[240px] flex-1">
          <ApiSearchBar
            value={searchInput}
            onChange={(value) => setSearchInput(value)}
            onSearch={(value) => {
              setPage(1);
              setSearchQuery(value.trim() || null);
            }}
            placeholder="Search by amount or reference..."
            minimumLength={2}
            delay={300}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Source</Label>
          <Select value={sourceFilter || "all"} onValueChange={(value) => { setSourceFilter(value === "all" ? null : value); setPage(1); }}>
            <SelectTrigger className="h-9 w-full min-w-[150px]">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="bank">Bank</SelectItem>
              <SelectItem value="usdt">USDT</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Status</Label>
          <Select value={statusFilter || "all"} onValueChange={(value) => { setStatusFilter(value === "all" ? null : value); setPage(1); }}>
            <SelectTrigger className="h-9 w-full min-w-[150px]">
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
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={(date) => { setFromDate(date); setPage(1); }}
          onToDateChange={(date) => { setToDate(date); setPage(1); }}
        />
        {activeFilterCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Results</h2>
            <span className="text-xs text-muted-foreground">Showing {rows.length} of {total} results</span>
          </div>
          <AppDataTable<UserDepositReportItem> data={rows} columns={columns} pageCount={totalPages} />
        </div>
      </div>
    </div>
  );
}
