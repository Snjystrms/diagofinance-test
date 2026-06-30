"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Landmark,
} from "lucide-react";
import toast from "react-hot-toast";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";

import { ApiSearchBar } from "@/components/ui/api-search-bar";

import { ReportPageWrapper } from "@/components/report-page-wrapper";
import type { ReportExportFormat } from "@/components/report-page-wrapper";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import {
  adminIbCommissionListReportApi,
  type IbCommissionGroup,
  type IbCommissionLevel,
  type IbLevelTrader,
  type IbCommissionReportListPayload,
} from "@/lib/api-finance-reports";
import { formatAmount } from "@/lib/formatters";

export default function IbCommissionReportPage() {
  const authCtx = useAuth?.();
  const { isManager, hasFeature } = useManagerPermissions();
  const canViewReport = !isManager || hasFeature("reportManagement", "ibCommissionReport");
  const ctxToken = authCtx?.token;
  const token =
    ctxToken ||
    (typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "");

  const [groups, setGroups] = useState<IbCommissionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Search
  const [searchQuery, setSearchQuery] = useQueryState("search", parseAsString);
  const [searchInput, setSearchInput] = useState(searchQuery || "");

  useEffect(() => {
    setSearchInput(searchQuery || "");
  }, [searchQuery]);

  const loadReport = useCallback(async () => {
    if (!token) {
      setGroups([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      const response = await adminIbCommissionListReportApi.list({
        token,
        search: searchQuery || undefined,
        page,
        per_page: perPage,
      });

      const payload = response as unknown as IbCommissionReportListPayload;
      const reportGroups = Array.isArray(payload?.data) ? payload.data : [];

      setGroups(reportGroups);

      const paginationData = payload?.pagination;
      if (paginationData) {
        setTotalPages(paginationData.last_page ?? 1);
        setTotal(paginationData.total ?? 0);
      } else {
        setTotalPages(1);
        setTotal(reportGroups.length);
      }
    } catch (error: unknown) {
      console.error("Failed to load IB commission report:", error);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "IB commission report",
          action: "load",
        })
      );
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage, searchQuery]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const handleExport = useCallback(
    async (formatType: ReportExportFormat) => {
      if (!canViewReport) {
        toast.error("You do not have permission to export IB commission report");
        return;
      }
      if (!token) {
        toast.error("Authentication required to export data");
        return;
      }

      const exportToastId = `ib-commission-report-export-${formatType}`;
      try {
        toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });

        const { blob, filename } = await adminIbCommissionListReportApi.export({
          token,
          format: formatType,
        });

        if (!blob.size) {
          toast.error("No data returned for export", { id: exportToastId });
          return;
        }

        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);

        toast.success(`Downloaded ${filename}`, { id: exportToastId });
      } catch (error: unknown) {
        console.error(`Failed to export ${formatType}:`, error);
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "IB commission report",
            action: "export",
          }),
          { id: exportToastId }
        );
      }
    },
    [canViewReport, token]
  );

  if (!canViewReport) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          You do not have permission to view IB commission report.
        </div>
      </div>
    );
  }

  return (
    <ReportPageWrapper
      title="Partner Commission Report"
      titleIcon={<Landmark className="h-6 w-6 text-primary" />}
      description="View commission entries generated from trader activity."
      isLoading={loading}
      isEmpty={groups.length === 0}
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
            placeholder="Search by IB name, email..."
            minimumLength={3}
            delay={300}
          />
        </div>

        <div className="rounded-lg border bg-card">
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Results</h2>
              <span className="text-xs text-muted-foreground">
                Showing {groups.length} of {total} results
              </span>
            </div>

            <div className="space-y-3">
              {groups.map((group) => (
                <IbCommissionGroupCard key={group.ib_user_id} group={group} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex w-full flex-col-reverse items-center justify-between gap-4 border-t pt-4 sm:flex-row sm:gap-8">
                <div className="flex-1 whitespace-nowrap text-sm text-muted-foreground">
                  Showing {groups.length} of {total} results
                </div>
                <div className="flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8">
                  <div className="flex items-center justify-center text-sm font-medium">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      aria-label="Go to first page"
                      variant="outline"
                      size="icon"
                      className="hidden size-8 lg:flex"
                      onClick={() => setPage(1)}
                      disabled={page <= 1}
                    >
                      <ChevronsLeft />
                    </Button>
                    <Button
                      aria-label="Go to previous page"
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                    >
                      <ChevronLeft />
                    </Button>
                    <Button
                      aria-label="Go to next page"
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight />
                    </Button>
                    <Button
                      aria-label="Go to last page"
                      variant="outline"
                      size="icon"
                      className="hidden size-8 lg:flex"
                      onClick={() => setPage(totalPages)}
                      disabled={page >= totalPages}
                    >
                      <ChevronsRight />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ReportPageWrapper>
  );
}

function IbCommissionGroupCard({ group }: { group: IbCommissionGroup }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors">
          <div className="flex flex-1 items-center gap-4">
            <div className="min-w-0 text-left">
              <div className="font-semibold">{group.ib_user_name}</div>
              <div className="text-xs text-muted-foreground">{group.ib_user_email}</div>
            </div>
            <div className="ml-auto flex items-center gap-6 text-sm">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Volume</div>
                <div className="font-medium">{formatAmount(group.total_volume)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Commission</div>
                <div className="font-medium">{formatAmount(group.total_commission)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Pending</div>
                <div className="font-medium">{formatAmount(group.total_pending)}</div>
              </div>
            </div>
          </div>
          <ChevronDown
            className={`ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-4 py-3">
            <h4 className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Commission Levels
            </h4>
            {group.levels.length > 0 ? (
              <div className="space-y-2">
                {group.levels.map((level) => (
                  <IbCommissionLevelCard key={level.level} level={level} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No levels configured.</p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function IbCommissionLevelCard({ level }: { level: IbCommissionLevel }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-md border">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-semibold">Level {level.level}</span>
            <span className="text-muted-foreground">
              Rate: {formatAmount(level.commission_rate)}$
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Vol: <span className="font-medium text-foreground">{formatAmount(level.total_volume)}</span>
            </span>
            <span className="text-muted-foreground">
              Comm: <span className="font-medium text-foreground">{formatAmount(level.commission_amount)}</span>
            </span>
            <span className="text-muted-foreground">
              Pending: <span className="font-medium text-foreground">{formatAmount(level.pending_commission)}</span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {level.traders.length > 0 ? (
            <div className="border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trader</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {level.traders.map((trader) => (
                    <IbCommissionTraderRow key={trader.trader_user_id} trader={trader} />
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="border-t px-4 py-3 text-sm text-muted-foreground">
              No traders in this level.
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function IbCommissionTraderRow({ trader }: { trader: IbLevelTrader }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{trader.trader_name || "-"}</TableCell>
      <TableCell className="text-muted-foreground">{trader.trader_email || "-"}</TableCell>
      <TableCell className="text-right whitespace-nowrap">{formatAmount(trader.total_volume)}</TableCell>
      <TableCell className="text-right whitespace-nowrap">{formatAmount(trader.commission_amount)}</TableCell>
      <TableCell className="text-right whitespace-nowrap">{formatAmount(trader.pending_commission)}</TableCell>
    </TableRow>
  );
}
