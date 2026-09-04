"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  CalendarIcon,
  RefreshCw,
  Download,
  ChevronDown,
  CandlestickChart,
  Wallet,
  LineChart,
  Percent,
  Search,
  X,
} from "lucide-react";

import {
  adminPositionReportApi,
  type PositionReportItem,
  type PositionReportSummary,
  type PositionReportListPayload,
} from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";
import { useAuth } from "@/contexts/auth-context";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import { ManualSortHeader } from "@/components/data-table/manual-sort-header";

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

const typeBadge = (type: string) => {
  const v = String(type || "").toLowerCase();
  if (v.includes("buy") || v === "0") return <span className="inline-flex rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Buy</span>;
  if (v.includes("sell") || v === "1") return <span className="inline-flex rounded-md bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/40 dark:text-red-300">Sell</span>;
  return <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{type || "—"}</span>;
};

const summaryCards = [
  { key: "balance", label: "Balance", icon: Wallet, className: "text-sky-600" },
  { key: "equity", label: "Equity", icon: LineChart, className: "text-violet-600" },
  { key: "profit", label: "Profit", icon: CandlestickChart, className: "text-emerald-600" },
  { key: "free_margin", label: "Free Margin", icon: Percent, className: "text-amber-600" },
] as const;

export default function PositionReportPage() {
  const authCtx = useAuth?.();
  const { isManager, hasFeature } = useManagerPermissions();
  const canViewReport = !isManager || hasFeature("reportManagement", "positionReport");
  const ctxToken = authCtx?.token;
  const token = ctxToken || (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [mt5Id, setMt5Id] = useQueryState("mt5_id", parseAsString);
  const [mt5IdInput, setMt5IdInput] = useState(mt5Id || "");

  const [rows, setRows] = useState<PositionReportItem[]>([]);
  const [summary, setSummary] = useState<PositionReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [sortBy, setSortBy] = useQueryState("sort_by", parseAsString);
  const [sortOrder, setSortOrder] = useQueryState("sort_order", parseAsString);

  const [searchQuery, setSearchQuery] = useQueryState("search", parseAsString);
  const [searchInput, setSearchInput] = useState(searchQuery || "");

  useEffect(() => {
    setSearchInput(searchQuery || "");
  }, [searchQuery]);

  const requestIdRef = useRef(0);

  const loadReport = useCallback(async () => {
    if (!token || !mt5Id || !String(mt5Id).trim()) {
      setRows([]);
      setSummary(null);
      setLoading(false);
      setTotalPages(1);
      setTotal(0);
      return;
    }
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setLoadError(null);
      const response = await adminPositionReportApi.list({
        token,
        mt5_id: String(mt5Id).trim(),
        page,
        per_page: perPage,
        search: searchQuery || undefined,
        sort_column: sortBy || undefined,
        sort_order: sortOrder ? (sortOrder.toUpperCase() as "ASC" | "DESC") : undefined,
      });
      if (requestId !== requestIdRef.current) return;
      const payload = response as unknown as PositionReportListPayload;
      const reportItems = Array.isArray(payload?.data) ? payload.data : [];
      setRows(reportItems);
      setSummary(payload?.summary ?? null);
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
      console.error("Failed to load position report:", error);
      setLoadError(error);
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "position report", action: "load" }));
      setRows([]);
      setSummary(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [token, mt5Id, page, perPage, sortBy, sortOrder, searchQuery]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleSearch = useCallback(
    (value: string) => {
      setPage(1);
      setSearchQuery(value.trim() || null);
    },
    [setPage, setSearchQuery]
  );

  const handleLoad = useCallback(() => {
    const value = mt5IdInput.trim();
    if (!value) {
      toast.error("Please enter an MT5 ID to load the position report");
      return;
    }
    setMt5Id(value);
    setPage(1);
  }, [mt5IdInput, setMt5Id, setPage]);

  const handleResetFilters = useCallback(() => {
    setSortBy(null);
    setSortOrder(null);
    setSearchInput("");
    setSearchQuery(null);
    setPage(1);
  }, [setSortBy, setSortOrder, setSearchQuery, setPage]);

  const handleExport = useCallback(
    async (formatType: "xlsx" | "csv") => {
      if (!canViewReport) {
        toast.error("You do not have permission to export position report");
        return;
      }
      if (!token) {
        toast.error("Authentication required to export data");
        return;
      }
      if (!mt5Id || !String(mt5Id).trim()) {
        toast.error("Please enter an MT5 ID before exporting");
        return;
      }
      const exportToastId = `export-${formatType}`;
      try {
        toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });
        const { blob, filename } = await adminPositionReportApi.export({
          token,
          format: formatType,
          mt5_id: String(mt5Id).trim(),
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
        toast.error(getAdminFriendlyErrorMessage(error, { resource: "position report", action: "export" }), { id: exportToastId });
      }
    },
    [canViewReport, token, mt5Id, searchQuery]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (sortBy) count++;
    if (sortOrder) count++;
    if (searchQuery) count++;
    return count;
  }, [sortBy, sortOrder, searchQuery]);

  const columns: ColumnDef<PositionReportItem>[] = useMemo(
    () => [
      {
        id: "id",
        header: () => <ManualSortHeader sortKey="id" title="Sr. No." />,
        accessorKey: "id",
        cell: ({ row, table }) => <SerialNumberCell row={row} table={table} className="font-mono text-sm" />,
      },
      {
        id: "symbol",
        header: "Symbol",
        accessorKey: "symbol",
        cell: ({ row }) => <span className="font-medium">{row.original.symbol || "—"}</span>,
      },
      {
        id: "ticket",
        header: "Ticket",
        accessorKey: "ticket",
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.ticket ?? "—"}</span>,
      },
      {
        id: "date",
        header: () => <ManualSortHeader sortKey="date" title="Date" />,
        accessorKey: "date",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm whitespace-nowrap">
            <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>{fmtDateTime(row.original.date)}</span>
          </div>
        ),
      },
      {
        id: "type",
        header: "Type",
        accessorKey: "type",
        cell: ({ row }) => typeBadge(String(row.original.type ?? "")),
      },
      {
        id: "volume",
        header: "Volume",
        accessorKey: "volume",
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.volume ?? "—"}</span>,
      },
      {
        id: "open_price",
        header: "Open Price",
        accessorKey: "open_price",
        cell: ({ row }) => <span className="font-mono text-sm">{formatAmount(row.original.open_price)}</span>,
      },
      {
        id: "current_price",
        header: "Current Price",
        accessorKey: "current_price",
        cell: ({ row }) => <span className="font-mono text-sm">{formatAmount(row.original.current_price)}</span>,
      },
      {
        id: "sl",
        header: "SL",
        accessorKey: "sl",
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.sl !== null && row.original.sl !== undefined && row.original.sl !== "" ? formatAmount(row.original.sl) : "—"}</span>,
      },
      {
        id: "tp",
        header: "TP",
        accessorKey: "tp",
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.tp !== null && row.original.tp !== undefined && row.original.tp !== "" ? formatAmount(row.original.tp) : "—"}</span>,
      },
      {
        id: "profit",
        header: () => <ManualSortHeader sortKey="profit" title="Profit" />,
        accessorKey: "profit",
        cell: ({ row }) => formatProfit(row.original.profit),
      },
    ],
    []
  );

  if (loadError && rows.length === 0 && mt5Id) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState error={loadError} audience="admin" variant="panel" resource="position report" action="load" onRetry={() => void loadReport()} />
      </div>
    );
  }

  if (!canViewReport) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">You do not have permission to view position report.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <CandlestickChart className="h-6 w-6 text-primary" />
            Position Report
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">View live open positions for a specific MT5 account</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" disabled={!mt5Id}>
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void handleExport("xlsx")}>Export Excel (.xlsx)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => void loadReport()} disabled={loading || !mt5Id}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs font-medium text-muted-foreground">MT5 Account ID <span className="text-destructive">*</span></Label>
            <div className="flex gap-2">
              <Input
                value={mt5IdInput}
                onChange={(e) => setMt5IdInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleLoad();
                }}
                placeholder="Enter MT5 account ID (e.g. 50123456)"
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

      {summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            const value = summary[card.key];
            const isProfit = card.key === "profit";
            const num = typeof value === "string" ? parseFloat(value) : Number(value);
            const sign = isProfit && Number.isFinite(num) && num > 0 ? "+" : "";
            const profitColor = isProfit && Number.isFinite(num) ? (num > 0 ? "text-emerald-600" : num < 0 ? "text-red-600" : "") : "";
            return (
              <Card key={card.key}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                    <Icon className={`h-4 w-4 ${card.className}`} />
                  </div>
                  <div className={`mt-2 text-2xl font-semibold ${profitColor}`}>
                    {sign}{formatAmount(value)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {mt5Id ? (
        <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
          <div className="min-w-[240px] flex-1">
            <ApiSearchBar
              value={searchInput}
              onChange={(value) => setSearchInput(value)}
              onSearch={handleSearch}
              placeholder="Search by symbol or ticket..."
              minimumLength={2}
              delay={300}
            />
          </div>
          {activeFilterCount > 0 ? (
            <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          ) : null}
        </div>
        </div>
      ) : null}

      {loading && rows.length === 0 && mt5Id ? (
        <TableSectionSkeleton columnCount={8} />
      ) : (
      <div className="rounded-lg border bg-card">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">Open Positions</h2>
            {mt5Id ? <span className="text-xs text-muted-foreground">Showing {rows.length} of {total} results</span> : <span className="text-xs text-muted-foreground">Enter an MT5 ID above to load positions</span>}
          </div>
          <AppDataTable<PositionReportItem> data={rows} columns={columns} pageCount={totalPages} />
        </div>
      </div>
      )}
    </div>
  );
}
