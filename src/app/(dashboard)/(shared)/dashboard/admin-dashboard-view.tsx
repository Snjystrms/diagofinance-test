"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Building2,
  TrendingUp,
  Clock,
  CheckCircle2,
  TrendingDown,
  Wallet,
  UserCheck,
  UserX,
  FileClock,
  Landmark,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { EnhancedDashboardCharts } from "./_components/EnhancedDashboardCharts";
import dynamic from "next/dynamic";
import type { AdminDashboardData } from "@/lib/api";
import { useClientCustomization } from "@/contexts/client-customization-context";
import { ThemePill } from "@/components/ui/theme-pill";
import { getDashboardThemeArtwork } from "@/components/theme-customizer";

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
const AreaChart = dynamic(
  () => import("recharts").then((m) => ({ default: m.AreaChart })),
  { ssr: false },
);
const Area = dynamic(
  () => import("recharts").then((m) => ({ default: m.Area })),
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

import { formatCurrency } from "@/lib/formatters";

interface AdminDashboardViewProps {
  adminDashboardData: AdminDashboardData | null;
  userName?: string;
}

type KpiCardItem = {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  ibVariant: string;
  href: string;
};

const SUMMARY_PERIOD_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  previous_month: "Previous Month",
};

export function AdminDashboardView({
  adminDashboardData,
  userName,
}: AdminDashboardViewProps) {
  const { themePairId, themeMode } = useClientCustomization();
  const dashboardThemeArtwork = getDashboardThemeArtwork(themePairId, themeMode);
  const kpis = adminDashboardData?.kpis;
  const transactionGraph = adminDashboardData?.transaction_graph;
  const clientsGraph = adminDashboardData?.clients_graph;
  const summaryMetrics = adminDashboardData?.summary_metrics;

  const transactionChartData = useMemo(() => {
    if (!transactionGraph?.data) return [];
    return transactionGraph.data.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      deposit: item.deposit,
      withdraw: item.withdraw,
      partner_commission: item.partner_commission,
      pending_commission: item.pending_commission,
    }));
  }, [transactionGraph]);

  const clientsChartData = useMemo(() => {
    if (!clientsGraph?.data) return [];
    return clientsGraph.data.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      clients: item.clients,
    }));
  }, [clientsGraph]);

  const transactionChartConfig = {
    deposit: { label: "Deposit", color: "#22c55e" },
    withdraw: { label: "Withdraw", color: "#ef4444" },
    ib_withdraw: { label: "Partner Withdraw", color: "#3b82f6" },
  };

  const clientsChartConfig = {
    clients: { label: "Clients", color: "#8b5cf6" },
  };

  const transactionSummary = useMemo(() => {
    if (!transactionChartData.length) {
      return { total: 0, growthPercent: 0 };
    }
    const first = transactionChartData[0];
    const last = transactionChartData[transactionChartData.length - 1];
    const firstTotal =
      Number(first.deposit) +
      Number(first.withdraw) +
      Number(first.partner_commission);
    const lastTotal =
      Number(last.deposit) + Number(last.withdraw) + Number(last.partner_commission);
    const growthPercent =
      firstTotal > 0 ? ((lastTotal - firstTotal) / firstTotal) * 100 : 0;
    return { total: lastTotal, growthPercent };
  }, [transactionChartData]);

  const clientsSummary = useMemo(() => {
    if (!clientsChartData.length) {
      return { total: 0, growthPercent: 0 };
    }
    const first = Number(clientsChartData[0].clients);
    const last = Number(clientsChartData[clientsChartData.length - 1].clients);
    const growthPercent = first > 0 ? ((last - first) / first) * 100 : 0;
    return { total: last, growthPercent };
  }, [clientsChartData]);

  const allKpiCards = [
    // Row 1
    {
      title: "Total Clients",
      value: kpis?.total_clients ?? 0,
      description: "All registered clients",
      icon: Users,
      ibVariant: "ib-portal-surface-primary",
      href: "/new-users",
    },
    {
      title: "Total IBs",
      value: kpis?.total_ib ?? 0,
      description: "Introducing Brokers",
      icon: Building2,
      ibVariant: "ib-portal-surface-primary",
      href: "/ib-users",
    },
    {
      title: "Active Traders",
      value: kpis?.active_traders ?? 0,
      description: "Currently trading",
      icon: TrendingUp,
      ibVariant: "ib-portal-surface-emerald",
      href: "/all-users-mt5-accounts",
    },
    // Row 2
    {
      title: "Approved Deposits",
      value: kpis?.approved_deposit ?? 0,
      description: "Total approved",
      icon: CheckCircle2,
      ibVariant: "ib-portal-surface-emerald",
      href: "/usdt-transactions?status=approved",
    },
    {
      title: "Pending Deposits",
      value: kpis?.pending_deposit ?? 0,
      description: "Awaiting approval",
      icon: Clock,
      ibVariant: "ib-portal-surface-amber",
      href: "/usdt-transactions?status=pending",
    },
    {
      title: "Pending Withdrawals",
      value: kpis?.pending_withdraw ?? 0,
      description: "Awaiting processing",
      icon: Clock,
      ibVariant: "ib-portal-surface-amber",
      href: "/withdrawal-requests?status=pending",
    },
    {
      title: "IB Pending Withdrawals",
      value: kpis?.pending_withdraw ?? 0,
      description: "Awaiting processing",
      icon: Clock,
      ibVariant: "ib-portal-surface-amber",
      href: "/withdrawal-requests?status=pending",
    },
    // Row 3
    {
      title: "Pending IB Request",
      value: kpis?.pending_ib_request ?? 0,
      description: "Pending IB requests",
      icon: Clock,
      ibVariant: "ib-portal-surface-primary",
      href: "/all-ib?status=0",
    },
    {
      title: "Pending KYC Clients",
      value: kpis?.pending_kyc_clients ?? 0,
      description: "Awaiting approval",
      icon: Clock,
      ibVariant: "ib-portal-surface-amber",
      href: "/user-verification?status=0",
    },
    {
      title: "Pending Bank Details",
      value: kpis?.pending_bank_details_request ?? 0,
      description: "Bank detail review queue",
      icon: Landmark,
      ibVariant: "ib-portal-surface-primary",
      href: "/add-bank-details",
    },
  ] satisfies KpiCardItem[];

  const greeting = (() => {
    const h = new Date().getHours();
    const g =
      h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    const firstName = userName?.split(" ")[0];
    return firstName ? `${g}, ${firstName}` : g;
  })();

  const formatSummaryDateRange = (
    metric:
      | { start_date?: string | null; end_date?: string | null }
      | null
      | undefined,
  ) => {
    if (!metric?.start_date && !metric?.end_date) return "No date range";

    const formatDate = (value: string | null | undefined) => {
      if (!value) return null;

      const parsedDate = new Date(value);
      if (Number.isNaN(parsedDate.getTime())) {
        return value;
      }

      return parsedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    };

    const start = formatDate(metric.start_date);
    const end = formatDate(metric.end_date);

    if (start && end && start === end) return start;
    if (start && end) return `${start} – ${end}`;
    return start ?? end ?? "No date range";
  };

  const KpiGrid = ({ cards }: { cards: KpiCardItem[] }) => (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6">
      {cards.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.title}
            href={item.href}
            aria-label={`Open ${item.title}`}
            className="block cursor-pointer rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Card
              className={`relative h-full overflow-hidden border rounded-[28px] shadow-sm hover:shadow-lg backdrop-blur-sm transition-all duration-300 group ib-portal-surface ${item.ibVariant}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground leading-tight">
                    {item.title}
                  </p>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                </div>
                <div className="text-2xl font-semibold tracking-tight text-foreground">
                  {item.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-full w-full p-4 lg:p-6 xl:p-8">
      {/* Header */}
      <div className="mb-6 ib-portal-hero rounded-[28px] border px-6 py-6 sm:px-7">
        {dashboardThemeArtwork && (
          <div
            className={`dashboard-theme-overlay dashboard-theme-welcome-overlay theme-art-${dashboardThemeArtwork}`}
          />
        )}
        <div className="relative z-10 space-y-2">
          <ThemePill
            icon={<Sparkles className="h-3.5 w-3.5" />}
            className="rounded-full text-xs font-semibold uppercase tracking-[0.22em]"
          >
            Admin Portal
          </ThemePill>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.15rem]">
              {greeting}
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
              Here&apos;s what&apos;s happening with your business today.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Card rows */}
      <KpiGrid cards={allKpiCards} />

      {/* Charts */}
      <EnhancedDashboardCharts adminDashboardData={adminDashboardData} />

      {/* Summary Metrics */}
      {summaryMetrics && (
        <Card className="relative overflow-hidden border rounded-[28px] shadow-lg backdrop-blur-sm ib-portal-surface">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Summary Metrics</CardTitle>
            <CardDescription>Financial overview by period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(["daily", "weekly", "monthly", "previous_month"] as const).map(
                (period) => {
                  const metric = summaryMetrics?.[period];
                  const metricRange = formatSummaryDateRange(metric);

                  return (
                    <div key={period} className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">
                          {SUMMARY_PERIOD_LABELS[period] ?? period}
                        </h4>
                        <span className="rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
                          {metricRange}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Range: {metricRange}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        <div className="group relative overflow-hidden p-3 rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <p className="relative text-xs text-muted-foreground mb-1">
                            Deposit
                          </p>
                          <p className="relative text-sm font-bold">
                            {formatCurrency(metric?.deposit ?? 0)}
                          </p>
                        </div>
                        <div className="group relative overflow-hidden p-3 rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300">
                          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <p className="relative text-xs text-muted-foreground mb-1">
                            Withdraw
                          </p>
                          <p className="relative text-sm font-bold">
                            {formatCurrency(metric?.withdraw ?? 0)}
                          </p>
                        </div>
                        <div className="group relative overflow-hidden p-3 rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300">
                          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <p className="relative text-xs text-muted-foreground mb-1">
                            {period === "daily" ? "Pending Commission" : "IB Commission"}
                          </p>
                          <p className="relative text-sm font-bold">
                            {formatCurrency(
                              period === "daily"
                                ? (metric?.pending_commission ?? 0)
                                : (metric?.partner_commission ?? 0)
                            )}
                          </p>
                        </div>
                        <div className="group relative overflow-hidden p-3 rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <p className="relative text-xs text-muted-foreground mb-1">
                            Bonus Given
                          </p>
                          <p className="relative text-sm font-bold">
                            {formatCurrency(metric?.add_bonus ?? 0)}
                          </p>
                        </div>
                        <div className="group relative overflow-hidden p-3 rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300">
                          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <p className="relative text-xs text-muted-foreground mb-1">
                            Bonus Removed
                          </p>
                          <p className="relative text-sm font-bold">
                            {formatCurrency(metric?.remove_bonus ?? 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold">Total</h4>
                  <span className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary backdrop-blur-sm">
                    {formatSummaryDateRange(summaryMetrics?.total)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Range: {formatSummaryDateRange(summaryMetrics?.total)}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  <div className="group relative overflow-hidden p-3 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-md backdrop-blur-sm hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <p className="relative text-xs text-muted-foreground mb-1">Deposit</p>
                    <p className="relative text-sm font-bold text-primary">
                      {formatCurrency(summaryMetrics?.total.deposit ?? 0)}
                    </p>
                  </div>
                  <div className="group relative overflow-hidden p-3 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-md backdrop-blur-sm hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <p className="relative text-xs text-muted-foreground mb-1">Withdraw</p>
                    <p className="relative text-sm font-bold text-primary">
                      {formatCurrency(summaryMetrics?.total.withdraw ?? 0)}
                    </p>
                  </div>
                  <div className="group relative overflow-hidden p-3 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-md backdrop-blur-sm hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <p className="relative text-xs text-muted-foreground mb-1">
                      IB Commission
                    </p>
                    <p className="relative text-sm font-bold text-primary">
                      {formatCurrency(summaryMetrics?.total.partner_commission ?? 0)}
                    </p>
                  </div>
                  <div className="group relative overflow-hidden p-3 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-md backdrop-blur-sm hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <p className="relative text-xs text-muted-foreground mb-1">
                      Bonus Given
                    </p>
                    <p className="relative text-sm font-bold text-primary">
                      {formatCurrency(summaryMetrics?.total.add_bonus ?? 0)}
                    </p>
                  </div>
                  <div className="group relative overflow-hidden p-3 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-md backdrop-blur-sm hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <p className="relative text-xs text-muted-foreground mb-1">
                      Bonus Removed
                    </p>
                    <p className="relative text-sm font-bold text-primary">
                      {formatCurrency(summaryMetrics?.total.remove_bonus ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
