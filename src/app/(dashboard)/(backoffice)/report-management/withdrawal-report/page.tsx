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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Search, TrendingDown } from "lucide-react";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { cn } from "@/lib/utils";

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
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [fromDateStr, setFromDateStr] = useQueryState(
    "from_date",
    parseAsString
  );
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [toDateStr, setToDateStr] = useQueryState("to_date", parseAsString);
  const [sortColumn, setSortColumn] = useQueryState(
    "sort_column",
    parseAsString
  );
  const [sortOrder, setSortOrder] = useQueryState<"ASC" | "DESC">(
    "sort_order",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parseAsString.withDefault("ASC") as any
  );

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
        from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
        page,
        per_page: perPage,
        search: searchQuery || undefined,
        sort_column: sortColumn || undefined,
        sort_order: sortOrder || undefined,
      });

      // The API response structure: { success, message, data: [...], pagination: {...}, filters: {...} }
      const payload = (response as unknown) as WithdrawalReportListPayload;
      const reportItems = Array.isArray(payload?.data) ? payload.data : [];
      
      console.log("Withdrawal report items:", reportItems);
      console.log("Pagination:", payload?.pagination);
      
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
    fromDate,
    toDate,
    sortColumn,
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
    setFromDate(undefined);
    setToDate(undefined);
    setSortColumn(null);
    setSortOrder(null);
    setSearchInput("");
    setSearchQuery(null);
    setPage(1);
  }, [
    setStatusFilter,
    setPaymentMethodFilter,
    setSortColumn,
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
    fromDate,
    toDate,
    searchQuery,
  ]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter) count++;
    if (paymentMethodFilter) count++;
    if (fromDate) count++;
    if (toDate) count++;
    if (sortColumn) count++;
    if (sortOrder) count++;
    if (searchQuery) count++;
    return count;
  }, [statusFilter, paymentMethodFilter, fromDate, toDate, sortColumn, sortOrder, searchQuery]);

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
        header: "Status",
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
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
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left font-normal",
                      !fromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {fromDate ? format(fromDate, "MMM dd, yyyy") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(date) => {
                      handleDateChange(date, "from");
                      setPage(1);
                    }}
                    initialFocus
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left font-normal",
                      !toDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {toDate ? format(toDate, "MMM dd, yyyy") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(date) => {
                      handleDateChange(date, "to");
                      setPage(1);
                    }}
                    initialFocus
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sort-column" className="text-xs font-medium text-muted-foreground">Sort By</Label>
              <Select
                value={sortColumn || undefined}
                onValueChange={(value) => {
                  setSortColumn(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="sort-column" className="h-9 w-full">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created At</SelectItem>
                  <SelectItem value="amount">Amount</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sort-order" className="text-xs font-medium text-muted-foreground">Order</Label>
              <Select
                value={sortOrder || undefined}
                onValueChange={(value: "ASC" | "DESC") => {
                  setSortOrder(value);
                  setPage(1);
                }}
              >
                <SelectTrigger id="sort-order" className="h-9 w-full">
                  <SelectValue placeholder="Select order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASC">Ascending</SelectItem>
                  <SelectItem value="DESC">Descending</SelectItem>
                </SelectContent>
              </Select>
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









