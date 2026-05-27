"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { ArrowLeftRight, CalendarIcon, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";

import { AppDataTable } from "@/components/app-data-table";
import { ReportPageWrapper } from "@/components/report-page-wrapper";
import type { ReportExportFormat } from "@/components/report-page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import {
  adminTransactionReportApi,
  type TransactionReportItem,
  type TransactionReportListPayload,
} from "@/lib/api";
import { fmtDateTime, formatAmount } from "@/lib/formatters";

export default function AllTransactionReportPage() {
  const authCtx = useAuth?.();
  const { isManager, hasFeature } = useManagerPermissions();
  const canViewReport = !isManager || hasFeature("reportManagement", "allTransactionReport");
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [rows, setRows] = useState<TransactionReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [searchQuery, setSearchQuery] = useQueryState("search", parseAsString);
  const [searchInput, setSearchInput] = useState(searchQuery || "");

  useEffect(() => {
    setSearchInput(searchQuery || "");
  }, [searchQuery]);

  const loadReport = useCallback(async () => {
    if (!token) {
      setRows([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      const response = await adminTransactionReportApi.list({
        token,
        search: searchQuery || undefined,
        page,
        per_page: perPage,
      });

      const payload = response as unknown as TransactionReportListPayload;
      const reportItems = Array.isArray(payload?.data) ? payload.data : [];
      setRows(reportItems);
      setTotalPages(payload?.pagination?.last_page ?? 1);
      setTotal(payload?.pagination?.total ?? reportItems.length);
    } catch (error: unknown) {
      console.error("Failed to load transaction report:", error);
      setLoadError(error);
      setRows([]);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "transaction report",
          action: "load",
        })
      );
    } finally {
      setLoading(false);
    }
  }, [page, perPage, searchQuery, token]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleSearch = useCallback(() => {
    setSearchQuery(searchInput.trim() || null);
    setPage(1);
  }, [searchInput, setSearchQuery, setPage]);

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    setSearchQuery(null);
    setPage(1);
  }, [setPage, setSearchQuery]);

  const handleExport = useCallback(
    async (formatType: ReportExportFormat) => {
      if (!canViewReport) {
        toast.error("You do not have permission to export transaction report");
        return;
      }
      if (!token) {
        toast.error("Authentication required to export data");
        return;
      }

      const exportToastId = `transaction-report-export-${formatType}`;
      try {
        toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });

        const { blob, filename } = await adminTransactionReportApi.export({
          token,
          format: formatType,
          search: searchQuery || undefined,
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
            resource: "transaction report",
            action: "export",
          }),
          { id: exportToastId }
        );
      }
    },
    [canViewReport, searchQuery, token]
  );

  const columns: ColumnDef<TransactionReportItem>[] = useMemo(
    () => [
      {
        id: "id",
        header: "Sr. No.",
        cell: ({ row, table }) => <SerialNumberCell row={row} table={table} className="font-mono text-sm" />,
      },
      {
        id: "transaction_type",
        header: "Type",
        accessorKey: "transaction_type_label",
        cell: ({ row }) => row.original.transaction_type_label || row.original.transaction_type || "-",
      },
      {
        id: "user",
        header: "User",
        accessorKey: "name",
        cell: ({ row }) => {
          const name = row.original.name;
          const email = row.original.email;
          if (!name && !email) return <span className="text-muted-foreground">-</span>;
          return (
            <div className="space-y-0.5">
              <div className="font-medium">{name || "-"}</div>
              <div className="text-xs text-muted-foreground">{email || "-"}</div>
            </div>
          );
        },
      },
      {
        id: "amount",
        header: "Amount (USD)",
        accessorKey: "amount",
        cell: ({ row }) => <span className="font-medium">{formatAmount(row.original.amount)}</span>,
      },
      {
        id: "payment_method",
        header: "Payment Method",
        accessorKey: "payment_method",
        cell: ({ row }) => row.original.payment_method || "-",
      },
      {
        id: "reference",
        header: "Reference",
        accessorKey: "reference",
        cell: ({ row }) => {
          const reference = row.original.reference;
          if (!reference) return <span className="text-muted-foreground">-</span>;
          return (
            <span className="block max-w-[260px] truncate text-sm" title={String(reference)}>
              {reference}
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status_text",
        cell: ({ row }) => {
          const statusLabel = row.original.status_text || row.original.status || "-";
          return (
            <span className="rounded-full border border-muted-foreground/20 px-2 py-0.5 text-[11px] font-medium">
              {statusLabel}
            </span>
          );
        },
      },
      {
        id: "created_at",
        header: "Created",
        accessorKey: "created_at",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>{fmtDateTime(row.original.created_at || row.original.date)}</span>
          </div>
        ),
      },
    ],
    []
  );

  if (!canViewReport) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          You do not have permission to view transaction report.
        </div>
      </div>
    );
  }

  return (
    <ReportPageWrapper
      title="All Transaction Report"
      titleIcon={<ArrowLeftRight className="h-6 w-6 text-primary" />}
      description="Manage and view all transactions."
      isLoading={loading}
      isEmpty={rows.length === 0}
      error={loadError}
      onExport={handleExport}
      onRefresh={() => void loadReport()}
      isRefreshing={loading}
    >
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Search</h2>
              {searchQuery && (
                <Button variant="ghost" size="sm" onClick={handleClearSearch} className="h-8">
                  <X className="mr-1 h-3.5 w-3.5" />
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
              {searchQuery && (
                <Button variant="outline" onClick={handleClearSearch}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Results</h2>
              <span className="text-xs text-muted-foreground">
                Showing {rows.length} of {total} results
              </span>
            </div>

            <AppDataTable<TransactionReportItem> data={rows} columns={columns} pageCount={totalPages} />
          </div>
        </div>
      </div>
    </ReportPageWrapper>
  );
}
