"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { ArrowLeftRight, CalendarIcon } from "lucide-react";
import toast from "react-hot-toast";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { ReportPageWrapper } from "@/components/report-page-wrapper";
import type { ReportExportFormat } from "@/components/report-page-wrapper";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import {
  adminTransactionReportApi,
  type TransactionReportItem,
  type TransactionReportListPayload,
} from "@/lib/api";
import { fmtDateTime, formatAmount } from "@/lib/formatters";
import { ViewContentDialog } from "@/components/ui/view-content-dialog";

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

  const [fromDateParam, setFromDateParam] = useQueryState("from_date", parseAsString);
  const [toDateParam, setToDateParam] = useQueryState("to_date", parseAsString);
  const [fromDate, setFromDate] = useState<Date | undefined>(
    fromDateParam ? new Date(fromDateParam) : undefined
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    toDateParam ? new Date(toDateParam) : undefined
  );

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
        from_date: fromDateParam || undefined,
        to_date: toDateParam || undefined,
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
  }, [page, perPage, searchQuery, fromDateParam, toDateParam, token]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

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
    [setFromDateParam, setToDateParam]
  );

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
            resource: "transaction report",
            action: "export",
          }),
          { id: exportToastId }
        );
      }
    },
    [canViewReport, searchQuery, fromDateParam, toDateParam, token]
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
          const raw = row.original.name_email;
          if (!raw) return <span className="text-muted-foreground">-</span>;
          const [name, email] = raw.split("/");
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
        cell: ({ row }) => <span className="font-medium whitespace-nowrap">{formatAmount(row.original.amount)}</span>,
      },
      {
        id: "comment",
        header: "Comment",
        accessorKey: "comment",
        cell: ({ row }) => (
          <ViewContentDialog
            content={row.original.comment}
            title="Transaction Comment"
            description="Full comment for this transaction"
            emptyLabel="—"
          />
        ),
      },
      {
        id: "approved_by",
        header: "Approved By",
        accessorKey: "approved_by",
        cell: ({ row }) => row.original.approved_by || "-",
      },
      // {
      //   id: "reference",
      //   header: "Reference",
      //   accessorKey: "reference",
      //   cell: ({ row }) => {
      //     const reference = row.original.reference;
      //     if (!reference) return <span className="text-muted-foreground">-</span>;
      //     return (
      //       <span className="block max-w-[260px] truncate text-sm" title={String(reference)}>
      //         {reference}
      //       </span>
      //     );
      //   },
      // },
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
          <div className="flex items-center gap-1 text-sm whitespace-nowrap">
            <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <div className="flex-1">
            <ApiSearchBar
              value={searchInput}
              onChange={(value) => setSearchInput(value)}
              onSearch={(value) => {
                setPage(1);
                setSearchQuery(value.trim() || null);
              }}
              placeholder="Search transactions..."
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
