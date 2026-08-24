"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import { parseAsString, useQueryState } from "nuqs";
import toast from "react-hot-toast";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeft,
  BarChart3,
  CalendarClock,
  CalendarIcon,
  Copy,
  DollarSign,
  ExternalLink,
  Eye,
  Gem,
  Link2,
  Network,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  Wallet,
  UserStar,
} from "lucide-react";

import {
  IbMetricCard,
  IbPageHeader,
  IbSectionCard,
} from "@/components/ib/ib-page-primitives";
import { StatePreservingLink } from "@/components/state-preserving-link";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ReusableDataTable,
  type ColumnDef,
} from "@/components/data-table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import {
  adminIbUsersApi,
  type AdminIbPlanItem,
  type AdminIbUser,
  type AdminIbWorkspaceData,
  type AdminIbWalletData,
  type AdminIbNetworkData,
  type AdminIbClientsResponse,
  type AdminIbSubIbsResponse,
  type AdminIbClient,
  type AdminIbSubIb,
  type AdminIbWalletTransaction,
  type AdminIbNetworkBusinessBreakdown,
  type AdminIbCommissionTrade,
  type AdminIbCommissionsResponse,
} from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { formatAmount, formatDateTimeInIST } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import {
  IB_PROFILE_RETURN_STORAGE_KEY,
  tableStateStorage,
  USER_PROFILE_RETURN_STORAGE_KEY,
} from "@/lib/table-state-storage";
import dynamic from "next/dynamic";
import type { ChartConfig } from "@/components/ui/chart";

const ChartContainer = dynamic(
  () =>
    import("@/components/ui/chart").then((m) => ({
      default: m.ChartContainer,
    })),
  { ssr: false },
);
const ChartTooltip = dynamic(
  () =>
    import("@/components/ui/chart").then((m) => ({ default: m.ChartTooltip })),
  { ssr: false },
);
const ChartTooltipContent = dynamic(
  () =>
    import("@/components/ui/chart").then((m) => ({
      default: m.ChartTooltipContent,
    })),
  { ssr: false },
);
const BarChart = dynamic(
  () => import("recharts").then((m) => ({ default: m.BarChart })),
  { ssr: false },
);
const Bar = dynamic(
  () => import("recharts").then((m) => ({ default: m.Bar })),
  { ssr: false },
);
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => ({ default: m.CartesianGrid })),
  { ssr: false },
);
const XAxis = dynamic(
  () => import("recharts").then((m) => ({ default: m.XAxis })),
  { ssr: false },
);
const YAxis = dynamic(
  () => import("recharts").then((m) => ({ default: m.YAxis })),
  { ssr: false },
);
const Cell = dynamic(
  () => import("recharts").then((m) => ({ default: m.Cell })),
  { ssr: false },
);

type TabKey = "overview" | "wallet" | "network" | "profile" | "commission";

const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  wallet: "Wallet",
  network: "Network",
  profile: "Profile",
  commission: "Commission",
};

type PreviewUser = Pick<
  AdminIbUser,
  | "id"
  | "uuid"
  | "name"
  | "first_name"
  | "last_name"
  | "email"
  | "mobile"
  | "phone"
  | "sponsor_id"
  | "sponsor_by"
  | "ib_name"
  | "ib_plan_name"
  | "partner_id"
  | "referral_code"
  | "referral_link"
  | "status"
  | "is_ib_user"
  | "created_at"
>;

type IbPlanOption = {
  id: string;
  name: string;
  status: string;
};

const normalizeIbPlanOption = (plan: AdminIbPlanItem): IbPlanOption => ({
  id: String(plan.id),
  name: plan.name ?? `IB Plan ${plan.id}`,
  status: String(plan.status ?? ""),
});

const deriveFullName = (user: PreviewUser): string => {
  const candidates = [
    user.name,
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim(),
  ];
  const match = candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  return match ?? "IB User";
};

const deriveStatusLabel = (user: PreviewUser) => {
  const raw = user.status ?? user.is_ib_user;
  const value =
    typeof raw === "boolean" ? (raw ? 1 : 0) : Number(raw ?? 0);
  return value === 1 || raw === "1" || raw === true ? "Active" : "Inactive";
};

const isActive = (user: PreviewUser) =>
  deriveStatusLabel(user) === "Active";

const deriveReferralLinkFallback = (user: PreviewUser): string => {
  if (typeof window === "undefined") return "";
  const base = window.location.origin;
  if (user.partner_id) return `${base}/register?ref=${user.partner_id}`;
  if (user.referral_code) return `${base}/register?ref=${user.referral_code}`;
  if (user.sponsor_id) return `${base}/register?ref=${user.sponsor_id}`;
  return "";
};

const resolveNumericUserId = (user: AdminIbUser) => {
  if (typeof user.id === "number" && Number.isFinite(user.id)) {
    return user.id;
  }
  if (typeof user.id === "string") {
    const trimmedId = user.id.trim();
    if (trimmedId.length > 0 && !Number.isNaN(Number(trimmedId))) {
      return Number(trimmedId);
    }
  }
  return null;
};

function TabSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

type ResolvedPreview = {
  user: PreviewUser;
  referralLink: string;
  planName: string;
  partnerId: string;
  fullName: string;
  statusLabel: string;
  isActive: boolean;
  sponsor_by: string;
};

type TabShellProps = {
  user: ResolvedPreview;
  loading: boolean;
};

function OverviewTab({
  user,
  loading,
  data,
}: TabShellProps & { data: AdminIbWorkspaceData | null }) {
  const { fullName, referralLink } = user;
  const ibWallet = data?.ib_wallet;
  const mainWallet = data?.main_wallet;
  const pendingRebates = data?.pending_rebates;
  const totalEarned = data?.total_earned;
  const rebatesGraph = data?.rebates_graph ?? [];
  const earningSummary = data?.earning_summary;
  const partnerInfo = data?.partner_info;

  const maxRebate = useMemo(() => {
    if (rebatesGraph.length === 0) return 1;
    return Math.max(...rebatesGraph.map((r) => r.rebates), 1);
  }, [rebatesGraph]);

  const chartConfig: ChartConfig = {
    rebates: {
      label: "Rebates",
      color: "var(--primary)",
    },
  };

  // Recompute whenever the theme class on <html> changes
  const [themeVersion, setThemeVersion] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new MutationObserver(() => setThemeVersion((v) => v + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    return () => observer.disconnect();
  }, []);

  const tickColor = useMemo(() => {
    if (typeof window === "undefined") return "#000000";
    const el = document.createElement("div");
    el.className = "text-foreground";
    el.style.cssText = "position:absolute;visibility:hidden";
    document.body.appendChild(el);
    const color = getComputedStyle(el).color;
    document.body.removeChild(el);
    return color || "#000000";
  }, [themeVersion]);

  const todayEarnedStr = totalEarned
    ? `Today: ${formatCurrency(totalEarned.today)}`
    : "Today: 0.00";

  return (
    <>
      <IbPageHeader
        eyebrow="IB Workspace"
        title={`IB dashboard for ${fullName}`}
        description="Read-only preview of the IB portal."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <IbMetricCard
          title="IB Wallet"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(ibWallet?.balance ?? 0)}
          description={ibWallet ? `${ibWallet.currency}` : "Funds available for partner-level withdrawals"}
          icon={<Wallet className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title="Main Wallet"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(mainWallet?.balance ?? 0)}
          description={mainWallet ? `${mainWallet.currency}` : "Client-side funds ready for trading"}
          icon={<Wallet className="h-5 w-5" />}
          accent="emerald"
        />
        <IbMetricCard
          title="Pending Rebates"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(pendingRebates?.amount ?? 0)}
          description={pendingRebates ? `${pendingRebates.currency}` : "Cycle information"}
          icon={<CalendarClock className="h-5 w-5" />}
          accent="amber"
        />
        <IbMetricCard
          title="Total Earned"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(totalEarned?.amount ?? 0)}
          description={todayEarnedStr}
          icon={<DollarSign className="h-5 w-5" />}
          accent="slate"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <IbSectionCard
          title="Rebate trend"
          description="Recent rebate activity for the IB account."
          actions={
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              {todayEarnedStr}
            </span>
          }
        >
          {loading ? (
            <Skeleton className="h-[280px] w-full rounded-[24px]" />
          ) : rebatesGraph.length > 0 ? (
            <ChartContainer
              config={chartConfig}
              className="h-[280px] w-full"
            >
              <BarChart
                data={rebatesGraph}
                margin={{ top: 8, right: 4, left: -16, bottom: 0 }}
                barCategoryGap="30%"
              >
                <defs>
                  <linearGradient id="rebateBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: tickColor }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis
                  domain={[0, maxRebate]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: tickColor }}
                  width={48}
                />
                <ChartTooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4, radius: 6 }}
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="rebates"
                  fill="url(#rebateBarGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                >
                  {rebatesGraph.map((point) => (
                    <Cell
                      key={point.date}
                      fill="url(#rebateBarGradient)"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-[24px] border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground">
              <TrendingUp className="h-6 w-6" />
              No rebate data available yet.
            </div>
          )}
        </IbSectionCard>

        <IbSectionCard
          title="IB profile"
          description="Core IB program details and referral assets."
        >
          <div className="space-y-4">
            <div className="ib-portal-note rounded-3xl border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    IB Info
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {user.user.ib_name ?? user.fullName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {user.user.email ?? "\u2014"}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {user.user.mobile ?? user.user.phone ?? "\u2014"}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-background/70 bg-background/80">
                  <UserStar className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 rounded-3xl border border-border/60 bg-muted/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  IB ID
                </p>
                <p className="mt-2 break-all text-lg font-semibold leading-snug text-foreground sm:text-xl">
                  {partnerInfo?.partner_id ?? user.partnerId}
                </p>
              </div>
              <div className="min-w-0 rounded-3xl border border-border/60 bg-muted/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Internal Transfers
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {loading ? <Skeleton className="h-6 w-24" /> : formatCurrency(earningSummary?.total_internal_transfers ?? 0)}
                </p>
              </div>
            </div>

            <div className="min-w-0 rounded-3xl border border-border/60 bg-muted/20 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Referral Link
                  </p>
                  <p className="mt-2 break-all text-sm leading-6">
                    {referralLink ? (
                      <a
                        href={referralLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground underline hover:text-primary"
                      >
                        {referralLink}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">
                        No referral link available
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  disabled={!referralLink}
                  onClick={() => {
                    if (referralLink) void navigator.clipboard.writeText(referralLink);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    if (referralLink) void navigator.clipboard.writeText(referralLink);
                  }}
                >
                  <Link2 className="mr-2 h-3.5 w-3.5" />
                  Copy link
                </Button>
              </div>
            </div>
          </div>
        </IbSectionCard>
      </div>
    </>
  );
}

function WalletTab({
  loading,
  data,
  onPageChange,
  currentPage,
  totalPages,
  perPage,
  onPerPageChange,
}: TabShellProps & { 
  data: AdminIbWalletData | null;
  onPageChange: (page: number) => void;
  currentPage: number;
  totalPages: number;
  perPage: number;
  onPerPageChange: (perPage: number) => void;
}) {
  const partnerWallet = data?.partner_wallet;
  const clientWallet = data?.client_wallet;
  const transactions = data?.recent_transactions ?? [];
  const totalTransactions = data?.pagination?.total ?? transactions.length;

  const walletTransactionColumns: ColumnDef<AdminIbWalletTransaction>[] = [
    {
      header: "Type",
      key: "type",
      render: (tx) => {
        const isOutflow = ["withdrawal", "transfer_out", "debit"].some(type =>
          String(tx.type).toLowerCase().includes(type)
        );
        const displayType = tx.type ? String(tx.type).replace(/_/g, " ") : "Transaction";
        
        return (
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[13px]",
                isOutflow
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
                  : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
              )}
            >
              {isOutflow ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
            </span>
            <span className="font-medium text-foreground capitalize">{displayType}</span>
          </div>
        );
      },
      className: "whitespace-nowrap",
    },
    {
      header: "Description",
      key: "description",
      render: (tx) => (
        <span className="max-w-[220px] truncate block text-muted-foreground">
          {tx.description || "—"}
        </span>
      ),
    },
    {
      header: "Amount",
      key: "amount",
      align: "right",
      render: (tx) => {
        const amount = tx.net_amount ?? tx.amount ?? 0;
        const isOutflow = ["withdrawal", "transfer_out", "debit"].some(type =>
          String(tx.type).toLowerCase().includes(type)
        );
        
        return (
          <span
            className={cn(
              "font-semibold tabular-nums",
              isOutflow
                ? "text-rose-600 dark:text-rose-300"
                : "text-emerald-600 dark:text-emerald-300"
            )}
          >
            {isOutflow ? "−" : "+"}
            {formatCurrency(Math.abs(amount))}
          </span>
        );
      },
      className: "whitespace-nowrap",
    },
    {
      header: "Status",
      key: "status",
      render: (tx) => {
        const status = tx.status?.toLowerCase() ?? "";
        
        if (["completed", "success", "approved"].includes(status)) {
          return (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 capitalize">{tx.status}</span>
            </span>
          );
        }
        
        if (["pending", "processing"].includes(status)) {
          return (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 capitalize">{tx.status}</span>
            </span>
          );
        }
        
        if (["failed", "rejected", "cancelled"].includes(status)) {
          return (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400 capitalize">{tx.status}</span>
            </span>
          );
        }
        
        return <Badge variant="outline" className="capitalize">{tx.status || "Unknown"}</Badge>;
      },
      className: "whitespace-nowrap",
    },
    {
      header: "Date",
      key: "date",
      render: (tx) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {tx.date ? formatDateTimeInIST(tx.date, "—") : "—"}
        </span>
      ),
      className: "whitespace-nowrap",
    },
  ];

  const pagination = {
    current_page: currentPage,
    per_page: perPage,
    total: totalTransactions,
    total_pages: totalPages,
  };

  return (
    <>
      <IbPageHeader
        eyebrow="Wallet"
        title="Wallet balances and transaction history"
        description="IB wallet, main wallet, and recent transactions."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <IbMetricCard
          title="IB Wallet"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(partnerWallet?.balance ?? 0)}
          description={partnerWallet?.label ?? "IB-side commission wallet"}
          icon={<Wallet className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title="Main Wallet"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(clientWallet?.balance ?? 0)}
          description={clientWallet?.label ?? "Main trading wallet"}
          icon={<Wallet className="h-5 w-5" />}
          accent="emerald"
        />
      </div>

      <IbSectionCard
        title="Recent wallet transactions"
        description="Latest movements across both wallets."
      >
        <ReusableDataTable
          data={transactions}
          columns={walletTransactionColumns}
          pagination={pagination}
          isLoading={loading}
          showSerialNumber={true}
          serialNumberStart={(currentPage - 1) * perPage + 1}
          onPageChange={onPageChange}
          onPerPageChange={onPerPageChange}
          emptyState={
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 py-10 text-sm text-muted-foreground">
              <Wallet className="h-6 w-6" />
              No transactions yet.
            </div>
          }
        />
      </IbSectionCard>
    </>
  );
}

function NetworkTab({
  loading,
  networkData,
  clientsData,
  subIbsData,
  businessPage,
  onBusinessPageChange,
  businessPerPage,
  onBusinessPerPageChange,
  clientsPage,
  onClientsPageChange,
  clientsPerPage,
  onClientsPerPageChange,
  subIbsPage,
  onSubIbsPageChange,
  subIbsPerPage,
  onSubIbsPerPageChange,
  clientsDateFrom,
  clientsDateTo,
  onClientsDateFromChange,
  onClientsDateToChange,
  onResetClientsFilters,
  subIbsDateFrom,
  subIbsDateTo,
  onSubIbsDateFromChange,
  onSubIbsDateToChange,
  onResetSubIbsFilters,
}: TabShellProps & {
  networkData: AdminIbNetworkData | null;
  clientsData: AdminIbClientsResponse | null;
  subIbsData: AdminIbSubIbsResponse | null;
  businessPage: number;
  onBusinessPageChange: (page: number) => void;
  businessPerPage: number;
  onBusinessPerPageChange: (perPage: number) => void;
  clientsPage: number;
  onClientsPageChange: (page: number) => void;
  clientsPerPage: number;
  onClientsPerPageChange: (perPage: number) => void;
  subIbsPage: number;
  onSubIbsPageChange: (page: number) => void;
  subIbsPerPage: number;
  onSubIbsPerPageChange: (perPage: number) => void;
  clientsDateFrom: Date | undefined;
  clientsDateTo: Date | undefined;
  onClientsDateFromChange: (date: Date | undefined) => void;
  onClientsDateToChange: (date: Date | undefined) => void;
  onResetClientsFilters: () => void;
  subIbsDateFrom: Date | undefined;
  subIbsDateTo: Date | undefined;
  onSubIbsDateFromChange: (date: Date | undefined) => void;
  onSubIbsDateToChange: (date: Date | undefined) => void;
  onResetSubIbsFilters: () => void;
}) {
  const businessBreakdown = networkData?.business_breakdown ?? [];
  const clients = clientsData?.data ?? [];
  const subIbs = subIbsData?.data ?? [];
  
  const clientsActiveFilterCount = (clientsDateFrom ? 1 : 0) + (clientsDateTo ? 1 : 0);
  const subIbsActiveFilterCount = (subIbsDateFrom ? 1 : 0) + (subIbsDateTo ? 1 : 0);

  // Column definitions
  const businessColumns: ColumnDef<AdminIbNetworkBusinessBreakdown>[] = [
    {
      header: "Level",
      key: "level",
      render: (b) => (
        <span className="font-medium">
          {b.level_label === "IB" ? "IB" : b.level_label}
        </span>
      ),
    },
    {
      header: "Source",
      key: "source",
      render: (b) => (
        <span className="text-muted-foreground">
          {b.source === "Sub-IBs" ? "Sub-IB" : b.source}
        </span>
      ),
    },
    {
      header: "Lots",
      key: "lots",
      align: "right",
      render: (b) => <span className="tabular-nums">{b.lots}</span>,
    },
    {
      header: "Commission Earned",
      key: "commission_earned",
      align: "right",
      render: (b) => (
        <span className="tabular-nums">{formatCurrency(b.commission_earned)}</span>
      ),
    },
    {
      header: "Clients / Sub-IBs",
      key: "clients_sub_ibs",
      align: "right",
      render: (b) => (
        <span className="tabular-nums">
          {b.clients > 0 ? `${b.clients} clients` : ""}
          {b.sub_ibs > 0 ? `${b.clients > 0 ? " / " : ""}${b.sub_ibs} sub-IBs` : ""}
          {b.clients === 0 && b.sub_ibs === 0 ? "—" : ""}
        </span>
      ),
    },
  ];

  const clientsColumns: ColumnDef<AdminIbClient>[] = [
    {
      header: "Client",
      key: "name",
      render: (client) => (
        <div>
          <p className="font-medium">{client.name}</p>
          <p className="text-xs text-muted-foreground">{client.email}</p>
        </div>
      ),
    },
    {
      header: "Lots",
      key: "lots",
      align: "right",
      render: (client) => <span className="tabular-nums">{client.lots}</span>,
    },
    {
      header: "Earned",
      key: "earned",
      align: "right",
      render: (client) => (
        <span className="tabular-nums">{formatCurrency(client.earned)}</span>
      ),
    },
    {
      header: "Pending",
      key: "pending",
      align: "right",
      render: (client) => (
        <span className="tabular-nums">{formatCurrency(client.pending)}</span>
      ),
    },
    {
      header: "Registered",
      key: "registered",
      render: (client) => (
        <span className="text-muted-foreground">
          {client.registered ? formatDateTimeInIST(client.registered, "—") : "—"}
        </span>
      ),
      hideOnMobile: true,
    },
  ];

  const subIbsColumns: ColumnDef<AdminIbSubIb>[] = [
    {
      header: "Sub-IB",
      key: "name",
      render: (sub) => (
        <div>
          <p className="font-medium">{sub.name}</p>
          <p className="text-xs text-muted-foreground">{sub.email}</p>
        </div>
      ),
    },
    {
      header: "Level",
      key: "level_label",
      render: (sub) => (
        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
          {sub.level_label}
        </span>
      ),
    },
    {
      header: "Lots",
      key: "lots",
      align: "right",
      render: (sub) => <span className="tabular-nums">{sub.lots}</span>,
    },
    {
      header: "Earned",
      key: "earned",
      align: "right",
      render: (sub) => (
        <span className="tabular-nums">{formatCurrency(sub.earned)}</span>
      ),
    },
    {
      header: "Pending",
      key: "pending",
      align: "right",
      render: (sub) => (
        <span className="tabular-nums">{formatCurrency(sub.pending)}</span>
      ),
    },
  ];

  const businessPagination = {
    current_page: businessPage,
    per_page: businessPerPage,
    total: businessBreakdown.length,
    total_pages: Math.ceil(businessBreakdown.length / businessPerPage),
  };

  const clientsPagination = {
    current_page: clientsData?.pagination?.current_page ?? clientsPage,
    per_page: clientsData?.pagination?.per_page ?? clientsPerPage,
    total: clientsData?.pagination?.total ?? 0,
    total_pages: clientsData?.pagination?.last_page ?? 1,
  };

  const subIbsPagination = {
    current_page: subIbsData?.pagination?.current_page ?? subIbsPage,
    per_page: subIbsData?.pagination?.per_page ?? subIbsPerPage,
    total: subIbsData?.pagination?.total ?? 0,
    total_pages: subIbsData?.pagination?.last_page ?? 1,
  };
  
  return (
    <>
      <IbPageHeader
        eyebrow="Network"
        title="Clients, sub-IBs & total business"
        description="Referred clients, sub-brokers, trading volume, and the full downline tree."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <IbMetricCard
          title="Referred Users"
          value={loading ? <Skeleton className="h-7 w-20" /> : String(networkData?.overview.direct_clients ?? 0)}
          description="Users directly referred"
          icon={<Users className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title="Sub-IBs"
          value={loading ? <Skeleton className="h-7 w-20" /> : String(networkData?.overview.sub_ibs ?? 0)}
          description="Active sub-IBs in downline"
          icon={<Network className="h-5 w-5" />}
          accent="emerald"
        />
        <IbMetricCard
          title="Total Downline"
          value={loading ? <Skeleton className="h-7 w-20" /> : String(networkData?.overview.total_downline ?? 0)}
          description="All levels combined"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="amber"
        />
        <IbMetricCard
          title="Total Business"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(networkData?.overview.total_business ?? 0)}
          description="Cumulative volume from you and your team"
          icon={<BarChart3 className="h-5 w-5" />}
          accent="primary"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <IbMetricCard
          title="Your Business"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(networkData?.overview.your_business ?? 0)}
          description="Volume from your own Referred Users"
          icon={<DollarSign className="h-5 w-5" />}
          accent="emerald"
        />
        <IbMetricCard
          title="Team Business"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(networkData?.overview.team_business ?? 0)}
          description="Volume from sub-IBs and their downlines"
          icon={<Network className="h-5 w-5" />}
          accent="amber"
        />
        <IbMetricCard
          title="Total Lots"
          value={loading ? <Skeleton className="h-7 w-20" /> : String(networkData?.overview.total_lots.toFixed(2) ?? 0)}
          description="Round lots traded across your network"
          icon={<BarChart3 className="h-5 w-5" />}
          accent="slate"
        />
      </div>

      <IbSectionCard
        title="Business breakdown"
        description="lots contributed by each level of your downline."
      >
        <ReusableDataTable
          data={businessBreakdown}
          columns={businessColumns}
          pagination={businessPagination}
          isLoading={loading}
          showSerialNumber={true}
          serialNumberStart={(businessPage - 1) * businessPerPage + 1}
          onPageChange={onBusinessPageChange}
          onPerPageChange={onBusinessPerPageChange}
          emptyState={
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 py-10 text-sm text-muted-foreground">
              <BarChart3 className="h-6 w-6" />
              No business breakdown data yet.
            </div>
          }
        />
      </IbSectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <IbSectionCard
          title="Referred Users"
          description="Clients registered via the IB's referral link."
          actions={
            clientsActiveFilterCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetClientsFilters}
              >
                Reset Filters
              </Button>
            ) : null
          }
        >
          <DateRangePicker
            fromDate={clientsDateFrom}
            toDate={clientsDateTo}
            onFromDateChange={onClientsDateFromChange}
            onToDateChange={onClientsDateToChange}
            className="mb-4"
          />
          
          <ReusableDataTable
            data={clients}
            columns={clientsColumns}
            pagination={clientsPagination}
            isLoading={loading}
            showSerialNumber={true}
            serialNumberStart={(clientsPage - 1) * clientsPerPage + 1}
            onPageChange={onClientsPageChange}
            onPerPageChange={onClientsPerPageChange}
            emptyState={
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 py-10 text-sm text-muted-foreground">
                <Users className="h-6 w-6" />
                No Referred Users yet.
              </div>
            }
          />
        </IbSectionCard>

        <IbSectionCard
          title="Sub-IBs"
          description="Sub-IBs attached to this IB at any level."
          actions={
            subIbsActiveFilterCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetSubIbsFilters}
              >
                Reset Filters
              </Button>
            ) : null
          }
        >
          <DateRangePicker
            fromDate={subIbsDateFrom}
            toDate={subIbsDateTo}
            onFromDateChange={onSubIbsDateFromChange}
            onToDateChange={onSubIbsDateToChange}
            className="mb-4"
          />
          
          <ReusableDataTable
            data={subIbs}
            columns={subIbsColumns}
            pagination={subIbsPagination}
            isLoading={loading}
            showSerialNumber={true}
            serialNumberStart={(subIbsPage - 1) * subIbsPerPage + 1}
            onPageChange={onSubIbsPageChange}
            onPerPageChange={onSubIbsPerPageChange}
            emptyState={
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 py-10 text-sm text-muted-foreground">
                <Network className="h-6 w-6" />
                No sub-IBs yet.
              </div>
            }
          />
        </IbSectionCard>
      </div>
    </>
  );
}

function ProfileTab({ user, loading }: TabShellProps) {
  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Full name", value: user.fullName },
    { label: "Email", value: user.user.email ?? "\u2014" },
    { label: "Mobile", value: user.user.mobile ?? user.user.phone ?? "\u2014" },
    { label: "IB Name", value: user.user.ib_name ?? "\u2014" },
    { label: "IB ID", value: user.partnerId },
    { label: "Referred By", value: user.user.sponsor_by ?? "\u2014" },
    { label: "Referral Code", value: user.user.referral_code ?? "\u2014" },
    {
      label: "Registered",
      value: user.user.created_at
        ? formatDateTimeInIST(user.user.created_at, "\u2014")
        : "\u2014",
    },
  ];

  return (
    <>
      <IbPageHeader
        eyebrow="Profile"
        title="IB account profile"
        description="Identity, plan assignment, and registration metadata."
        actions={
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 rounded-full"
          >
            <StatePreservingLink
              storageKey={USER_PROFILE_RETURN_STORAGE_KEY}
              href={`/new-users/${user.user.id ?? user.user.uuid ?? ""}`}
            >
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Open full user record
            </StatePreservingLink>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-3xl border border-border/60 bg-muted/20 p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {row.label}
            </p>
            <p className="mt-2 text-sm font-medium text-foreground break-words">
              {loading ? <Skeleton className="h-5 w-40" /> : row.value}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

function CommissionTab({ user }: TabShellProps) {
  const { token } = useAuth();
  const userId = user.user.id ?? user.user.uuid;

  const [commissionData, setCommissionData] = useState<AdminIbCommissionsResponse | null>(null);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [commissionPage, setCommissionPage] = useState(1);
  const [commissionPerPage, setCommissionPerPage] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);

  const loadCommissions = useCallback(async () => {
    if (!token || !userId) return;
    try {
      setCommissionLoading(true);
      const res = await adminIbUsersApi.commissions(
        userId,
        token,
        commissionPage,
        commissionPerPage,
        searchQuery || undefined,
        fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        toDate ? format(toDate, "yyyy-MM-dd") : undefined,
      );
      const raw = res as unknown as AdminIbCommissionsResponse;
      setCommissionData({
        ...raw,
        data: raw.data ?? [],
        pagination: raw.pagination ?? {
          total: 0,
          per_page: commissionPerPage,
          current_page: commissionPage,
          last_page: 1,
        },
      });
    } catch (err: unknown) {
      console.error("Failed to load commissions:", err);
      toast.error(
        getAdminFriendlyErrorMessage(err, {
          resource: "commission data",
          action: "load",
        }),
      );
      setCommissionData(null);
    } finally {
      setCommissionLoading(false);
    }
  }, [token, userId, commissionPage, commissionPerPage, searchQuery, fromDate, toDate]);

  useEffect(() => {
    void loadCommissions();
  }, [loadCommissions]);

  const activeFilterCount =
    (searchQuery ? 1 : 0) + (fromDate ? 1 : 0) + (toDate ? 1 : 0);

  const handleResetFilters = () => {
    setSearchInput("");
    setSearchQuery("");
    setFromDate(undefined);
    setToDate(undefined);
    setCommissionPage(1);
  };

  const commissionColumns: ColumnDef<AdminIbCommissionTrade>[] = [
    {
      header: "Date",
      key: "date",
      render: (t) => t.date || "—",
    },
    {
      header: "MT5 ID",
      key: "mt5_id",
      render: (t) => t.mt5_id || "—",
    },
    {
      header: "Order",
      key: "order",
      render: (t) => <span className="tabular-nums">{t.order}</span>,
    },
    {
      header: "Symbol",
      key: "symbol",
      render: (t) => t.symbol || "—",
    },
    {
      header: "Type",
      key: "type",
      render: (t) => (
        <Badge
          className={cn(
            "border-0",
            String(t.type).toLowerCase() === "buy"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-300",
          )}
        >
          {t.type}
        </Badge>
      ),
    },
    {
      header: "Price",
      key: "price",
      align: "right",
      render: (t) => <span className="tabular-nums">{formatAmount(t.price)}</span>,
    },
    {
      header: "Volume",
      key: "volume",
      align: "right",
      render: (t) => <span className="tabular-nums">{formatAmount(t.volume)}</span>,
    },
    {
      header: "Profit",
      key: "profit",
      align: "right",
      render: (t) => (
        <span className={cn("tabular-nums", t.profit < 0 && "text-destructive")}>
          {formatAmount(t.profit)}
        </span>
      ),
    },
    {
      header: "My Commission",
      key: "my_commission",
      align: "right",
      render: (t) => (
        <span className="font-medium tabular-nums">{formatAmount(t.my_commission)}</span>
      ),
    },
  ];

  return (
    <>
      <IbPageHeader
        eyebrow="Commission"
        title="My Commissions"
        description="Commission earned on trades placed by you and your downline."
      />

      <div className="space-y-4">
        {/* Filters */}
        <div className="rounded-lg border bg-card p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <ApiSearchBar
              value={searchInput}
              onChange={(value) => setSearchInput(value)}
              onSearch={(value) => {
                setCommissionPage(1);
                const trimmed = value.trim();
                setSearchQuery(trimmed.length === 0 || trimmed.length >= 3 ? trimmed : searchQuery);
              }}
              placeholder="Search by MT5 ID or symbol"
              className="min-w-[220px] flex-1 max-w-full"
              minimumLength={3}
              delay={300}
            />

            <DateRangePicker
              fromDate={fromDate}
              toDate={toDate}
              onFromDateChange={(date) => {
                setFromDate(date);
                setCommissionPage(1);
              }}
              onToDateChange={(date) => {
                setToDate(date);
                setCommissionPage(1);
              }}
            />

            {activeFilterCount > 0 ? (
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                Reset
              </Button>
            ) : null}
          </div>
        </div>

        {/* Commission table */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <ReusableDataTable
            data={commissionData?.data ?? []}
            columns={commissionColumns}
            pagination={{
              current_page: commissionData?.pagination?.current_page ?? commissionPage,
              per_page: commissionData?.pagination?.per_page ?? commissionPerPage,
              total: commissionData?.pagination?.total ?? 0,
              total_pages: commissionData?.pagination?.last_page ?? 1,
            }}
            isLoading={commissionLoading}
            showSerialNumber={true}
            serialNumberStart={(commissionPage - 1) * commissionPerPage + 1}
            onPageChange={setCommissionPage}
            onPerPageChange={(perPage) => {
              setCommissionPerPage(perPage);
              setCommissionPage(1);
            }}
            emptyState={
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 py-10 text-sm text-muted-foreground">
                <TrendingUp className="h-6 w-6" />
                No commission records found.
              </div>
            }
          />
        </div>
      </div>
    </>
  );
}

export default function IbUserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const idParam = Array.isArray(params.id) ? params.id[0] : params.id;
  const id = typeof idParam === "string" ? decodeURIComponent(idParam) : "";

  const [user, setUser] = useState<AdminIbUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [activeTabParam, setActiveTab] = useQueryState("tab", parseAsString.withDefault("overview"));
  const activeTab = (activeTabParam in TAB_LABELS ? (activeTabParam as TabKey) : "overview");
  const [ibPlans, setIbPlans] = useState<IbPlanOption[]>([]);
  const [loadingIbPlans, setLoadingIbPlans] = useState(false);
  const [selectedIbPlanId, setSelectedIbPlanId] = useState("");
  const [updatingPlan, setUpdatingPlan] = useState(false);
  // const [showPlanSelect, setShowPlanSelect] = useState(false);

  const [workspaceData, setWorkspaceData] = useState<AdminIbWorkspaceData | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);

  const [walletData, setWalletData] = useState<AdminIbWalletData | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletLoaded, setWalletLoaded] = useState(false);
  const [walletPage, setWalletPage] = useState(1);
  const [walletPerPage, setWalletPerPage] = useState(10);

  const [networkData, setNetworkData] = useState<AdminIbNetworkData | null>(null);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [networkLoaded, setNetworkLoaded] = useState(false);

  const [clientsData, setClientsData] = useState<AdminIbClientsResponse | null>(null);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [clientsPage, setClientsPage] = useState(1);

  const [subIbsData, setSubIbsData] = useState<AdminIbSubIbsResponse | null>(null);
  const [subIbsLoading, setSubIbsLoading] = useState(false);
  const [subIbsLoaded, setSubIbsLoaded] = useState(false);
  const [subIbsPage, setSubIbsPage] = useState(1);

  const [businessPage, setBusinessPage] = useState(1);
  const [businessPerPage, setBusinessPerPage] = useState(10);
  const [clientsPerPage, setClientsPerPage] = useState(10);
  const [subIbsPerPage, setSubIbsPerPage] = useState(10);

  // Date filter states for clients
  const [clientsDateFrom, setClientsDateFrom] = useState<Date | undefined>(undefined);
  const [clientsDateTo, setClientsDateTo] = useState<Date | undefined>(undefined);

  // Date filter states for sub-IBs
  const [subIbsDateFrom, setSubIbsDateFrom] = useState<Date | undefined>(undefined);
  const [subIbsDateTo, setSubIbsDateTo] = useState<Date | undefined>(undefined);

  const userId = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) ? n : null;
  }, [id]);

  const loadUser = useCallback(async () => {
    if (!token || !id) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const uid = Number(id);
      if (!Number.isFinite(uid)) {
        throw new Error(`Invalid user ID: ${id}`);
      }

      const response = await adminIbUsersApi.detail(uid, token);
      const payload = response?.data;

      let resolvedUser: AdminIbUser | null = null;

      if (payload) {
        const dataObj = payload as Record<string, unknown>;
        if (dataObj.user && typeof dataObj.user === "object") {
          resolvedUser = dataObj.user as AdminIbUser;
        } else if (dataObj.data && typeof dataObj.data === "object") {
          const inner = dataObj.data as Record<string, unknown>;
          if (inner.user && typeof inner.user === "object") {
            resolvedUser = inner.user as AdminIbUser;
          } else {
            resolvedUser = inner as unknown as AdminIbUser;
          }
        } else {
          resolvedUser = payload as unknown as AdminIbUser;
        }
      }

      if (!resolvedUser) {
        throw new Error("Could not resolve user from detail response.");
      }

      setUser(resolvedUser);
    } catch (err: unknown) {
      console.error("Failed to load IB user detail:", err);
      setError(err);
      toast.error(
        getAdminFriendlyErrorMessage(err, {
          resource: "IB user",
          action: "load",
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  // const loadIbPlans = useCallback(async () => {
  //   if (!token) {
  //     setIbPlans([]);
  //     return;
  //   }

  //   try {
  //     setLoadingIbPlans(true);
  //     const response = await adminIbPlansApi.list({ token });
  //     const plans = Array.isArray(response?.data) ? response.data : [];
  //     setIbPlans(plans.map(normalizeIbPlanOption));
  //   } catch (err: unknown) {
  //     console.error("Failed to load partner plans:", err);
  //     toast.error(
  //       getAdminFriendlyErrorMessage(err, {
  //         resource: "partner plans",
  //         action: "load",
  //       }),
  //     );
  //     setIbPlans([]);
  //   } finally {
  //     setLoadingIbPlans(false);
  //   }
  // }, [token]);

  // useEffect(() => {
  //   void loadIbPlans();
  // }, [loadIbPlans]);

  const loadTabData = useCallback(async (tab: TabKey) => {
    if (!token || !userId) return;

    try {
      switch (tab) {
        case "overview": {
          if (workspaceLoaded) return;
          setWorkspaceLoading(true);
          const res = await adminIbUsersApi.workspace(userId, token);
          setWorkspaceData(res.data ?? null);
          setWorkspaceLoaded(true);
          break;
        }
        case "wallet": {
          if (walletLoaded) return;
          setWalletLoading(true);
          const res = await adminIbUsersApi.wallet(userId, token, walletPage, walletPerPage);
          setWalletData(res.data ?? null);
          setWalletLoaded(true);
          break;
        }
        case "network": {
          // Only load network overview data once
          if (!networkLoaded) {
            setNetworkLoading(true);
            const netRes = await adminIbUsersApi.network(userId, token);
            setNetworkData(netRes.data ?? null);
            setNetworkLoaded(true);
            setNetworkLoading(false);
          }
          // Load clients and subIbs with proper pagination
          await loadClientsData();
          await loadSubIbsData();
          break;
        }
        default:
          break;
      }
    } catch (err: unknown) {
      console.error(`Failed to load ${tab} data:`, err);
      toast.error(
        getAdminFriendlyErrorMessage(err, {
          resource: `IB ${tab} data`,
          action: "load",
        }),
      );
    } finally {
      switch (tab) {
        case "overview": setWorkspaceLoading(false); break;
        case "wallet": setWalletLoading(false); break;
        default: break;
      }
    }
  }, [token, userId, workspaceLoaded, walletLoaded, networkLoaded, walletPage, walletPerPage]);

  const loadClientsData = useCallback(async () => {
    if (!token || !userId) return;
    
    try {
      setClientsLoading(true);
      const clientsDateFromStr = clientsDateFrom ? format(clientsDateFrom, "yyyy-MM-dd") : undefined;
      const clientsDateToStr = clientsDateTo ? format(clientsDateTo, "yyyy-MM-dd") : undefined;
      
      const cliRes = await adminIbUsersApi.clients(
        userId, 
        token, 
        clientsPage, 
        clientsPerPage, 
        clientsDateFromStr, 
        clientsDateToStr
      );
      
      const raw = cliRes as unknown as { data: AdminIbClient[]; pagination: AdminIbClientsResponse["pagination"] };
      setClientsData({ 
        data: raw.data ?? [], 
        pagination: raw.pagination ?? { total: 0, per_page: clientsPerPage, current_page: clientsPage, last_page: 1 }, 
        success: cliRes.success 
      });
      setClientsLoaded(true);
    } catch (err: unknown) {
      console.error(`Failed to load clients data:`, err);
      toast.error(
        getAdminFriendlyErrorMessage(err, {
          resource: "clients data",
          action: "load",
        }),
      );
    } finally {
      setClientsLoading(false);
    }
  }, [token, userId, clientsPage, clientsPerPage, clientsDateFrom, clientsDateTo]);

  const loadSubIbsData = useCallback(async () => {
    if (!token || !userId) return;
    
    try {
      setSubIbsLoading(true);
      const subIbsDateFromStr = subIbsDateFrom ? format(subIbsDateFrom, "yyyy-MM-dd") : undefined;
      const subIbsDateToStr = subIbsDateTo ? format(subIbsDateTo, "yyyy-MM-dd") : undefined;
      
      const subRes = await adminIbUsersApi.subIbs(
        userId, 
        token, 
        subIbsPage, 
        subIbsPerPage, 
        subIbsDateFromStr, 
        subIbsDateToStr
      );
      
      const raw = subRes as unknown as { data: AdminIbSubIb[]; pagination: AdminIbSubIbsResponse["pagination"] };
      setSubIbsData({ 
        data: raw.data ?? [], 
        pagination: raw.pagination ?? { total: 0, per_page: subIbsPerPage, current_page: subIbsPage, last_page: 1 }, 
        success: subRes.success 
      });
      setSubIbsLoaded(true);
    } catch (err: unknown) {
      console.error(`Failed to load sub-IBs data:`, err);
      toast.error(
        getAdminFriendlyErrorMessage(err, {
          resource: "sub-IBs data",
          action: "load",
        }),
      );
    } finally {
      setSubIbsLoading(false);
    }
  }, [token, userId, subIbsPage, subIbsPerPage, subIbsDateFrom, subIbsDateTo]);

  useEffect(() => {
    if (activeTab !== "profile") {
      void loadTabData(activeTab);
    }
  }, [activeTab, loadTabData]);

  // Reload clients data when pagination or filters change
  useEffect(() => {
    if (activeTab === "network" && clientsLoaded) {
      void loadClientsData();
    }
  }, [activeTab, clientsPage, clientsPerPage, clientsDateFrom, clientsDateTo, loadClientsData]);

  // Reload sub-IBs data when pagination or filters change
  useEffect(() => {
    if (activeTab === "network" && subIbsLoaded) {
      void loadSubIbsData();
    }
  }, [activeTab, subIbsPage, subIbsPerPage, subIbsDateFrom, subIbsDateTo, loadSubIbsData]);

  // const handleUpdatePlan = useCallback(async () => {
  //   if (!token || !user || !selectedIbPlanId) return;

  //   const userId = resolveNumericUserId(user);
  //   if (!userId) {
  //     toast.error("User ID not available");
  //     return;
  //   }

  //   try {
  //     setUpdatingPlan(true);
  //     const response = await adminIbUsersApi.updatePlan(
  //       userId,
  //       { ib_plan_id: Number(selectedIbPlanId) },
  //       token,
  //     );

  //     toast.success(
  //       response?.message?.trim() || "Partner plan updated successfully",
  //     );
  //     setShowPlanSelect(false);
  //     setSelectedIbPlanId("");
  //     await loadUser();
  //   } catch (err: unknown) {
  //     console.error("Failed to update IB plan:", err);
  //     toast.error(
  //       getAdminFriendlyErrorMessage(err, {
  //         resource: "IB plan",
  //         action: "update",
  //       }),
  //     );
  //   } finally {
  //     setUpdatingPlan(false);
  //   }
  // }, [token, user, selectedIbPlanId, loadUser]);

  const previewData = useMemo(() => {
    if (!user) return null;

    const referralLink = user.referral_link || deriveReferralLinkFallback(user);

    return {
      user,
      referralLink,
      planName: user.ib_plan_name ?? "Standard IB Plan",
      partnerId: user.partner_id ?? user.referral_code ?? "\u2014",
      fullName: deriveFullName(user),
      statusLabel: deriveStatusLabel(user),
      isActive: isActive(user),
      sponsor_by: user.sponsor_by ?? "",
    };
  }, [user]);

  const handleBackNavigation = () => {
    const returnUrl = tableStateStorage.getReturnUrl(
      IB_PROFILE_RETURN_STORAGE_KEY,
      true,
    );
    router.push(returnUrl || "/ib-users");
  };

  if (error && !user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 p-6">
          <Button
            variant="ghost"
            className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={handleBackNavigation}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to IB Users
          </Button>
          <ApiErrorState
            error={error}
            audience="admin"
            variant="panel"
            resource="IB user"
            action="load"
            onRetry={() => {
              void loadUser();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto flex flex-col gap-0 p-0">
        {/* Top bar — admin context strip */}
        <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/30 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-foreground">
                <Eye className="h-3.5 w-3.5 text-primary" />
                Admin Preview
              </span>
              <span>Read-only view of the IB portal</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {previewData ? (
              <>
                <Badge
                  className={cn(
                    "border-0",
                    previewData.isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-950/30 dark:text-gray-300",
                  )}
                >
                  {previewData.statusLabel}
                </Badge>
                {/* <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full"
                  onClick={() => setShowPlanSelect(!showPlanSelect)}
                >
                  Update Plan
                </Button> */}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full"
                >
                  <StatePreservingLink
                    storageKey={USER_PROFILE_RETURN_STORAGE_KEY}
                    href={`/new-users/${previewData.user.id ?? previewData.user.uuid ?? ""}`}
                  >
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    Full Profile
                  </StatePreservingLink>
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {/* Plan update inline section */}
        {/* {showPlanSelect && (
          <div className="border-b border-border/60 bg-muted/20 px-6 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex-1">
                  <label htmlFor="ib-plan-id" className="mb-1 block text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Select new partner plan
                  </label>
                  <Select
                    value={selectedIbPlanId}
                    onValueChange={setSelectedIbPlanId}
                    disabled={loadingIbPlans || ibPlans.length === 0}
                  >
                    <SelectTrigger id="ib-plan-id" className="max-w-xs">
                      <SelectValue
                        placeholder={loadingIbPlans ? "Loading plans..." : "Select partner plan"}
                      />
                  </SelectTrigger>
                  <SelectContent>
                    {ibPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!loadingIbPlans && ibPlans.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">No partner plans available.</p>
                ) : null}
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={!selectedIbPlanId || updatingPlan}
                  onClick={() => void handleUpdatePlan()}
                >
                  {updatingPlan ? "Updating..." : "Apply"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowPlanSelect(false);
                    setSelectedIbPlanId("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )} */}

        {/* Back button + page shell */}
        <div className="flex flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <Button
              variant="ghost"
              className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={handleBackNavigation}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to IB Users
            </Button>
          </div>

          {loading && !previewData ? (
            <div className="space-y-6">
              <Skeleton className="h-24 w-full rounded-[28px]" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-36 rounded-[28px]" />
                ))}
              </div>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
                <Skeleton className="h-[320px] rounded-[28px]" />
                <Skeleton className="h-[320px] rounded-[28px]" />
              </div>
            </div>
          ) : previewData ? (
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as TabKey)}
              className="space-y-6"
            >
              <TabsList className="ib-portal-surface inline-flex h-auto w-full flex-wrap gap-1 rounded-2xl border p-1.5">
                {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="flex-1 min-w-fit rounded-xl data-[state=active]:bg-sidebar-primary/20 data-[state=active]:text-sidebar-primary data-[state=active]:font-semibold data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-sidebar-primary/40 data-[state=active]:shadow-md data-[state=active]:shadow-sidebar-primary/20"
                  >
                    {TAB_LABELS[key]}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <OverviewTab user={previewData} loading={workspaceLoading} data={workspaceData} />
              </TabsContent>

              <TabsContent value="wallet" className="space-y-6">
                <WalletTab 
                  user={previewData} 
                  loading={walletLoading} 
                  data={walletData}
                  currentPage={walletPage}
                  totalPages={walletData?.pagination?.last_page ?? 1}
                  perPage={walletPerPage}
                  onPageChange={(page) => {
                    setWalletPage(page);
                    setWalletLoaded(false); // Trigger reload
                  }}
                  onPerPageChange={(perPage) => {
                    setWalletPerPage(perPage);
                    setWalletPage(1); // Reset to first page
                    setWalletLoaded(false); // Trigger reload
                  }}
                />
              </TabsContent>

              <TabsContent value="network" className="space-y-6">
                <NetworkTab
                  user={previewData}
                  loading={networkLoading || clientsLoading || subIbsLoading}
                  networkData={networkData}
                  clientsData={clientsData}
                  subIbsData={subIbsData}
                  businessPage={businessPage}
                  onBusinessPageChange={setBusinessPage}
                  businessPerPage={businessPerPage}
                  onBusinessPerPageChange={setBusinessPerPage}
                  clientsPage={clientsPage}
                  onClientsPageChange={(page) => {
                    setClientsPage(page);
                  }}
                  clientsPerPage={clientsPerPage}
                  onClientsPerPageChange={(perPage) => {
                    setClientsPerPage(perPage);
                    setClientsPage(1); // Reset to first page
                  }}
                  subIbsPage={subIbsPage}
                  onSubIbsPageChange={(page) => {
                    setSubIbsPage(page);
                  }}
                  subIbsPerPage={subIbsPerPage}
                  onSubIbsPerPageChange={(perPage) => {
                    setSubIbsPerPage(perPage);
                    setSubIbsPage(1); // Reset to first page
                  }}
                  clientsDateFrom={clientsDateFrom}
                  clientsDateTo={clientsDateTo}
                  onClientsDateFromChange={setClientsDateFrom}
                  onClientsDateToChange={setClientsDateTo}
                  onResetClientsFilters={() => {
                    setClientsDateFrom(undefined);
                    setClientsDateTo(undefined);
                  }}
                  subIbsDateFrom={subIbsDateFrom}
                  subIbsDateTo={subIbsDateTo}
                  onSubIbsDateFromChange={setSubIbsDateFrom}
                  onSubIbsDateToChange={setSubIbsDateTo}
                  onResetSubIbsFilters={() => {
                    setSubIbsDateFrom(undefined);
                    setSubIbsDateTo(undefined);
                  }}
                />
              </TabsContent>

              <TabsContent value="profile" className="space-y-6">
                <ProfileTab user={previewData} loading={loading} />
              </TabsContent>

              <TabsContent value="commission" className="space-y-6">
                {previewData ? (
                  <CommissionTab user={previewData} loading={loading} />
                ) : null}
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </div>
    </div>
  );
}
