"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { CalendarIcon, Search, TrendingDown } from "lucide-react";
import { ApiSearchBar } from "@/components/ui/api-search-bar";

import {
  adminWithdrawalReportApi,
  type WithdrawalReportItem,
  type WithdrawalReportListPayload,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { ReportPageWrapper } from "@/components/report-page-wrapper";
import type { ReportExportFormat } from "@/components/report-page-wrapper";
import { fmtDateTime, formatAmount } from "@/lib/formatters";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import { ManualSortHeader } from "@/components/data-table/manual-sort-header";

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
export default function WithdrawalReportPage() {
  const authCtx = useAuth?.();
  const { isManager, hasFeature } = useManagerPermissions();
  const canViewReport = !isManager || hasFeature("reportManagement", "withdrawReport");
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [rows, setRows] = useState<WithdrawalReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useQueryState(
    "status",
    parseAsString
  );
  const [paymentMethodFilter, setPaymentMethodFilter] = useQueryState(
    "payment_method_id",
    parseAsString
  );
  const [isIbFilter, setIsIbFilter] = useQueryState(
    "is_ib",
    parseAsString
  );
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [fromDateStr, setFromDateStr] = useQueryState(
    "from_date",
    parseAsString
  );
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [toDateStr, setToDateStr] = useQueryState("to_date", parseAsString);
  const [sortBy, setSortBy] = useQueryState("sort_by", parseAsString);
  const [sortOrder, setSortOrder] = useQueryState("sort_order", parseAsString);

  // Search
  const [searchQuery, setSearchQuery] = useQueryState("search", parseAsString);
  const [searchInput, setSearchInput] = useState(searchQuery || "");

  useEffect(() => {
    setSearchInput(searchQuery || "");
  }, [searchQuery]);

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

      const response = await adminWithdrawalReportApi.list({
        token,
        // Only pass filter parameters if they are set
        status:
          statusFilter && statusFilter !== "all"
            ? statusFilter
            : undefined,
        payment_method_id:
          paymentMethodFilter && paymentMethodFilter !== "all"
            ? paymentMethodFilter
            : paymentMethodFilter === "all"
              ? "all"
              : undefined,
        is_ib:
          isIbFilter && isIbFilter !== "all"
            ? isIbFilter
            : undefined,
        from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
        page,
        per_page: perPage,
        search: searchQuery || undefined,
        sort_column: sortBy || undefined,
        sort_order: sortOrder ? (sortOrder.toUpperCase() as "ASC" | "DESC") : undefined,
      });

      // The API response structure: { success, message, data: [...], pagination: {...}, filters: {...} }
      const payload = (response as unknown) as WithdrawalReportListPayload;
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
      console.error("Failed to load withdrawal report:", error);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "withdrawal report",
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
    statusFilter,
    paymentMethodFilter,
    isIbFilter,
    fromDate,
    toDate,
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
      } else {
        setToDate(date);
      }
    },
    []
  );

  const handleResetFilters = useCallback(() => {
    setStatusFilter(null);
    setPaymentMethodFilter(null);
    setIsIbFilter(null);
    setFromDate(undefined);
    setToDate(undefined);
    setSortBy(null);
    setSortOrder(null);
    setSearchInput("");
    setSearchQuery(null);
    setPage(1);
  }, [
    setStatusFilter,
    setPaymentMethodFilter,
    setIsIbFilter,
    setSortBy,
    setSortOrder,
    setSearchQuery,
    setPage,
  ]);

  const handleExport = useCallback(async (formatType: ReportExportFormat) => {
    if (!canViewReport) {
      toast.error("You do not have permission to export withdrawal report");
      return;
    }
    if (!token) {
      toast.error("Authentication required to export data");
      return;
    }
    const exportToastId = `export-${formatType}`;
    try {
      toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });
      
      const { blob, filename } = await adminWithdrawalReportApi.export({
        token,
        format: formatType,
        status:
          statusFilter && statusFilter !== "all"
            ? statusFilter
            : undefined,
        payment_method_id:
          paymentMethodFilter && paymentMethodFilter !== "all"
            ? paymentMethodFilter
            : paymentMethodFilter === "all"
              ? "all"
              : undefined,
        is_ib:
          isIbFilter && isIbFilter !== "all"
            ? isIbFilter
            : undefined,
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
          resource: "withdrawal report",
          action: "export",
        }),
        { id: exportToastId }
      );
    }
  }, [
    canViewReport,
    token,
    statusFilter,
    paymentMethodFilter,
    isIbFilter,
    fromDate,
    toDate,
    searchQuery,
  ]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter) count++;
    if (paymentMethodFilter) count++;
    if (isIbFilter) count++;
    if (fromDate) count++;
    if (toDate) count++;
    if (sortBy) count++;
    if (sortOrder) count++;
    if (searchQuery) count++;
    return count;
  }, [statusFilter, paymentMethodFilter, isIbFilter, fromDate, toDate, sortBy, sortOrder, searchQuery]);

  const columns: ColumnDef<WithdrawalReportItem>[] = useMemo(
    () => [
      {
        id: "id",
        header: "Sr. No.",
        accessorKey: "id",
        cell: ({ row, table }) => (
          <SerialNumberCell row={row} table={table} className="font-mono text-sm" />
        ),
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
        header: () => <ManualSortHeader sortKey="amount" title="Amount (USD)" />,
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
          // const address = row.original.wallet_address;
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
        header: () => <ManualSortHeader sortKey="status" title="Status" />,
        accessorKey: "status",
        cell: ({ row }) => statusBadge(row.original.status),
      },
       {
        id: "approved_by",
        header: "Approved By",
        accessorKey: "approved_by",
        cell: ({ row }) => row.original.approved_by || "-",
      },
      {
        id: "created_at",
        header: () => <ManualSortHeader sortKey="created_at" title="Created" />,
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
          You do not have permission to view withdrawal report.
        </div>
      </div>
    );
  }

  return (
    <ReportPageWrapper
      title="Withdrawal Report"
      titleIcon={<TrendingDown className="h-6 w-6 text-primary" />}
      description="Manage and view withdrawal transactions"
      isLoading={loading}
      isEmpty={rows.length === 0}
      error={loadError}
      onExport={handleExport}
      onRefresh={() => void loadReport()}
      isRefreshing={loading}
    >
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Search className="h-4 w-4" />
              Filters
            </h2>
            {activeFilterCount > 0 ? (
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                Reset
              </Button>
            ) : null}
          </div>
          <div className="mb-4">
            <ApiSearchBar
              value={searchInput}
              onChange={(value) => setSearchInput(value)}
              onSearch={(value) => {
                setPage(1);
                setSearchQuery(value.trim() || null);
              }}
              placeholder="Search by name, email..."
              minimumLength={3}
              delay={300}
            />
          </div>
         <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
  <div className="space-y-1.5">
    <Label htmlFor="status-filter" className="text-xs font-medium text-muted-foreground">Status</Label>
    <Select
      value={statusFilter || undefined}
      onValueChange={(value) => {
        setStatusFilter(value === "all" ? null : value);
        setPage(1);
      }}
    >
      <SelectTrigger id="status-filter" className="h-9 w-full">
        <SelectValue placeholder="All Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Status</SelectItem>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="approved">Approved</SelectItem>
        <SelectItem value="rejected">Rejected</SelectItem>
      </SelectContent>
    </Select>
  </div>
  <div className="space-y-1.5">
    <Label htmlFor="user-type-filter" className="text-xs font-medium text-muted-foreground">User Type</Label>
    <Select
      value={isIbFilter || undefined}
      onValueChange={(value) => {
        setIsIbFilter(value === "all" ? null : value);
        setPage(1);
      }}
    >
      <SelectTrigger id="user-type-filter" className="h-9 w-full">
        <SelectValue placeholder="All Users" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Users</SelectItem>
        <SelectItem value="1">Partners Only</SelectItem>
        <SelectItem value="0">Non-Partners Only</SelectItem>
      </SelectContent>
    </Select>
  </div>
  <div className="space-y-1.5">
    <Label htmlFor="payment-method-filter" className="text-xs font-medium text-muted-foreground">Payment Method</Label>
    <Select
      value={paymentMethodFilter || undefined}
      onValueChange={(value) => {
        setPaymentMethodFilter(value === "all" ? null : value);
        setPage(1);
      }}
    >
      <SelectTrigger id="payment-method-filter" className="h-9 w-full">
        <SelectValue placeholder="All Methods" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Methods</SelectItem>
      </SelectContent>
    </Select>
  </div>

  <div className="md:col-span-2 xl:col-span-1">
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
</div>
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
            <AppDataTable<WithdrawalReportItem>
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









