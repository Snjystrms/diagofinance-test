"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Landmark } from "lucide-react";
import toast from "react-hot-toast";
import { parseAsInteger, useQueryState } from "nuqs";

import { AppDataTable } from "@/components/app-data-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { ReportPageWrapper } from "@/components/report-page-wrapper";
import type { ReportExportFormat } from "@/components/report-page-wrapper";
import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import {
  adminIbCommissionListReportApi,
  type IbCommissionReportItem,
  type IbCommissionReportListPayload,
} from "@/lib/api-finance-reports";
import { formatAmount } from "@/lib/formatters";

const fmtDate = (value?: string | null) => {
  if (!value) return "-";
  try {
    return format(new Date(`${value}T00:00:00`), "MMM dd, yyyy");
  } catch {
    return value;
  }
};

export default function IbCommissionReportPage() {
  const authCtx = useAuth?.();
  const { isManager, hasFeature } = useManagerPermissions();
  const canViewReport = !isManager || hasFeature("reportManagement", "ibCommissionReport");
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [rows, setRows] = useState<IbCommissionReportItem[]>([]);
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

      const response = await adminIbCommissionListReportApi.list({
        token,
        page,
        per_page: perPage,
      });

      const payload = response as unknown as IbCommissionReportListPayload;
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
      console.error("Failed to load IB commission report:", error);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "IB commission report",
          action: "load",
        })
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleExport = useCallback(
    async (formatType: ReportExportFormat) => {
      if (!canViewReport) {
        toast.error("You do not have permission to export IB commission report");
        return;
      }
      if (!token) {
        toast.error("Authentication required to export data");
        return;
      }

      const exportToastId = `ib-commission-report-export-${formatType}`;
      try {
        toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });

        const { blob, filename } = await adminIbCommissionListReportApi.export({
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
            resource: "IB commission report",
            action: "export",
          }),
          { id: exportToastId }
        );
      }
    },
    [canViewReport, token]
  );

  const columns: ColumnDef<IbCommissionReportItem>[] = useMemo(
    () => [
      {
        id: "id",
        header: "Sr. No.",
        cell: ({ row, table }) => (
          <SerialNumberCell row={row} table={table} className="font-mono text-sm" />
        ),
      },
      {
        id: "ib_user",
        header: "IB User",
        accessorKey: "ib_user_name",
        cell: ({ row }) => {
          const name = row.original.ib_user_name;
          const email = row.original.ib_user_email;
          const userId = row.original.ib_user_id;
          if (!name && !email && userId === undefined) {
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
        id: "trader_user",
        header: "Trader",
        accessorKey: "trader_name",
        cell: ({ row }) => {
          const name = row.original.trader_name;
          const email = row.original.trader_email;
          const userId = row.original.trader_user_id;
          if (!name && !email && userId === undefined) {
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
        id: "mt5_account",
        header: "MT5 Account",
        accessorKey: "mt5_account",
        cell: ({ row }) => row.original.mt5_account || <span className="text-muted-foreground">-</span>,
      },
      {
        id: "trade_date",
        header: "Trade Date",
        accessorKey: "trade_date",
        cell: ({ row }) => <span className="text-sm">{fmtDate(row.original.trade_date)}</span>,
      },
      {
        id: "volume",
        header: "Volume",
        accessorKey: "volume",
        cell: ({ row }) => <span className="font-medium">{formatAmount(row.original.volume)}</span>,
      },
      {
        id: "level",
        header: "Level",
        accessorKey: "level",
        cell: ({ row }) => <span className="font-medium">{String(row.original.level)}</span>,
      },
      {
        id: "commission_rate",
        header: "Commission Rate",
        accessorKey: "commission_rate",
        cell: ({ row }) => <span className="font-medium">{formatAmount(row.original.commission_rate)}%</span>,
      },
      {
        id: "commission_amount",
        header: "Commission Amount",
        accessorKey: "commission_amount",
        cell: ({ row }) => <span className="font-medium">{formatAmount(row.original.commission_amount)}</span>,
      },
      {
        id: "pending_commission",
        header: "Pending Commission",
        accessorKey: "pending_commission",
        cell: ({ row }) => <span className="font-medium">{formatAmount(row.original.pending_commission)}</span>,
      },
    ],
    []
  );

  if (!canViewReport) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          You do not have permission to view IB commission report.
        </div>
      </div>
    );
  }

  return (
    <ReportPageWrapper
      title="Partner Commission Report"
      titleIcon={<Landmark className="h-6 w-6 text-primary" />}
      description="View commission entries generated from trader activity."
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
            <h2 className="text-base font-semibold">Results</h2>
            <span className="text-xs text-muted-foreground">
              Showing {rows.length} of {total} results
            </span>
          </div>

          <AppDataTable<IbCommissionReportItem> data={rows} columns={columns} pageCount={totalPages} />
        </div>
      </div>
    </ReportPageWrapper>
  );
}
