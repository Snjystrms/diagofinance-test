"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, RefreshCw, Download, Filter, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

import {
  adminIbWithdrawalReportApi,
  type IbWithdrawalReportItem,
  type IbWithdrawalReportListPayload,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { ReportPageWrapper } from "@/components/report-page-wrapper";
import { fmtDateTime, formatAmount } from "@/lib/formatters";

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
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [rows, setRows] = useState<IbWithdrawalReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  
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

      const response = await adminIbWithdrawalReportApi.list({
        token,
        from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
        page,
        per_page: perPage,
      });

      // The API response structure: { success, message, data: [...], pagination: {...}, filters: {...} }
      const payload = (response as unknown) as IbWithdrawalReportListPayload;
      const reportItems = Array.isArray(payload?.data) ? payload.data : [];
      
      console.log("IB Withdrawal report items:", reportItems);
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
      console.error("Failed to load IB withdrawal report:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load IB withdrawal report"
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
    setPage(1);
  }, [
    setPage,
  ]);

  const handleExportExcel = useCallback(async () => {
    if (!token) {
      toast.error("Authentication required to export data");
      return;
    }

    try {
      toast.loading("Preparing Excel export...", { id: "export-excel" });

      // Fetch all data for export (use a large per_page to get all records)
      const response = await adminIbWithdrawalReportApi.list({
        token,
        from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        to_date: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
        page: 1,
        per_page: 10000, // Large number to get all records
      });

      const payload = (response as unknown) as IbWithdrawalReportListPayload;
      const reportItems = Array.isArray(payload?.data) ? payload.data : [];

      if (reportItems.length === 0) {
        toast.error("No data to export", { id: "export-excel" });
        return;
      }

      // Prepare data for Excel
      const excelData = reportItems.map((item) => ({
        ID: item.id,
        "IB Name": item.ib_name || "—",
        "Partner ID": item.partner_id || "—",
        "User Name": item.name || "—",
        "User Email": item.email || "—",
        "Amount (USDT)": formatAmount(item.amount),
        "Payment Method": item.payment_method || "—",
        "Wallet Address": item.wallet_address || "—",
        "Chain ID": item.chain_id || "—",
        "Transaction Hash": item.transaction_hash || "—",
        Status:
          item.status === 1 || item.status === "approved"
            ? "Approved"
            : item.status === 2 || item.status === "rejected"
              ? "Rejected"
              : "Pending",
        "Created At": fmtDateTime(item.created_at),
        "Updated At": fmtDateTime(item.updated_at),
        Remarks: item.remarks || "—",
        "Approved By": item.approved_by || "—",
        "Approved At": fmtDateTime(item.approved_at),
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "IB Withdrawal Report");

      // Generate filename with current date
      const filename = `ib-withdrawal-report-${format(new Date(), "yyyy-MM-dd-HHmmss")}.xlsx`;

      // Write file
      XLSX.writeFile(workbook, filename);

      toast.success(`Exported ${reportItems.length} records to ${filename}`, {
        id: "export-excel",
      });
    } catch (error: unknown) {
      console.error("Failed to export Excel:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to export Excel file",
        { id: "export-excel" }
      );
    }
  }, [
    token,
    fromDate,
    toDate,
  ]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (fromDate) count++;
    if (toDate) count++;
    return count;
  }, [fromDate, toDate]);

  const columns: ColumnDef<IbWithdrawalReportItem>[] = useMemo(
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
        id: "ib_info",
        header: "IB Info",
        accessorKey: "ib_name",
        cell: ({ row }) => {
          const ibName = row.original.ib_name;
          const partnerId = row.original.partner_id;
          if (!ibName && !partnerId) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="space-y-0.5">
              <div className="font-medium">{ibName || "—"}</div>
              <div className="text-xs text-muted-foreground">{partnerId ? `ID: ${partnerId}` : "—"}</div>
            </div>
          );
        },
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
        id: "wallet_address",
        header: "Wallet Address",
        accessorKey: "wallet_address",
        cell: ({ row }) => {
          const address = row.original.wallet_address;
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

  return (
    <ReportPageWrapper
      title="IB Withdrawal Report"
      description={<></>}
      isLoading={loading}
      isEmpty={rows.length === 0}
      onRefresh={handleRefresh}
      isRefreshing={loading}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage and view IB withdrawal transactions
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

                  {/* Main Filters - Date Range Only */}
                  <div className="grid grid-cols-2 gap-4">
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
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={loading || rows.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>

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







