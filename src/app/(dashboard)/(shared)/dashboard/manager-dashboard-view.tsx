'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Clock,
  TrendingDown,
  TrendingUp,
  Sparkles,
  UserCheck,
  UserX,
  Activity,
  BarChart3,
  CalendarDays,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type {
  ManagerDashboardData,
  ManagerClientsStats,
  ManagerDepositsStats,
  ManagerWithdrawalsStats,
  SubadminDashboardData,
} from "@/lib/api";
import { useClientCustomization } from "@/contexts/client-customization-context"
import { getDashboardThemeArtwork } from "@/components/theme-customizer"
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
        <div className="text-2xl font-semibold tracking-tight text-foreground">{value}</div>
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
      <h2 className="text-base font-semibold text-foreground mb-3">Client Overview</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
        <StatCard title="Total Clients" value={clients.total} icon={Users} description="All registered clients" variant="primary" />
        <StatCard title="New Today" value={clients.new_today} icon={Activity} description="Registered today" variant="emerald" />
        <StatCard title="Pending Approval" value={clients.pending_approval} icon={Clock} description="Awaiting review" variant="amber" />
        <StatCard title="FTD Count" value={clients.ftd_count} icon={UserCheck} description="First-time depositors" variant="emerald" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="New This Week" value={clients.new_this_week} icon={CalendarDays} description="Registered this week" variant="primary" />
        <StatCard title="New This Month" value={clients.new_this_month} icon={CalendarDays} description="Registered this month" variant="primary" />
        <StatCard title="Non-FTD" value={clients.non_ftd_count} icon={UserX} description="No first deposit yet" variant="default" />
        <StatCard title="Active (30d)" value={clients.active_last_30_days} icon={BarChart3} description="Active last 30 days" variant="emerald" />
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
        <AmountStatCard label="Pending" count={deposits.pending_count} amount={deposits.pending_amount} highlight="amber" />
        <AmountStatCard label="Approved Today" count={deposits.approved_today_count} amount={deposits.approved_today_amount} highlight="emerald" />
        <AmountStatCard label="Approved This Month" count={deposits.approved_this_month_count} amount={deposits.approved_this_month_amount} highlight="emerald" />
        <AmountStatCard label="Approved All Time" count={deposits.approved_all_time_count} amount={deposits.approved_all_time_amount} highlight="primary" />
      </CardContent>
    </Card>
  );
}

function WithdrawalsSection({ withdrawals }: { withdrawals: ManagerWithdrawalsStats }) {
  return (
    <Card className="rounded-[28px] border shadow-sm">
      <CardHeader className="pb-3 pt-5 px-5 border-b">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-red-500" />
          <CardTitle className="text-sm font-semibold">Withdrawals</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-5 grid grid-cols-2 gap-3">
        <AmountStatCard label="Pending" count={withdrawals.pending_count} amount={withdrawals.pending_amount} highlight="amber" />
        <AmountStatCard label="Approved Today" count={withdrawals.approved_today_count} amount={withdrawals.approved_today_amount} highlight="emerald" />
        <AmountStatCard label="Approved This Month" count={withdrawals.approved_this_month_count} amount={withdrawals.approved_this_month_amount} highlight="emerald" />
        <AmountStatCard label="Approved All Time" count={withdrawals.approved_all_time_count} amount={withdrawals.approved_all_time_amount} highlight="primary" />
        <AmountStatCard label="Rejected This Month" count={withdrawals.rejected_this_month_count} highlight="red" />
      </CardContent>
    </Card>
  );
}

export function ManagerDashboardView({ managerDashboardData, subadminDashboardData, userName }: ManagerDashboardViewProps) {
  const { themePairId, themeMode } = useClientCustomization();
  const dashboardThemeArtwork = getDashboardThemeArtwork(themePairId, themeMode);
  const data = managerDashboardData ?? subadminDashboardData ?? null;
  const managerInfo =
    (data as ManagerDashboardData | null)?.manager ??
    (data as SubadminDashboardData | null)?.subadmin;
  const manager = managerInfo;
  const permissions = data?.permissions;
  const clients = data?.stats?.clients;
  const deposits = data?.stats?.transactions?.deposits;
  const withdrawals = data?.stats?.transactions?.withdrawals;
  const canViewTransactions = permissions?.some((permission) => permission?.toLowerCase() === "transaction");

  const greeting = (() => {
    const h = new Date().getHours();
    const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    const firstName = (userName ?? manager?.name)?.split(" ")[0];
    return firstName ? `${g}, ${firstName}` : g;
  })();

  return (
    <div className="min-h-full w-full p-4 lg:p-6 xl:p-8">
      {/* Header */}
      {/* Desktop: original with theme images — falls back to dark premium when no artwork, so it shows correctly in bright and dark mode. */}
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
      {/* Mobile fallback: dark premium — shows when viewport is reduced (below xl). */}
      <div className="mb-6 block xl:hidden">
        <PremiumDarkCard className="px-6 py-6 sm:px-7" aria-label="Manager portal">
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

      {/* Permissions */}
      {/* {permissions && permissions.length > 0 && (
        <div className="mb-6">
          <Card className="rounded-[28px] border shadow-sm">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Assigned Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="flex flex-wrap gap-2">
                {permissions.map((perm) => (
                  <Badge key={perm} variant="secondary" className="capitalize text-xs px-3 py-1">
                    {perm}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )} */}

      {/* Client Stats — only rendered when present in API response */}
      {clients && <ClientStatsSection clients={clients} />}

      {/* Transaction Stats — only rendered when present in API response */}
      {canViewTransactions && (deposits ?? withdrawals) && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Transaction Overview</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {deposits && <DepositsSection deposits={deposits} />}
            {withdrawals && <WithdrawalsSection withdrawals={withdrawals} />}
          </div>
        </div>
      )}
    </div>
  );
}
