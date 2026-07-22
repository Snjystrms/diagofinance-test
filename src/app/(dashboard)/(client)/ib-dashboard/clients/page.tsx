"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import {
  ArrowLeftRight,
  DollarSign,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { format, parse, startOfMonth } from "date-fns";

import { ApiErrorState } from "@/components/errors/api-error-state";
import {
  ReusableDataTable,
  type ColumnDef,
  type PaginationState,
} from "@/components/data-table/reusable-data-table";
import {
  IbMetricCard,
  IbPageHeader,
  IbPageShell,
  IbSectionCard,
} from "@/components/ib/ib-page-primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { ibRequestsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

/* ─── Local types that match the actual API shapes ──────────────────────── */

type TabType = "clients" | "sub-ibs" | "rebates";

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
  client_email: string;
  lots_traded: number;
  pending_rebates: number;
  earned_rebates: number;
  personal_deposit: number;
  personal_withdrawal: number;
  team_deposit: number;
  team_withdrawal: number;
  main_wallet_balance: number;
  registration_date: string;
};

/** Sub-IB row — matches /user/ib-client-summary/sub-ibs */
type SubIbRow = {
  sub_ib_user_id: number | string;
  sub_ib_id: string;
  name: string;
  email: string;
  level: string; // "Level 1", "Level 2", …
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
  client_email: string;
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
  const lastPage = toNum(
    r.last_page ?? r.total_pages,
    Math.max(1, Math.ceil(total / perPage)),
  );
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

function getDefaultMonthRange() {
  const now = new Date();
  return {
    from: format(startOfMonth(now), "yyyy-MM-dd"),
    to: format(now, "yyyy-MM-dd"),
  };
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

function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-muted/10 px-6 text-center">
      <div className="mb-4 rounded-2xl border border-border/60 bg-background/80 p-3 text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

/* ─── Column Definitions ────────────────────────────────────────────────────── */

// Clients columns
const clientsColumns: ColumnDef<ClientRow>[] = [
  {
    key: "name",
    header: "Name",
    render: (row) => (
      <div className="font-medium">
        {row.client_name}
        <div className="text-xs text-muted-foreground">
          ({row.client_email})
        </div>
      </div>
    ),
  },
  {
    key: "lots_traded",
    header: "Lots Traded",
    align: "right",
    render: (row) =>
      toNum(row.lots_traded).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    hideOnMobile: true,
  },
  {
    key: "pending_rebates",
    header: "Pending Rebates",
    align: "right",
    render: (row) => formatCurrency(toNum(row.pending_rebates), "USD"),
    hideOnMobile: true,
  },
  {
    key: "earned_rebates",
    header: "Earned Rebates",
    align: "right",
    render: (row) => formatCurrency(toNum(row.earned_rebates), "USD"),
    hideOnMobile: true,
  },
  {
    key: "personal_deposit",
    header: "Personal Deposit",
    align: "right",
    render: (row) => formatCurrency(toNum(row.personal_deposit), "USD"),
    hideOnMobile: true,
  },
  {
    key: "personal_withdrawal",
    header: "Personal Withdrawal",
    align: "right",
    render: (row) => formatCurrency(toNum(row.personal_withdrawal), "USD"),
    hideOnMobile: true,
  },
  {
    key: "team_deposit",
    header: "Team Deposit",
    align: "right",
    render: (row) => formatCurrency(toNum(row.team_deposit), "USD"),
    hideOnMobile: true,
  },
  {
    key: "team_withdrawal",
    header: "Team Withdrawal",
    align: "right",
    render: (row) => formatCurrency(toNum(row.team_withdrawal), "USD"),
    hideOnMobile: true,
  },
  {
    key: "main_wallet_balance",
    header: "Main Wallet Balance",
    align: "right",
    render: (row) => formatCurrency(toNum(row.main_wallet_balance), "USD"),
    hideOnMobile: true,
  },
  {
    key: "registration_date",
    header: "Registration Date",
    render: (row) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(row.registration_date)}
      </span>
    ),
    hideOnMobile: true,
  },
];

// Sub-IBs columns
const subIbsColumns: ColumnDef<SubIbRow>[] = [
  {
    key: "name",
    header: "Name",
    render: (row) => (
      <div className="font-medium">
        {row.name}
        <div className="text-xs text-muted-foreground">({row.email})</div>
      </div>
    ),
  },
  {
    key: "level",
    header: "Level",
    render: (row) => (
      <span className="inline-flex rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium">
        {row.level}
      </span>
    ),
    hideOnMobile: true,
  },
  {
    key: "sub_ib_id",
    header: "Partner ID",
    render: (row) => (
      <span className="inline-flex rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-xs font-medium">
        {row.sub_ib_id}
      </span>
    ),
    hideOnMobile: true,
  },
  {
    key: "lots_traded",
    header: "Lots Traded",
    align: "right",
    render: (row) =>
      toNum(row.lots_traded).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    hideOnMobile: true,
  },
  {
    key: "pending_rebates",
    header: "Pending Rebates",
    align: "right",
    render: (row) => formatCurrency(toNum(row.pending_rebates), "USD"),
    hideOnMobile: true,
  },
  {
    key: "earned_rebates",
    header: "Earned Rebates",
    align: "right",
    render: (row) => (
      <span className="font-semibold text-emerald-600 dark:text-emerald-300">
        {formatCurrency(toNum(row.earned_rebates), "USD")}
      </span>
    ),
  },
  {
    key: "registration_date",
    header: "Registration Date",
    render: (row) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(row.registration_date)}
      </span>
    ),
    hideOnMobile: true,
  },
];

const STATUS_STYLE: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300",
  approved:
    "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  paid: "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
};

// Rebates columns
const rebatesColumns: ColumnDef<RebateDeal>[] = [
  {
    key: "client",
    header: "Client",
    render: (row) => (
      <div>
        <div className="font-medium text-sm">{row.client_name}</div>
        <div className="text-xs text-muted-foreground">
          ({row.client_email})
        </div>
      </div>
    ),
  },
  {
    key: "account",
    header: "Account",
    render: (row) => (
      <div>
        <div className="font-mono text-xs">{row.trading_account}</div>
        <div className="text-xs text-muted-foreground">{row.account_type}</div>
      </div>
    ),
    hideOnMobile: true,
  },
  {
    key: "symbol",
    header: "Symbol",
    render: (row) => <span className="font-medium">{row.symbol}</span>,
  },
  {
    key: "side",
    header: "Side",
    render: (row) => (
      <Badge
        variant="outline"
        className={
          row.side === "BUY"
            ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
            : "border-red-500/40 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20"
        }
      >
        {row.side}
      </Badge>
    ),
    hideOnMobile: true,
  },
  {
    key: "volume",
    header: "Volume",
    align: "right",
    render: (row) => (
      <span className="font-mono text-sm">
        {toNum(row.volume).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 5,
        })}
      </span>
    ),
  },
  {
    key: "commission",
    header: "Commission",
    align: "right",
    render: (row) => (
      <span className="font-semibold text-emerald-600 dark:text-emerald-300">
        {toNum(row.commission).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 5,
        })}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => {
      const statusKey = toStr(row.rebate_status).toLowerCase();
      const statusClass =
        STATUS_STYLE[statusKey] ?? "bg-muted/40 text-muted-foreground";
      return (
        <Badge className={`border-0 text-xs font-semibold ${statusClass}`}>
          {row.rebate_status}
        </Badge>
      );
    },
    hideOnMobile: true,
  },
  {
    key: "open_time",
    header: "Open Time",
    render: (row) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {row.open_time}
      </span>
    ),
    hideOnMobile: true,
  },
];

/* ─── Column Definitions End ────────────────────────────────────────────────── */

/* ─── Search bar for each tab ──────────────────────────────────────────────── */

function TabSearchBar({
  inputValue,
  onInputChange,
  onSearch,
  onClear,
  isLoading,
}: {
  inputValue: string;
  onInputChange: (v: string) => void;
  onSearch: () => void;
  onClear: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch();
          }}
          placeholder="Search by name or ID"
          className="pl-10"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={onSearch} disabled={isLoading}>
          Search
        </Button>
        {inputValue && (
          <Button variant="outline" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>
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
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm"
          >
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
    parse: (v) =>
      v === "clients" || v === "sub-ibs" || v === "rebates" ? v : "clients",
    defaultValue: "clients",
  });
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [limit, setLimit] = useQueryState(
    "limit",
    parseAsInteger.withDefault(10),
  );

  const [fromDate, setFromDate] = useQueryState("from_date", parseAsString);
  const [toDate, setToDate] = useQueryState("to_date", parseAsString);
  const [levelFilter, setLevelFilter] = useQueryState("level", parseAsInteger);

  // Date state for DateRangePicker
  const [fromDateObj, setFromDateObj] = useState<Date | undefined>(undefined);
  const [toDateObj, setToDateObj] = useState<Date | undefined>(undefined);
  const hasAppliedDefaultDateRange = useRef(false);

  // Sync date objects with query params
  useEffect(() => {
    if (fromDate) {
      const parsed = parse(fromDate, "yyyy-MM-dd", new Date());
      if (!isNaN(parsed.getTime())) setFromDateObj(parsed);
    } else {
      setFromDateObj(undefined);
    }
  }, [fromDate]);

  useEffect(() => {
    if (toDate) {
      const parsed = parse(toDate, "yyyy-MM-dd", new Date());
      if (!isNaN(parsed.getTime())) setToDateObj(parsed);
    } else {
      setToDateObj(undefined);
    }
  }, [toDate]);

  useEffect(() => {
    if (hasAppliedDefaultDateRange.current) return;
    if (
      (activeTab === "clients" || activeTab === "sub-ibs") &&
      !fromDate &&
      !toDate
    ) {
      const defaultRange = getDefaultMonthRange();
      hasAppliedDefaultDateRange.current = true;
      setFromDate(defaultRange.from);
      setToDate(defaultRange.to);
    }
  }, [activeTab, fromDate, toDate, setFromDate, setToDate]);

  const [clientsSearch, setClientsSearch] = useState({ query: "", input: "" });
  const [subIbsSearch, setSubIbsSearch] = useState({ query: "", input: "" });
  const [rebatesSearch, setRebatesSearch] = useState({ query: "", input: "" });

  // ── Clients state ──
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientsPagination, setClientsPagination] =
    useState<PaginationState>(emptyPagination);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<unknown | null>(null);

  // ── Sub-IBs state ──
  const [subIbs, setSubIbs] = useState<SubIbRow[]>([]);
  const [subIbsPagination, setSubIbsPagination] =
    useState<PaginationState>(emptyPagination);
  const [subIbsLoading, setSubIbsLoading] = useState(false);
  const [subIbsError, setSubIbsError] = useState<unknown | null>(null);
  const [levelCount, setLevelCount] = useState<number>(5); // Track max levels from API

  // ── Rebates state ──
  const [rebates, setRebates] = useState<RebateDeal[]>([]);
  const [rebatesPagination, setRebatesPagination] =
    useState<PaginationState>(emptyPagination);
  const [rebatesLoading, setRebatesLoading] = useState(false);
  const [rebatesError, setRebatesError] = useState<unknown | null>(null);

  /* ── Handle per page change ─────────────────────────────────────────────── */
  const handlePerPageChange = (newPerPage: number) => {
    setLimit(newPerPage);
    setPage(1); // Reset to first page when changing rows per page
  };

  /* ── Fetch clients ─────────────────────────────────────────────────────── */
  const fetchClients = useCallback(async () => {
    if (!token) {
      setClientsError("Authentication required");
      return;
    }
    try {
      setClientsLoading(true);
      setClientsError(null);
      const res = await ibRequestsApi.getClients(token, {
        page,
        limit,
        search: clientsSearch.query || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
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
  }, [token, page, limit, clientsSearch.query, fromDate, toDate]);

  /* ── Fetch sub-IBs ─────────────────────────────────────────────────────── */
  const fetchSubIbs = useCallback(async () => {
    if (!token) {
      setSubIbsError("Authentication required");
      return;
    }
    try {
      setSubIbsLoading(true);
      setSubIbsError(null);
      const res = await ibRequestsApi.getSubIbs(token, {
        page,
        limit,
        search: subIbsSearch.query || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        level: levelFilter || undefined,
      });
      // apiCall returns raw JSON → { success, message, data: [...], pagination: {...}, level_count: number }
      const raw = res as unknown as {
        data: SubIbRow[];
        pagination: unknown;
        level_count?: number;
      };
      const rows: SubIbRow[] = Array.isArray(raw.data) ? raw.data : [];
      setSubIbs(rows);
      setSubIbsPagination(parsePagination(raw.pagination, rows.length));

      // Update level count from API response
      if (typeof raw.level_count === "number" && raw.level_count > 0) {
        setLevelCount(raw.level_count);
      }
    } catch (e) {
      console.error("fetchSubIbs:", e);
      setSubIbsError(e);
      setSubIbs([]);
    } finally {
      setSubIbsLoading(false);
    }
  }, [token, page, limit, subIbsSearch.query, fromDate, toDate, levelFilter]);

  const fetchRebates = useCallback(async () => {
    if (!token) {
      setRebatesError("Authentication required");
      return;
    }
    try {
      setRebatesLoading(true);
      setRebatesError(null);
      const res = await ibRequestsApi.getRebates(token, {
        page,
        limit,
        search: rebatesSearch.query || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      // apiCall returns raw JSON → { success, message, data: { summary: [...], total, pagination: {...} } }
      const raw = res as unknown as {
        data: { summary: RebateDeal[]; total: number; pagination: unknown };
      };
      const dataBlock = raw.data ?? {};
      const rows: RebateDeal[] = Array.isArray(dataBlock.summary)
        ? dataBlock.summary
        : [];
      const total = toNum(
        (dataBlock as Record<string, unknown>).total,
        rows.length,
      );
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
  }, [token, page, limit, rebatesSearch.query, fromDate, toDate]);

  useEffect(() => {
    if (activeTab === "clients") void fetchClients();
    else if (activeTab === "sub-ibs") void fetchSubIbs();
    else void fetchRebates();
  }, [activeTab, fetchClients, fetchSubIbs, fetchRebates]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, setPage]);

  const handleSearchForTab = useCallback(
    (tab: TabType) => {
      if (tab === "clients")
        setClientsSearch((s) => ({ ...s, query: s.input }));
      else if (tab === "sub-ibs")
        setSubIbsSearch((s) => ({ ...s, query: s.input }));
      else setRebatesSearch((s) => ({ ...s, query: s.input }));
      setPage(1);
    },
    [setPage],
  );

  const handleClearSearchForTab = useCallback(
    (tab: TabType) => {
      if (tab === "clients") setClientsSearch({ query: "", input: "" });
      else if (tab === "sub-ibs") setSubIbsSearch({ query: "", input: "" });
      else setRebatesSearch({ query: "", input: "" });
      setPage(1);
    },
    [setPage],
  );

  const handleRefresh = useCallback(() => {
    if (activeTab === "clients") void fetchClients();
    else if (activeTab === "sub-ibs") void fetchSubIbs();
    else void fetchRebates();
  }, [activeTab, fetchClients, fetchSubIbs, fetchRebates]);

  const isLoading = clientsLoading || subIbsLoading || rebatesLoading;
  const currentPagination =
    activeTab === "clients"
      ? clientsPagination
      : activeTab === "sub-ibs"
        ? subIbsPagination
        : rebatesPagination;
  const currentError =
    activeTab === "clients"
      ? clientsError
      : activeTab === "sub-ibs"
        ? subIbsError
        : rebatesError;

  /* ── Metric totals ─────────────────────────────────────────────────────── */
  const totals = useMemo(() => {
    if (activeTab === "clients") {
      return {
        earnedRebates: clients.reduce((s, r) => s + toNum(r.earned_rebates), 0),
        totalLots: clients.reduce((s, r) => s + toNum(r.lots_traded), 0),
      };
    }
    if (activeTab === "sub-ibs") {
      return {
        earnedRebates: subIbs.reduce((s, r) => s + toNum(r.earned_rebates), 0),
        totalLots: subIbs.reduce((s, r) => s + toNum(r.lots_traded), 0),
      };
    }
    // rebates: sum commission as "earned"
    return {
      earnedRebates: rebates.reduce((s, r) => s + toNum(r.commission), 0),
      totalLots: rebates.reduce((s, r) => s + toNum(r.volume), 0),
    };
  }, [activeTab, clients, subIbs, rebates]);

  if (
    clientsLoading &&
    activeTab === "clients" &&
    clients.length === 0 &&
    !clientsError
  ) {
    return <ClientsLoadingState />;
  }

  return (
    <IbPageShell>
      <IbPageHeader
        eyebrow="Partner's Clients"
        title="Client summary and rebate activity"
        description="Browse Referred Users, Sub Partners, and rebate records from the same reporting surface."
        actions={
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      />

      {/* Metric cards */}
      {/* <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <IbMetricCard
          title="Current View"
          value={activeTab === "clients" ? "Clients" : activeTab === "sub-ibs" ? "Sub Partners" : "Rebates"}
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
      </div> */}

      <IbSectionCard
        title="Partner activity ledger"
        description="Filter and review client-side trading and rebate records."
      >
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabType)}
          className="space-y-6"
        >
          <TabsList className="grid h-auto w-full grid-cols-1 sm:grid-cols-3 rounded-2xl bg-muted/40 p-1">
            <TabsTrigger value="clients">Referred Users</TabsTrigger>
            <TabsTrigger value="sub-ibs">Sub Partners</TabsTrigger>
            <TabsTrigger value="rebates">Rebates</TabsTrigger>
          </TabsList>

          {/* Error state */}
          {!!currentError && (
            <ApiErrorState
              error={currentError}
              audience="client"
              resource={
                activeTab === "clients"
                  ? "clients"
                  : activeTab === "sub-ibs"
                    ? "sub IBs"
                    : "rebates"
              }
              action="load"
              variant="inline"
              onRetry={handleRefresh}
            />
          )}

          {/* ── Referred Users ── */}
          <TabsContent value="clients" className="space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <TabSearchBar
                inputValue={clientsSearch.input}
                onInputChange={(v) =>
                  setClientsSearch((s) => ({ ...s, input: v }))
                }
                onSearch={() => handleSearchForTab("clients")}
                onClear={() => handleClearSearchForTab("clients")}
                isLoading={clientsLoading}
              />
              {/* Date Filters */}
              <div className="flex flex-wrap items-end gap-3 lg:ml-auto">
                <DateRangePicker
                  fromDate={fromDateObj}
                  toDate={toDateObj}
                  onFromDateChange={(date) => {
                    setFromDateObj(date);
                    setPage(1);
                    setFromDate(date ? format(date, "yyyy-MM-dd") : null);
                  }}
                  onToDateChange={(date) => {
                    setToDateObj(date);
                    setPage(1);
                    setToDate(date ? format(date, "yyyy-MM-dd") : null);
                  }}
                />
                {(fromDate || toDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPage(1);
                      setFromDate(null);
                      setToDate(null);
                    }}
                    className="h-9 text-muted-foreground hover:text-foreground text-xs font-medium"
                  >
                    Clear Dates
                  </Button>
                )}
              </div>
            </div>
            {clientsLoading && clients.length === 0 ? (
              <TableSkeleton />
            ) : clients.length > 0 ? (
              <ReusableDataTable
                data={clients}
                columns={clientsColumns}
                pagination={clientsPagination}
                isLoading={clientsLoading}
                showSerialNumber
                serialNumberStart={
                  (clientsPagination.current_page - 1) *
                    clientsPagination.per_page +
                  1
                }
                onPageChange={setPage}
                onPerPageChange={handlePerPageChange}
                perPageOptions={[10, 20, 30, 50, 100]}
              />
            ) : !clientsError ? (
              <EmptyState
                title="No clients found"
                description={
                  clientsSearch.query
                    ? "No Referred Users match your search."
                    : "Direct user registrations will appear here when activity starts."
                }
                icon={<Users className="h-5 w-5" />}
              />
            ) : null}
          </TabsContent>

          {/* ── Sub IBs ── */}
          <TabsContent value="sub-ibs" className="space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <TabSearchBar
                inputValue={subIbsSearch.input}
                onInputChange={(v) =>
                  setSubIbsSearch((s) => ({ ...s, input: v }))
                }
                onSearch={() => handleSearchForTab("sub-ibs")}
                onClear={() => handleClearSearchForTab("sub-ibs")}
                isLoading={subIbsLoading}
              />
              {/* Date Filters & Level Filter */}
              <div className="flex flex-wrap items-end gap-3 lg:ml-auto">
                <Select
                  value={levelFilter?.toString() || "all"}
                  onValueChange={(value) => {
                    setLevelFilter(value === "all" ? null : parseInt(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {Array.from({ length: levelCount }, (_, i) => i + 1).map(
                      (level) => (
                        <SelectItem key={level} value={level.toString()}>
                          Level {level}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
                <DateRangePicker
                  fromDate={fromDateObj}
                  toDate={toDateObj}
                  onFromDateChange={(date) => {
                    setFromDateObj(date);
                    setPage(1);
                    setFromDate(date ? format(date, "yyyy-MM-dd") : null);
                  }}
                  onToDateChange={(date) => {
                    setToDateObj(date);
                    setPage(1);
                    setToDate(date ? format(date, "yyyy-MM-dd") : null);
                  }}
                />
                {(fromDate || toDate || levelFilter) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPage(1);
                      setFromDate(null);
                      setToDate(null);
                      setLevelFilter(null);
                    }}
                    className="h-9 text-muted-foreground hover:text-foreground text-xs font-medium"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
            {subIbsLoading && subIbs.length === 0 ? (
              <TableSkeleton />
            ) : subIbs.length > 0 ? (
              <ReusableDataTable
                data={subIbs}
                columns={subIbsColumns}
                pagination={subIbsPagination}
                isLoading={subIbsLoading}
                showSerialNumber
                serialNumberStart={
                  (subIbsPagination.current_page - 1) *
                    subIbsPagination.per_page +
                  1
                }
                onPageChange={setPage}
                onPerPageChange={handlePerPageChange}
                perPageOptions={[10, 20, 30, 50, 100]}
              />
            ) : !subIbsError ? (
              <EmptyState
                title="No sub Partners records found"
                description={
                  subIbsSearch.query
                    ? "No sub Partners records match your search."
                    : "Sub Partners relationships will appear here after registrations are linked."
                }
                icon={<Users className="h-5 w-5" />}
              />
            ) : null}
          </TabsContent>

          {/* ── Rebates ── */}
          <TabsContent value="rebates" className="space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <TabSearchBar
                inputValue={rebatesSearch.input}
                onInputChange={(v) =>
                  setRebatesSearch((s) => ({ ...s, input: v }))
                }
                onSearch={() => handleSearchForTab("rebates")}
                onClear={() => handleClearSearchForTab("rebates")}
                isLoading={rebatesLoading}
              />
              {/* Date Filters */}
              <div className="flex flex-wrap items-end gap-3 lg:ml-auto">
                <DateRangePicker
                  fromDate={fromDateObj}
                  toDate={toDateObj}
                  onFromDateChange={(date) => {
                    setFromDateObj(date);
                    setPage(1);
                    setFromDate(date ? format(date, "yyyy-MM-dd") : null);
                  }}
                  onToDateChange={(date) => {
                    setToDateObj(date);
                    setPage(1);
                    setToDate(date ? format(date, "yyyy-MM-dd") : null);
                  }}
                />
                {(fromDate || toDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPage(1);
                      setFromDate(null);
                      setToDate(null);
                    }}
                    className="h-9 text-muted-foreground hover:text-foreground text-xs font-medium"
                  >
                    Clear Dates
                  </Button>
                )}
              </div>
            </div>
            {rebatesLoading && rebates.length === 0 ? (
              <TableSkeleton />
            ) : rebates.length > 0 ? (
              <ReusableDataTable
                data={rebates}
                columns={rebatesColumns}
                pagination={rebatesPagination}
                isLoading={rebatesLoading}
                showSerialNumber
                serialNumberStart={
                  (rebatesPagination.current_page - 1) *
                    rebatesPagination.per_page +
                  1
                }
                onPageChange={setPage}
                onPerPageChange={handlePerPageChange}
                perPageOptions={[10, 20, 30, 50, 100]}
              />
            ) : !rebatesError ? (
              <EmptyState
                title="No rebate entries found"
                description={
                  rebatesSearch.query
                    ? "No rebate entries match your search."
                    : "Rebate activity will appear here once clients begin trading."
                }
                icon={<DollarSign className="h-5 w-5" />}
              />
            ) : null}
          </TabsContent>
        </Tabs>
      </IbSectionCard>
    </IbPageShell>
  );
}
