"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Search, X, ArrowLeftRight } from "lucide-react";
import * as XLSX from "xlsx";

import {
  adminInternalTransferReportApi,
  type InternalTransferReportItem,
  type InternalTransferReportListPayload,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { ReportPageWrapper } from "@/components/report-page-wrapper";
import type { ReportExportFormat } from "@/components/report-page-wrapper";
import { fmtDateTime, formatAmount } from "@/lib/formatters";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

/* ---------------- Page ---------------- */
export default function InternalTransferReportPage() {
  const authCtx = useAuth?.();
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [rows, setRows] = useState<InternalTransferReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
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
      setLoadError(null);

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
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "internal transfer report",
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

  const handleRefresh = useCallback(() => {
    void loadReport();
  }, [loadReport]);

  const handleExport = useCallback(async (formatType: ReportExportFormat) => {
    if (!token) {
      toast.error("Authentication required to export data");
      return;
    }

    try {
      const exportToastId = `export-${formatType}`;
      toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });

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
        toast.error("No data to export", { id: exportToastId });
        return;
      }

      const exportData = reportItems.map((item) => ({
        ID: item.id,
        "User Name": item.name || "—",
        "User Email": item.email || "—",
        "From Account": item.from_account || "—",
        "To Account": item.to_account || "—",
        "Amount (USDT)": formatAmount(item.amount),
        "Comment": item.comment || "—",
        "Marketing Name": item.marketing_name || "—",
        "Type": item.type ?? "—",
        "Status": item.status === 1 ? "Success" : item.status != null ? "Pending" : "—",
        "Created At": fmtDateTime(item.created_at),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const filenameBase = `internal-transfer-report-${format(new Date(), "yyyy-MM-dd-HHmmss")}`;
      let filename = `${filenameBase}.xlsx`;
      if (formatType === "xlsx") {
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Internal Transfer Report");
        XLSX.writeFile(workbook, filename);
      } else {
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        filename = `${filenameBase}.csv`;
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }

      toast.success(`Exported ${reportItems.length} records to ${filename}`, {
        id: exportToastId,
      });
    } catch (error: unknown) {
      console.error(`Failed to export ${formatType}:`, error);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "internal transfer report",
          action: "export",
        }),
        { id: `export-${formatType}` }
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
        header: "Sr. No.",
        accessorKey: "id",
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.index + 1}</span>
        ),
      },
      {
        id: "user",
        header: "User",
        accessorKey: "name",
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
        id: "transfer_details",
        header: "Transfer Details",
        accessorKey: "from_account",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <div className="text-sm">
              <span className="text-muted-foreground">From:</span> {row.original.from_account || "—"}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">To:</span> {row.original.to_account || "—"}
            </div>
          </div>
        ),
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
        id: "comment",
        header: "Comment",
        accessorKey: "comment",
        cell: ({ row }) => {
          const comment = row.original.comment;
          if (!comment) return <span className="text-muted-foreground">—</span>;
          return (
            <span
              className="text-sm max-w-[200px] truncate block"
              title={String(comment)}
            >
              {comment}
            </span>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => {
          const status = row.original.status;
          if (status == null) return <span className="text-muted-foreground">—</span>;
          const isSuccess = status === 1;
          return (
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                isSuccess
                  ? "bg-green-50 text-green-700 border-green-600/30"
                  : "bg-yellow-50 text-yellow-700 border-yellow-600/30"
              }`}
            >
              {isSuccess ? "Success" : "Pending"}
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
            <span>{fmtDateTime(row.original.created_at)}</span>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <ReportPageWrapper
      title="Internal Transfer Report"
      titleIcon={<ArrowLeftRight className="h-6 w-6 text-primary" />}
      description="Manage and view internal transfer transactions"
      isLoading={loading}
      isEmpty={rows.length === 0}
      error={loadError}
      onExport={handleExport}
      onRefresh={handleRefresh}
      isRefreshing={loading}
    >
      <div className="space-y-4">
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
    </ReportPageWrapper>
  );
}






