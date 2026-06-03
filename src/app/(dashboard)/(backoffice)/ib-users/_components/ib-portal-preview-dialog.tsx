"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
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
import type { AdminIbUser } from "@/lib/api";

/**
 * ============================================================================
 * IB PORTAL PREVIEW (Admin View)
 * ============================================================================
 *
 * This dialog renders the IB's portal exactly as the IB user sees it on
 * `/ib-dashboard`, but in read-only preview mode for admins.
 *
 * Data contract — each section has its own admin endpoint. Wire these up
 * once the backend exposes them:
 *
 *   • Overview / Metric cards   → GET /admin/ib-management/ib-users/:id/dashboard
 *   • Wallet transactions      → GET /admin/ib-management/ib-users/:id/wallet
 *   • Commission plan          → GET /admin/ib-management/ib-users/:id/plan
 *   • Network (clients+subIBs) → GET /admin/ib-management/ib-users/:id/clients
 *                                 GET /admin/ib-management/ib-users/:id/sub-ibs
 *   • Profile summary          → GET /admin/ib-management/ib-users/:id/profile
 *
 * Until then, the component derives a coherent preview from the row already
 * returned by the IB Users list (AdminIbUser), so admins can validate the UX
 * before the API contract is finalised.
 * ============================================================================
 */

type TabKey = "overview" | "wallet" | "commissions" | "network" | "profile";

const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  wallet: "Wallet",
  commissions: "Commissions",
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
  /**
   * Optional loading flag — set this to true while the parent fetches
   * IB-specific preview data. While true, metric cards show skeletons.
   */
  loading?: boolean;
  /**
   * Optional error from the preview API call. When present, the dialog
   * renders a friendly error state instead of placeholder content.
   */
  error?: unknown | null;
};

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
      planName: user.ib_plan_name ?? "Standard IB",
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
        <DialogTitle className="sr-only">IB Portal Preview</DialogTitle>
        <DialogDescription className="sr-only">
          Read-only preview of the IB portal as seen by the IB user.
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
                  <TabsList className="inline-flex h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-muted/40 p-1.5">
                    {(Object.keys(TAB_LABELS) as TabKey[]).map((key) => (
                      <TabsTrigger
                        key={key}
                        value={key}
                        className="rounded-xl px-4 py-2 text-sm"
                      >
                        {TAB_LABELS[key]}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    <OverviewTab user={previewData} loading={loading} />
                  </TabsContent>

                  <TabsContent value="wallet" className="space-y-6">
                    <WalletTab user={previewData} loading={loading} />
                  </TabsContent>

                  <TabsContent value="commissions" className="space-y-6">
                    <CommissionsTab user={previewData} loading={loading} />
                  </TabsContent>

                  <TabsContent value="network" className="space-y-6">
                    <NetworkTab
                      user={previewData}
                      loading={loading}
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

function OverviewTab({ user, loading }: TabShellProps) {
  const { fullName, partnerId, planName, referralLink } = user;

  return (
    <>
      <IbPageHeader
        eyebrow="IB Workspace"
        title={`IB dashboard for ${fullName}`}
        description="Read-only preview of the IB portal — same view the IB user sees on /ib-dashboard."
        actions={
          <Button type="button" variant="outline" size="sm" className="h-9 rounded-full">
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <IbMetricCard
          title="IB Wallet"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(0)}
          description="Funds available for partner-level withdrawals and transfers."
          icon={<Wallet className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title="Main Wallet"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(0)}
          description="Client-side funds ready for trading activity."
          icon={<Wallet className="h-5 w-5" />}
          accent="emerald"
        />
        <IbMetricCard
          title="Pending Rebates"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(0)}
          description="Cycle information unavailable in preview"
          icon={<CalendarClock className="h-5 w-5" />}
          accent="amber"
        />
        <IbMetricCard
          title="Total Earned"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(0)}
          description="Today: 0.00"
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
              Today earning 0.00
            </span>
          }
        >
          {loading ? (
            <Skeleton className="h-[280px] w-full rounded-[24px]" />
          ) : (
            <div className="flex h-[280px] flex-col items-center justify-center gap-2 rounded-[24px] border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground">
              <TrendingUp className="h-6 w-6" />
              Rebate chart will render once the dashboard endpoint is wired up.
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
                    IB User
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {planName}
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
                  IB ID
                </p>
                <p className="mt-2 break-all text-lg font-semibold leading-snug text-foreground sm:text-xl">
                  {partnerId}
                </p>
              </div>
              <div className="min-w-0 rounded-3xl border border-border/60 bg-muted/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Internal Transfers
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {loading ? <Skeleton className="h-6 w-24" /> : formatCurrency(0)}
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
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="outline" size="sm" className="rounded-full">
                  <Link2 className="mr-2 h-3.5 w-3.5" />
                  Copy link
                </Button>
                <Button size="sm" className="rounded-full">
                  <Users className="mr-2 h-3.5 w-3.5" />
                  Client summary
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

function WalletTab({ loading }: TabShellProps) {
  return (
    <>
      <IbPageHeader
        eyebrow="Wallet"
        title="Wallet balances and transaction history"
        description="Partner (IB) wallet, main (client) wallet, and recent transfers."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <IbMetricCard
          title="Partner Wallet"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(0)}
          description="IB-side commission wallet"
          icon={<Wallet className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title="Client Wallet"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(0)}
          description="Main trading wallet"
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
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No transactions yet. Once the wallet endpoint is wired up,
                    recent transfers will appear here.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </IbSectionCard>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Commissions tab                                                   */
/* ------------------------------------------------------------------ */

function CommissionsTab({ user, loading }: TabShellProps) {
  return (
    <>
      <IbPageHeader
        eyebrow="Commissions"
        title="Commission rates & recent rebates"
        description={`Live payout matrix for ${user.fullName}'s IB plan.`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <IbMetricCard
          title="IB Plan"
          value={user.planName}
          description="Plan assigned to this user"
          icon={<Gem className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title="Total Earned"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(0)}
          description="Lifetime commission"
          icon={<DollarSign className="h-5 w-5" />}
          accent="emerald"
        />
        <IbMetricCard
          title="Pending Rebates"
          value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(0)}
          description="Awaiting next cycle"
          icon={<CalendarClock className="h-5 w-5" />}
          accent="amber"
        />
      </div>

      <IbSectionCard
        title="Commission rates"
        description="Account-type payout ladder for the assigned plan."
      >
        {loading ? (
          <TabSkeleton rows={4} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Type</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>IB Rate</TableHead>
                  <TableHead>Sub-IB L1</TableHead>
                  <TableHead>Sub-IB L2</TableHead>
                  <TableHead>Sub-IB L3</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Commission rates will load from
                    <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                      /admin/ib-management/ib-users/:id/plan
                    </code>
                    once the endpoint is available.
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
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
  onViewDownlineTree,
}: TabShellProps & {
  onViewDownlineTree?: (user: AdminIbUser) => void;
}) {
  return (
    <>
      <IbPageHeader
        eyebrow="Network"
        title="Clients, sub-IBs & downline"
        description="Referred clients, sub-brokers, and the full downline tree."
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

      <div className="grid gap-4 md:grid-cols-3">
        <IbMetricCard
          title="Direct Clients"
          value={loading ? <Skeleton className="h-7 w-20" /> : "0"}
          description="Clients directly referred"
          icon={<Users className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title="Sub-IBs"
          value={loading ? <Skeleton className="h-7 w-20" /> : "0"}
          description="Active sub-brokers in downline"
          icon={<Network className="h-5 w-5" />}
          accent="emerald"
        />
        <IbMetricCard
          title="Total Downline"
          value={loading ? <Skeleton className="h-7 w-20" /> : "0"}
          description="All levels combined"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="amber"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <IbSectionCard
          title="Direct clients"
          description="Clients registered via the IB's referral link."
        >
          {loading ? (
            <TabSkeleton rows={4} />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Lots</TableHead>
                    <TableHead>Earned</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Registered</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Direct client list will load from
                      <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                        /admin/ib-management/ib-users/:id/clients
                      </code>
                      .
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </IbSectionCard>

        <IbSectionCard
          title="Sub-IBs"
          description="Sub-brokers attached to this IB at any level."
        >
          {loading ? (
            <TabSkeleton rows={4} />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sub-IB</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Lots</TableHead>
                    <TableHead>Earned</TableHead>
                    <TableHead>Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Sub-IB list will load from
                      <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                        /admin/ib-management/ib-users/:id/sub-ibs
                      </code>
                      .
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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
    { label: "IB Name", value: user.user.ib_name ?? "—" },
    { label: "IB Plan", value: user.planName },
    { label: "IB ID / Partner ID", value: user.partnerId },
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
        title="IB account profile"
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
        description="A short log of the IB's recent portal actions."
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
