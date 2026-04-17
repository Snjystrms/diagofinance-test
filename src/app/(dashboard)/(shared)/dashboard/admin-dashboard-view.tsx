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
  const summaryMetrics = adminDashboardData?.summary_metrics;

  const chartData = useMemo(() => {
    if (!transactionGraph?.data) return [];
    return transactionGraph.data.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      deposit: item.deposit,
      withdraw: item.withdraw,
      ib_withdraw: item.ib_withdraw,
    }));
  }, [transactionGraph]);

  const chartConfig = {
    deposit: { label: "Deposit", color: "#22c55e" },
    withdraw: { label: "Withdraw", color: "#ef4444" },
    ib_withdraw: { label: "IB Withdraw", color: "#3b82f6" },
  };

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
        <Card className="hover:shadow-md transition-shadow duration-300 border-2 border-indigo-500/30 hover:border-indigo-500/50 bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{kpis?.total_clients ?? 0}</div>
            <p className="text-xs text-muted-foreground">All registered clients</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-300 border-2 border-blue-500/30 hover:border-blue-500/50 bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total IB</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{kpis?.total_ib ?? 0}</div>
            <p className="text-xs text-muted-foreground">Introducing Brokers</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-300 border-2 border-amber-500/30 hover:border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Clients</CardTitle>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{kpis?.pending_clients ?? 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-300 border-2 border-green-500/30 hover:border-green-500/50 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Traders</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{kpis?.active_traders ?? 0}</div>
            <p className="text-xs text-muted-foreground">Currently trading</p>
          </CardContent>
        </Card>
      </div>

      {/* Additional KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="hover:shadow-md transition-shadow duration-300 border-2 border-green-500/30 hover:border-green-500/50 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Deposits</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{kpis?.approved_deposit ?? 0}</div>
            <p className="text-xs text-muted-foreground">Total approved</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-300 border-2 border-amber-500/30 hover:border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Deposits</CardTitle>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{kpis?.pending_deposit ?? 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-300 border-2 border-red-500/30 hover:border-red-500/50 bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{kpis?.pending_withdraw ?? 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-300 border-2 border-purple-500/30 hover:border-purple-500/50 bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending IB Withdrawals</CardTitle>
            <Wallet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{kpis?.pending_ib_withdraw ?? 0}</div>
            <p className="text-xs text-muted-foreground">IB withdrawal requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Graph */}
      {transactionGraph && (
        <Card className="mb-6">
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
            {chartData.length > 0 ? (
              <div className="h-[300px] w-full">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />}
                    />
                    <Line type="monotone" dataKey="deposit" stroke={chartConfig.deposit.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="withdraw" stroke={chartConfig.withdraw.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="ib_withdraw" stroke={chartConfig.ib_withdraw.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
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
