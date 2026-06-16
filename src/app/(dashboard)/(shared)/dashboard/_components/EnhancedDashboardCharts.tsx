'use client';

import { useMemo } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, TrendingDown, Users, Activity } from "lucide-react";
import type { AdminDashboardData } from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface EnhancedChartsProps {
  adminDashboardData: AdminDashboardData | null;
}

type TransactionChartPoint = {
  date: string;
  deposit: number;
  withdraw: number;
  ib_withdraw: number;
};

type ClientChartPoint = {
  date: string;
  clients: number;
};

const transactionChartConfig = {
  deposit: { label: "Deposit", color: "var(--primary)" },
  withdraw: { label: "Withdraw", color: "var(--accent)" },
  ib_withdraw: { label: "IB Withdraw", color: "var(--secondary)" },
} satisfies ChartConfig;

const clientChartConfig = {
  clients: { label: "Clients", color: "var(--primary)" },
} satisfies ChartConfig;

export function EnhancedDashboardCharts({ adminDashboardData }: EnhancedChartsProps) {
  const transactionGraph = adminDashboardData?.transaction_graph;
  const clientsGraph = adminDashboardData?.clients_graph;

  const transactionChartData = useMemo<TransactionChartPoint[]>(() => {
    if (!transactionGraph?.data) return [];
    return transactionGraph.data.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      deposit: Number(item.deposit ?? 0),
      withdraw: Number(item.withdraw ?? 0),
      ib_withdraw: Number(item.ib_withdraw ?? 0),
    }));
  }, [transactionGraph]);

  const clientsChartData = useMemo<ClientChartPoint[]>(() => {
    if (!clientsGraph?.data) return [];
    return clientsGraph.data.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      clients: Number(item.clients ?? 0),
    }));
  }, [clientsGraph]);

  const transactionSummary = useMemo(() => {
    if (!transactionChartData.length) return { total: 0, growthPercent: 0, deposit: 0, withdraw: 0, ibWithdraw: 0, depositChange: 0, withdrawChange: 0, ibWithdrawChange: 0 };
    const last = transactionChartData[transactionChartData.length - 1];
    const first = transactionChartData[0];
    const lastTotal = last.deposit + last.withdraw + last.ib_withdraw;
    const firstTotal = first.deposit + first.withdraw + first.ib_withdraw;
    const growthPercent = firstTotal > 0 ? ((lastTotal - firstTotal) / firstTotal) * 100 : 0;
    const depositChange = first.deposit > 0 ? ((last.deposit - first.deposit) / first.deposit) * 100 : 0;
    const withdrawChange = first.withdraw > 0 ? ((last.withdraw - first.withdraw) / first.withdraw) * 100 : 0;
    const ibWithdrawChange = first.ib_withdraw > 0 ? ((last.ib_withdraw - first.ib_withdraw) / first.ib_withdraw) * 100 : 0;
    return { total: lastTotal, growthPercent, deposit: last.deposit, withdraw: last.withdraw, ibWithdraw: last.ib_withdraw, depositChange, withdrawChange, ibWithdrawChange };
  }, [transactionChartData]);

  const clientsSummary = useMemo(() => {
    if (!clientsChartData.length) return { total: 0, growthPercent: 0 };
    const first = Number(clientsChartData[0].clients);
    const last = Number(clientsChartData[clientsChartData.length - 1].clients);
    const growthPercent = first > 0 ? ((last - first) / first) * 100 : 0;
    return { total: last, growthPercent };
  }, [clientsChartData]);

  const transactionHasVariation = useMemo(
    () => transactionChartData.some((p) => p.deposit !== 0 || p.withdraw !== 0 || p.ib_withdraw !== 0),
    [transactionChartData]
  );
  const clientsHasVariation = useMemo(
    () => clientsChartData.some((p) => p.clients !== 0),
    [clientsChartData]
  );

  const dateRange = (graph: { start_date?: string; end_date?: string } | null | undefined) => {
    if (!graph?.start_date || !graph?.end_date) return null;
    return `${new Date(graph.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${new Date(graph.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  };

  const transactionMetrics: { name: string; amount: number; change: number; colorVar: string }[] = [
    { name: "Deposit", amount: transactionSummary.deposit, change: transactionSummary.depositChange, colorVar: "var(--primary)" },
    { name: "Withdraw", amount: transactionSummary.withdraw, change: transactionSummary.withdrawChange, colorVar: "var(--accent)" },
    { name: "IB Withdraw", amount: transactionSummary.ibWithdraw, change: transactionSummary.ibWithdrawChange, colorVar: "var(--secondary)" },
  ];

  return (
    <div className="mb-6 grid gap-6 xl:grid-cols-2">

      {/* ── Transaction Chart ── */}
      {transactionGraph && (
        <Card className="flex w-full flex-col gap-0 p-5 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between p-0">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <CardTitle className="text-base font-medium leading-none font-semibold text-muted-foreground">
                Transactions
              </CardTitle>
              {dateRange(transactionGraph) && (
                <>
                  <span className="mx-1 text-[10px] text-muted-foreground">|</span>
                  <span className="text-[10px] text-muted-foreground">
                    {dateRange(transactionGraph)}
                  </span>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 p-0">
            <div className="flex items-center gap-2 pb-2">
              <span className="text-3xl font-medium tracking-tight tabular-nums">
                {formatCurrency(transactionSummary.total)}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full text-xs",
                  transactionSummary.growthPercent >= 0
                    ? "bg-primary/10 text-primary"
                    : "bg-accent/10 text-accent"
                )}
              >
                {transactionSummary.growthPercent >= 0 ? "+" : ""}
                {transactionSummary.growthPercent.toFixed(1)}%
              </Badge>
            </div>

            {transactionChartData.length > 0 ? (
              <ChartContainer
                config={transactionChartConfig}
                className="aspect-auto h-[200px] w-full"
              >
                <LineChart accessibilityLayer data={transactionChartData}>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="4 4"
                    stroke="var(--color-border)"
                  />
                  <XAxis dataKey="date" hide />
                  <YAxis
                    hide
                    domain={
                      transactionHasVariation
                        ? ["dataMin - 10", "dataMax + 10"]
                        : [-1, 1]
                    }
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    cursor={{
                      stroke: "var(--color-deposit)",
                      strokeWidth: 1,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="deposit"
                    stroke="var(--color-deposit)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "var(--color-deposit)",
                      stroke: "var(--background)",
                      strokeWidth: 2,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="withdraw"
                    stroke="var(--color-withdraw)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "var(--color-withdraw)",
                      stroke: "var(--background)",
                      strokeWidth: 2,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ib_withdraw"
                    stroke="var(--color-ib_withdraw)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "var(--color-ib_withdraw)",
                      stroke: "var(--background)",
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                No transaction data available
              </div>
            )}

            <div className="flex flex-col gap-3">
              {transactionMetrics.map((metric) => {
                const up = metric.change >= 0;
                return (
                  <div key={metric.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-block h-1.5 w-4 rounded-full"
                        style={{ background: metric.colorVar }}
                      />
                      <span className="text-sm font-medium text-muted-foreground">
                        {metric.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-sm font-medium">
                        {formatCurrency(metric.amount)}
                      </span>
                      <div className="flex items-center gap-1">
                        {up ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="1em"
                            height="1em"
                            viewBox="0 0 24 24"
                            className="size-3.5 text-primary"
                          >
                            <path
                              fill="currentColor"
                              d="M11 20V7.825l-5.6 5.6L4 12l8-8l8 8l-1.4 1.425l-5.6-5.6V20z"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="1em"
                            height="1em"
                            viewBox="0 0 24 24"
                            className="size-3.5 text-accent"
                          >
                            <path
                              fill="currentColor"
                              d="M11 16.175V5q0-.425.288-.712T12 4t.713.288T13 5v11.175l4.9-4.9q.3-.3.7-.288t.7.313q.275.3.287.7t-.287.7l-6.6 6.6q-.15.15-.325.213t-.375.062t-.375-.062t-.325-.213l-6.6-6.6q-.275-.275-.275-.687T4.7 11.3q.3-.3.713-.3t.712.3z"
                            />
                          </svg>
                        )}
                        <span
                          className={cn(
                            "text-xs font-medium",
                            up ? "text-primary" : "text-accent"
                          )}
                        >
                          {up ? "+" : ""}
                          {metric.change.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Client Growth Chart ── */}
      {clientsGraph && (
        <Card className="flex w-full flex-col gap-0 p-5 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between p-0">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-primary" />
              <CardTitle className="text-base font-medium leading-none font-semibold text-muted-foreground">
                Client Growth
              </CardTitle>
              {dateRange(clientsGraph) && (
                <>
                  <span className="mx-1 text-[10px] text-muted-foreground">|</span>
                  <span className="text-[10px] text-muted-foreground">
                    {dateRange(clientsGraph)}
                  </span>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 p-0">
            <div className="flex items-center gap-2 pb-2">
              <span className="text-3xl font-medium tracking-tight tabular-nums">
                {clientsSummary.total.toLocaleString()}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full text-xs",
                  clientsSummary.growthPercent >= 0
                    ? "bg-primary/10 text-primary"
                    : "bg-accent/10 text-accent"
                )}
              >
                {clientsSummary.growthPercent >= 0 ? "+" : ""}
                {clientsSummary.growthPercent.toFixed(1)}%
              </Badge>
            </div>

            {clientsChartData.length > 0 ? (
              <ChartContainer
                config={clientChartConfig}
                className="aspect-auto h-[200px] w-full"
              >
                <LineChart accessibilityLayer data={clientsChartData}>
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="4 4"
                    stroke="var(--color-border)"
                  />
                  <XAxis dataKey="date" hide />
                  <YAxis
                    hide
                    domain={
                      clientsHasVariation
                        ? ["dataMin - 10", "dataMax + 10"]
                        : [-1, 1]
                    }
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                    cursor={{
                      stroke: "var(--color-clients)",
                      strokeWidth: 1,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="clients"
                    stroke="var(--color-clients)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "var(--color-clients)",
                      stroke: "var(--background)",
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                No client data available
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="size-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Total Clients
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-sm font-medium">
                    {clientsSummary.total.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1">
                    {clientsSummary.growthPercent >= 0 ? (
                      <TrendingUp className="size-3.5 text-primary" />
                    ) : (
                      <TrendingDown className="size-3.5 text-accent" />
                    )}
                    <span
className={cn(
                            "text-xs font-medium",
                            clientsSummary.growthPercent >= 0
                              ? "text-primary"
                              : "text-accent"
                          )}
                    >
                      {clientsSummary.growthPercent >= 0 ? "+" : ""}
                      {clientsSummary.growthPercent.toFixed(1)}%
                    </span>
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