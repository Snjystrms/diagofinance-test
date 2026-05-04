"use client";

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import { ArrowLeftRight, DollarSign, RefreshCw, Search, Users } from "lucide-react";

import { ApiErrorState } from "@/components/errors/api-error-state";
import { IbMetricCard, IbPageHeader, IbPageShell, IbSectionCard } from "@/components/ib/ib-page-primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { ibRequestsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

/* ─── Local types that match the actual API shapes ──────────────────────── */

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

/** Client row — matches /user/ib-client-summary/clients */
type ClientRow = {
  client_id: number | string;
  client_name: string;
  lots_traded: number;
  pending_rebates: number;
  earned_rebates: number;
  registration_date: string;
};

/** Sub-IB row — matches /user/ib-client-summary/sub-ibs */
type SubIbRow = {
  sub_ib_user_id: number | string;
  sub_ib_id: string;
  name: string;
  level: string;          // "Level 1", "Level 2", …
  lots_traded: number;
  pending_rebates: number;
  earned_rebates: number;
  registration_date: string;
};

/** Rebate deal row — matches /user/ib-client-summary/rebates */
type RebateDeal = {
  deal: number | string;
  trading_account: string;
  account_type: string;
  symbol: string;
  side: string;
  volume: number;
  commission: number;
  open_time: string;
  close_time: string;
  client_id: number | string;
  client_name: string;
  rebate_status: string;
  created_at: string;
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function toNum(v: unknown, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function toStr(v: unknown, def = "") {
  return v !== null && v !== undefined ? String(v) : def;
}

function parsePagination(raw: unknown, fallbackTotal: number): PaginationState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...emptyPagination, total: fallbackTotal };
  }
  const r = raw as Record<string, unknown>;
  const total = toNum(r.total, fallbackTotal);
  const perPage = toNum(r.per_page, 10);
  const lastPage = toNum(r.last_page ?? r.total_pages, Math.max(1, Math.ceil(total / perPage)));
  return {
    current_page: toNum(r.current_page, 1),
    per_page: perPage,
    total,
    total_pages: lastPage,
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/* ─── Skeleton / empty states ────────────────────────────────────────────── */

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-2xl" />
      ))}
    </div>
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

/* ─── Pagination controls ─────────────────────────────────────────────────── */

function PaginationControls({
  pagination,
  isLoading,
  onPageChange,
}: {
  pagination: PaginationState;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}) {
  if (pagination.total_pages <= 1) return null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
        Showing {(pagination.current_page - 1) * pagination.per_page + 1}–
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
        {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === pagination.total_pages || Math.abs(p - pagination.current_page) <= 1)
          .map((p, idx, arr) => (
            <div key={p} className="flex items-center gap-2">
              {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-muted-foreground">…</span>}
              <Button
                variant={p === pagination.current_page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(p)}
                disabled={isLoading}
                className="min-w-[2.5rem]"
              >
                {p}
              </Button>
            </div>
          ))}
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

/* ─── Clients table ────────────────────────────────────────────────────────── */

function ClientsTable({ rows }: { rows: ClientRow[] }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Client ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Lots Traded</TableHead>
            <TableHead className="text-right">Pending Rebates</TableHead>
            <TableHead className="text-right">Earned Rebates</TableHead>
            <TableHead>Registration Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.client_id}`}>
              <TableCell className="font-mono text-xs sm:text-sm">{row.client_id}</TableCell>
              <TableCell className="font-medium">{row.client_name}</TableCell>
              <TableCell className="text-right">
                {toNum(row.lots_traded).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(toNum(row.pending_rebates), "USD")}</TableCell>
              <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-300">
                {formatCurrency(toNum(row.earned_rebates), "USD")}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(row.registration_date)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ─── Sub-IBs table ────────────────────────────────────────────────────────── */

function SubIbsTable({ rows }: { rows: SubIbRow[] }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>IB ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Level</TableHead>
            <TableHead className="text-right">Lots Traded</TableHead>
            <TableHead className="text-right">Pending Rebates</TableHead>
            <TableHead className="text-right">Earned Rebates</TableHead>
            <TableHead>Registration Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={`${row.sub_ib_user_id}`}>
              <TableCell className="font-mono text-xs">{row.sub_ib_id || row.sub_ib_user_id}</TableCell>
              <TableCell className="font-medium">{row.name}</TableCell>
              <TableCell>
                <span className="inline-flex rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium">
                  {row.level}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {toNum(row.lots_traded).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(toNum(row.pending_rebates), "USD")}</TableCell>
              <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-300">
                {formatCurrency(toNum(row.earned_rebates), "USD")}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(row.registration_date)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ─── Rebates table ────────────────────────────────────────────────────────── */

const STATUS_STYLE: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300",
  approved: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  paid:     "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
};

function RebatesTable({ rows }: { rows: RebateDeal[] }) {
  return (
    <div className="overflow-x-auto overflow-hidden rounded-[24px] border border-border/60">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>MT5 ID</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead>Side</TableHead>
            <TableHead className="text-right">Volume</TableHead>
            <TableHead className="text-right">Commission</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Open Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const statusKey = toStr(row.rebate_status).toLowerCase();
            const statusClass = STATUS_STYLE[statusKey] ?? "bg-muted/40 text-muted-foreground";
            return (
              <TableRow key={`${row.deal}`}>
                <TableCell className="font-mono text-xs">{row.deal}</TableCell>
                
                <TableCell>
                  <div className="space-y-0.5">
                    <div className="font-medium text-sm">{row.client_name}</div>
                    <div className="text-xs text-muted-foreground">ID: {row.client_id}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <div className="font-mono text-xs">{row.trading_account}</div>
                    <div className="text-xs text-muted-foreground">{row.account_type}</div>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{row.symbol}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={row.side === "BUY"
                      ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                      : "border-red-500/40 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20"
                    }
                  >
                    {row.side}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {toNum(row.volume).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                </TableCell>
                <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-300">
                  {toNum(row.commission).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                </TableCell>
                <TableCell>
                  <Badge className={`border-0 text-xs font-semibold ${statusClass}`}>
                    {row.rebate_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{row.open_time}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/* ─── Loading skeleton ───────────────────────────────────────────────────── */

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
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
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
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </IbPageShell>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function IbClientsPage() {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useQueryState<TabType>("tab", {
    parse: (v) => (v === "clients" || v === "sub-ibs" || v === "rebates" ? v : "clients"),
    defaultValue: "clients",
  });
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [limit] = useQueryState("limit", parseAsInteger.withDefault(10));
  const [search, setSearch] = useQueryState("search", parseAsString);
  const [searchInput, setSearchInput] = useState(search || "");

  // ── Clients state ──
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientsPagination, setClientsPagination] = useState<PaginationState>(emptyPagination);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<unknown | null>(null);

  // ── Sub-IBs state ──
  const [subIbs, setSubIbs] = useState<SubIbRow[]>([]);
  const [subIbsPagination, setSubIbsPagination] = useState<PaginationState>(emptyPagination);
  const [subIbsLoading, setSubIbsLoading] = useState(false);
  const [subIbsError, setSubIbsError] = useState<unknown | null>(null);

  // ── Rebates state ──
  const [rebates, setRebates] = useState<RebateDeal[]>([]);
  const [rebatesPagination, setRebatesPagination] = useState<PaginationState>(emptyPagination);
  const [rebatesLoading, setRebatesLoading] = useState(false);
  const [rebatesError, setRebatesError] = useState<unknown | null>(null);

  /* ── Fetch clients ─────────────────────────────────────────────────────── */
  const fetchClients = useCallback(async () => {
    if (!token) { setClientsError("Authentication required"); return; }
    try {
      setClientsLoading(true);
      setClientsError(null);
      const res = await ibRequestsApi.getClients(token, { page, limit, search: search || undefined });
      // apiCall returns raw JSON → { success, message, data: [...], pagination: {...} }
      const raw = res as unknown as { data: ClientRow[]; pagination: unknown };
      const rows: ClientRow[] = Array.isArray(raw.data) ? raw.data : [];
      setClients(rows);
      setClientsPagination(parsePagination(raw.pagination, rows.length));
    } catch (e) {
      console.error("fetchClients:", e);
      setClientsError(e);
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  }, [token, page, limit, search]);

  /* ── Fetch sub-IBs ─────────────────────────────────────────────────────── */
  const fetchSubIbs = useCallback(async () => {
    if (!token) { setSubIbsError("Authentication required"); return; }
    try {
      setSubIbsLoading(true);
      setSubIbsError(null);
      const res = await ibRequestsApi.getSubIbs(token, { page, limit, search: search || undefined });
      // apiCall returns raw JSON → { success, message, data: [...], pagination: {...} }
      const raw = res as unknown as { data: SubIbRow[]; pagination: unknown };
      const rows: SubIbRow[] = Array.isArray(raw.data) ? raw.data : [];
      setSubIbs(rows);
      setSubIbsPagination(parsePagination(raw.pagination, rows.length));
    } catch (e) {
      console.error("fetchSubIbs:", e);
      setSubIbsError(e);
      setSubIbs([]);
    } finally {
      setSubIbsLoading(false);
    }
  }, [token, page, limit, search]);

  /* ── Fetch rebates ─────────────────────────────────────────────────────── */
  const fetchRebates = useCallback(async () => {
    if (!token) { setRebatesError("Authentication required"); return; }
    try {
      setRebatesLoading(true);
      setRebatesError(null);
      const res = await ibRequestsApi.getRebates(token, { page, limit, search: search || undefined });
      // apiCall returns raw JSON → { success, message, data: { summary: [...], total, pagination: {...} } }
      const raw = res as unknown as { data: { summary: RebateDeal[]; total: number; pagination: unknown } };
      const dataBlock = raw.data ?? {};
      const rows: RebateDeal[] = Array.isArray(dataBlock.summary) ? dataBlock.summary : [];
      const total = toNum((dataBlock as Record<string, unknown>).total, rows.length);
      // Merge top-level total into pagination since the API's pagination object omits it
      const pag = parsePagination(dataBlock.pagination, total);
      if (pag.total === 0 && total > 0) pag.total = total;
      setRebates(rows);
      setRebatesPagination(pag);
    } catch (e) {
      console.error("fetchRebates:", e);
      setRebatesError(e);
      setRebates([]);
    } finally {
      setRebatesLoading(false);
    }
  }, [token, page, limit, search]);

  useEffect(() => {
    if (activeTab === "clients") void fetchClients();
    else if (activeTab === "sub-ibs") void fetchSubIbs();
    else void fetchRebates();
  }, [activeTab, fetchClients, fetchSubIbs, fetchRebates]);

  useEffect(() => { setPage(1); }, [activeTab, setPage]);

  const handleSearch = useCallback(() => {
    setSearch(searchInput || null);
    setPage(1);
  }, [searchInput, setPage, setSearch]);

  const handleSearchKeyPress = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") handleSearch(); },
    [handleSearch],
  );

  const handleRefresh = useCallback(() => {
    if (activeTab === "clients") void fetchClients();
    else if (activeTab === "sub-ibs") void fetchSubIbs();
    else void fetchRebates();
  }, [activeTab, fetchClients, fetchSubIbs, fetchRebates]);

  const isLoading = clientsLoading || subIbsLoading || rebatesLoading;
  const currentPagination =
    activeTab === "clients" ? clientsPagination :
    activeTab === "sub-ibs" ? subIbsPagination :
    rebatesPagination;
  const currentError =
    activeTab === "clients" ? clientsError :
    activeTab === "sub-ibs" ? subIbsError :
    rebatesError;

  /* ── Metric totals ─────────────────────────────────────────────────────── */
  const totals = useMemo(() => {
    if (activeTab === "clients") {
      return {
        earnedRebates: clients.reduce((s, r) => s + toNum(r.earned_rebates), 0),
        totalLots:     clients.reduce((s, r) => s + toNum(r.lots_traded), 0),
      };
    }
    if (activeTab === "sub-ibs") {
      return {
        earnedRebates: subIbs.reduce((s, r) => s + toNum(r.earned_rebates), 0),
        totalLots:     subIbs.reduce((s, r) => s + toNum(r.lots_traded), 0),
      };
    }
    // rebates: sum commission as "earned"
    return {
      earnedRebates: rebates.reduce((s, r) => s + toNum(r.commission), 0),
      totalLots:     rebates.reduce((s, r) => s + toNum(r.volume), 0),
    };
  }, [activeTab, clients, subIbs, rebates]);

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
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <IbMetricCard
          title="Current View"
          value={activeTab === "clients" ? "Clients" : activeTab === "sub-ibs" ? "Sub IBs" : "Rebates"}
          description={`${currentPagination.total} total records in this tab.`}
          icon={<Users className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title={activeTab === "rebates" ? "Total Volume" : "Total Lots Traded"}
          value={totals.totalLots.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          description={`Page ${currentPagination.current_page} of ${currentPagination.total_pages}`}
          icon={<ArrowLeftRight className="h-5 w-5" />}
          accent="slate"
        />
        <IbMetricCard
          title={activeTab === "rebates" ? "Total Commission" : "Earned Rebates"}
          value={formatCurrency(totals.earnedRebates, "USD")}
          description="Sum across the current page"
          icon={<DollarSign className="h-5 w-5" />}
          accent="emerald"
        />
      </div>

      <IbSectionCard
        title="IB activity ledger"
        description="Filter and review client-side trading and rebate records."
      >
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-muted/40 p-1">
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="sub-ibs">Sub IBs</TabsTrigger>
            <TabsTrigger value="rebates">Rebates</TabsTrigger>
          </TabsList>

          {/* Search bar */}
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                placeholder="Search by name or ID"
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSearch} disabled={isLoading}>Search</Button>
              {search && (
                <Button variant="outline" onClick={() => { setSearchInput(""); setSearch(null); setPage(1); }}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Error state */}
          {!!currentError && (
            <ApiErrorState
              error={currentError}
              audience="client"
              resource={activeTab === "clients" ? "clients" : activeTab === "sub-ibs" ? "sub IBs" : "rebates"}
              action="load"
              variant="inline"
              onRetry={handleRefresh}
            />
          )}

          {/* ── Clients ── */}
          <TabsContent value="clients" className="space-y-5">
            {clientsLoading && clients.length === 0 ? <TableSkeleton /> :
             clients.length > 0 ? (
              <>
                <ClientsTable rows={clients} />
                <PaginationControls pagination={clientsPagination} isLoading={isLoading} onPageChange={setPage} />
              </>
            ) : !clientsError ? (
              <EmptyState
                title="No clients found"
                description={search ? "No direct clients match your search." : "Direct client registrations will appear here when activity starts."}
                icon={<Users className="h-5 w-5" />}
              />
            ) : null}
          </TabsContent>

          {/* ── Sub IBs ── */}
          <TabsContent value="sub-ibs" className="space-y-5">
            {subIbsLoading && subIbs.length === 0 ? <TableSkeleton /> :
             subIbs.length > 0 ? (
              <>
                <SubIbsTable rows={subIbs} />
                <PaginationControls pagination={subIbsPagination} isLoading={isLoading} onPageChange={setPage} />
              </>
            ) : !subIbsError ? (
              <EmptyState
                title="No sub IB records found"
                description={search ? "No sub IB records match your search." : "Sub IB relationships will appear here after registrations are linked."}
                icon={<Users className="h-5 w-5" />}
              />
            ) : null}
          </TabsContent>

          {/* ── Rebates ── */}
          <TabsContent value="rebates" className="space-y-5">
            {rebatesLoading && rebates.length === 0 ? <TableSkeleton /> :
             rebates.length > 0 ? (
              <>
                <RebatesTable rows={rebates} />
                <PaginationControls pagination={rebatesPagination} isLoading={isLoading} onPageChange={setPage} />
              </>
            ) : !rebatesError ? (
              <EmptyState
                title="No rebate entries found"
                description={search ? "No rebate entries match your search." : "Rebate activity will appear here once clients begin trading."}
                icon={<DollarSign className="h-5 w-5" />}
              />
            ) : null}
          </TabsContent>
        </Tabs>
      </IbSectionCard>
    </IbPageShell>
  );
}
