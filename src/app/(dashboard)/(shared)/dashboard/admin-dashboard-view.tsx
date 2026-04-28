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
} from "lucide-react";
import dynamic from "next/dynamic";
import type { AdminDashboardData } from "@/lib/api";

const ChartContainer = dynamic(() => import("@/components/ui/chart").then((m) => ({ default: m.ChartContainer })), { ssr: false });
const ChartTooltip = dynamic(() => import("@/components/ui/chart").then((m) => ({ default: m.ChartTooltip })), { ssr: false });
const ChartTooltipContent = dynamic(() => import("@/components/ui/chart").then((m) => ({ default: m.ChartTooltipContent })), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((m) => ({ default: m.LineChart })), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => ({ default: m.Line })), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => ({ default: m.CartesianGrid })), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => ({ default: m.XAxis })), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => ({ default: m.YAxis })), { ssr: false });

import { formatCurrency } from "@/lib/formatters";

interface AdminDashboardViewProps {
  adminDashboardData: AdminDashboardData | null;
}

export function AdminDashboardView({ adminDashboardData }: AdminDashboardViewProps) {
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

  const primaryKpiCards = [
    {
      title: "Total Clients",
      value: kpis?.total_clients ?? 0,
      description: "All registered clients",
      icon: Users,
      className:
        "border-indigo-500/30 hover:border-indigo-500/50 bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent",
      iconClassName: "text-indigo-600 dark:text-indigo-400",
      valueClassName: "text-indigo-600 dark:text-indigo-400",
    },
    {
      title: "Total IB",
      value: kpis?.total_ib ?? 0,
      description: "Introducing Brokers",
      icon: Building2,
      className:
        "border-blue-500/30 hover:border-blue-500/50 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent",
      iconClassName: "text-blue-600 dark:text-blue-400",
      valueClassName: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Pending Clients",
      value: kpis?.pending_clients ?? 0,
      description: "Awaiting approval",
      icon: Clock,
      className:
        "border-amber-500/30 hover:border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent",
      iconClassName: "text-amber-600 dark:text-amber-400",
      valueClassName: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Active Traders",
      value: kpis?.active_traders ?? 0,
      description: "Currently trading",
      icon: TrendingUp,
      className:
        "border-green-500/30 hover:border-green-500/50 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent",
      iconClassName: "text-green-600 dark:text-green-400",
      valueClassName: "text-green-600 dark:text-green-400",
    },
  ];

  const secondaryKpiCards = [
    {
      title: "Approved Deposits",
      value: kpis?.approved_deposit ?? 0,
      description: "Total approved",
      icon: CheckCircle2,
      className:
        "border-green-500/30 hover:border-green-500/50 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent",
      iconClassName: "text-green-600 dark:text-green-400",
      valueClassName: "text-green-600 dark:text-green-400",
    },
    {
      title: "Pending Deposits",
      value: kpis?.pending_deposit ?? 0,
      description: "Awaiting approval",
      icon: Clock,
      className:
        "border-amber-500/30 hover:border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent",
      iconClassName: "text-amber-600 dark:text-amber-400",
      valueClassName: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Pending Withdrawals",
      value: kpis?.pending_withdraw ?? 0,
      description: "Awaiting processing",
      icon: TrendingDown,
      className:
        "border-red-500/30 hover:border-red-500/50 bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent",
      iconClassName: "text-red-600 dark:text-red-400",
      valueClassName: "text-red-600 dark:text-red-400",
    },
    {
      title: "Pending IB Withdrawals",
      value: kpis?.pending_ib_withdraw ?? 0,
      description: "IB withdrawal requests",
      icon: Wallet,
      className:
        "border-purple-500/30 hover:border-purple-500/50 bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-transparent",
      iconClassName: "text-purple-600 dark:text-purple-400",
      valueClassName: "text-purple-600 dark:text-purple-400",
    },
  ];

  const tertiaryKpiCards = [
    {
      title: "FTD Users",
      value: kpis?.ftd_users ?? 0,
      description: "First-time deposit users",
      icon: UserCheck,
      className:
        "border-emerald-500/30 hover:border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 via-lime-500/5 to-transparent",
      iconClassName: "text-emerald-600 dark:text-emerald-400",
      valueClassName: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Non-FTD Users",
      value: kpis?.non_ftd_users ?? 0,
      description: "Users without first deposit",
      icon: UserX,
      className:
        "border-slate-500/30 hover:border-slate-500/50 bg-gradient-to-br from-slate-500/10 via-zinc-500/5 to-transparent",
      iconClassName: "text-slate-600 dark:text-slate-300",
      valueClassName: "text-slate-700 dark:text-slate-200",
    },
    {
      title: "Pending IB Requests",
      value: kpis?.pending_ib_request ?? 0,
      description: "Waiting for IB approval",
      icon: FileClock,
      className:
        "border-cyan-500/30 hover:border-cyan-500/50 bg-gradient-to-br from-cyan-500/10 via-sky-500/5 to-transparent",
      iconClassName: "text-cyan-600 dark:text-cyan-400",
      valueClassName: "text-cyan-600 dark:text-cyan-400",
    },
    {
      title: "Pending Bank Details",
      value: kpis?.pending_bank_details_request ?? 0,
      description: "Bank detail review queue",
      icon: Landmark,
      className:
        "border-fuchsia-500/30 hover:border-fuchsia-500/50 bg-gradient-to-br from-fuchsia-500/10 via-pink-500/5 to-transparent",
      iconClassName: "text-fuchsia-600 dark:text-fuchsia-400",
      valueClassName: "text-fuchsia-600 dark:text-fuchsia-400",
    },
  ];

  return (
    <div className="min-h-full w-full p-4 lg:p-6 xl:p-8 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back! Here&apos;s what&apos;s happening with your business today.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {primaryKpiCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.title}
              className={`hover:shadow-md transition-shadow duration-300 border-2 ${item.className}`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <Icon className={`h-4 w-4 ${item.iconClassName}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${item.valueClassName}`}>{item.value}</div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {secondaryKpiCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.title}
              className={`hover:shadow-md transition-shadow duration-300 border-2 ${item.className}`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <Icon className={`h-4 w-4 ${item.iconClassName}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${item.valueClassName}`}>{item.value}</div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {tertiaryKpiCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.title}
              className={`hover:shadow-md transition-shadow duration-300 border-2 ${item.className}`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <Icon className={`h-4 w-4 ${item.iconClassName}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${item.valueClassName}`}>{item.value}</div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        {transactionGraph && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Transaction Graph</CardTitle>
                  <CardDescription>
                    {transactionGraph.start_date && transactionGraph.end_date
                      ? `${new Date(transactionGraph.start_date).toLocaleDateString()} - ${new Date(transactionGraph.end_date).toLocaleDateString()}`
                      : "Transaction overview"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {transactionChartData.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ChartContainer config={transactionChartConfig} className="h-full w-full">
                    <LineChart data={transactionChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                      />
                      <Line type="monotone" dataKey="deposit" stroke={transactionChartConfig.deposit.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="withdraw" stroke={transactionChartConfig.withdraw.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="ib_withdraw" stroke={transactionChartConfig.ib_withdraw.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ChartContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No transaction data available
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {clientsGraph && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Client Growth Graph</CardTitle>
                  <CardDescription>
                    {clientsGraph.start_date && clientsGraph.end_date
                      ? `${new Date(clientsGraph.start_date).toLocaleDateString()} - ${new Date(clientsGraph.end_date).toLocaleDateString()}`
                      : "New client registrations"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {clientsChartData.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ChartContainer config={clientsChartConfig} className="h-full w-full">
                    <LineChart data={clientsChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={(value) => `${Number(value)} clients`} />}
                      />
                      <Line type="monotone" dataKey="clients" stroke={clientsChartConfig.clients.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ChartContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No client graph data available
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

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
