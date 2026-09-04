"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import toast from "react-hot-toast";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { format } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { CalendarIcon, X } from "lucide-react";

import {
  adminLoginActivityReportApi,
  type LoginActivityReportItem,
  type LoginActivityReportListPayload,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { ReportPageWrapper } from "@/components/report-page-wrapper";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
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

  // Date filters
  const [fromDateParam, setFromDateParam] = useQueryState(
    "from_date",
    parseAsString,
  );
  const [toDateParam, setToDateParam] = useQueryState("to_date", parseAsString);
  const [fromDate, setFromDate] = useState<Date | undefined>(
    fromDateParam ? new Date(fromDateParam) : undefined,
  );
  const [toDate, setToDate] = useState<Date | undefined>(
    toDateParam ? new Date(toDateParam) : undefined,
  );

  // Sync search input with query param
  useEffect(() => {
    setSearchInput(searchQuery || "");
  }, [searchQuery]);

  const handleDateChange = useCallback(
    (date: Date | undefined, type: "from" | "to") => {
      if (type === "from") {
        setFromDate(date);
        setFromDateParam(date ? format(date, "yyyy-MM-dd") : null);
      } else {
        setToDate(date);
        setToDateParam(date ? format(date, "yyyy-MM-dd") : null);
      }
    },
    [setFromDateParam, setToDateParam],
  );

  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    setSearchQuery(null);
    setFromDate(undefined);
    setFromDateParam(null);
    setToDate(undefined);
    setToDateParam(null);
    setPage(1);
  }, [setSearchQuery, setFromDateParam, setToDateParam, setPage]);

  const hasActiveFilters = Boolean(
    searchQuery || fromDateParam || toDateParam,
  );

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
        from_date: fromDateParam || undefined,
        to_date: toDateParam || undefined,
        page,
        per_page: perPage,
      });

      // The API response structure: { success, message, data: [...], pagination: {...}, filters: {...} }
      const payload = (response as unknown) as LoginActivityReportListPayload;
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
    fromDateParam,
    toDateParam,
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
    const exportToastId = `export-${formatType}`;
    try {
      toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });
      
      const { blob, filename } = await adminLoginActivityReportApi.export({
        token,
        format: formatType,
        search: searchQuery || undefined,
        from_date: fromDateParam || undefined,
        to_date: toDateParam || undefined,
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
          resource: "login activity report",
          action: "export",
        }),
        { id: exportToastId }
      );
    }
  }, [
    canViewReport,
    token,
    searchQuery,
    fromDateParam,
    toDateParam,
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
        <div className="rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
          <div className="min-w-[240px] flex-1">
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
          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          ) : null}
        </div>
         </div>

        {/* Results Section */}
        {loading && rows.length === 0 ? (
          <TableSectionSkeleton columnCount={6} />
        ) : (
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
        )}
      </div>
    </ReportPageWrapper>
  );
}









