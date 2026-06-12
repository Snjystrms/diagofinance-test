'use client';

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { AdminDashboardData } from "@/lib/api"
import { useClientCustomization } from "@/contexts/client-customization-context"
import { isGoldenBullTheme } from "@/components/theme-customizer";

const ChartContainer = dynamic(() => import("@/components/ui/chart").then((m) => ({ default: m.ChartContainer })), { ssr: false });
const ChartTooltip = dynamic(() => import("@/components/ui/chart").then((m) => ({ default: m.ChartTooltip })), { ssr: false });
const ChartTooltipContent = dynamic(() => import("@/components/ui/chart").then((m) => ({ default: m.ChartTooltipContent })), { ssr: false });
const AreaChart = dynamic(() => import("recharts").then((m) => ({ default: m.AreaChart })), { ssr: false });
const Area = dynamic(() => import("recharts").then((m) => ({ default: m.Area })), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => ({ default: m.CartesianGrid })), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => ({ default: m.XAxis })), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => ({ default: m.YAxis })), { ssr: false });

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

export function AdminDashboardView({ adminDashboardData, userName }: AdminDashboardViewProps) {
  const { themePairId, themeMode } = useClientCustomization();
  const isBullTheme = isGoldenBullTheme(themePairId, themeMode);
  const kpis = adminDashboardData?.kpis;
  const transactionGraph = adminDashboardData?.transaction_graph;
  const clientsGraph = adminDashboardData?.clients_graph;
  const summaryMetrics = adminDashboardData?.summary_metrics;

  const transactionChartData = useMemo(() => {
    if (!transactionGraph?.data) return [];
    return transactionGraph.data.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      deposit: item.deposit,
      withdraw: item.withdraw,
      ib_withdraw: item.ib_withdraw,
    }));
  }, [transactionGraph]);

  const clientsChartData = useMemo(() => {
    if (!clientsGraph?.data) return [];
    return clientsGraph.data.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      clients: item.clients,
    }));
  }, [clientsGraph]);

  const transactionChartConfig = {
    deposit: { label: "Deposit", color: "#22c55e" },
    withdraw: { label: "Withdraw", color: "#ef4444" },
    ib_withdraw: { label: "IB Withdraw", color: "#3b82f6" },
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
    const firstTotal = Number(first.deposit) + Number(first.withdraw) + Number(first.ib_withdraw);
    const lastTotal = Number(last.deposit) + Number(last.withdraw) + Number(last.ib_withdraw);
    const growthPercent = firstTotal > 0 ? ((lastTotal - firstTotal) / firstTotal) * 100 : 0;
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

 // Replace the three separate arrays and KpiGrid calls with this:

const allKpiCards = [
  // Row 1
  { title: "Total Clients",          value: kpis?.total_clients ?? 0,                   description: "All registered clients",      icon: Users,        ibVariant: "ib-portal-surface-primary", href: "/new-users" },
  { title: "Total Partners",         value: kpis?.total_ib ?? 0,                        description: "Introducing Brokers",         icon: Building2,    ibVariant: "ib-portal-surface-primary", href: "/ib-users" },
  { title: "Active Traders",         value: kpis?.active_traders ?? 0,                  description: "Currently trading",           icon: TrendingUp,   ibVariant: "ib-portal-surface-emerald", href: "/all-users-mt5-accounts" },
  // Row 2
  { title: "Approved Deposits",      value: kpis?.approved_deposit ?? 0,                description: "Total approved",              icon: CheckCircle2, ibVariant: "ib-portal-surface-emerald", href: "/usdt-transactions?status=approved" },
  { title: "Pending Deposits",       value: kpis?.pending_deposit ?? 0,                 description: "Awaiting approval",           icon: Clock,        ibVariant: "ib-portal-surface-amber",   href: "/usdt-transactions?status=pending" },
  { title: "Pending Withdrawals",    value: kpis?.pending_withdraw ?? 0,                description: "Awaiting processing",         icon: Clock, ibVariant: "ib-portal-surface-amber",   href: "/withdrawal-requests" },
  // Row 3
  { title: "Pending Partner Request", value: kpis?.pending_ib_request ?? 0,             description: "Pending Partner requests",      icon: Clock,       ibVariant: "ib-portal-surface-primary", href: "/all-ib?status=0" },
  { title: "Pending KYC Clients",        value: kpis?.pending_kyc_clients ?? 0,             description: "Awaiting approval",           icon: Clock,        ibVariant: "ib-portal-surface-amber",   href: "/user-verification" },
  { title: "Pending Bank Details",   value: kpis?.pending_bank_details_request ?? 0,    description: "Bank detail review queue",    icon: Landmark,     ibVariant: "ib-portal-surface-primary", href: "/add-bank-details" },
] satisfies KpiCardItem[];

  const greeting = (() => {
    const h = new Date().getHours();
    const g = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    const firstName = userName?.split(" ")[0];
    return firstName ? `${g}, ${firstName}` : g;
  })();

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
              <div className="text-2xl font-semibold tracking-tight text-foreground">{item.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
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
        {isBullTheme && <div className="bull-theme-overlay bull-theme-welcome-overlay" />}
        <div className="relative z-10 space-y-2">
          <div className="ib-portal-kicker inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em]">
            <Sparkles className="h-3.5 w-3.5" />
            Admin Portal
          </div>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Summary Metrics</CardTitle>
            <CardDescription>Financial overview by period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(["daily", "weekly", "monthly"] as const).map((period) => (
                <div key={period} className="space-y-2">
                  <h4 className="text-sm font-semibold text-muted-foreground capitalize">{period}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Deposit</p>
                      <p className="text-sm font-bold">{formatCurrency(summaryMetrics[period].deposit)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Withdraw</p>
                      <p className="text-sm font-bold">{formatCurrency(summaryMetrics[period].withdraw)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">IB Withdraw</p>
                      <p className="text-sm font-bold">{formatCurrency(summaryMetrics[period].ib_withdraw)}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="space-y-2 pt-2 border-t">
                <h4 className="text-sm font-semibold">Total</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs text-muted-foreground">Deposit</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(summaryMetrics.total.deposit)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs text-muted-foreground">Withdraw</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(summaryMetrics.total.withdraw)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-xs text-muted-foreground">IB Withdraw</p>
                    <p className="text-sm font-bold text-primary">{formatCurrency(summaryMetrics.total.ib_withdraw)}</p>
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
