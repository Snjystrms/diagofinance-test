"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { CalendarIcon, RefreshCw, Download, Search, X } from "lucide-react";
import * as XLSX from "xlsx";

import {
  adminLoginActivityReportApi,
  type LoginActivityReportItem,
  type LoginActivityReportListPayload,
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

/* ---------------- Page ---------------- */
export default function LoginActivityReportPage() {
  const authCtx = useAuth?.();
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [rows, setRows] = useState<LoginActivityReportItem[]>([]);
  const [loading, setLoading] = useState(true);
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
      toast.error(
        error instanceof Error ? error.message : "Failed to load login activity report"
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
      const response = await adminLoginActivityReportApi.list({
        token,
        search: searchQuery || undefined,
        page: 1,
        per_page: 10000, // Large number to get all records
      });

      const payload = (response as unknown) as LoginActivityReportListPayload;
      const reportItems = Array.isArray(payload?.data) ? payload.data : [];

      if (reportItems.length === 0) {
        toast.error("No data to export", { id: "export-excel" });
        return;
      }

      // Prepare data for Excel
      const excelData = reportItems.map((item) => ({
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

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Login Activity Report");

      // Generate filename with current date
      const filename = `login-activity-report-${format(new Date(), "yyyy-MM-dd-HHmmss")}.xlsx`;

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

  const columns: ColumnDef<LoginActivityReportItem>[] = useMemo(
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
      {
        id: "browser_device",
        header: "Browser / Device",
        accessorKey: "browser",
        cell: ({ row }) => {
          const browser = row.original.browser;
          const device = row.original.device;
          const platform = row.original.platform;
          
          return (
            <div className="space-y-0.5">
              {browser && (
                <div className="text-sm">{browser}</div>
              )}
              {(device || platform) && (
                <div className="text-xs text-muted-foreground">
                  {device && platform ? `${device} / ${platform}` : device || platform}
                </div>
              )}
              {!browser && !device && !platform && (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          );
        },
      },
      {
        id: "location",
        header: "Location",
        accessorKey: "location",
        cell: ({ row }) => {
          const location = row.original.location;
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
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => {
          const status = row.original.status;
          if (!status) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-sm">{String(status)}</span>
          );
        },
      },
      {
        id: "login_at",
        header: "Login Time",
        accessorKey: "login_at",
        cell: ({ row }) => {
          const loginAt = row.original.login_at || row.original.created_at;
          return (
            <div className="flex items-center gap-1 text-sm">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>{fmtDateTime(loginAt)}</span>
            </div>
          );
        },
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
            <h1 className="text-2xl font-semibold">Login Activity Report</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              View and manage user login activities
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
                  placeholder="Search in IP address..."
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
                Searching for IP address: <span className="font-medium">{searchQuery}</span>
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
            <AppDataTable<LoginActivityReportItem>
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








