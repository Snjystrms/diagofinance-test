"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  Copy,
  DollarSign,
  ExternalLink,
  Eye,
  Gem,
  Link2,
  Network,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import {
  IbMetricCard,
  IbPageHeader,
  IbSectionCard,
} from "@/components/ib/ib-page-primitives";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/format";
import { formatDateTimeInIST } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type {
  AdminIbUser,
  AdminIbWorkspaceData,
  AdminIbWalletData,
  AdminIbNetworkData,
  AdminIbClientsResponse,
  AdminIbSubIbsResponse,
} from "@/lib/api";

/**
 * ============================================================================
 * PARTNER PORTAL PREVIEW (Admin View)
 * ============================================================================
 *
 * This dialog renders the partner's portal in read-only preview mode for admins.
 *
 * Data contract:
 *   • Overview / Metric cards   → GET /admin/ib-management/ib-users/:id/workspace
 *   • Wallet transactions      → GET /admin/ib-management/ib-users/:id/wallet
 *   • Network (clients+subIBs) → GET /admin/ib-management/ib-users/:id/network
 *                                 GET /admin/ib-management/ib-users/:id/clients
 *                                 GET /admin/ib-management/ib-users/:id/sub-ibs
 *   • Profile summary          → GET /admin/ib-management/ib-users/:id
 * ============================================================================
 */

type TabKey = "overview" | "wallet" | "network" | "profile";

const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  wallet: "Wallet",
  network: "Network",
  profile: "Profile",
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
  | "ib_name"
  | "ib_plan_name"
  | "partner_id"
  | "referral_code"
  | "referral_link"
  | "status"
  | "is_ib_user"
  | "created_at"
>;

type IbPortalPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminIbUser | null;
  onViewDownlineTree?: (user: AdminIbUser) => void;
  onUpdatePlan?: (user: AdminIbUser) => void;
  loading?: boolean;
  error?: unknown | null;
  workspaceData?: AdminIbWorkspaceData | null;
  workspaceLoading?: boolean;
  walletData?: AdminIbWalletData | null;
  walletLoading?: boolean;
  networkData?: AdminIbNetworkData | null;
  networkLoading?: boolean;
  clientsData?: AdminIbClientsResponse | null;
  clientsLoading?: boolean;
  subIbsData?: AdminIbSubIbsResponse | null;
  subIbsLoading?: boolean;
};

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

const buildPublicReferralLink = (raw?: string | null) => {
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    parsed.protocol = "https:";
    parsed.host = "crminhouse-mocha.vercel.app";
    return parsed.toString();
  } catch {
    return raw.replace("https://api.graybulls.com", "https://crminhouse-mocha.vercel.app");
  }
};

const PreviewLoadingState = () => (
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
);

export function IbPortalPreviewDialog({
  open,
  onOpenChange,
  user,
  onViewDownlineTree,
  onUpdatePlan,
  loading = false,
  error = null,
  workspaceData,
  workspaceLoading,
  walletData,
  walletLoading,
  networkData,
  networkLoading,
  clientsData,
  clientsLoading,
  subIbsData,
  subIbsLoading,
}: IbPortalPreviewDialogProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const previewData = useMemo(() => {
    if (!user) return null;

    const referralLink = buildPublicReferralLink(
      user.referral_link ?? deriveReferralLinkFallback(user),
    );

    return {
      user,
      referralLink,
      planName: user.ib_plan_name ?? "Standard Partner Plan",
      partnerId: user.partner_id ?? user.referral_code ?? "—",
      fullName: deriveFullName(user),
      statusLabel: deriveStatusLabel(user),
      isActive: isActive(user),
    };
  }, [user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[min(1280px,calc(100vw-2rem))] gap-0 p-0 sm:rounded-[28px]"
        showCloseButton
      >
        <DialogTitle className="sr-only">Partner Portal Preview</DialogTitle>
        <DialogDescription className="sr-only">
          Read-only preview of the partner portal as seen by the partner user.
        </DialogDescription>

        <div className="flex h-[min(88vh,860px)] flex-col overflow-hidden">
          {/* Top bar — admin context strip */}
          <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/30 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-foreground">
                <Eye className="h-3.5 w-3.5 text-primary" />
                Admin Preview
              </span>
              <span>·</span>
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
                  {onUpdatePlan ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-full border-blue-200 bg-blue-50 px-3.5 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-200"
                      onClick={() => onUpdatePlan(user as AdminIbUser)}
                    >
                      Update Plan
                    </Button>
                  ) : null}
                  {onViewDownlineTree ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-full border-amber-200 bg-amber-50 px-3.5 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200"
                      onClick={() => onViewDownlineTree(user as AdminIbUser)}
                    >
                      <Network className="mr-2 h-3.5 w-3.5" />
                      Downline
                    </Button>
                  ) : null}
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

          {/* Scrollable portal body */}
          <div className="ib-portal-shell flex-1 overflow-y-auto bg-background">
            <div className="mx-auto flex w-full max-w-none flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
              {error ? (
                <ApiErrorState
                  error={error}
                  audience="admin"
                  resource="IB portal preview"
                  action="load"
                  variant="panel"
                  onRetry={() => onOpenChange(false)}
                />
              ) : loading || !previewData ? (
                <PreviewLoadingState />
              ) : (
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
                    <OverviewTab user={previewData} loading={workspaceLoading ?? loading} data={workspaceData ?? null} />
                  </TabsContent>

                  <TabsContent value="wallet" className="space-y-6">
                    <WalletTab user={previewData} loading={walletLoading ?? loading} data={walletData ?? null} />
                  </TabsContent>

                  <TabsContent value="network" className="space-y-6">
                    <NetworkTab
                      user={previewData}
                      loading={networkLoading || clientsLoading || subIbsLoading || loading}
                      networkData={networkData ?? null}
                      clientsData={clientsData ?? null}
                      subIbsData={subIbsData ?? null}
                      onViewDownlineTree={onViewDownlineTree}
                    />
                  </TabsContent>

                  <TabsContent value="profile" className="space-y-6">
                    <ProfileTab user={previewData} loading={loading} />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function deriveReferralLinkFallback(user: PreviewUser): string {
  if (typeof window === "undefined") return "";
  const base = window.location.origin;
  if (user.partner_id) return `${base}/register?ref=${user.partner_id}`;
  if (user.referral_code) return `${base}/register?ref=${user.referral_code}`;
  if (user.sponsor_id) return `${base}/register?ref=${user.sponsor_id}`;
  return "";
}

type ResolvedPreview = {
  user: PreviewUser;
  referralLink: string;
  planName: string;
  partnerId: string;
  fullName: string;
  statusLabel: string;
  isActive: boolean;
};

type TabShellProps = {
  user: ResolvedPreview;
  loading: boolean;
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

/* ------------------------------------------------------------------ */
/*  Overview tab                                                      */
/* ------------------------------------------------------------------ */

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
                    Partner Plan
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {partnerInfo?.ib_plan ?? user.planName}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-background/70 bg-background/80">
                  <Gem className="h-5 w-5" />
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

/* ------------------------------------------------------------------ */
/*  Wallet tab                                                        */
/* ------------------------------------------------------------------ */

function WalletTab({
  loading,
  data,
}: TabShellProps & { data: AdminIbWalletData | null }) {
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
                    <TableCell>{index + 1}</TableCell>
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

/* ------------------------------------------------------------------ */
/*  Network tab                                                       */
/* ------------------------------------------------------------------ */

function NetworkTab({
  loading,
  networkData,
  clientsData,
  subIbsData,
  onViewDownlineTree,
}: TabShellProps & {
  networkData: AdminIbNetworkData | null;
  clientsData: AdminIbClientsResponse | null;
  subIbsData: AdminIbSubIbsResponse | null;
  onViewDownlineTree?: (user: AdminIbUser) => void;
}) {
  return (
    <>
      <IbPageHeader
        eyebrow="Network"
        title="Clients, sub-partners & total business"
        description="Referred clients, sub-partners, trading volume, and the full downline tree."
        actions={
          onViewDownlineTree ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-full border-amber-200 bg-amber-50 px-3.5 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200"
            >
              <Network className="mr-2 h-3.5 w-3.5" />
              Open full downline tree
            </Button>
          ) : null
        }
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
          value={loading ? <Skeleton className="h-7 w-20" /> : String(networkData?.overview.total_lots ?? 0)}
          description="Round lots traded across your network"
          icon={<BarChart3 className="h-5 w-5" />}
          accent="slate"
        />
      </div>

      <IbSectionCard
        title="Business breakdown"
        description="Lots contributed by each level of your downline."
      >
        {loading ? (
          <TabSkeleton rows={5} />
        ) : (networkData?.business_breakdown?.length ?? 0) > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Source</TableHead>
                  {/* <TableHead className="text-right">Volume</TableHead> */}
                  <TableHead className="text-right">Lots</TableHead>
                  <TableHead className="text-right">Commission Earned</TableHead>
                  <TableHead className="text-right">Clients / Sub-Partners</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {networkData!.business_breakdown.map((b) => (
                  <TableRow key={b.level}>
                    <TableCell className="font-medium">{b.level_label}</TableCell>
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
        >
          {loading ? (
            <TabSkeleton rows={4} />
          ) : (clientsData?.data?.length ?? 0) > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sr. No.</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Lots</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Earned</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientsData!.data.map((client, index) => (
                    <TableRow key={client.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{client.lots}</TableCell>
                      <TableCell className="text-right tabular-nums">{client.volume}</TableCell>
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
        >
          {loading ? (
            <TabSkeleton rows={4} />
          ) : (subIbsData?.data?.length ?? 0) > 0 ? (
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
                  {subIbsData!.data.map((sub, index) => (
                    <TableRow key={sub.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sub.name}</p>
                          <p className="text-xs text-muted-foreground">{sub.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                          {sub.level_label === "IB" ? "Partner" : sub.level_label}
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

/* ------------------------------------------------------------------ */
/*  Profile tab                                                       */
/* ------------------------------------------------------------------ */

function ProfileTab({ user, loading }: TabShellProps) {
  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Full name", value: user.fullName },
    { label: "Email", value: user.user.email ?? "—" },
    { label: "Mobile", value: user.user.mobile ?? user.user.phone ?? "—" },
    { label: "Partner Name", value: user.user.ib_name ?? "—" },
    { label: "Partner Plan", value: user.planName },
    { label: "Partner ID", value: user.partnerId },
    { label: "Sponsor ID", value: user.user.sponsor_id ?? "—" },
    { label: "Referral Code", value: user.user.referral_code ?? "—" },
    {
      label: "Registered",
      value: user.user.created_at
        ? formatDateTimeInIST(user.user.created_at, "—")
        : "—",
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

      <IbSectionCard
        title="Activity timeline"
        description="A short log of the partner's recent portal actions."
      >
        {loading ? (
          <TabSkeleton rows={3} />
        ) : (
          <div className="space-y-2">
            {[
              { icon: ArrowUpRight, label: "Login activity", tone: "text-rose-600" },
              { icon: ArrowDownRight, label: "Plan assignment", tone: "text-emerald-600" },
              { icon: ArrowUpRight, label: "KYC update", tone: "text-amber-600" },
            ].map((entry, index) => {
              const Icon = entry.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background p-4"
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-muted/40",
                      entry.tone,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {entry.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Timeline entries will load once activity log endpoint is wired up.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </IbSectionCard>
    </>
  );
}
