"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Wallet, X } from "lucide-react";
import { ApiSearchBar } from "@/components/ui/api-search-bar";

import {
  adminWalletHistoryReportApi,
  type WalletHistoryReportItem,
  type WalletHistoryReportListPayload,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { ReportPageWrapper } from "@/components/report-page-wrapper";
import type { ReportExportFormat } from "@/components/report-page-wrapper";
import { fmtDateTime, formatAmount } from "@/lib/formatters";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import { ManualSortHeader } from "@/components/data-table/manual-sort-header";
import { ViewContentDialog } from "@/components/ui/view-content-dialog";

const methodBadge = (method?: string | null) => {
  switch (method) {
    case "deposit":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300">
          Deposit
        </Badge>
      );
    case "transfer_in":
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          Transfer In
        </Badge>
      );
    case "transfer_out":
      return (
        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
          Transfer Out
        </Badge>
      );
    case "ib_withdrawal":
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          IB Withdrawal
        </Badge>
      );
    default:
      return method ? (
        <Badge variant="outline">{method}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
  }
};

/* ---------------- Page ---------------- */
export default function WalletHistoryReportPage() {
  const authCtx = useAuth?.();
  const { isManager, hasFeature } = useManagerPermissions();
  const canViewReport =
    !isManager || hasFeature("reportManagement", "walletHistoryReport");
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined"
      ? localStorage.getItem("auth_token") || ""
      : "");

  const [rows, setRows] = useState<WalletHistoryReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Search
  const [searchQuery, setSearchQuery] = useQueryState("search", parseAsString);
  const [searchInput, setSearchInput] = useState(searchQuery || "");

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

  const [sortBy] = useQueryState("sort_by", parseAsString);
  const [sortOrder] = useQueryState("sort_order", parseAsString);

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

      const response = await adminWalletHistoryReportApi.list({
        token,
        from_date: fromDateParam || undefined,
        to_date: toDateParam || undefined,
        page,
        per_page: perPage,
        search: searchQuery || undefined,
        sort_column: sortBy || undefined,
        sort_order: sortOrder
          ? (sortOrder.toUpperCase() as "ASC" | "DESC")
          : undefined,
      });

      // The API response structure: { success, message, data: [...], pagination: {...}, filters: {...} }
      const payload = response as unknown as WalletHistoryReportListPayload;
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
      console.error("Failed to load wallet history report:", error);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "wallet history report",
          action: "load",
        }),
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    token,
    page,
    perPage,
    fromDateParam,
    toDateParam,
    sortBy,
    sortOrder,
    searchQuery,
  ]);

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

  const handleExport = useCallback(
    async (formatType: ReportExportFormat) => {
      if (!canViewReport) {
        toast.error(
          "You do not have permission to export wallet history report",
        );
        return;
      }
      if (!token) {
        toast.error("Authentication required to export data");
        return;
      }
      const exportToastId = `export-${formatType}`;
      try {
        toast.loading(`Preparing ${formatType.toUpperCase()} export...`, {
          id: exportToastId,
        });

        const { blob, filename } = await adminWalletHistoryReportApi.export({
          token,
          format: formatType,
          from_date: fromDateParam || undefined,
          to_date: toDateParam || undefined,
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

        toast.success(`Successfully exported to ${filename}`, {
          id: exportToastId,
        });
      } catch (error: unknown) {
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "wallet history report",
            action: "export",
          }),
          { id: exportToastId },
        );
      }
    },
    [canViewReport, token, fromDateParam, toDateParam, searchQuery],
  );

  const columns: ColumnDef<WalletHistoryReportItem>[] = useMemo(
    () => [
      {
        id: "id",
        header: "Sr. No.",
        accessorKey: "id",
        cell: ({ row, table }) => (
          <SerialNumberCell
            row={row}
            table={table}
            className="font-mono text-sm"
          />
        ),
      },
      {
        id: "user",
        header: "User",
        accessorKey: "name",
        cell: ({ row }) => {
          const raw = row.original.name_email || row.original.name;
          if (!raw) return <span className="text-muted-foreground">—</span>;
          const [name, email] = raw.split("/");
          return (
            <div className="space-y-0.5">
              <div className="font-medium">{name || "—"}</div>
              {email ? (
                <div className="text-xs text-muted-foreground">{email}</div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "method",
        header: () => <ManualSortHeader sortKey="method" title="Method" />,
        accessorKey: "method",
        cell: ({ row }) => methodBadge(row.original.method),
      },
      {
        id: "to_deposit",
        header: "To Deposit",
        accessorKey: "to_deposit",
        cell: ({ row }) => {
          const target = row.original.to_deposit;
          return target ? (
            <span className="font-mono text-sm">MT{target}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "amount",
        header: () => (
          <ManualSortHeader sortKey="amount" title="Amount (USD)" />
        ),
        accessorKey: "amount",
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap">
            {formatAmount(row.original.amount)}
          </span>
        ),
      },
      {
        id: "note",
        header: "Note",
        accessorKey: "note",
        cell: ({ row }) => (
          <ViewContentDialog
            content={row.original.note || row.original.comment}
            title="Wallet History Note"
            description="Full note for this wallet history entry"
            emptyLabel="—"
          />
        ),
      },
      {
        id: "approved_by",
        header: "Approved By",
        accessorKey: "approved_by",
        cell: ({ row }) => row.original.approved_by || "—",
      },
      {
        id: "created_at",
        header: () => (
          <ManualSortHeader sortKey="created_at" title="Created" />
        ),
        accessorKey: "created_at",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 text-sm whitespace-nowrap">
            <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>{fmtDateTime(row.original.created_at)}</span>
          </div>
        ),
      },
    ],
    [],
  );
  if (!canViewReport) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          You do not have permission to view wallet history report.
        </div>
      </div>
    );
  }

  return (
    <ReportPageWrapper
      title="Wallet History Report"
      titleIcon={<Wallet className="h-6 w-6 text-primary" />}
      description="Manage and view wallet history transactions"
      isLoading={loading}
      isEmpty={rows.length === 0}
      error={loadError}
      onExport={handleExport}
      onRefresh={() => void loadReport()}
      isRefreshing={loading}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
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

        {/* Results Section */}
        <div className="rounded-lg border bg-card">
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Results</h2>
              <span className="text-xs text-muted-foreground">
                Showing {rows.length} of {total} results
              </span>
            </div>

            {/* Data Table */}
            <AppDataTable<WalletHistoryReportItem>
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
