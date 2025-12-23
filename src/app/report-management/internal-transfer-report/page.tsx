"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { CalendarIcon, RefreshCw, Download, Search, X } from "lucide-react";
import * as XLSX from "xlsx";

import {
  adminInternalTransferReportApi,
  type InternalTransferReportItem,
  type InternalTransferReportListPayload,
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

/* ---------------- Page ---------------- */
export default function InternalTransferReportPage() {
  const authCtx = useAuth?.();
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [rows, setRows] = useState<InternalTransferReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Search filter
  const [searchQuery, setSearchQuery] = useQueryState("search", parseAsString);
  const [searchInput, setSearchInput] = useState(searchQuery || "");

  // Sync search input with query param
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

      const response = await adminInternalTransferReportApi.list({
        token,
        search: searchQuery || undefined,
        page,
        per_page: perPage,
      });

      // The API response structure: { success, message, data: [...], pagination: {...}, filters: {...} }
      const payload = (response as unknown) as InternalTransferReportListPayload;
      const reportItems = Array.isArray(payload?.data) ? payload.data : [];
      
      console.log("Internal transfer report items:", reportItems);
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
      console.error("Failed to load internal transfer report:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to load internal transfer report"
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    token,
    page,
    perPage,
    searchQuery,
  ]);

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
  }, [setSearchQuery, setPage]);

  const handleResetFilters = useCallback(() => {
    setSearchInput("");
    setSearchQuery(null);
    setPage(1);
  }, [
    setSearchQuery,
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
      const response = await adminInternalTransferReportApi.list({
        token,
        search: searchQuery || undefined,
        page: 1,
        per_page: 10000, // Large number to get all records
      });

      const payload = (response as unknown) as InternalTransferReportListPayload;
      const reportItems = Array.isArray(payload?.data) ? payload.data : [];

      if (reportItems.length === 0) {
        toast.error("No data to export", { id: "export-excel" });
        return;
      }

      // Prepare data for Excel
      const excelData = reportItems.map((item) => ({
        ID: item.id,
        "User ID": item.user_id || "—",
        "User Name": item.user?.name || "—",
        "User Email": item.user?.email || "—",
        "From Account": item.from_account || "—",
        "To Account": item.to_account || "—",
        "From Wallet Type": item.from_wallet_type || "—",
        "To Wallet Type": item.to_wallet_type || "—",
        "From MT5 Account ID": item.from_mt5_account_id || "—",
        "To MT5 Account ID": item.to_mt5_account_id || "—",
        "Amount (USDT)": formatAmount(item.amount),
        "Transfer Type": item.transfer_type || "—",
        "Transfer Mode": item.transfer_mode || "—",
        "Remarks": item.remarks || item.comment || "—",
        "Status": item.status_text || (item.status ? String(item.status) : "—"),
        "Created At": fmtDateTime(item.created_at),
        "Updated At": fmtDateTime(item.updated_at),
      }));

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Internal Transfer Report");

      // Generate filename with current date
      const filename = `internal-transfer-report-${format(new Date(), "yyyy-MM-dd-HHmmss")}.xlsx`;

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
    searchQuery,
  ]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    return count;
  }, [searchQuery]);

  const columns: ColumnDef<InternalTransferReportItem>[] = useMemo(
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
        accessorKey: "user",
        cell: ({ row }) => {
          const user = row.original.user;
          if (!user) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="space-y-0.5">
              <div className="font-medium">{user.name || "—"}</div>
              <div className="text-xs text-muted-foreground">{user.email || "—"}</div>
            </div>
          );
        },
      },
      {
        id: "transfer_details",
        header: "Transfer Details",
        accessorKey: "transfer_type",
        cell: ({ row }) => {
          const fromAccount = row.original.from_account || row.original.from_wallet_type || row.original.from_mt5_account_id;
          const toAccount = row.original.to_account || row.original.to_wallet_type || row.original.to_mt5_account_id;
          const transferType = row.original.transfer_type;
          const transferMode = row.original.transfer_mode;
          
          return (
            <div className="space-y-0.5">
              <div className="text-sm">
                <span className="text-muted-foreground">From:</span> {fromAccount || "—"}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">To:</span> {toAccount || "—"}
              </div>
              {(transferType || transferMode) && (
                <div className="text-xs text-muted-foreground">
                  {transferType && transferMode ? `${transferType} / ${transferMode}` : transferType || transferMode}
                </div>
              )}
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
        id: "remarks",
        header: "Remarks",
        accessorKey: "remarks",
        cell: ({ row }) => {
          const remarks = row.original.remarks || row.original.comment;
          if (!remarks) return <span className="text-muted-foreground">—</span>;
          return (
            <span
              className="text-sm max-w-[200px] truncate block"
              title={String(remarks)}
            >
              {remarks}
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => {
          const status = row.original.status_text || row.original.status;
          if (!status) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-sm">{String(status)}</span>
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
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner className="h-8 w-8" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Internal Transfer Report</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage and view internal transfer transactions
            </p>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Search Section */}
        <div className="rounded-lg border bg-card p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Search</h2>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search in amount, comments..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  className="pl-9"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading}
                size="default"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              {searchQuery && (
                <Button
                  variant="outline"
                  onClick={handleClearSearch}
                  size="default"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {searchQuery && (
              <div className="text-sm text-muted-foreground">
                Searching for: <span className="font-medium">{searchQuery}</span>
              </div>
            )}
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
            <AppDataTable<InternalTransferReportItem>
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








