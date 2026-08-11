"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { History, ReceiptText, X } from "lucide-react";
import toast from "react-hot-toast";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { ReportPageWrapper } from "@/components/report-page-wrapper";
import type { ReportExportFormat } from "@/components/report-page-wrapper";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import {
  adminTradingHistoryReportApi,
  type TradingHistoryReportItem,
  type TradingHistoryReportListPayload,
} from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { fmtDateTime } from "@/lib/formatters";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";

const formatNumericValue = (value?: number | string | null, maxFractionDigits = 2) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numericValue = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return numericValue.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
};

const getRecordTypeBadge = (recordType?: string | null) => {
  const normalizedValue = String(recordType ?? "").trim().toLowerCase();
  if (normalizedValue === "deal") {
    return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">Deal</Badge>;
  }

  if (normalizedValue === "order") {
    return <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300">Order</Badge>;
  }

  return <Badge variant="outline">{normalizedValue || "Unknown"}</Badge>;
};

export default function TradingHistoryReportPage() {
  const authCtx = useAuth?.();
  const { isManager, hasFeature } = useManagerPermissions();
  const canViewReport = !isManager || hasFeature("reportManagement", "historyReport");
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [rows, setRows] = useState<TradingHistoryReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Search
  const [searchQuery, setSearchQuery] = useQueryState("search", parseAsString);
  const [searchInput, setSearchInput] = useState(searchQuery || "");

  // Date filters
  const [fromDateParam, setFromDateParam] = useQueryState(
    "from_date",
    parseAsString,
  );
  const [toDateParam, setToDateParam] = useQueryState("to_date", parseAsString);
  const [fromDate, setFromDate] = useState<Date | undefined>(
    fromDateParam ? new Date(fromDateParam) : undefined,
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    toDateParam ? new Date(toDateParam) : undefined,
  );

  useEffect(() => {
    setSearchInput(searchQuery || "");
  }, [searchQuery]);

  const handleDateChange = useCallback(
    (date: Date | undefined, type: "from" | "to") => {
      if (type === "from") {
        setFromDate(date);
        setFromDateParam(date ? format(date, "yyyy-MM-dd") : null);
      } else {
        setToDate(date);
        setToDateParam(date ? format(date, "yyyy-MM-dd") : null);
      }
    },
    [setFromDateParam, setToDateParam],
  );

  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    setSearchQuery(null);
    setFromDate(undefined);
    setFromDateParam(null);
    setToDate(undefined);
    setToDateParam(null);
    setPage(1);
  }, [setSearchQuery, setFromDateParam, setToDateParam, setPage]);

  const hasActiveFilters = Boolean(
    searchQuery || fromDateParam || toDateParam,
  );

  const loadReport = useCallback(async () => {
    if (!token) {
      setRows([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      const response = await adminTradingHistoryReportApi.list({
        token,
        search: searchQuery || undefined,
        from_date: fromDateParam || undefined,
        to_date: toDateParam || undefined,
        page,
        per_page: perPage,
      });

      const payload = response as unknown as TradingHistoryReportListPayload;
      const reportItems = Array.isArray(payload?.data) ? payload.data : [];

      setRows(reportItems);
      setTotalPages(payload?.pagination?.last_page ?? 1);
      setTotal(payload?.pagination?.total ?? reportItems.length);
    } catch (error: unknown) {
      console.error("Failed to load trading history report:", error);
      setLoadError(error);
      setRows([]);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "trading history report",
          action: "load",
        })
      );
    } finally {
      setLoading(false);
    }
  }, [page, perPage, token, searchQuery, fromDateParam, toDateParam]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleExport = useCallback(
    async (formatType: ReportExportFormat) => {
      if (!canViewReport) {
        toast.error("You do not have permission to export trading history report");
        return;
      }
      if (!token) {
        toast.error("Authentication required to export data");
        return;
      }

      const exportToastId = `trading-history-export-${formatType}`;

      try {
        toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });

        const { blob, filename } = await adminTradingHistoryReportApi.export({
          token,
          format: formatType,
          search: searchQuery || undefined,
          from_date: fromDateParam || undefined,
          to_date: toDateParam || undefined,
        });

        if (!blob.size) {
          toast.error("No data returned for export", { id: exportToastId });
          return;
        }

        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);

        toast.success(`Downloaded ${filename}`, { id: exportToastId });
      } catch (error: unknown) {
        console.error(`Failed to export ${formatType}:`, error);
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "trading history report",
            action: "export",
          }),
          { id: exportToastId }
        );
      }
    },
    [canViewReport, token, searchQuery, fromDateParam, toDateParam]
  );

  const columns: ColumnDef<TradingHistoryReportItem>[] = useMemo(
    () => [
      {
        id: "sr_no",
        header: "Sr. No.",
        cell: ({ row, table }) => <SerialNumberCell row={row} table={table} className="font-mono text-sm" />,
      },
      {
        id: "user",
        header: "User",
        cell: ({ row }) => {
          const { name, email } = row.original;

          if (!name && !email) {
            return <span className="text-muted-foreground">-</span>;
          }

          return (
            <div className="space-y-0.5">
              <div className="font-medium">{name || "-"}</div>
              <div className="text-xs text-muted-foreground">{email || "-"}</div>
            </div>
          );
        },
      },
      {
        id: "account",
        header: "Account",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <div className="font-medium">{row.original.account_id || "-"}</div>
            <div className="text-xs text-muted-foreground">Login: {row.original.login || "-"}</div>
          </div>
        ),
      },
      {
        id: "record_type",
        header: "Record Type",
        cell: ({ row }) => getRecordTypeBadge(row.original.record_type),
      },
      {
        id: "ticket",
        header: "Ticket",
        accessorKey: "ticket",
        cell: ({ row }) => <span className="font-mono text-sm">{row.original.ticket ?? "-"}</span>,
      },
      {
        id: "symbol",
        header: "Symbol",
        accessorKey: "symbol",
        cell: ({ row }) => row.original.symbol || "-",
      },
      {
        id: "volume",
        header: "Volume",
        accessorKey: "volume",
        cell: ({ row }) => formatNumericValue(row.original.volume, 2),
      },
      {
        id: "price",
        header: "Price",
        accessorKey: "price",
        cell: ({ row }) => formatNumericValue(row.original.price, 5),
      },
      {
        id: "profit",
        header: "Profit",
        accessorKey: "profit",
        cell: ({ row }) => {
          const numericProfit =
            typeof row.original.profit === "string"
              ? Number(row.original.profit)
              : row.original.profit;
          const colorClass =
            typeof numericProfit === "number" && numericProfit > 0
              ? "text-emerald-600"
              : typeof numericProfit === "number" && numericProfit < 0
                ? "text-red-600"
                : "text-foreground";

          return (
            <span className={`font-medium ${colorClass}`}>
              {formatNumericValue(row.original.profit, 2)}
            </span>
          );
        },
      },
      {
        id: "trade_time_ist",
        header: "Trade Time (IST)",
        accessorKey: "trade_time_ist",
        cell: ({ row }) => row.original.trade_time_ist || "-",
      },
      {
        id: "created_at",
        header: "Created",
        accessorKey: "created_at",
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{fmtDateTime(row.original.created_at)}</span>
        ),
      },
    ],
    []
  );
  if (!canViewReport) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          You do not have permission to view trading history report.
        </div>
      </div>
    );
  }

  return (
    <ReportPageWrapper
      title="Trading History Report"
      titleIcon={<History className="h-6 w-6 text-primary" />}
      description="View paginated MT5 trading history entries for admin reporting."
      isLoading={loading}
      isEmpty={rows.length === 0}
      error={loadError}
      onExport={handleExport}
      onRefresh={() => void loadReport()}
      isRefreshing={loading}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
          <div className="min-w-[240px] flex-1">
            <ApiSearchBar
              value={searchInput}
              onChange={(value) => setSearchInput(value)}
              onSearch={(value) => {
                setPage(1);
                setSearchQuery(value.trim() || null);
              }}
              placeholder="Search by name, email, account..."
              minimumLength={3}
              delay={300}
            />
          </div>
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
          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          ) : null}
        </div>

        <div className="rounded-lg border bg-card">
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-base font-semibold">
                <ReceiptText className="h-4 w-4" />
                Results
              </div>
              <span className="text-xs text-muted-foreground">
                Showing {rows.length} of {total} results
              </span>
            </div>

            <AppDataTable<TradingHistoryReportItem>
              data={rows}
              columns={columns}
              pageCount={totalPages}
            />
          </div>
        </div>
      </div>
    </ReportPageWrapper>
  );
}



