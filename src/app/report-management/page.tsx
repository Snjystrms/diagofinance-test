"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { CalendarIcon, RefreshCw, Download, Filter, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  adminDepositReportApi,
  type DepositReportItem,
  type DepositReportListPayload,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { MainLayout } from "@/components/main-layout";

/* ---------------- Helpers ---------------- */
const fmtDateTime = (s?: string | null) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
};

const formatAmount = (amount: string | number) => {
  try {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  } catch {
    return String(amount);
  }
};

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
export default function ReportManagementPage() {
  const authCtx = useAuth?.();
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [rows, setRows] = useState<DepositReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  
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

      const response = await adminDepositReportApi.list({
        token,
        // Only pass filter parameters if they are set
        status:
          statusFilter && statusFilter !== "all"
            ? Number(statusFilter)
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
        sort_column: sortColumn || undefined,
        sort_order: sortOrder || undefined,
      });

      // The API response structure: { success, message, data: [...], pagination: {...}, filters: {...} }
      const payload = response.data as unknown as DepositReportListPayload;
      const reportItems = Array.isArray(payload?.data) ? payload.data : [];
      
      console.log("Report items:", reportItems);
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
      console.error("Failed to load deposit report:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load deposit report"
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
    setPage(1);
  }, [
    setStatusFilter,
    setPaymentMethodFilter,
    setSortColumn,
    setSortOrder,
    setPage,
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
    return count;
  }, [statusFilter, paymentMethodFilter, fromDate, toDate, sortColumn, sortOrder]);

  const columns: ColumnDef<DepositReportItem>[] = useMemo(
    () => [
      {
        id: "id",
        header: "ID",
        accessorKey: "id",
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.id}</span>
        ),
      },
      {
        id: "user",
        header: "User",
        accessorKey: "name_email",
        cell: ({ row }) => {
          const name = row.original.name;
          const email = row.original.email;
          if (!name && !email) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="space-y-0.5">
              <div className="font-medium">{name || "—"}</div>
              <div className="text-xs text-muted-foreground">{email || "—"}</div>
            </div>
          );
        },
      },
      {
        id: "amount",
        header: "Amount (USDT)",
        accessorKey: "amount",
        cell: ({ row }) => (
          <span className="font-medium">{formatAmount(row.original.amount)}</span>
        ),
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
        id: "transaction_hash",
        header: "Transaction Hash",
        accessorKey: "transaction_hash",
        cell: ({ row }) => {
          const hash = row.original.transaction_hash;
          if (!hash) return <span className="text-muted-foreground">—</span>;
          return (
            <span
              className="font-mono text-xs max-w-[200px] truncate block"
              title={String(hash)}
            >
              {hash}
            </span>
          );
        },
      },
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
          <div className="flex items-center gap-1 text-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>{fmtDateTime(row.original.created_at)}</span>
          </div>
        ),
      },
    ],
    []
  );

  if (loading && rows.length === 0) {
    return (
      <MainLayout>
        <ListPageSkeleton
          actionCount={2}
          columnCount={6}
          rowCount={10}
          filterPillCount={4}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-semibold">Deposit Report</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage and view deposit transactions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="relative "

                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                  <ChevronDown className="h-4 w-4 ml-2" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[600px] p-5 absolute right-1  " align="start">
                <div className="space-y-5">
                  {/* Filter Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">Filters</h3>
                    {total > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {total} total records
                      </span>
                    )}
                  </div>

                  {/* Main Filters */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Status Filter */}
                    <div className="space-y-1.5">
                      <Label htmlFor="status-filter-popover" className="text-xs font-medium text-muted-foreground">
                        Status
                      </Label>
                      <Select
                        value={statusFilter || undefined}
                        onValueChange={(value) => {
                          setStatusFilter(value === "all" ? null : value);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger id="status-filter-popover" className="h-9">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="0">Pending</SelectItem>
                          <SelectItem value="1">Approved</SelectItem>
                          <SelectItem value="2">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Payment Method Filter */}
                    <div className="space-y-1.5">
                      <Label htmlFor="payment-method-filter-popover" className="text-xs font-medium text-muted-foreground">
                        Payment Method
                      </Label>
                      <Select
                        value={paymentMethodFilter || undefined}
                        onValueChange={(value) => {
                          setPaymentMethodFilter(value === "all" ? null : value);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger id="payment-method-filter-popover" className="h-9">
                          <SelectValue placeholder="All Methods" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Methods</SelectItem>
                          {/* Add more payment methods as needed */}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* From Date */}
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

                    {/* To Date */}
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
                  </div>

                  {/* Sort Controls - Separated by border */}
                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="sort-column-popover" className="text-xs font-medium text-muted-foreground">
                          Sort By
                        </Label>
                        <Select
                          value={sortColumn || undefined}
                          onValueChange={(value) => {
                            setSortColumn(value);
                            setPage(1);
                          }}
                        >
                          <SelectTrigger id="sort-column-popover" className="h-9">
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
                        <Label htmlFor="sort-order-popover" className="text-xs font-medium text-muted-foreground">
                          Order
                        </Label>
                        <Select
                          value={sortOrder || undefined}
                          onValueChange={(value: "ASC" | "DESC") => {
                            setSortOrder(value);
                            setPage(1);
                          }}
                        >
                          <SelectTrigger id="sort-order-popover" className="h-9">
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

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        handleResetFilters();
                        setFilterPopoverOpen(false);
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setFilterPopoverOpen(false)}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button 
              variant="ghost" 
              size="sm"
              onClick={loadReport} 
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
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
            <AppDataTable<DepositReportItem>
              data={rows}
              columns={columns}
              pageCount={totalPages}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 
