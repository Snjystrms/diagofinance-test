"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  RefreshCw,
  Download,
  ChevronDown,
  History,
  ArrowDownToLine,
  ArrowUpFromLine,
  Repeat,
  Coins,
  Info,
  X,
} from "lucide-react";

import {
  adminHistoryReportApi,
  type HistoryReportSummary,
  type HistoryReportListPayload,
} from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";
import { useAuth } from "@/contexts/auth-context";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import { ManualSortHeader } from "@/components/data-table/manual-sort-header";
import { cn } from "@/lib/utils";

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
    return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} USD`;
  } catch {
    return `${String(amount)} USD`;
  }
};

const summaryCards = [
  { key: "deposit", label: "Deposit", icon: ArrowDownToLine, className: "text-emerald-600" },
  { key: "withdrawal", label: "Withdrawal", icon: ArrowUpFromLine, className: "text-red-600" },
  { key: "swap", label: "Swap", icon: Repeat, className: "text-sky-600" },
  { key: "commission", label: "Commission", icon: Coins, className: "text-amber-600" },
] as const;

type HistoryRow = Record<string, unknown>;

export default function HistoryReportPage() {
  const authCtx = useAuth?.();
  const { isManager, hasFeature } = useManagerPermissions();
  const canViewReport = !isManager || hasFeature("reportManagement", "historyReport");
  const ctxToken = authCtx?.token;
  const token = ctxToken || (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [summary, setSummary] = useState<HistoryReportSummary | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

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
      setSummary(null);
      setNote(null);
      setLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setLoadError(null);
      const response = await adminHistoryReportApi.list({
        token,
        page,
        per_page: perPage,
        search: searchQuery || undefined,
        from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
        sort_column: sortBy || undefined,
        sort_order: sortOrder ? (sortOrder.toUpperCase() as "ASC" | "DESC") : undefined,
      });
      if (requestId !== requestIdRef.current) return;
      const payload = response as unknown as HistoryReportListPayload;
      const reportItems = Array.isArray(payload?.data) ? (payload.data as HistoryRow[]) : [];
      setRows(reportItems);
      setSummary(payload?.summary ?? null);
      setNote(payload?.note ?? null);
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
      console.error("Failed to load history report:", error);
      setLoadError(error);
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "history report", action: "load" }));
      setRows([]);
      setSummary(null);
      setNote(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [token, page, perPage, fromDate, toDate, sortBy, sortOrder, searchQuery]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleDateChange = useCallback((date: Date | undefined, type: "from" | "to") => {
    if (type === "from") setFromDate(date);
    else setToDate(date);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFromDate(undefined);
    setToDate(undefined);
    setSortBy(null);
    setSortOrder(null);
    setSearchInput("");
    setSearchQuery(null);
    setPage(1);
  }, [setSortBy, setSortOrder, setSearchQuery, setPage]);

  const handleExport = useCallback(
    async (formatType: "xlsx" | "csv") => {
      if (!canViewReport) {
        toast.error("You do not have permission to export history report");
        return;
      }
      if (!token) {
        toast.error("Authentication required to export data");
        return;
      }
      const exportToastId = `export-${formatType}`;
      try {
        toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });
        const { blob, filename } = await adminHistoryReportApi.export({
          token,
          format: formatType,
          search: searchQuery || undefined,
          from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
          to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
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
        toast.error(getAdminFriendlyErrorMessage(error, { resource: "history report", action: "export" }), { id: exportToastId });
      }
    },
    [canViewReport, token, searchQuery, fromDate, toDate]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (fromDate) count++;
    if (toDate) count++;
    if (sortBy) count++;
    if (sortOrder) count++;
    if (searchQuery) count++;
    return count;
  }, [fromDate, toDate, sortBy, sortOrder, searchQuery]);

  const dynamicColumns = useMemo<ColumnDef<HistoryRow>[]>(() => {
    if (rows.length === 0) return [];
    const firstRow = rows[0] ?? {};
    const keys = Object.keys(firstRow);
    const columns: ColumnDef<HistoryRow>[] = [
      {
        id: "id",
        header: () => <ManualSortHeader sortKey="id" title="Sr. No." />,
        accessorKey: "id",
        cell: ({ row, table }) => <SerialNumberCell row={row} table={table} className="font-mono text-sm" />,
      },
    ];
    keys.forEach((key) => {
      if (key === "id") return;
      columns.push({
        id: key,
        header: () => <ManualSortHeader sortKey={key} title={formatHeader(key)} />,
        accessorKey: key,
        cell: ({ row }) => {
          const val = row.original?.[key];
          if (val === null || val === undefined || val === "") return <span className="text-muted-foreground">—</span>;
          if (typeof val === "number" && key !== "ticket" && key !== "login") {
            return <span className="font-mono text-sm">{formatAmount(val)}</span>;
          }
          const str = String(val);
          if (key.toLowerCase().includes("price") || key.toLowerCase() === "profit" || key.toLowerCase() === "commission" || key.toLowerCase() === "swap") {
            return <span className="font-mono text-sm">{formatAmount(str)}</span>;
          }
          if (key.toLowerCase().includes("time") || key.toLowerCase().includes("date")) {
            return <span className="font-mono text-sm">{fmtDateTime(str)}</span>;
          }
          return <span className={cn("text-sm", key.toLowerCase() === "profit" || key.toLowerCase() === "commission" ? "font-medium" : "")}>{str}</span>;
        },
      });
    });
    return columns;
  }, [rows]);

  if (loadError && rows.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState error={loadError} audience="admin" variant="panel" resource="history report" action="load" onRetry={() => void loadReport()} />
      </div>
    );
  }

  if (!canViewReport) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">You do not have permission to view history report.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <History className="h-6 w-6 text-primary" />
            History Report
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Trading history with deposit, withdrawal, swap and commission summary</p>
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

      {note ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{note}</span>
        </div>
      ) : null}
      
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
            placeholder="Search history records..."
            minimumLength={2}
            delay={300}
          />
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

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            const value = summary[card.key];
            const isWithdrawal = card.key === "withdrawal";
            const num = typeof value === "string" ? parseFloat(value) : Number(value);
            const sign = isWithdrawal && Number.isFinite(num) && num > 0 ? "-" : "";
            return (
              <Card key={card.key}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                    <Icon className={`h-4 w-4 ${card.className}`} />
                  </div>
                  <div className="mt-2 text-2xl font-semibold">
                    {sign}{typeof value === "number" ? formatAmount(value) : formatAmount(value ?? 0)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {loading && rows.length === 0 ? (
        <TableSectionSkeleton columnCount={6} />
      ) : (
      <div className="rounded-lg border bg-card">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Results</h2>
            {rows.length > 0 ? <span className="text-xs text-muted-foreground">Showing {rows.length} of {total} results</span> : null}
          </div>
          <AppDataTable<HistoryRow> data={rows} columns={dynamicColumns} pageCount={totalPages} getRowId={(row) => String(row.ticket ?? row.login ?? row.date ?? Math.random())} />
        </div>
      </div>
      )}
    </div>
  );
}

function formatHeader(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
