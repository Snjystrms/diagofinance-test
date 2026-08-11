"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { CalendarIcon, Landmark, X } from "lucide-react";

import {
  adminIbWithdrawalReportApi,
  type IbWithdrawalReportItem,
  type IbWithdrawalReportListPayload,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { ReportPageWrapper } from "@/components/report-page-wrapper";
import type { ReportExportFormat } from "@/components/report-page-wrapper";
import { fmtDateTime, formatAmount } from "@/lib/formatters";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";

const statusBadge = (status: string | number) => {
  const statusStr = String(status);
  switch (statusStr) {
    case "1":
    case "approved":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300">
          Approved
        </Badge>
      );
    case "2":
    case "rejected":
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
          Rejected
        </Badge>
      );
    case "0":
    case "pending":
    default:
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300">
          Pending
        </Badge>
      );
  }
};

/* ---------------- Page ---------------- */
export default function IbWithdrawalReportPage() {
  const authCtx = useAuth?.();
  const { isManager, hasFeature } = useManagerPermissions();
  const canViewReport = !isManager || hasFeature("reportManagement", "ibWithdrawReport");
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [rows, setRows] = useState<IbWithdrawalReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Search
  const [searchQuery, setSearchQuery] = useQueryState("search", parseAsString);
  const [searchInput, setSearchInput] = useState(searchQuery || "");

  useEffect(() => {
    setSearchInput(searchQuery || "");
  }, [searchQuery]);

  // Filters - only date range for IB withdrawal report
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [fromDateStr, setFromDateStr] = useQueryState(
    "from_date",
    parseAsString
  );
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [toDateStr, setToDateStr] = useQueryState("to_date", parseAsString);

  // Sync date state with query params
  useEffect(() => {
    if (fromDateStr) {
      const parsed = new Date(fromDateStr);
      if (!isNaN(parsed.getTime())) {
        setFromDate(parsed);
      }
    }
  }, [fromDateStr]);

  useEffect(() => {
    if (toDateStr) {
      const parsed = new Date(toDateStr);
      if (!isNaN(parsed.getTime())) {
        setToDate(parsed);
      }
    }
  }, [toDateStr]);

  // Update query params when dates change
  useEffect(() => {
    if (fromDate) {
      setFromDateStr(format(fromDate, "yyyy-MM-dd"));
    } else {
      setFromDateStr(null);
    }
  }, [fromDate, setFromDateStr]);

  useEffect(() => {
    if (toDate) {
      setToDateStr(format(toDate, "yyyy-MM-dd"));
    } else {
      setToDateStr(null);
    }
  }, [toDate, setToDateStr]);

  const loadReport = useCallback(async () => {
    if (!token) {
      setRows([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      const response = await adminIbWithdrawalReportApi.list({
        token,
        from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
        search: searchQuery || undefined,
        page,
        per_page: perPage,
      });

      // The API response structure: { success, message, data: [...], pagination: {...}, filters: {...} }
      const payload = (response as unknown) as IbWithdrawalReportListPayload;
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
      console.error("Failed to load IB withdrawal report:", error);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "IB withdrawal report",
          action: "load",
        })
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    token,
    page,
    perPage,
    fromDate,
    toDate,
    searchQuery,
  ]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleDateChange = useCallback(
    (date: Date | undefined, type: "from" | "to") => {
      if (type === "from") {
        setFromDate(date);
      } else {
        setToDate(date);
      }
    },
    []
  );

  const handleResetFilters = useCallback(() => {
    setFromDate(undefined);
    setToDate(undefined);
    setSearchInput("");
    setSearchQuery(null);
    setPage(1);
  }, [
    setPage,
    setSearchQuery,
  ]);

  const handleExport = useCallback(async (formatType: ReportExportFormat) => {
    if (!canViewReport) {
      toast.error("You do not have permission to export IB withdrawal report");
      return;
    }
    if (!token) {
      toast.error("Authentication required to export data");
      return;
    }
    const exportToastId = `export-${formatType}`;
    try {
      toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });
      
      const { blob, filename } = await adminIbWithdrawalReportApi.export({
        token,
        format: formatType,
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
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "IB withdrawal report",
          action: "export",
        }),
        { id: exportToastId }
      );
    }
  }, [
    canViewReport,
    token,
    fromDate,
    toDate,
    searchQuery,
  ]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (fromDate) count++;
    if (toDate) count++;
    if (searchQuery) count++;
    return count;
  }, [fromDate, toDate, searchQuery]);

  const columns: ColumnDef<IbWithdrawalReportItem>[] = useMemo(
    () => [
      {
        id: "id",
        header: "Sr. No.",
        accessorKey: "id",
        cell: ({ row, table }) => (
          <SerialNumberCell row={row} table={table} className="font-mono text-sm" />
        ),
      },
      // {
      //   id: "ib_info",
      //   header: "IB Info",
      //   accessorKey: "ib_name",
      //   cell: ({ row }) => {
      //     const ibName = row.original.ib_name;
      //     const partnerId = row.original.partner_id;
      //     if (!ibName && !partnerId) return <span className="text-muted-foreground">—</span>;
      //     return (
      //       <div className="space-y-0.5">
      //         <div className="font-medium">{ibName || "—"}</div>
      //         <div className="text-xs text-muted-foreground">{partnerId ? `ID: ${partnerId}` : "—"}</div>
      //       </div>
      //     );
      //   },
      // },
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
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap">{formatAmount(row.original.amount)}</span>
        ),
      },
       {
        id: "comment",
        header: "Comment",
        accessorKey: "comment",
        cell: ({ row }) => row.original.comment || "-",
      },
      {
        id: "payment_method",
        header: "Payment Method",
        accessorKey: "payment_method",
        cell: ({ row }) => {
          const method = row.original.payment_method;
          return method ? (
            <span className="text-sm">{method}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "wallet_address",
        header: "Wallet Address",
        accessorKey: "wallet_address",
        cell: ({ row }) => {
          const address = row.original.withdraw_to;
          if (!address) return <span className="text-muted-foreground">—</span>;
          return (
            <span
              className="font-mono text-xs max-w-[200px] truncate block"
              title={String(address)}
            >
              {address}
            </span>
          );
        },
      },
      // {
      //   id: "transaction_hash",
      //   header: "Transaction Hash",
      //   accessorKey: "transaction_hash",
      //   cell: ({ row }) => {
      //     const hash = row.original.transaction_hash;
      //     if (!hash) return <span className="text-muted-foreground">—</span>;
      //     return (
      //       <span
      //         className="font-mono text-xs max-w-[200px] truncate block"
      //         title={String(hash)}
      //       >
      //         {hash}
      //       </span>
      //     );
      //   },
      // },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        id: "created_at",
        header: "Created",
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
  if (!canViewReport) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          You do not have permission to view IB withdrawal report.
        </div>
      </div>
    );
  }

  return (
    <ReportPageWrapper
      title="Partner Withdrawal Report"  
      titleIcon={<Landmark className="h-6 w-6 text-primary" />}
      description="Manage and view Partner withdrawal transactions"
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
        placeholder="Search by IB name, partner ID..."
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
    {activeFilterCount > 0 ? (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleResetFilters}
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
            <AppDataTable<IbWithdrawalReportItem>
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









