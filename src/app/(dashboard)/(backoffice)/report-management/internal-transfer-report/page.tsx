"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { CalendarIcon, ArrowLeftRight } from "lucide-react";
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
import { useManagerPermissions } from "@/hooks/use-manager-permissions";

/* ---------------- Page ---------------- */
export default function InternalTransferReportPage() {
  const authCtx = useAuth?.();
  const { isManager, hasFeature } = useManagerPermissions();
  const canViewReport = !isManager || hasFeature("reportManagement", "internalTransferReport");
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

  const handleRefresh = useCallback(() => {
    void loadReport();
  }, [loadReport]);

  const handleExport = useCallback(async (formatType: ReportExportFormat) => {
    if (!canViewReport) {
      toast.error("You do not have permission to export internal transfer report");
      return;
    }
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
        "Amount (USD)": formatAmount(item.amount),
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
    canViewReport,
    token,
    searchQuery,
  ]);

  const columns: ColumnDef<InternalTransferReportItem>[] = useMemo(
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
        header: "Amount (USD)",
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
  if (!canViewReport) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          You do not have permission to view internal transfer report.
        </div>
      </div>
    );
  }

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
        <div className="flex items-center gap-2">
          <ApiSearchBar
            value={searchInput}
            onChange={(value) => setSearchInput(value)}
            onSearch={(value) => {
              setPage(1);
              setSearchQuery(value.trim() || null);
            }}
            placeholder="Search in amount, comments..."
            minimumLength={3}
            delay={300}
          />
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








