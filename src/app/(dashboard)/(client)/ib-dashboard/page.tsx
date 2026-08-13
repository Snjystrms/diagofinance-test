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
  UserStar
} from "lucide-react";

import { ApiErrorState } from "@/components/errors/api-error-state";
import {
  IbMetricCard,
  IbPageHeader,
  IbPageShell,
  IbSectionCard,
} from "@/components/ib/ib-page-primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import {
  type IbDashboardResponse,
  type IbInternalTransferRequest,
  ibRequestsApi,
} from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";

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
const LineChart = dynamic(
  () => import("recharts").then((m) => ({ default: m.LineChart })),
  { ssr: false },
);
const Line = dynamic(
  () => import("recharts").then((m) => ({ default: m.Line })),
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

  const days =
    Math.floor((remainingTime.days_decimal ?? remainingTime.days) * 10) / 10;
  const hours = String(remainingTime.hours ?? 0).padStart(2, "0");
  const minutes = String(remainingTime.minutes ?? 0).padStart(2, "0");

  return `${days}d ${hours}h ${minutes}m remaining`;
}

function DashboardLoadingState() {
  return (
    <IbPageShell>
      <section className="rounded-[20px] sm:rounded-[28px] border border-border/60 bg-card p-4 sm:p-6 shadow-sm">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-10 w-56 sm:w-72 rounded-full" />
          <Skeleton className="h-4 w-full max-w-xl rounded-full" />
        </div>
      </section>
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[20px] sm:rounded-[28px] border border-border/60 bg-card p-4 sm:p-6 shadow-sm">
            <div className="space-y-4">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-8 w-32 sm:w-36 rounded-full" />
              <Skeleton className="h-4 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="rounded-[20px] sm:rounded-[28px] border border-border/60 bg-card p-4 sm:p-6 shadow-sm">
          <Skeleton className="h-[240px] sm:h-[340px] w-full rounded-2xl" />
        </div>
        <div className="rounded-[20px] sm:rounded-[28px] border border-border/60 bg-card p-4 sm:p-6 shadow-sm">
          <div className="space-y-3 sm:space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 sm:h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </IbPageShell>
  );
}

export default function IbDashboardPage() {
  const { token } = useAuth();
  const [dashboardData, setDashboardData] =
    useState<IbDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferComment, setTransferComment] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  
  // Track theme changes for dynamic color resolution
  const [themeVersion, setThemeVersion] = useState(0);
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class" || mutation.attributeName === "style") {
          setThemeVersion((v) => v + 1);
        }
      });
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Get theme-aware color for axis ticks
  const tickColor = useMemo(() => {
    if (typeof window === "undefined") return "#71717a";
    
    const testEl = document.createElement("div");
    testEl.className = "text-muted-foreground";
    testEl.style.visibility = "hidden";
    testEl.style.position = "absolute";
    document.body.appendChild(testEl);
    const computedColor = getComputedStyle(testEl).color;
    document.body.removeChild(testEl);
    
    return computedColor || "#71717a";
  }, [themeVersion]);

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
    if (
      !dashboardData?.pending_rebates?.cycle_start ||
      !dashboardData.pending_rebates.cycle_end
    ) {
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
    const referralLink = dashboardData?.partner_info?.referral_link;
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
        destination: "main",
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
  const publicReferralLink = partner_info.referral_link;

  return (
    <IbPageShell>
      <IbPageHeader
        eyebrow="IB Workspace"
        title={`IB dashboard for ${user.name}`}
        description="Track rebates, move funds into the main wallet, and monitor referral performance from one place."
        actions={
          <>
            <Button variant="outline" onClick={fetchDashboard}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
        <IbMetricCard
          title="IB Wallet"
          value={formatCurrency(
            partner_wallet.balance,
            partner_wallet.currency,
          )}
          description="Funds available for IB-level withdrawals and transfers."
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
          value={formatCurrency(
            pending_rebates.amount,
            pending_rebates.currency,
          )}
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
          value={formatCurrency(
            earning_summary.total_earned,
            earning_summary.currency,
          )}
          description="Total IB Commission accumulated."
          icon={<DollarSign className="h-5 w-5" />}
          accent="slate"
        />
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <IbSectionCard
          title="Rebate trend"
          description="Recent rebate activity for your Partner account."
          actions={
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
              <LineChartIcon className="h-3.5 w-3.5 shrink-0" />
              Today{" "}
              {formatCurrency(today_earning.balance, today_earning.currency)}
            </div>
          }
          contentClassName="pt-2"
        >
          {chartData.length > 0 ? (
            <ChartContainer
              config={chartConfig}
              className="h-[240px] sm:h-[300px] lg:h-[340px] w-full"
            >
              <LineChart
                data={chartData}
                margin={{ top: 18, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: tickColor }}
                />
                <YAxis
                  domain={[0, maxRebate]}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: tickColor }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="rebates"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ 
                    r: 4,
                    fill: "var(--primary)",
                    stroke: "var(--background)",
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[240px] sm:h-[300px] lg:h-[340px] items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground">
              No rebate data available yet.
            </div>
          )}
        </IbSectionCard>

        <IbSectionCard
          title="IB profile"
          description="Core IB program details and referral assets."
        >
          <div className="space-y-3 sm:space-y-4">
            <div className="ib-portal-note rounded-2xl sm:rounded-3xl border p-3 sm:p-5">
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    IB User
                  </p>
                  <p className="mt-1 text-lg font-semibold text-foreground sm:mt-2 sm:text-2xl">
                    {user.name || "N/A"}
                  </p>
                </div>
                <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-background/70 bg-background/80">
                   <UserStar className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="min-w-0 rounded-2xl sm:rounded-3xl border border-border/60 bg-muted/20 p-3 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  IB ID
                </p>
                <p className="mt-1 break-all text-base font-semibold leading-snug text-foreground sm:mt-2 sm:text-lg">
                  {partner_info.partner_id}
                </p>
              </div>
              <div className="min-w-0 rounded-2xl sm:rounded-3xl border border-border/60 bg-muted/20 p-3 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Internal Transfers
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground sm:mt-2">
                  {formatCurrency(
                    earning_summary.total_internal_transfers,
                    earning_summary.currency,
                  )}
                </p>
              </div>
            </div>

            <div className="min-w-0 rounded-2xl sm:rounded-3xl border border-border/60 bg-muted/20 p-3 sm:p-5">
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Referral Link
                  </p>
                  <p className="mt-1 break-all text-sm leading-6">
                    <a
                      href={publicReferralLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground underline hover:text-primary transition-colors break-all"
                    >
                      {publicReferralLink}
                    </a>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-8 w-8 sm:h-9 sm:w-9"
                  onClick={copyReferralLink}
                >
                  <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:gap-3">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={copyReferralLink}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Copy link
                </Button>
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/ib-dashboard/clients">Client summary</Link>
                </Button>
              </div>
            </div>
          </div>
        </IbSectionCard>
      </div>
    </IbPageShell>
  );
}
