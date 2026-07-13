"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { CalendarIcon, RefreshCw, Download, ChevronDown, BarChart3, Search } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  adminIbUsersReportApi,
  type IbUsersReportItem,
  type IbUsersReportListPayload,
} from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";
import { useAuth } from "@/contexts/auth-context";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import { ManualSortHeader } from "@/components/data-table/manual-sort-header";

/* ---------------- Helpers ---------------- */
const fmtDateTime = (s?: string | null) => {
  if (!s) return "—";
  try {
    return formatDateTimeInIST(s);
  } catch {
    return s;
  }
};

const formatAmount = (amount: string | number) => {
  try {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return String(amount);
  }
};

/* ---------------- Page ---------------- */
export default function AllPartnersReportPage() {
  const authCtx = useAuth?.();
  const { isManager, hasFeature } = useManagerPermissions();
  const canViewReport = !isManager || hasFeature("reportManagement", "ibUsersReport");
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [rows, setRows] = useState<IbUsersReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [verificationStatusFilter, setVerificationStatusFilter] = useQueryState(
    "verification_status",
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

  const requestIdRef = useRef(0);

  const loadReport = useCallback(async () => {
    if (!token) {
      setRows([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);
      setLoadError(null);

      const response = await adminIbUsersReportApi.list({
        token,
        page,
        per_page: perPage,
        from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
        verification_status:
          verificationStatusFilter && verificationStatusFilter !== "all"
            ? verificationStatusFilter
            : undefined,
        search: searchQuery || undefined,
        sort_column: sortBy || undefined,
        sort_order: sortOrder ? (sortOrder.toUpperCase() as "ASC" | "DESC") : undefined,
      });

      if (requestId !== requestIdRef.current) return;

      const payload = response as unknown as IbUsersReportListPayload;
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
      if (requestId !== requestIdRef.current) return;
      console.error("Failed to load IB users report:", error);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "all partners report",
          action: "load",
        })
      );
      setRows([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    token,
    page,
    perPage,
    fromDate,
    toDate,
    verificationStatusFilter,
    searchQuery,
    sortBy,
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
    setVerificationStatusFilter(null);
    setFromDate(undefined);
    setToDate(undefined);
    setSortBy(null);
    setSortOrder(null);
    setSearchInput("");
    setSearchQuery(null);
    setPage(1);
  }, [
    setVerificationStatusFilter,
    setSortBy,
    setSortOrder,
    setSearchQuery,
    setPage,
  ]);

  const handleExport = useCallback(async (formatType: "xlsx" | "csv") => {
    if (!canViewReport) {
      toast.error("You do not have permission to export partner report");
      return;
    }
    if (!token) {
      toast.error("Authentication required to export data");
      return;
    }
    const exportToastId = `export-${formatType}`;
    try {
      toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });
      
      const { blob, filename } = await adminIbUsersReportApi.export({
        token,
        format: formatType,
        from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
        verification_status:
          verificationStatusFilter && verificationStatusFilter !== "all"
            ? verificationStatusFilter
            : undefined,
        search: searchQuery || undefined,
        sort_column: sortBy || undefined,
        sort_order: sortOrder ? (sortOrder.toUpperCase() as "ASC" | "DESC") : undefined,
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
          resource: "all partners report",
          action: "export",
        }),
        { id: exportToastId }
      );
    }
  }, [canViewReport, token, fromDate, toDate, verificationStatusFilter, searchQuery, sortBy, sortOrder]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (verificationStatusFilter) count++;
    if (fromDate) count++;
    if (toDate) count++;
    if (sortBy) count++;
    if (sortOrder) count++;
    if (searchQuery) count++;
    return count;
  }, [verificationStatusFilter, fromDate, toDate, sortBy, sortOrder, searchQuery]);

  const columns: ColumnDef<IbUsersReportItem>[] = useMemo(
    () => [
      {
        id: "id",
        header: "Sr. No.",
        accessorKey: "sr_no",
        cell: ({ row, table }) => (
          <SerialNumberCell row={row} table={table} className="font-mono text-sm" />
        ),
      },
      {
        id: "user",
        header: "Partner Details",
        accessorKey: "name",
        cell: ({ row }) => {
          const status = row.original.verification_status;
          return (
            <div className="space-y-0.5">
              <div className="font-medium flex items-center gap-1.5 flex-wrap">
                <span>{row.original.name || "-"}</span>
                {status && (
                  <Badge variant="outline" className={cn("text-[9px] px-1 py-0 font-semibold uppercase", 
                    status === "full-verified" 
                      ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800/40" 
                      : status === "semi-verified"
                      ? "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40"
                      : "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/40 dark:text-gray-300 dark:border-gray-700/40"
                  )}>
                    {status.replace("-", " ")}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{row.original.email || "-"}</div>
              <code className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1 py-0.5 rounded">{row.original.uuid || "-"}</code>
            </div>
          );
        },
      },
      {
        id: "deposit",
        header: () => <ManualSortHeader sortKey="deposit" title="Personal Deposit" />,
        accessorKey: "deposit",
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap">${formatAmount(row.original.deposit)}</span>
        ),
      },
      {
        id: "team_deposit",
        header: () => <ManualSortHeader sortKey="team_deposit" title="Team Deposit" />,
        accessorKey: "team_deposit",
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap">${formatAmount(row.original.team_deposit)}</span>
        ),
      },
      {
        id: "withdrawal",
        header: () => <ManualSortHeader sortKey="withdrawal" title="Personal Withdrawal" />,
        accessorKey: "withdrawal",
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap">${formatAmount(row.original.withdrawal)}</span>
        ),
      },
      {
        id: "team_withdrawal",
        header: () => <ManualSortHeader sortKey="team_withdrawal" title="Team Withdrawal" />,
        accessorKey: "team_withdrawal",
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap">${formatAmount(row.original.team_withdrawal)}</span>
        ),
      },
      {
        id: "ib_commission",
        header: () => <ManualSortHeader sortKey="ib_commission" title="Partner Commission" />,
        accessorKey: "ib_commission",
        cell: ({ row }) => (
          <span className="font-semibold text-primary whitespace-nowrap">${formatAmount(row.original.ib_commission)}</span>
        ),
      },
      {
        id: "main_wallet",
        header: () => <ManualSortHeader sortKey="main_wallet_balance" title="Main Wallet" />,
        accessorKey: "main_wallet_balance",
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap">${formatAmount(row.original.main_wallet_balance)}</span>
        ),
      },
      {
        id: "partner_wallet",
        header: () => <ManualSortHeader sortKey="partner_wallet_balance" title="Partner Wallet" />,
        accessorKey: "partner_wallet_balance",
        cell: ({ row }) => (
          <span className="font-medium whitespace-nowrap">${formatAmount(row.original.partner_wallet_balance)}</span>
        ),
      },
      {
        id: "referred_by",
        header: "Referred By",
        accessorKey: "referred_by_name",
        cell: ({ row }) => {
          const name = row.original.referred_by_name;
          const email = row.original.referred_by_email;
          if (!name && !email) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="space-y-0.5 text-xs">
              <div className="font-medium text-foreground">{name || "-"}</div>
              <div className="text-muted-foreground">{email || "-"}</div>
            </div>
          );
        },
      },
      {
        id: "created_at",
        header: () => <ManualSortHeader sortKey="created_at" title="Registered At" />,
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

  if (loading && rows.length === 0) {
    return (
      <ListPageSkeleton
        actionCount={2}
        columnCount={8}
        rowCount={10}
        filterPillCount={4}
      />
    );
  }

  if (loadError && rows.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          error={loadError}
          audience="admin"
          variant="panel"
          resource="all partners report"
          action="load"
          onRetry={() => {
            void loadReport();
          }}
        />
      </div>
    );
  }

  if (!canViewReport) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          You do not have permission to view all partners report.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <BarChart3 className="h-6 w-6 text-primary" />
            All Partners Report
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage and view Partner (IB) metrics and transaction summaries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void handleExport("xlsx")}>Export Excel (.xlsx)</DropdownMenuItem>
              {/* <DropdownMenuItem onClick={() => void handleExport("csv")}>Export CSV (.csv)</DropdownMenuItem> */}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            size="sm"
            onClick={loadReport} 
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Section */}
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
            placeholder="Search by name or email..."
            minimumLength={3}
            delay={300}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="verification-status-filter" className="text-xs font-medium text-muted-foreground">Verification Status</Label>
            <Select
              value={verificationStatusFilter || "all"}
              onValueChange={(value) => {
                setVerificationStatusFilter(value === "all" ? null : value);
                setPage(1);
              }}
            >
              <SelectTrigger id="verification-status-filter" className="h-9 w-full">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="semi-verified">Semi Verified</SelectItem>
                <SelectItem value="full-verified">Full Verified</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="md:col-span-1 lg:col-span-3">
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
          <AppDataTable<IbUsersReportItem>
            data={rows}
            columns={columns}
            pageCount={totalPages}
          />
        </div>
      </div>
    </div>
  );
}
