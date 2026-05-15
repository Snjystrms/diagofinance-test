"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { History, ReceiptText } from "lucide-react";
import toast from "react-hot-toast";
import { parseAsInteger, useQueryState } from "nuqs";

import { AppDataTable } from "@/components/app-data-table";
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
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [rows, setRows] = useState<TradingHistoryReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

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
  }, [page, perPage, token]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleExport = useCallback(
    async (formatType: ReportExportFormat) => {
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
    [token]
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
        cell: ({ row }) => fmtDateTime(row.original.created_at),
      },
    ],
    []
  );

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
    </ReportPageWrapper>
  );
}



