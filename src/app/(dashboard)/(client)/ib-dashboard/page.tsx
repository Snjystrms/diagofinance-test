"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import {
  ArrowRightLeft,
  CalendarClock,
  Copy,
  DollarSign,
  Gem,
  LineChart as LineChartIcon,
  Link2,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";

import { ApiErrorState } from "@/components/errors/api-error-state";
import { IbMetricCard, IbPageHeader, IbPageShell, IbSectionCard } from "@/components/ib/ib-page-primitives";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { type IbDashboardResponse, type IbInternalTransferRequest, ibRequestsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";

import type { ChartConfig } from "@/components/ui/chart";

const ChartContainer = dynamic(
  () => import("@/components/ui/chart").then((m) => ({ default: m.ChartContainer })),
  { ssr: false },
);
const ChartTooltip = dynamic(
  () => import("@/components/ui/chart").then((m) => ({ default: m.ChartTooltip })),
  { ssr: false },
);
const ChartTooltipContent = dynamic(
  () => import("@/components/ui/chart").then((m) => ({ default: m.ChartTooltipContent })),
  { ssr: false },
);
const LineChart = dynamic(() => import("recharts").then((m) => ({ default: m.LineChart })), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => ({ default: m.Line })), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => ({ default: m.CartesianGrid })), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => ({ default: m.XAxis })), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => ({ default: m.YAxis })), { ssr: false });

function formatCycleDate(value?: string) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatRemainingTime(remainingTime?: {
  days: number;
  days_decimal: number;
  hours: number;
  minutes: number;
  seconds: number;
}) {
  if (!remainingTime) {
    return "Cycle information unavailable";
  }

  const days = Math.floor((remainingTime.days_decimal ?? remainingTime.days) * 10) / 10;
  const hours = String(remainingTime.hours ?? 0).padStart(2, "0");
  const minutes = String(remainingTime.minutes ?? 0).padStart(2, "0");

  return `${days}d ${hours}h ${minutes}m remaining`;
}

function buildPublicReferralLink(referralLink?: string) {
  if (!referralLink) {
    return "";
  }

  try {
    const parsed = new URL(referralLink);
    parsed.protocol = "https:";
    parsed.host = "crminhouse-mocha.vercel.app";
    return parsed.toString();
  } catch {
    return referralLink.replace("https://api.graybulls.com", "https://crminhouse-mocha.vercel.app");
  }
}

function DashboardLoadingState() {
  return (
    <IbPageShell>
      <section className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-10 w-72 rounded-full" />
          <Skeleton className="h-4 w-full max-w-2xl rounded-full" />
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
            <div className="space-y-4">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-8 w-36 rounded-full" />
              <Skeleton className="h-4 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <div className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
          <Skeleton className="h-[360px] w-full rounded-[24px]" />
        </div>
        <div className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </IbPageShell>
  );
}

export default function IbDashboardPage() {
  const { token } = useAuth();
  const [dashboardData, setDashboardData] = useState<IbDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferComment, setTransferComment] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!token) {
      setError("Authentication required");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await ibRequestsApi.getDashboard(token);
      if (response?.data) {
        setDashboardData(response.data);
      } else {
        setError("Unable to load IB dashboard");
      }
    } catch (fetchError) {
      console.error("Failed to fetch IB dashboard:", fetchError);
      setError(fetchError);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const chartData = useMemo(
    () =>
      dashboardData?.rebates_graph?.map((item) => ({
        date: item.date,
        rebates: item.rebates,
      })) ?? [],
    [dashboardData?.rebates_graph],
  );

  const chartConfig: ChartConfig = {
    rebates: {
      label: "Rebates",
      color: "hsl(221, 83%, 53%)",
    },
  };

  const maxRebate = useMemo(() => {
    if (chartData.length === 0) {
      return 1;
    }
    return Math.max(...chartData.map((row) => row.rebates), 1);
  }, [chartData]);

  const cycleProgress = useMemo(() => {
    if (!dashboardData?.pending_rebates?.cycle_start || !dashboardData.pending_rebates.cycle_end) {
      return 0;
    }

    const start = new Date(dashboardData.pending_rebates.cycle_start).getTime();
    const end = new Date(dashboardData.pending_rebates.cycle_end).getTime();
    const now = Date.now();

    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return 0;
    }

    return Math.min(Math.max(((now - start) / (end - start)) * 100, 0), 100);
  }, [dashboardData?.pending_rebates]);

  const copyReferralLink = useCallback(() => {
    const referralLink = buildPublicReferralLink(dashboardData?.partner_info?.referral_link);
    if (!referralLink) {
      return;
    }

    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied");
  }, [dashboardData?.partner_info?.referral_link]);

  const handleTransfer = useCallback(async () => {
    if (!token || !dashboardData) {
      toast.error("Authentication required");
      return;
    }

    const amount = Number(transferAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > dashboardData.partner_wallet.balance) {
      toast.error("Insufficient partner wallet balance");
      return;
    }

    try {
      setIsTransferring(true);

      const payload: IbInternalTransferRequest = {
        amount,
        ...(transferComment.trim() ? { comment: transferComment.trim() } : {}),
      };

      const response = await ibRequestsApi.internalTransfer(payload, token);
      if (response.success) {
        toast.success(response.message || "Transfer completed successfully");
        setIsTransferDialogOpen(false);
        setTransferAmount("");
        setTransferComment("");
        await fetchDashboard();
        return;
      }

      toast.error(
        getFriendlyErrorMessage(response.message || "Transfer failed", {
          audience: "client",
          resource: "IB transfer",
          action: "submit",
        }),
      );
    } catch (transferError) {
      console.error("IB transfer failed:", transferError);
      toast.error(
        getFriendlyErrorMessage(transferError, {
          audience: "client",
          resource: "IB transfer",
          action: "submit",
        }),
      );
    } finally {
      setIsTransferring(false);
    }
  }, [dashboardData, fetchDashboard, token, transferAmount, transferComment]);

  if (isLoading) {
    return <DashboardLoadingState />;
  }

  if (error || !dashboardData) {
    return (
      <IbPageShell>
        <ApiErrorState
          error={error || "Unable to load IB dashboard"}
          audience="client"
          resource="IB dashboard"
          action="load"
          variant="panel"
          onRetry={fetchDashboard}
        />
      </IbPageShell>
    );
  }

  const {
    partner_wallet,
    client_wallet,
    today_earning,
    pending_rebates,
    earning_summary,
    partner_info,
    user,
  } = dashboardData;
  const publicReferralLink = buildPublicReferralLink(partner_info.referral_link);

  return (
    <IbPageShell>
      <IbPageHeader
        eyebrow="Partner Workspace"
        title={`Partner dashboard for ${user.name}`}
        description="Track rebates, move funds into the main wallet, and monitor referral performance from one place."
        actions={
          <>
            <Button variant="outline" onClick={fetchDashboard}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" asChild>
              <Link href="/ib-dashboard/wallet">Wallet history</Link>
            </Button>
            <Button onClick={() => setIsTransferDialogOpen(true)}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer funds
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <IbMetricCard
          title="Partner Wallet"
          value={formatCurrency(partner_wallet.balance, partner_wallet.currency)}
          description="Funds available for partner-level withdrawals and transfers."
          icon={<Wallet className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title="Main Wallet"
          value={formatCurrency(client_wallet.balance, client_wallet.currency)}
          description="Client-side funds ready for trading activity."
          icon={<Wallet className="h-5 w-5" />}
          accent="emerald"
        />
        <IbMetricCard
          title="Pending Rebates"
          value={formatCurrency(pending_rebates.amount, pending_rebates.currency)}
          description={formatRemainingTime(pending_rebates.remaining_time)}
          icon={<CalendarClock className="h-5 w-5" />}
          accent="amber"
          footer={
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatCycleDate(pending_rebates.cycle_start)}</span>
                <span>{formatCycleDate(pending_rebates.cycle_end)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                  style={{ width: `${cycleProgress}%` }}
                />
              </div>
            </div>
          }
        />
        <IbMetricCard
          title="Total Earned"
          value={formatCurrency(earning_summary.total_earned, earning_summary.currency)}
          description={`Today: ${formatCurrency(today_earning.balance, today_earning.currency)}`}
          icon={<DollarSign className="h-5 w-5" />}
          accent="slate"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <IbSectionCard
          title="Rebate trend"
          description="Recent rebate activity for your IB account."
          actions={
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground">
              <LineChartIcon className="h-4 w-4" />
              Today earning {formatCurrency(today_earning.balance, today_earning.currency)}
            </div>
          }
          contentClassName="pt-2"
        >
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[340px] w-full">
              <LineChart data={chartData} margin={{ top: 18, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  domain={[0, maxRebate]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="rebates"
                  stroke="var(--color-rebates)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[340px] items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground">
              No rebate data available yet.
            </div>
          )}
        </IbSectionCard>

        <IbSectionCard title="Partner profile" description="Core Partner program details and referral assets.">
          <div className="space-y-4">
            <div className="ib-portal-note rounded-3xl border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Partner User</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{partner_info.ib_plan || "N/A"}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-background/70 bg-background/80">
                  <Gem className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 rounded-3xl border border-border/60 bg-muted/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Partner ID</p>
                <p className="mt-2 break-all text-lg font-semibold leading-snug text-foreground sm:text-xl">
                  {partner_info.partner_id}
                </p>
              </div>
              <div className="min-w-0 rounded-3xl border border-border/60 bg-muted/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Internal Transfers
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {formatCurrency(earning_summary.total_internal_transfers, earning_summary.currency)}
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
      <a 
        href={publicReferralLink} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-foreground underline hover:text-primary transition-colors"
      >
        {publicReferralLink}
      </a>
    </p>
  </div>
  <Button variant="outline" size="icon" className="shrink-0" onClick={copyReferralLink}>
    <Copy className="h-4 w-4" />
  </Button>
</div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="outline" onClick={copyReferralLink}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Copy link
                </Button>
                <Button asChild>
                  <Link href="/ib-dashboard/clients">Client summary</Link>
                </Button>
              </div>
            </div>
          </div>
        </IbSectionCard>
      </div>

      <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Transfer to client wallet</DialogTitle>
            <DialogDescription>
              Move balance from the partner wallet into the client wallet without leaving the dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="grid gap-4 rounded-3xl border border-border/60 bg-muted/20 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Partner Wallet
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {formatCurrency(partner_wallet.balance, partner_wallet.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Client Wallet
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {formatCurrency(client_wallet.balance, client_wallet.currency)}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ib-transfer-amount">Amount</Label>
              <Input
                id="ib-transfer-amount"
                type="number"
                step="1"
                min="1"
                max={partner_wallet.balance}
                value={transferAmount}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                onChange={(event) => setTransferAmount(event.target.value)}
                placeholder="Enter amount"
                disabled={isTransferring}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ib-transfer-comment">Comment</Label>
              <Textarea
                id="ib-transfer-comment"
                rows={3}
                value={transferComment}
                onChange={(event) => setTransferComment(event.target.value)}
                placeholder="Optional note for this transfer"
                disabled={isTransferring}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsTransferDialogOpen(false);
                setTransferAmount("");
                setTransferComment("");
              }}
              disabled={isTransferring}
            >
              Cancel
            </Button>
            <Button onClick={handleTransfer} disabled={isTransferring}>
              {isTransferring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer funds
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </IbPageShell>
  );
}
