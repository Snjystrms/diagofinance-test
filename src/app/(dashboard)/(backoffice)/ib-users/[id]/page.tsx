"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
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
  Landmark,
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
import { ApiErrorState } from "@/components/errors/api-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import {
  adminIbCommissionReportApi,
  // adminIbPlansApi,
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
  type IbCommissionReportPayload,
} from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { formatAmount, formatDateTimeInIST } from "@/lib/formatters";
import { cn } from "@/lib/utils";

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
  name: plan.name ?? `Partner Plan ${plan.id}`,
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
  return match ?? "Partner User";
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

  const todayEarnedStr = totalEarned
    ? `Today: ${formatCurrency(totalEarned.today)}`
    : "Today: 0.00";

  return (
    <>
      <IbPageHeader
        eyebrow="Partner Workspace"
        title={`Partner dashboard for ${fullName}`}
        description="Read-only preview of the partner portal."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <IbMetricCard
          title="Partner Wallet"
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
          description="Recent rebate activity for the partner account."
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
            <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-[24px] border border-border/60 bg-muted/20 p-4">
              <div className="grid w-full grid-cols-7 gap-1">
                {rebatesGraph.map((point) => (
                  <div key={point.date} className="flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-sm bg-primary/20"
                      style={{ height: `${Math.max(4, point.rebates || 2)}px` }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {point.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-[24px] border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground">
              <TrendingUp className="h-6 w-6" />
              No rebate data available yet.
            </div>
          )}
        </IbSectionCard>

        <IbSectionCard
          title="Partner profile"
          description="Core partner program details and referral assets."
        >
          <div className="space-y-4">
            <div className="ib-portal-note rounded-3xl border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Partner Info
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
                  Partner ID
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
}: TabShellProps & { 
  data: AdminIbWalletData | null;
  onPageChange: (page: number) => void;
  currentPage: number;
  totalPages: number;
}) {
  const partnerWallet = data?.partner_wallet;
  const clientWallet = data?.client_wallet;
  const transactions = data?.recent_transactions ?? [];

  return (
    <>
      <IbPageHeader
        eyebrow="Wallet"
        title="Wallet balances and transaction history"
        description="Partner wallet, main wallet, and recent transactions."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <IbMetricCard
          title="Partner Wallet"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(partnerWallet?.balance ?? 0)}
          description={partnerWallet?.label ?? "Partner-side commission wallet"}
          icon={<Wallet className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title="Client Wallet"
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
        {loading ? (
          <TabSkeleton rows={5} />
        ) : transactions.length > 0 ? (
          <>
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sr. No.</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx, index) => (
                    <TableRow key={tx.id}>
                      <TableCell className="capitalize">{(currentPage - 1) * 10 + index + 1}</TableCell>
                      <TableCell className="capitalize">{tx.type}</TableCell>
                      <TableCell className="font-medium tabular-nums">
                        {formatCurrency(tx.net_amount ?? tx.amount)}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          tx.status === "completed"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
                        )}>
                          {tx.status}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {tx.description}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {tx.date ? formatDateTimeInIST(tx.date, "\u2014") : "\u2014"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 py-10 text-sm text-muted-foreground">
            <Wallet className="h-6 w-6" />
            No transactions yet.
          </div>
        )}
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
  clientsPage,
  onClientsPageChange,
  subIbsPage,
  onSubIbsPageChange,
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
  clientsPage: number;
  onClientsPageChange: (page: number) => void;
  subIbsPage: number;
  onSubIbsPageChange: (page: number) => void;
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
  const ITEMS_PER_PAGE = 10;
  
  const paginatedBusinessBreakdown = networkData?.business_breakdown?.slice(
    (businessPage - 1) * ITEMS_PER_PAGE,
    businessPage * ITEMS_PER_PAGE
  ) ?? [];
  const businessTotalPages = Math.ceil((networkData?.business_breakdown?.length ?? 0) / ITEMS_PER_PAGE);
  
  const paginatedClients = clientsData?.data?.slice(
    (clientsPage - 1) * ITEMS_PER_PAGE,
    clientsPage * ITEMS_PER_PAGE
  ) ?? [];
  const clientsTotalPages = Math.ceil((clientsData?.data?.length ?? 0) / ITEMS_PER_PAGE);
  
  const paginatedSubIbs = subIbsData?.data?.slice(
    (subIbsPage - 1) * ITEMS_PER_PAGE,
    subIbsPage * ITEMS_PER_PAGE
  ) ?? [];
  const subIbsTotalPages = Math.ceil((subIbsData?.data?.length ?? 0) / ITEMS_PER_PAGE);
  
  const clientsActiveFilterCount = (clientsDateFrom ? 1 : 0) + (clientsDateTo ? 1 : 0);
  const subIbsActiveFilterCount = (subIbsDateFrom ? 1 : 0) + (subIbsDateTo ? 1 : 0);
  
  return (
    <>
      <IbPageHeader
        eyebrow="Network"
        title="Clients, sub-IBs & total business"
        description="Referred clients, sub-brokers, trading volume, and the full downline tree."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <IbMetricCard
          title="Direct Clients"
          value={loading ? <Skeleton className="h-7 w-20" /> : String(networkData?.overview.direct_clients ?? 0)}
          description="Clients directly referred"
          icon={<Users className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title="Sub-Partners"
          value={loading ? <Skeleton className="h-7 w-20" /> : String(networkData?.overview.sub_ibs ?? 0)}
          description="Active sub-partners in downline"
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
          description="Volume from your own direct clients"
          icon={<DollarSign className="h-5 w-5" />}
          accent="emerald"
        />
        <IbMetricCard
          title="Team Business"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(networkData?.overview.team_business ?? 0)}
          description="Volume from sub-partners and their downlines"
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
        {loading ? (
          <TabSkeleton rows={5} />
        ) : (networkData?.business_breakdown?.length ?? 0) > 0 ? (
          <>
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sr. No.</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Source</TableHead>
                    {/* <TableHead className="text-right">Volume</TableHead> */}
                    <TableHead className="text-right">Lots</TableHead>
                    <TableHead className="text-right">Commission Earned</TableHead>
                    <TableHead className="text-right">Clients / Sub-Partners</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBusinessBreakdown.map((b, index) => (
                    <TableRow key={b.level}>
                      <TableCell>{(businessPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                      <TableCell className="font-medium">{b.level_label === "IB" ? "Partner" : b.level_label}</TableCell>
                      <TableCell className="text-muted-foreground">{b.source === "Sub-IBs" ? "Sub-Partner" : b.source}</TableCell>
                      {/* <TableCell className="text-right tabular-nums">{b.volume}</TableCell> */}
                      <TableCell className="text-right tabular-nums">{b.lots}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(b.commission_earned)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {b.clients > 0 ? `${b.clients} clients` : ""}
                        {b.sub_ibs > 0 ? `${b.clients > 0 ? " / " : ""}${b.sub_ibs} sub-partners` : ""}
                        {b.clients === 0 && b.sub_ibs === 0 ? "\u2014" : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {businessTotalPages > 1 && (
              <div className="flex items-center justify-between gap-2 pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {businessPage} of {businessTotalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onBusinessPageChange(businessPage - 1)}
                    disabled={businessPage <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onBusinessPageChange(businessPage + 1)}
                    disabled={businessPage >= businessTotalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 py-10 text-sm text-muted-foreground">
            <BarChart3 className="h-6 w-6" />
            No business breakdown data yet.
          </div>
        )}
      </IbSectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <IbSectionCard
          title="Direct clients"
          description="Clients registered via the partner's referral link."
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
          {/* Clients Date Filters */}
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("h-9 w-full justify-start text-left font-normal", !clientsDateFrom && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {clientsDateFrom ? format(clientsDateFrom, "MMM dd, yyyy") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={clientsDateFrom} onSelect={onClientsDateFromChange} initialFocus captionLayout="dropdown" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("h-9 w-full justify-start text-left font-normal", !clientsDateTo && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {clientsDateTo ? format(clientsDateTo, "MMM dd, yyyy") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={clientsDateTo} onSelect={onClientsDateToChange} initialFocus captionLayout="dropdown" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {loading ? (
            <TabSkeleton rows={4} />
          ) : (clientsData?.data?.length ?? 0) > 0 ? (
            <>
              <div className="overflow-hidden rounded-2xl border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sr. No.</TableHead>  
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Lots</TableHead>
                      {/* <TableHead className="text-right">Volume</TableHead> */}
                      <TableHead className="text-right">Earned</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead>Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClients.map((client, index) => (
                      <TableRow key={client.id}>
                        <TableCell>{(clientsPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{client.lots}</TableCell>
                        {/* <TableCell className="text-right tabular-nums">{client.volume}</TableCell> */}
                        <TableCell className="text-right tabular-nums">{formatCurrency(client.earned)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(client.pending)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {client.registered ? formatDateTimeInIST(client.registered, "\u2014") : "\u2014"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {clientsTotalPages > 1 && (
                <div className="flex items-center justify-between gap-2 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {clientsPage} of {clientsTotalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onClientsPageChange(clientsPage - 1)}
                      disabled={clientsPage <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onClientsPageChange(clientsPage + 1)}
                      disabled={clientsPage >= clientsTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 py-10 text-sm text-muted-foreground">
              <Users className="h-6 w-6" />
              No direct clients yet.
            </div>
          )}
        </IbSectionCard>

        <IbSectionCard
          title="Sub-Partners"
          description="Sub-partners attached to this partner at any level."
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
          {/* Sub-IBs Date Filters */}
          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("h-9 w-full justify-start text-left font-normal", !subIbsDateFrom && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {subIbsDateFrom ? format(subIbsDateFrom, "MMM dd, yyyy") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={subIbsDateFrom} onSelect={onSubIbsDateFromChange} initialFocus captionLayout="dropdown" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("h-9 w-full justify-start text-left font-normal", !subIbsDateTo && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {subIbsDateTo ? format(subIbsDateTo, "MMM dd, yyyy") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={subIbsDateTo} onSelect={onSubIbsDateToChange} initialFocus captionLayout="dropdown" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {loading ? (
            <TabSkeleton rows={4} />
          ) : (subIbsData?.data?.length ?? 0) > 0 ? (
            <>
              <div className="overflow-hidden rounded-2xl border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sr. No.</TableHead>
                      <TableHead>Sub-Partner</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead className="text-right">Lots</TableHead>
                      {/* <TableHead className="text-right">Volume</TableHead> */}
                      <TableHead className="text-right">Earned</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSubIbs.map((sub, index) => (
                      <TableRow key={sub.id}>
                        <TableCell>{(subIbsPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sub.name}</p>
                            <p className="text-xs text-muted-foreground">{sub.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                            {sub.level_label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{sub.lots}</TableCell>
                        {/* <TableCell className="text-right tabular-nums">{sub.volume}</TableCell> */}
                        <TableCell className="text-right tabular-nums">{formatCurrency(sub.earned)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(sub.pending)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {subIbsTotalPages > 1 && (
                <div className="flex items-center justify-between gap-2 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {subIbsPage} of {subIbsTotalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSubIbsPageChange(subIbsPage - 1)}
                      disabled={subIbsPage <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSubIbsPageChange(subIbsPage + 1)}
                      disabled={subIbsPage >= subIbsTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-muted/20 py-10 text-sm text-muted-foreground">
              <Network className="h-6 w-6" />
              No sub-partners yet.
            </div>
          )}
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
    { label: "Partner Name", value: user.user.ib_name ?? "\u2014" },
    { label: "Partner ID", value: user.partnerId },
    { label: "Sponsor By", value: user.user.sponsor_by ?? "\u2014" },
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
        title="Partner account profile"
        description="Identity, plan assignment, and registration metadata."
        actions={
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 rounded-full"
          >
            <Link href={`/new-users/${user.user.id ?? user.user.uuid ?? ""}`}>
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Open full user record
            </Link>
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

function CommissionTab({
  user,
  loading,
  commissionPages,
  onCommissionPageChange,
}: TabShellProps & {
  commissionPages: Record<number, number>;
  onCommissionPageChange: (level: number, page: number) => void;
}) {
  const { token } = useAuth();
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [report, setReport] = useState<IbCommissionReportPayload | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [loadError, setLoadError] = useState<unknown | null>(null);

  const ITEMS_PER_PAGE = 10;

  const userId = user.user.id ?? user.user.uuid;
  const activeFilterCount = (fromDate ? 1 : 0) + (toDate ? 1 : 0);

  const loadReport = useCallback(async () => {
    if (!token || !userId) return;
    try {
      setReportLoading(true);
      setLoadError(null);
      const response = await adminIbCommissionReportApi.getCommissionLevelReport({
        token,
        user_id: String(userId),
        date_from: fromDate ? format(fromDate, "yyyy-MM-dd") : undefined,
        date_to: toDate ? format(toDate, "yyyy-MM-dd") : undefined,
      });
      const payload = response && typeof response === "object" && "data" in response
        ? (response as { data?: IbCommissionReportPayload }).data ?? response
        : response;
      setReport(payload as IbCommissionReportPayload);
    } catch (error) {
      setReport(null);
      setLoadError(error);
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "commission report", action: "load" }));
    } finally {
      setReportLoading(false);
    }
  }, [token, userId, fromDate, toDate]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  return (
    <>
      <IbPageHeader
        eyebrow="Commission"
        title="Commission Structure"
        description="Commission earned across your downline levels."
      />

      <div className="space-y-4">
        <IbSectionCard
          title="Commission Filters"
          description="Filter commission data by date range."
          actions={
            activeFilterCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFromDate(undefined); setToDate(undefined); }}
              >
                Reset
              </Button>
            ) : null
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("h-9 w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {fromDate ? format(fromDate, "MMM dd, yyyy") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus captionLayout="dropdown" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("h-9 w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {toDate ? format(toDate, "MMM dd, yyyy") : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus captionLayout="dropdown" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </IbSectionCard>

        {reportLoading ? (
          <div className="flex items-center justify-center py-12">
            <Skeleton className="h-6 w-6 rounded-full" />
            <span className="ml-2 text-sm text-muted-foreground">Loading commission report…</span>
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load commission report. Please try again.
          </div>
        ) : report ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <IbMetricCard
                title="Total Commission"
                value={formatAmount(report.summary.total_commission)}
                description="Across all levels"
                icon={<Landmark className="h-5 w-5" />}
                accent="primary"
              />
              <IbMetricCard
                title="Total Downline Users"
                value={String(report.summary.total_downline_users)}
                description="Users in your network"
                icon={<Users className="h-5 w-5" />}
                accent="emerald"
              />
              <IbMetricCard
                title="Total Trades"
                value={String(report.summary.total_trade_count)}
                description="Trades across network"
                icon={<TrendingUp className="h-5 w-5" />}
                accent="amber"
              />
            </div>

            {report.levels.map((level) => {
              const currentPage = commissionPages[level.level] ?? 1;
              const paginatedUsers = level.users.slice(
                (currentPage - 1) * ITEMS_PER_PAGE,
                currentPage * ITEMS_PER_PAGE
              );
              const totalPages = Math.ceil(level.users.length / ITEMS_PER_PAGE);
              
              return (
              <IbSectionCard
                key={level.level}
                title={level.level_label}
                description={`Users: ${level.user_count} | Trades: ${level.trade_count} | Days: ${level.trade_days}`}
                actions={
                  <Badge variant="secondary" className="font-medium">
                    {formatAmount(level.total_commission)}
                  </Badge>
                }
              >
                <div className="overflow-hidden rounded-2xl border border-border/60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sr. No.</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Sponsor ID</TableHead>
                        <TableHead className="text-right">Volume</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-right">Trades</TableHead>
                        <TableHead className="text-right">Trade Days</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {level.users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                            No users at this level.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedUsers.map((u, index) => (
                          <TableRow key={u.user_id}>
                            <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</TableCell>
                            <TableCell>
                              <div className="font-medium">{u.name}</div>
                              <div className="text-xs text-muted-foreground">{u.email}</div>
                            </TableCell>
                            <TableCell>{u.sponsor_id || "\u2014"}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatAmount(u.volume)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatAmount(u.commission)}</TableCell>
                            <TableCell className="text-right tabular-nums">{u.trade_count}</TableCell>
                            <TableCell className="text-right tabular-nums">{u.trade_days}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-2 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCommissionPageChange(level.level, currentPage - 1)}
                        disabled={currentPage <= 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCommissionPageChange(level.level, currentPage + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </IbSectionCard>
            )})}
          </>
        ) : (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            No commission data available for this user.
          </div>
        )}
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
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
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
  const [commissionPages, setCommissionPages] = useState<Record<number, number>>({});

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
      console.error("Failed to load partner user detail:", err);
      setError(err);
      toast.error(
        getAdminFriendlyErrorMessage(err, {
          resource: "partner user",
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
          const res = await adminIbUsersApi.wallet(userId, token, walletPage, 10);
          setWalletData(res.data ?? null);
          setWalletLoaded(true);
          break;
        }
        case "network": {
          const clientsDateFromStr = clientsDateFrom ? format(clientsDateFrom, "yyyy-MM-dd") : undefined;
          const clientsDateToStr = clientsDateTo ? format(clientsDateTo, "yyyy-MM-dd") : undefined;
          const subIbsDateFromStr = subIbsDateFrom ? format(subIbsDateFrom, "yyyy-MM-dd") : undefined;
          const subIbsDateToStr = subIbsDateTo ? format(subIbsDateTo, "yyyy-MM-dd") : undefined;
          
          const [netRes, cliRes, subRes] = await Promise.all([
            networkLoaded ? null : adminIbUsersApi.network(userId, token),
            clientsLoaded ? null : adminIbUsersApi.clients(userId, token, 1, 100, clientsDateFromStr, clientsDateToStr),
            subIbsLoaded ? null : adminIbUsersApi.subIbs(userId, token, 1, 100, subIbsDateFromStr, subIbsDateToStr),
          ]);
          if (netRes) { setNetworkData(netRes.data ?? null); setNetworkLoaded(true); }
          if (cliRes) {
            const raw = cliRes as unknown as { data: AdminIbClient[]; pagination: AdminIbClientsResponse["pagination"] };
            setClientsData({ data: raw.data ?? [], pagination: raw.pagination ?? { total: 0, per_page: 20, current_page: 1, last_page: 1 }, success: cliRes.success });
            setClientsLoaded(true);
          }
          if (subRes) {
            const raw = subRes as unknown as { data: AdminIbSubIb[]; pagination: AdminIbSubIbsResponse["pagination"] };
            setSubIbsData({ data: raw.data ?? [], pagination: raw.pagination ?? { total: 0, per_page: 20, current_page: 1, last_page: 1 }, success: subRes.success });
            setSubIbsLoaded(true);
          }
          break;
        }
        default:
          break;
      }
    } catch (err: unknown) {
      console.error(`Failed to load ${tab} data:`, err);
      toast.error(
        getAdminFriendlyErrorMessage(err, {
          resource: `partner ${tab} data`,
          action: "load",
        }),
      );
    } finally {
      switch (tab) {
        case "overview": setWorkspaceLoading(false); break;
        case "wallet": setWalletLoading(false); break;
        case "network": setNetworkLoading(false); break;
        default: break;
      }
    }
  }, [token, userId, workspaceLoaded, walletLoaded, networkLoaded, clientsLoaded, subIbsLoaded, walletPage, clientsDateFrom, clientsDateTo, subIbsDateFrom, subIbsDateTo]);

  useEffect(() => {
    if (activeTab !== "profile") {
      void loadTabData(activeTab);
    }
  }, [activeTab, loadTabData]);

  // Reload clients data when clients date filters change
  useEffect(() => {
    if (activeTab === "network" && (clientsDateFrom || clientsDateTo)) {
      setClientsLoaded(false);
      void loadTabData("network");
    }
  }, [activeTab, clientsDateFrom, clientsDateTo]);

  // Reload sub-IBs data when sub-IBs date filters change
  useEffect(() => {
    if (activeTab === "network" && (subIbsDateFrom || subIbsDateTo)) {
      setSubIbsLoaded(false);
      void loadTabData("network");
    }
  }, [activeTab, subIbsDateFrom, subIbsDateTo]);

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
      planName: user.ib_plan_name ?? "Standard Partner Plan",
      partnerId: user.partner_id ?? user.referral_code ?? "\u2014",
      fullName: deriveFullName(user),
      statusLabel: deriveStatusLabel(user),
      isActive: isActive(user),
      sponsor_by: user.sponsor_by ?? "",
    };
  }, [user]);

  if (error && !user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 p-6">
          <Button
            variant="ghost"
            className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
            onClick={() => router.push("/ib-users")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Partner Users
          </Button>
          <ApiErrorState
            error={error}
            audience="admin"
            variant="panel"
            resource="partner user"
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
              <span>Read-only view of the partner portal</span>
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
                  <Link href={`/new-users/${previewData.user.id ?? previewData.user.uuid ?? ""}`}>
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    Full Profile
                  </Link>
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
              asChild
              variant="ghost"
              className="w-fit px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
            >
                <Link href="/ib-users">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Partner Users
                </Link>
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
                  onPageChange={(page) => {
                    setWalletPage(page);
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
                  clientsPage={clientsPage}
                  onClientsPageChange={setClientsPage}
                  subIbsPage={subIbsPage}
                  onSubIbsPageChange={setSubIbsPage}
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
                  <CommissionTab 
                    user={previewData} 
                    loading={loading}
                    commissionPages={commissionPages}
                    onCommissionPageChange={(level, page) => {
                      setCommissionPages(prev => ({ ...prev, [level]: page }));
                    }}
                  />
                ) : null}
              </TabsContent>
            </Tabs>
          ) : null}
        </div>
      </div>
    </div>
  );
}