"use client";

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
  UserCheck,
  UserX,
  Landmark,
  Sparkles,
  Activity,
  BarChart3,
  CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { EnhancedDashboardCharts } from "./_components/EnhancedDashboardCharts";
import { formatCurrency } from "@/lib/formatters";
import type {
  ManagerDashboardData,
  ManagerClientsStats,
  ManagerDepositsStats,
  ManagerWithdrawalsStats,
  SubadminDashboardData,
} from "@/lib/api";
import { useClientCustomization } from "@/contexts/client-customization-context";
import { getDashboardThemeArtwork } from "@/components/theme-customizer";
import { ThemePill } from "@/components/ui/theme-pill";
import {
  PremiumDarkCard,
  PremiumDarkLayers,
} from "@/components/ui/premium-dark-card";

interface ManagerDashboardViewProps {
  managerDashboardData: ManagerDashboardData | null;
  subadminDashboardData?: SubadminDashboardData | null;
  userName?: string;
}

type StatVariant = "primary" | "emerald" | "amber" | "default";
type HighlightVariant = "amber" | "emerald" | "primary" | "red";
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

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  variant: StatVariant;
}) {
  const variantClass: Record<StatVariant, string> = {
    primary: "ib-portal-surface-primary",
    emerald: "ib-portal-surface-emerald",
    amber: "ib-portal-surface-amber",
    default: "ib-portal-surface",
  };

  return (
    <Card
      className={`relative overflow-hidden border rounded-[28px] shadow-sm hover:shadow-lg backdrop-blur-sm transition-all duration-300 group ib-portal-surface ${variantClass[variant]}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground leading-tight">
            {title}
          </p>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
            <Icon className="h-4 w-4 text-foreground" />
          </div>
        </div>
        <div className="text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function AmountStatCard({
  label,
  count,
  amount,
  highlight,
}: {
  label: string;
  count: number;
  amount?: number;
  highlight: HighlightVariant;
}) {
  const highlightClass: Record<HighlightVariant, string> = {
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    primary: "text-primary",
    red: "text-red-600 dark:text-red-400",
  };

  return (
    <div className="p-3 rounded-2xl bg-muted/50 border border-border/50">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm font-bold ${highlightClass[highlight]}`}>
        {count} txn{count !== 1 ? "s" : ""}
      </p>
      {amount !== undefined && (
        <p className="text-xs font-medium text-foreground mt-0.5">
          {formatCurrency(amount)}
        </p>
      )}
    </div>
  );
}

function ClientStatsSection({ clients }: { clients: ManagerClientsStats }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold text-foreground mb-3">
        Client Overview
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <StatCard
          title="Total Clients"
          value={clients.total}
          icon={Users}
          description="All registered clients"
          variant="primary"
        />
        <StatCard
          title="New Today"
          value={clients.new_today}
          icon={Activity}
          description="Registered today"
          variant="emerald"
        />
        <StatCard
          title="Pending Approval"
          value={clients.pending_approval}
          icon={Clock}
          description="Awaiting review"
          variant="amber"
        />
        <StatCard
          title="FTD Count"
          value={clients.ftd_count}
          icon={UserCheck}
          description="First-time depositors"
          variant="emerald"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="New This Week"
          value={clients.new_this_week}
          icon={CalendarDays}
          description="Registered this week"
          variant="primary"
        />
        <StatCard
          title="New This Month"
          value={clients.new_this_month}
          icon={CalendarDays}
          description="Registered this month"
          variant="primary"
        />
        <StatCard
          title="Non-FTD"
          value={clients.non_ftd_count}
          icon={UserX}
          description="No first deposit yet"
          variant="default"
        />
        <StatCard
          title="Active (30d)"
          value={clients.active_last_30_days}
          icon={BarChart3}
          description="Active last 30 days"
          variant="emerald"
        />
      </div>
    </div>
  );
}

function DepositsSection({ deposits }: { deposits: ManagerDepositsStats }) {
  return (
    <Card className="rounded-[28px] border shadow-sm">
      <CardHeader className="pb-3 pt-5 px-5 border-b">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <CardTitle className="text-sm font-semibold">Deposits</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-5 grid grid-cols-2 gap-3">
        <AmountStatCard
          label="Pending"
          count={deposits.pending_count}
          amount={deposits.pending_amount}
          highlight="amber"
        />
        <AmountStatCard
          label="Approved Today"
          count={deposits.approved_today_count}
          amount={deposits.approved_today_amount}
          highlight="emerald"
        />
        <AmountStatCard
          label="Approved This Month"
          count={deposits.approved_this_month_count}
          amount={deposits.approved_this_month_amount}
          highlight="emerald"
        />
        <AmountStatCard
          label="Approved All Time"
          count={deposits.approved_all_time_count}
          amount={deposits.approved_all_time_amount}
          highlight="primary"
        />
      </CardContent>
    </Card>
  );
}

function WithdrawalsSection({
  withdrawals,
}: {
  withdrawals: ManagerWithdrawalsStats;
}) {
  return (
    <Card className="rounded-[28px] border shadow-sm">
      <CardHeader className="pb-3 pt-5 px-5 border-b">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-500" />
          <CardTitle className="text-sm font-semibold">Withdrawals</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-5 grid grid-cols-2 gap-3">
        <AmountStatCard
          label="Pending"
          count={withdrawals.pending_count}
          amount={withdrawals.pending_amount}
          highlight="amber"
        />
        <AmountStatCard
          label="Approved Today"
          count={withdrawals.approved_today_count}
          amount={withdrawals.approved_today_amount}
          highlight="emerald"
        />
        <AmountStatCard
          label="Approved This Month"
          count={withdrawals.approved_this_month_count}
          amount={withdrawals.approved_this_month_amount}
          highlight="emerald"
        />
        <AmountStatCard
          label="Approved All Time"
          count={withdrawals.approved_all_time_count}
          amount={withdrawals.approved_all_time_amount}
          highlight="primary"
        />
        <AmountStatCard
          label="Rejected This Month"
          count={withdrawals.rejected_this_month_count}
          highlight="red"
        />
      </CardContent>
    </Card>
  );
}

function SubadminKpiGrid({ cards }: { cards: KpiCardItem[] }) {
  return (
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
}

export function ManagerDashboardView({
  managerDashboardData,
  subadminDashboardData,
  userName,
}: ManagerDashboardViewProps) {
  const { themePairId, themeMode } = useClientCustomization();
  const dashboardThemeArtwork = getDashboardThemeArtwork(
    themePairId,
    themeMode,
  );

  const data = managerDashboardData ?? subadminDashboardData ?? null;
  const managerInfo =
    (data as ManagerDashboardData | null)?.manager ??
    (data as SubadminDashboardData | null)?.subadmin;
  const manager = managerInfo;

  const subadminData = subadminDashboardData as
    | SubadminDashboardData
    | null
    | undefined;
  const hasSubadminKpis = Boolean(subadminData?.kpis);

  const greeting = (() => {
    const h = new Date().getHours();
    const g =
      h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    const firstName = (userName ?? manager?.name)?.split(" ")[0];
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

  if (hasSubadminKpis) {
    const kpis = subadminData!.kpis!;
    const transactionGraph = subadminData!.transaction_graph;
    const clientsGraph = subadminData!.clients_graph;
    const summaryMetrics = subadminData!.summary_metrics;

    const allKpiCards = [
      {
        title: "Total Clients",
        value: kpis.total_clients ?? 0,
        description: "All registered clients",
        icon: Users,
        ibVariant: "ib-portal-surface-primary",
        href: "/new-users",
      },
      {
        title: "Total IB",
        value: kpis.total_ib ?? 0,
        description: "Introducing Brokers",
        icon: Building2,
        ibVariant: "ib-portal-surface-primary",
        href: "/ib-users",
      },
      {
        title: "Approved Deposits",
        value: kpis.approved_deposit ?? 0,
        description: "Total approved",
        icon: CheckCircle2,
        ibVariant: "ib-portal-surface-emerald",
        href: "/usdt-transactions?status=approved",
      },
      {
        title: "Pending Deposits",
        value: kpis.pending_deposit ?? 0,
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
        title: "Pending IB Request",
        value: kpis.pending_ib_request ?? 0,
        description: "Pending IB requests",
        icon: Clock,
        ibVariant: "ib-portal-surface-primary",
        href: "/all-ib?status=0",
      },
      {
        title: "Pending KYC Clients",
        value: kpis.pending_kyc_clients ?? 0,
        description: "Awaiting approval",
        icon: Clock,
        ibVariant: "ib-portal-surface-amber",
        href: "/user-verification?status=0",
      },
      {
        title: "Pending Bank Details",
        value: kpis.pending_bank_details_request ?? 0,
        description: "Bank detail review queue",
        icon: Landmark,
        ibVariant: "ib-portal-surface-primary",
        href: "/add-bank-details",
      },
      {
        title: "IB Pending Withdrawals",
        value: kpis.pending_ib_withdrawal ?? 0,
        description: "Awaiting processing",
        icon: Clock,
        ibVariant: "ib-portal-surface-amber",
        href: "/ib-withdrawal-requests?status=pending",
      },
    ] satisfies KpiCardItem[];

    return (
      <div className="min-h-full w-full p-4 lg:p-6 xl:p-8">
        {/* Header */}
        <div className="mb-6 hidden xl:block">
          <div
            className={`rounded-[28px] border px-6 py-6 sm:px-7 ${
              dashboardThemeArtwork
                ? "ib-portal-hero ib-dash-artwork-surface"
                : "premium-dark-border group relative overflow-hidden border-white/5 bg-[#050505]"
            }`}
          >
            {dashboardThemeArtwork ? (
              <div
                className={`dashboard-theme-overlay dashboard-theme-welcome-overlay theme-art-${dashboardThemeArtwork}`}
              />
            ) : (
              <PremiumDarkLayers />
            )}
            <div className="relative z-10 space-y-2">
              <ThemePill
                icon={<Sparkles className="h-3.5 w-3.5" />}
                className={`rounded-full text-xs font-semibold uppercase tracking-[0.22em] ${
                  dashboardThemeArtwork
                    ? ""
                    : "border border-white/10 bg-white/5 text-white/80 backdrop-blur-[6px]"
                }`}
              >
                Subadmin Portal
              </ThemePill>
              <div className="space-y-1">
                <h1
                  className={`text-3xl font-semibold tracking-tight sm:text-[2.15rem] ${
                    dashboardThemeArtwork ? "text-zinc-50" : "text-white"
                  }`}
                >
                  {greeting}
                </h1>
                <p
                  className={`max-w-3xl text-sm sm:text-base ${
                    dashboardThemeArtwork ? "text-zinc-50/80" : "text-white/45"
                  }`}
                >
                  Here&apos;s what&apos;s happening with your business today.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="mb-6 block xl:hidden">
          <PremiumDarkCard
            className="px-6 py-6 sm:px-7"
            aria-label="Subadmin portal"
          >
            <div className="relative z-10 space-y-2">
              <ThemePill
                icon={<Sparkles className="h-3.5 w-3.5" />}
                className="rounded-full border border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur-[6px]"
              >
                Subadmin Portal
              </ThemePill>
              <div className="space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[2.15rem]">
                  {greeting}
                </h1>
                <p className="max-w-3xl text-sm text-white/45 sm:text-base">
                  Here&apos;s what&apos;s happening with your business today.
                </p>
              </div>
            </div>
          </PremiumDarkCard>
        </div>

        {/* KPI Cards */}
        <SubadminKpiGrid cards={allKpiCards} />

        {/* Charts */}
        {transactionGraph && clientsGraph && (
          <EnhancedDashboardCharts
            adminDashboardData={{
              kpis,
              transaction_graph: transactionGraph,
              clients_graph: clientsGraph,
              summary_metrics: summaryMetrics ?? {
                daily: {
                  start_date: null,
                  end_date: null,
                  deposit: 0,
                  withdraw: 0,
                  add_bonus: 0,
                  remove_bonus: 0,
                },
                weekly: {
                  start_date: null,
                  end_date: null,
                  deposit: 0,
                  withdraw: 0,
                  add_bonus: 0,
                  remove_bonus: 0,
                },
                monthly: {
                  start_date: null,
                  end_date: null,
                  deposit: 0,
                  withdraw: 0,
                  add_bonus: 0,
                  remove_bonus: 0,
                },
                total: {
                  start_date: null,
                  end_date: null,
                  deposit: 0,
                  withdraw: 0,
                  add_bonus: 0,
                  remove_bonus: 0,
                },
              },
            }}
          />
        )}

        {/* Summary Metrics */}
        {summaryMetrics && (
          <Card className="relative overflow-hidden border rounded-[28px] shadow-lg backdrop-blur-sm ib-portal-surface">
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                Summary Metrics
              </CardTitle>
              <CardDescription>Financial overview by period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(
                  ["daily", "weekly", "monthly", "previous_month"] as const
                ).map((period) => {
                  const metric = summaryMetrics[period];
                  if (!metric) return null;
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
                            {formatCurrency(metric.deposit ?? 0)}
                          </p>
                        </div>
                        <div className="group relative overflow-hidden p-3 rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300">
                          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <p className="relative text-xs text-muted-foreground mb-1">
                            Withdraw
                          </p>
                          <p className="relative text-sm font-bold">
                            {formatCurrency(metric.withdraw ?? 0)}
                          </p>
                        </div>
                        <div className="group relative overflow-hidden p-3 rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300">
                          <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <p className="relative text-xs text-muted-foreground mb-1">
                            {period === "daily"
                              ? "Pending Commission"
                              : "IB Commission"}
                          </p>
                          <p className="relative text-sm font-bold">
                            {formatCurrency(
                              period === "daily"
                                ? (metric.pending_commission ?? 0)
                                : (metric.partner_commission ?? 0),
                            )}
                          </p>
                        </div>
                        <div className="group relative overflow-hidden p-3 rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <p className="relative text-xs text-muted-foreground mb-1">
                            Bonus Given
                          </p>
                          <p className="relative text-sm font-bold">
                            {formatCurrency(metric.add_bonus ?? 0)}
                          </p>
                        </div>
                        <div className="group relative overflow-hidden p-3 rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300">
                          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <p className="relative text-xs text-muted-foreground mb-1">
                            Bonus Removed
                          </p>
                          <p className="relative text-sm font-bold">
                            {formatCurrency(metric.remove_bonus ?? 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold">Total</h4>
                    <span className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary backdrop-blur-sm">
                      {formatSummaryDateRange(summaryMetrics.total)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Range: {formatSummaryDateRange(summaryMetrics.total)}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    <div className="group relative overflow-hidden p-3 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-md backdrop-blur-sm hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <p className="relative text-xs text-muted-foreground mb-1">
                        Deposit
                      </p>
                      <p className="relative text-sm font-bold text-primary">
                        {formatCurrency(summaryMetrics.total.deposit ?? 0)}
                      </p>
                    </div>
                    <div className="group relative overflow-hidden p-3 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-md backdrop-blur-sm hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <p className="relative text-xs text-muted-foreground mb-1">
                        Withdraw
                      </p>
                      <p className="relative text-sm font-bold text-primary">
                        {formatCurrency(summaryMetrics.total.withdraw ?? 0)}
                      </p>
                    </div>
                    <div className="group relative overflow-hidden p-3 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-md backdrop-blur-sm hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <p className="relative text-xs text-muted-foreground mb-1">
                        IB Commission
                      </p>
                      <p className="relative text-sm font-bold text-primary">
                        {formatCurrency(
                          summaryMetrics.total.partner_commission ?? 0,
                        )}
                      </p>
                    </div>
                    <div className="group relative overflow-hidden p-3 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-md backdrop-blur-sm hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <p className="relative text-xs text-muted-foreground mb-1">
                        Bonus Given
                      </p>
                      <p className="relative text-sm font-bold text-primary">
                        {formatCurrency(summaryMetrics.total.add_bonus ?? 0)}
                      </p>
                    </div>
                    <div className="group relative overflow-hidden p-3 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent shadow-md backdrop-blur-sm hover:shadow-lg hover:border-primary/50 transition-all duration-300">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <p className="relative text-xs text-muted-foreground mb-1">
                        Bonus Removed
                      </p>
                      <p className="relative text-sm font-bold text-primary">
                        {formatCurrency(summaryMetrics.total.remove_bonus ?? 0)}
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

  // Manager fallback layout
  const permissions = data?.permissions;
  const clients = data?.stats?.clients;
  const deposits = data?.stats?.transactions?.deposits;
  const withdrawals = data?.stats?.transactions?.withdrawals;
  const canViewTransactions = permissions?.some(
    (permission) => permission?.toLowerCase() === "transaction",
  );

  return (
    <div className="min-h-full w-full p-4 lg:p-6 xl:p-8">
      {/* Header */}
      <div className="mb-6 hidden xl:block">
        <div
          className={`rounded-[28px] border px-6 py-6 sm:px-7 ${
            dashboardThemeArtwork
              ? "ib-portal-hero ib-dash-artwork-surface"
              : "premium-dark-border group relative overflow-hidden border-white/5 bg-[#050505]"
          }`}
        >
          {dashboardThemeArtwork ? (
            <div
              className={`dashboard-theme-overlay dashboard-theme-welcome-overlay theme-art-${dashboardThemeArtwork}`}
            />
          ) : (
            <PremiumDarkLayers />
          )}
          <div className="relative z-10 space-y-2">
            <ThemePill
              icon={<Sparkles className="h-3.5 w-3.5" />}
              className={`rounded-full text-xs font-semibold uppercase tracking-[0.22em] ${
                dashboardThemeArtwork
                  ? ""
                  : "border border-white/10 bg-white/5 text-white/80 backdrop-blur-[6px]"
              }`}
            >
              Manager Portal
            </ThemePill>
            <div className="space-y-1">
              <h1
                className={`text-3xl font-semibold tracking-tight sm:text-[2.15rem] ${
                  dashboardThemeArtwork ? "text-zinc-50" : "text-white"
                }`}
              >
                {greeting}
              </h1>
              <p
                className={`max-w-3xl text-sm sm:text-base ${
                  dashboardThemeArtwork ? "text-zinc-50/80" : "text-white/45"
                }`}
              >
                Here&apos;s what&apos;s happening with your business today.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="mb-6 block xl:hidden">
        <PremiumDarkCard
          className="px-6 py-6 sm:px-7"
          aria-label="Manager portal"
        >
          <div className="relative z-10 space-y-2">
            <ThemePill
              icon={<Sparkles className="h-3.5 w-3.5" />}
              className="rounded-full border border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur-[6px]"
            >
              Manager Portal
            </ThemePill>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[2.15rem]">
                {greeting}
              </h1>
              <p className="max-w-3xl text-sm text-white/45 sm:text-base">
                Here&apos;s what&apos;s happening with your business today.
              </p>
            </div>
          </div>
        </PremiumDarkCard>
      </div>

      {/* Client Stats */}
      {clients && <ClientStatsSection clients={clients} />}

      {/* Transaction Stats */}
      {canViewTransactions && (deposits ?? withdrawals) && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">
            Transaction Overview
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {deposits && <DepositsSection deposits={deposits} />}
            {withdrawals && <WithdrawalsSection withdrawals={withdrawals} />}
          </div>
        </div>
      )}
    </div>
  );
}
