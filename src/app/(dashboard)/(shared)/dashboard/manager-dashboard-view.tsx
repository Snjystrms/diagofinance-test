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
} from "@/lib/api";
import { useClientCustomization } from "@/contexts/client-customization-context"
import { isGoldenBullTheme } from "@/components/theme-customizer"

interface ManagerDashboardViewProps {
  managerDashboardData: ManagerDashboardData | null;
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

export function ManagerDashboardView({ managerDashboardData, userName }: ManagerDashboardViewProps) {
  const { themePairId, themeMode } = useClientCustomization();
  const isBullTheme = isGoldenBullTheme(themePairId, themeMode);
  const manager = managerDashboardData?.manager;
  const permissions = managerDashboardData?.permissions;
  const clients = managerDashboardData?.stats?.clients;
  const deposits = managerDashboardData?.stats?.transactions?.deposits;
  const withdrawals = managerDashboardData?.stats?.transactions?.withdrawals;
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
      <div className="mb-6 ib-portal-hero rounded-[28px] border px-6 py-6 sm:px-7">
        {isBullTheme && <div className="bull-theme-overlay bull-theme-welcome-overlay" />}
        <div className="relative z-10 space-y-2">
          <div className="ib-portal-kicker inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em]">
            <Sparkles className="h-3.5 w-3.5" />
            Manager Portal
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.15rem]">
              {greeting}
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
              Here&apos;s what&apos;s happening with your business today.
            </p>
          </div>
          {manager && (
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {/* <span className="text-sm text-muted-foreground">{manager.email}</span>
              <span className="text-muted-foreground/40">•</span> */}
              {/* <span className="text-sm text-muted-foreground">
                {manager.total_client} client{manager.total_client !== 1 ? "s" : ""}
              </span> */}
              {/* <Badge
                variant={manager.status === 1 ? "default" : "outline"}
                className="text-xs"
              >
                {manager.status === 1 ? "Active" : "Inactive"}
              </Badge> */}
            </div>
          )}
        </div>
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
