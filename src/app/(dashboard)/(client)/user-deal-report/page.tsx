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
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  RefreshCw,
  LineChart,
  Search,
  Download,
  ChevronDown,
  X,
} from "lucide-react";

import {
  userReportApi,
  type UserDealReportItem,
  type UserDealReportPayload,
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

const formatProfit = (amount: string | number) => {
  const num = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (!Number.isFinite(num)) return formatAmount(amount);
  const sign = num > 0 ? "+" : "";
  return (
    <span className={`font-medium whitespace-nowrap ${num > 0 ? "text-emerald-600" : num < 0 ? "text-red-600" : ""}`}>
      {sign}
      {num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
    </span>
  );
};

const recordTypeBadge = (rt: string) => {
  const v = String(rt || "").toLowerCase();
  if (v.includes("deal")) return <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 border-sky-300 dark:border-sky-800">Deal</Badge>;
  if (v.includes("order")) return <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-violet-300 dark:border-violet-800">Order</Badge>;
  return <Badge variant="outline">{rt || "—"}</Badge>;
};

export default function UserDealReportPage() {
  const authCtx = useAuth?.();
  const ctxToken = authCtx?.token;
  const token = ctxToken || (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [loginFilter, setLoginFilter] = useQueryState("login", parseAsString);
  const [loginInput, setLoginInput] = useState(loginFilter || "");

  const [rows, setRows] = useState<UserDealReportItem[]>([]);
  const [loading, setLoading] = useState(false);
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
      setLoading(false);
      return;
    }
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setLoadError(null);
      const response = await userReportApi.deal.list({
        token,
        page,
        per_page: perPage,
        login: loginFilter || undefined,
        from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
        search: searchQuery || undefined,
        sort_column: sortBy || undefined,
        sort_order: sortOrder ? (sortOrder.toUpperCase() as "ASC" | "DESC") : undefined,
      });
      if (requestId !== requestIdRef.current) return;
      const payload = response as unknown as UserDealReportPayload;
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
      console.error("Failed to load user deal report:", error);
      setLoadError(error);
      toast.error(getFriendlyErrorMessage(error, { resource: "deal report", action: "load" }));
      setRows([]);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [token, page, perPage, loginFilter, fromDate, toDate, sortBy, sortOrder, searchQuery]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleLoad = useCallback(() => {
    const value = loginInput.trim();
    if (!value) {
      toast.error("Please enter an MT5 login ID");
      return;
    }
    setLoginFilter(value);
    setPage(1);
  }, [loginInput, setLoginFilter, setPage]);

  const handleResetFilters = useCallback(() => {
    setLoginFilter(null);
    setLoginInput("");
    setFromDate(undefined);
    setToDate(undefined);
    setSortBy(null);
    setSortOrder(null);
    setSearchInput("");
    setSearchQuery(null);
    setPage(1);
  }, [setLoginFilter, setSortBy, setSortOrder, setSearchQuery, setPage]);

  const handleExport = useCallback(
    async (formatType: "xlsx" | "csv") => {
      if (!token) {
        toast.error("Authentication required to export data");
        return;
      }
      if (!loginFilter) {
        toast.error("Please enter an MT5 login ID to export deals");
        return;
      }
      const exportToastId = `export-${formatType}`;
      try {
        toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });
        const { blob, filename } = await userReportApi.deal.export({
          token,
          format: formatType,
          login: loginFilter,
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
        toast.error(getFriendlyErrorMessage(error, { resource: "deal report", action: "export" }), { id: exportToastId });
      }
    },
    [token, loginFilter, fromDate, toDate, searchQuery],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (loginFilter) count++;
    if (fromDate) count++;
    if (toDate) count++;
    if (sortBy) count++;
    if (sortOrder) count++;
    if (searchQuery) count++;
    return count;
  }, [loginFilter, fromDate, toDate, sortBy, sortOrder, searchQuery]);

  const columns: ColumnDef<UserDealReportItem>[] = useMemo(
    () => [
      {
        id: "id",
        header: () => <ManualSortHeader sortKey="id" title="Sr. No." />,
        accessorKey: "id",
        cell: ({ row, table }) => <SerialNumberCell row={row} table={table} className="font-mono text-sm" />,
      },
      {
        id: "record_type",
        header: "Type",
        accessorKey: "record_type",
        cell: ({ row }) => recordTypeBadge(row.original.record_type),
      },
      {
        id: "ticket",
        header: "Ticket",
        accessorKey: "ticket",
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.ticket ?? "—"}</span>,
      },
      {
        id: "login",
        header: "Login",
        accessorKey: "login",
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.login ?? "—"}</span>,
      },
      {
        id: "symbol",
        header: "Symbol",
        accessorKey: "symbol",
        cell: ({ row }) => <span className="font-medium">{row.original.symbol || "—"}</span>,
      },
      {
        id: "volume",
        header: "Volume",
        accessorKey: "volume",
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.volume ?? "—"}</span>,
      },
      {
        id: "price",
        header: "Price",
        accessorKey: "price",
        cell: ({ row }) => <span className="font-mono text-sm">{formatAmount(row.original.price)}</span>,
      },
      {
        id: "profit",
        header: () => <ManualSortHeader sortKey="profit" title="Profit" />,
        accessorKey: "profit",
        cell: ({ row }) => formatProfit(row.original.profit),
      },
      {
        id: "comment",
        header: "Comment",
        accessorKey: "comment",
        cell: ({ row }) => <ViewContentDialog content={row.original.comment} title="Comment" description="Full comment" emptyLabel="—" />,
      },
      {
        id: "trade_time_ist",
        header: () => <ManualSortHeader sortKey="trade_time_ist" title="Time" />,
        accessorKey: "trade_time_ist",
        cell: ({ row }) => (
          <div className="text-sm whitespace-nowrap">
            {fmtDateTime(row.original.trade_time_ist || row.original.created_at)}
          </div>
        ),
      },
    ],
    []
  );

  if (loading && rows.length === 0) {
    return <ClientTablePageSkeleton columnCount={7} rowCount={8} />;
  }

  if (loadError && rows.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState error={loadError} audience="client" variant="panel" resource="deal report" action="load" onRetry={() => void loadReport()} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <LineChart className="h-6 w-6 text-primary" />
            Deal Report
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your trading deals and transactions</p>
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

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs font-medium text-muted-foreground">MT5 Login ID</Label>
            <div className="flex gap-2">
              <Input
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLoad();
                }}
                placeholder="Filter by MT5 login (e.g. 800123)"
                className="h-9 max-w-sm font-mono"
              />
              <Button className="h-9 gap-1.5" onClick={handleLoad} disabled={loading}>
                <Search className="h-4 w-4" />
                Load
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
        <div className="min-w-[240px] flex-1">
          <ApiSearchBar
            value={searchInput}
            onChange={(value) => setSearchInput(value)}
            onSearch={(value) => {
              setPage(1);
              setSearchQuery(value.trim() || null);
            }}
            placeholder="Search by symbol or ticket..."
            minimumLength={2}
            delay={300}
          />
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
            {rows.length > 0 ? <span className="text-xs text-muted-foreground">Showing {rows.length} of {total} results</span> : <span className="text-xs text-muted-foreground">No deals loaded</span>}
          </div>
          <AppDataTable<UserDealReportItem> data={rows} columns={columns} pageCount={totalPages} />
        </div>
      </div>
    </div>
  );
}
