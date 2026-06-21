"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { CalendarIcon } from "lucide-react";
import * as XLSX from "xlsx";

import {
  adminLoginActivityReportApi,
  type LoginActivityReportItem,
  type LoginActivityReportListPayload,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { ReportPageWrapper } from "@/components/report-page-wrapper";
import type { ReportExportFormat } from "@/components/report-page-wrapper";
import { fmtDateTime } from "@/lib/formatters";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";

/* ---------------- Page ---------------- */
export default function LoginActivityReportPage() {
  const authCtx = useAuth?.();
  const { isManager, hasFeature } = useManagerPermissions();
  const canViewReport = !isManager || hasFeature("reportManagement", "loginActivity");
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [rows, setRows] = useState<LoginActivityReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Search filter - searches in IP address
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

      const response = await adminLoginActivityReportApi.list({
        token,
        search: searchQuery || undefined,
        page,
        per_page: perPage,
      });

      // The API response structure: { success, message, data: [...], pagination: {...}, filters: {...} }
      const payload = (response as unknown) as LoginActivityReportListPayload;
      const reportItems = Array.isArray(payload?.data) ? payload.data : [];
      
      console.log("Login activity report items:", reportItems);
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
      console.error("Failed to load login activity report:", error);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "login activity report",
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

  const handleExport = useCallback(async (formatType: ReportExportFormat) => {
    if (!canViewReport) {
      toast.error("You do not have permission to export login activity report");
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
      const response = await adminLoginActivityReportApi.list({
        token,
        search: searchQuery || undefined,
        page: 1,
        per_page: 10000, // Large number to get all records
      });

      const payload = (response as unknown) as LoginActivityReportListPayload;
      const reportItems = Array.isArray(payload?.data) ? payload.data : [];

      if (reportItems.length === 0) {
        toast.error("No data to export", { id: exportToastId });
        return;
      }

      const exportData = reportItems.map((item) => ({
        ID: item.id,
        "User ID": item.user_id || "—",
        "User Name": item.user?.name || item.name || "—",
        "User Email": item.user?.email || item.email || "—",
        "IP Address": item.ip_address || "—",
        "Browser": item.browser || "—",
        "Device": item.device || "—",
        "Platform": item.platform || "—",
        "User Agent": item.user_agent || "—",
        "Location": item.location || "—",
        "Country": item.country || "—",
        "City": item.city || "—",
        "Status": item.status ? String(item.status) : "—",
        "Login At": fmtDateTime(item.login_at || item.created_at),
        "Created At": fmtDateTime(item.created_at),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const filenameBase = `login-activity-report-${format(new Date(), "yyyy-MM-dd-HHmmss")}`;
      let filename = `${filenameBase}.xlsx`;
      if (formatType === "xlsx") {
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Login Activity Report");
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
          resource: "login activity report",
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

  const columns: ColumnDef<LoginActivityReportItem>[] = useMemo(
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
        accessorKey: "user",
        cell: ({ row }) => {
          const user = row.original.user;
          const name = user?.name || row.original.name;
          const email = user?.email || row.original.email;
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
        id: "ip_address",
        header: "IP Address",
        accessorKey: "ip_address",
        cell: ({ row }) => {
          const ip = row.original.ip_address;
          if (!ip) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="font-mono text-sm">{ip}</span>
          );
        },
      },
      // {
      //   id: "browser_device",
      //   header: "Browser / Device",
      //   accessorKey: "browser",
      //   cell: ({ row }) => {
      //     const browser = row.original.browser;
      //     const device = row.original.device;
      //     const platform = row.original.platform;
          
      //     return (
      //       <div className="space-y-0.5">
      //         {browser && (
      //           <div className="text-sm">{browser}</div>
      //         )}
      //         {(device || platform) && (
      //           <div className="text-xs text-muted-foreground">
      //             {device && platform ? `${device} / ${platform}` : device || platform}
      //           </div>
      //         )}
      //         {!browser && !device && !platform && (
      //           <span className="text-muted-foreground">—</span>
      //         )}
      //       </div>
      //     );
      //   },
      // },
      {
        id: "location",
        header: "Location",
        accessorKey: "location",
        cell: ({ row }) => {
          const location = row.original.state;
          const country = row.original.country;
          const city = row.original.city;
          
          if (!location && !country && !city) {
            return <span className="text-muted-foreground">—</span>;
          }
          
          return (
            <div className="space-y-0.5">
              {location && (
                <div className="text-sm">{location}</div>
              )}
              {(country || city) && (
                <div className="text-xs text-muted-foreground">
                  {country && city ? `${city}, ${country}` : country || city}
                </div>
              )}
            </div>
          );
        },
      },
      // {
      //   id: "status",
      //   header: "Status",
      //   accessorKey: "status",
      //   cell: ({ row }) => {
      //     const status = row.original.status;
      //     if (!status) return <span className="text-muted-foreground">—</span>;
      //     return (
      //       <span className="text-sm">{String(status)}</span>
      //     );
      //   },
      // },
      {
        id: "login_at",
        header: "Login Time",
        accessorKey: "login_at",
        cell: ({ row }) => {
          const loginAt = row.original.login_at || row.original.created_at;
          return (
            <div className="flex items-center gap-1 text-sm whitespace-nowrap">
              <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{fmtDateTime(loginAt)}</span>
            </div>
          );
        },
      },
    ],
    []
  );
  if (!canViewReport) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          You do not have permission to view login activity report.
        </div>
      </div>
    );
  }

  return (
    <ReportPageWrapper
      title="Login Activity Report"
      description="View and manage user login activities"
      isLoading={loading}
      isEmpty={rows.length === 0}
      error={loadError}
      onExport={handleExport}
      onRefresh={() => void loadReport()}
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
            placeholder="Search in IP address..."
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
            <AppDataTable<LoginActivityReportItem>
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









