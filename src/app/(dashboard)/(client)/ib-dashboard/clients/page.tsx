"use client";

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { ArrowLeft, DollarSign, RefreshCw, Search, Users } from "lucide-react";

import { ApiErrorState } from "@/components/errors/api-error-state";
import { IbMetricCard, IbPageHeader, IbPageShell, IbSectionCard } from "@/components/ib/ib-page-primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { type IbClient, type IbRebate, type IbSubIb, ibRequestsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

type TabType = "clients" | "sub-ibs" | "rebates";
type PaginationState = {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

const emptyPagination: PaginationState = {
  current_page: 1,
  per_page: 10,
  total: 0,
  total_pages: 1,
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function ClientsLoadingState() {
  return (
    <IbPageShell>
      <section className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-10 w-64 rounded-full" />
          <Skeleton className="h-4 w-full max-w-xl rounded-full" />
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
            <div className="space-y-4">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-8 w-32 rounded-full" />
              <Skeleton className="h-4 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </IbPageShell>
  );
}

function EmptyState({ title, description, icon }: { title: string; description: string; icon: ReactNode }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-muted/10 px-6 text-center">
      <div className="mb-4 rounded-2xl border border-border/60 bg-background/80 p-3 text-muted-foreground">{icon}</div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SummaryTable({
  rows,
  includeLevel = false,
}: {
  rows: Array<IbClient | IbSubIb | IbRebate>;
  includeLevel?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Client ID</TableHead>
            <TableHead>Name</TableHead>
            {includeLevel ? <TableHead>Level</TableHead> : null}
            <TableHead className="text-right">Lots Traded</TableHead>
            <TableHead className="text-right">Pending Rebates</TableHead>
            <TableHead className="text-right">Earned Rebates</TableHead>
            <TableHead>Registration Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.client_id}-${row.registration_date}`}>
              <TableCell className="font-mono text-xs sm:text-sm">{row.client_id}</TableCell>
              <TableCell className="font-medium">{row.client_name}</TableCell>
              {includeLevel ? (
                <TableCell>
                  {"level" in row ? (
                    <span className="inline-flex rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium">
                      Level {row.level}
                    </span>
                  ) : null}
                </TableCell>
              ) : null}
              <TableCell className="text-right">
                {row.lots_traded.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(row.pending_rebates, "USD")}</TableCell>
              <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-300">
                {formatCurrency(row.earned_rebates, "USD")}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(row.registration_date)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PaginationControls({
  pagination,
  isLoading,
  onPageChange,
}: {
  pagination: PaginationState;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}) {
  if (pagination.total_pages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        Showing {(pagination.current_page - 1) * pagination.per_page + 1} to{" "}
        {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total} results
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.current_page - 1)}
          disabled={pagination.current_page === 1 || isLoading}
        >
          Previous
        </Button>
        {Array.from({ length: pagination.total_pages }, (_, index) => index + 1)
          .filter((pageNum) => {
            if (pageNum === 1 || pageNum === pagination.total_pages) return true;
            return pageNum >= pagination.current_page - 1 && pageNum <= pagination.current_page + 1;
          })
          .map((pageNum, index, array) => {
            const showEllipsis = index > 0 && pageNum - array[index - 1] > 1;

            return (
              <div key={pageNum} className="flex items-center gap-2">
                {showEllipsis ? <span className="px-1 text-muted-foreground">...</span> : null}
                <Button
                  variant={pageNum === pagination.current_page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  disabled={isLoading}
                  className="min-w-[2.5rem]"
                >
                  {pageNum}
                </Button>
              </div>
            );
          })}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.current_page + 1)}
          disabled={pagination.current_page === pagination.total_pages || isLoading}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function IbClientsPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useQueryState("tab", {
    parse: (value) => (value === "clients" || value === "sub-ibs" || value === "rebates" ? value : "clients"),
    defaultValue: "clients",
  });

  const [clients, setClients] = useState<IbClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<unknown | null>(null);
  const [clientsPagination, setClientsPagination] = useState<PaginationState>(emptyPagination);

  const [subIbs, setSubIbs] = useState<IbSubIb[]>([]);
  const [subIbsLoading, setSubIbsLoading] = useState(false);
  const [subIbsError, setSubIbsError] = useState<unknown | null>(null);
  const [subIbsPagination, setSubIbsPagination] = useState<PaginationState>(emptyPagination);

  const [rebates, setRebates] = useState<IbRebate[]>([]);
  const [rebatesLoading, setRebatesLoading] = useState(false);
  const [rebatesError, setRebatesError] = useState<unknown | null>(null);
  const [rebatesPagination, setRebatesPagination] = useState<PaginationState>(emptyPagination);

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [limit] = useQueryState("limit", parseAsInteger.withDefault(10));
  const [search, setSearch] = useQueryState("search", parseAsString);
  const [searchInput, setSearchInput] = useState(search || "");

  const fetchClients = useCallback(async () => {
    if (!token) {
      setClientsError("Authentication required");
      setClientsLoading(false);
      return;
    }

    try {
      setClientsLoading(true);
      setClientsError(null);
      const response = await ibRequestsApi.getClients(token, { page, limit, search: search || undefined });
      if (response?.success && response.data?.data) {
        setClients(response.data.data.clients || []);
        setClientsPagination(response.data.data.pagination);
      } else {
        setClients([]);
        setClientsError("Unable to load clients data");
      }
    } catch (fetchError) {
      console.error("Failed to fetch clients:", fetchError);
      setClients([]);
      setClientsError(fetchError);
    } finally {
      setClientsLoading(false);
    }
  }, [limit, page, search, token]);

  const fetchSubIbs = useCallback(async () => {
    if (!token) {
      setSubIbsError("Authentication required");
      setSubIbsLoading(false);
      return;
    }

    try {
      setSubIbsLoading(true);
      setSubIbsError(null);
      const response = await ibRequestsApi.getSubIbs(token, { page, limit, search: search || undefined });
      if (response?.success && response.data?.data) {
        setSubIbs(response.data.data.sub_ibs || []);
        setSubIbsPagination(response.data.data.pagination);
      } else {
        setSubIbs([]);
        setSubIbsError("Unable to load sub IB data");
      }
    } catch (fetchError) {
      console.error("Failed to fetch sub IBs:", fetchError);
      setSubIbs([]);
      setSubIbsError(fetchError);
    } finally {
      setSubIbsLoading(false);
    }
  }, [limit, page, search, token]);

  const fetchRebates = useCallback(async () => {
    if (!token) {
      setRebatesError("Authentication required");
      setRebatesLoading(false);
      return;
    }

    try {
      setRebatesLoading(true);
      setRebatesError(null);
      const response = await ibRequestsApi.getRebates(token, { page, limit, search: search || undefined });
      if (response?.success && response.data?.data) {
        setRebates(response.data.data.rebates || []);
        setRebatesPagination(response.data.data.pagination);
      } else {
        setRebates([]);
        setRebatesError("Unable to load rebate data");
      }
    } catch (fetchError) {
      console.error("Failed to fetch rebates:", fetchError);
      setRebates([]);
      setRebatesError(fetchError);
    } finally {
      setRebatesLoading(false);
    }
  }, [limit, page, search, token]);

  useEffect(() => {
    if (activeTab === "clients") {
      void fetchClients();
    } else if (activeTab === "sub-ibs") {
      void fetchSubIbs();
    } else {
      void fetchRebates();
    }
  }, [activeTab, fetchClients, fetchRebates, fetchSubIbs]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, setPage]);

  const handleSearch = useCallback(() => {
    setSearch(searchInput || null);
    setPage(1);
  }, [searchInput, setPage, setSearch]);

  const handleSearchKeyPress = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch],
  );

  const handleRefresh = useCallback(() => {
    if (activeTab === "clients") {
      void fetchClients();
    } else if (activeTab === "sub-ibs") {
      void fetchSubIbs();
    } else {
      void fetchRebates();
    }
  }, [activeTab, fetchClients, fetchRebates, fetchSubIbs]);

  const isLoading = clientsLoading || subIbsLoading || rebatesLoading;
  const currentPagination =
    activeTab === "clients" ? clientsPagination : activeTab === "sub-ibs" ? subIbsPagination : rebatesPagination;
  const currentError =
    activeTab === "clients" ? clientsError : activeTab === "sub-ibs" ? subIbsError : rebatesError;
  const currentRows = activeTab === "clients" ? clients : activeTab === "sub-ibs" ? subIbs : rebates;

  const totals = useMemo(() => {
    const rows = currentRows;
    return {
      visibleRows: rows.length,
      totalLots: rows.reduce((sum, row) => sum + row.lots_traded, 0),
      earnedRebates: rows.reduce((sum, row) => sum + row.earned_rebates, 0),
    };
  }, [currentRows]);

  if (clientsLoading && activeTab === "clients" && clients.length === 0 && !clientsError) {
    return <ClientsLoadingState />;
  }

  return (
    <IbPageShell>
      <IbPageHeader
        eyebrow="IB Clients"
        title="Client summary and rebate activity"
        description="Browse direct clients, sub IBs, and rebate records from the same reporting surface."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/ib-dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to dashboard
              </Link>
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <IbMetricCard
          title="Current View"
          value={activeTab === "clients" ? "Clients" : activeTab === "sub-ibs" ? "Sub IBs" : "Rebates"}
          description={`${currentPagination.total} total records in this tab.`}
          icon={<Users className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title="Visible Rows"
          value={String(totals.visibleRows)}
          description={`Page ${currentPagination.current_page} of ${currentPagination.total_pages}`}
          icon={<Search className="h-5 w-5" />}
          accent="slate"
        />
        <IbMetricCard
          title="Earned Rebates"
          value={formatCurrency(totals.earnedRebates, "USD")}
          description={`Visible lots traded: ${totals.totalLots.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          icon={<DollarSign className="h-5 w-5" />}
          accent="emerald"
        />
      </div>

      <IbSectionCard
        title="IB activity ledger"
        description="Filter and review client-side trading and rebate records."
      >
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)} className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-muted/40 p-1">
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="sub-ibs">Sub IBs</TabsTrigger>
            <TabsTrigger value="rebates">Rebates</TabsTrigger>
          </TabsList>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={handleSearchKeyPress}
                placeholder="Search by client ID or name"
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSearch} disabled={isLoading}>
                Search
              </Button>
              {search ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchInput("");
                    setSearch(null);
                    setPage(1);
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          {currentError ? (
            <ApiErrorState
              error={currentError}
              audience="client"
              resource={activeTab === "clients" ? "clients" : activeTab === "sub-ibs" ? "sub IBs" : "rebates"}
              action="load"
              variant="inline"
              onRetry={handleRefresh}
            />
          ) : null}

          <TabsContent value="clients" className="space-y-5">
            {clientsLoading && clients.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-2xl" />
                ))}
              </div>
            ) : clients.length > 0 ? (
              <>
                <SummaryTable rows={clients} />
                <PaginationControls pagination={clientsPagination} isLoading={isLoading} onPageChange={setPage} />
              </>
            ) : (
              <EmptyState
                title="No clients found"
                description={
                  search
                    ? "No direct clients match your current search."
                    : "Direct client registrations will appear here when activity starts."
                }
                icon={<Users className="h-5 w-5" />}
              />
            )}
          </TabsContent>

          <TabsContent value="sub-ibs" className="space-y-5">
            {subIbsLoading && subIbs.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-2xl" />
                ))}
              </div>
            ) : subIbs.length > 0 ? (
              <>
                <SummaryTable rows={subIbs} includeLevel />
                <PaginationControls pagination={subIbsPagination} isLoading={isLoading} onPageChange={setPage} />
              </>
            ) : (
              <EmptyState
                title="No sub IB records found"
                description={
                  search
                    ? "No sub IB records match your current search."
                    : "Sub IB relationships will appear here after registrations are linked."
                }
                icon={<Users className="h-5 w-5" />}
              />
            )}
          </TabsContent>

          <TabsContent value="rebates" className="space-y-5">
            {rebatesLoading && rebates.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-2xl" />
                ))}
              </div>
            ) : rebates.length > 0 ? (
              <>
                <SummaryTable rows={rebates} />
                <PaginationControls pagination={rebatesPagination} isLoading={isLoading} onPageChange={setPage} />
              </>
            ) : (
              <EmptyState
                title="No rebate entries found"
                description={
                  search
                    ? "No rebate entries match your current search."
                    : "Rebate activity will appear here once clients begin trading."
                }
                icon={<DollarSign className="h-5 w-5" />}
              />
            )}
          </TabsContent>
        </Tabs>
      </IbSectionCard>
    </IbPageShell>
  );
}
