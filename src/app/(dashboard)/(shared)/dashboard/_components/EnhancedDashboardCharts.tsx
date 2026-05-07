'use client';

import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Users } from "lucide-react";
import type { AdminDashboardData } from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";

interface EnhancedChartsProps {
  adminDashboardData: AdminDashboardData | null;
}

type ChartColorPalette = {
  deposit: string;
  withdraw: string;
  ibWithdraw: string;
  clients: string;
  grid: string;
  axis: string;
  background: string;
  positive: string;
  negative: string;
};

type TransactionMetricKey = "deposit" | "withdraw" | "ib_withdraw";

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

type ChartTooltipEntry = {
  dataKey?: string;
  color?: string;
  name?: string;
  value?: number | string | null;
};

type ChartDotProps = {
  index?: number;
  cx?: number;
  cy?: number;
};

const fallbackChartColors: ChartColorPalette = {
  deposit: "#22c55e",
  withdraw: "#ef4444",
  ibWithdraw: "#3b82f6",
  clients: "#a78bfa",
  grid: "rgba(148, 163, 184, 0.35)",
  axis: "#64748b",
  background: "#ffffff",
  positive: "#22c55e",
  negative: "#ef4444",
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function TransactionTooltip({
  active,
  payload,
  label,
  chartColors,
}: {
  active?: boolean;
  payload?: readonly ChartTooltipEntry[];
  label?: string | number;
  chartColors: ChartColorPalette;
}) {
  if (!active || !payload?.length) return null;
  const getSeriesColor = (key?: string, fallback?: string) => {
    if (key === "deposit") return chartColors.deposit;
    if (key === "withdraw") return chartColors.withdraw;
    if (key === "ib_withdraw") return chartColors.ibWithdraw;
    return fallback || "hsl(var(--muted-foreground))";
  };
  return (
    <div className="min-w-[160px] rounded-xl border border-border/60 bg-card/95 p-3 shadow-2xl backdrop-blur-md">
      <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-6 mb-1">
          <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: getSeriesColor(entry?.dataKey, entry?.color) }} />
            {entry.name}
          </span>
          <span className="text-[13px] font-bold text-foreground">{formatCurrency(Number(entry.value))}</span>
        </div>
      ))}
    </div>
  );
}

function ClientTooltip({
  active,
  payload,
  label,
  color,
}: {
  active?: boolean;
  payload?: readonly ChartTooltipEntry[];
  label?: string | number;
  color: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[140px] rounded-xl border border-border/60 bg-card/95 p-3 shadow-2xl backdrop-blur-md">
      <p className="mb-2 text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">{label}</p>
      <div className="flex items-center justify-between gap-6">
        <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
          Clients
        </span>
        <span className="text-[13px] font-bold text-foreground">{Number(payload[0].value)}</span>
      </div>
    </div>
  );
}

// ─── Legend Pill ──────────────────────────────────────────────────────────────
function LegendPill({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide"
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
        color,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

// ─── Stat Badge ───────────────────────────────────────────────────────────────
function GrowthBadge({ percent }: { percent: number }) {
  const up = percent >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
        up ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{percent.toFixed(1)}%
    </span>
  );
}

// ─── Glow dot on line end ─────────────────────────────────────────────────────
function GlowDot({
  cx,
  cy,
  color,
  innerColor,
}: {
  cx?: number;
  cy?: number;
  color: string;
  innerColor: string;
}) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={color} opacity={0.18} />
      <circle cx={cx} cy={cy} r={3.5} fill={color} opacity={0.7} />
      <circle cx={cx} cy={cy} r={2} fill={innerColor} />
    </g>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function EnhancedDashboardCharts({ adminDashboardData }: EnhancedChartsProps) {
  const transactionGraph = adminDashboardData?.transaction_graph;
  const clientsGraph = adminDashboardData?.clients_graph;
  const [chartColors, setChartColors] = useState<ChartColorPalette>(fallbackChartColors);

  useEffect(() => {
    const resolveCssColor = (cssVarName: string, fallback: string) => {
      const probe = document.createElement("span");
      probe.style.color = fallback;
      probe.style.display = "none";
      probe.style.color = `var(${cssVarName})`;
      document.body.appendChild(probe);
      const resolved = getComputedStyle(probe).color;
      probe.remove();
      return resolved || fallback;
    };

    const resolveCssBackground = (cssVarName: string, fallback: string) => {
      const probe = document.createElement("span");
      probe.style.backgroundColor = fallback;
      probe.style.display = "none";
      probe.style.backgroundColor = `var(${cssVarName})`;
      document.body.appendChild(probe);
      const resolved = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return resolved || fallback;
    };

    const updateColors = () => {
      setChartColors({
        deposit: resolveCssColor("--chart-2", fallbackChartColors.deposit),
        withdraw: resolveCssColor("--destructive", fallbackChartColors.withdraw),
        ibWithdraw: resolveCssColor("--chart-1", fallbackChartColors.ibWithdraw),
        clients: resolveCssColor("--chart-3", fallbackChartColors.clients),
        grid: resolveCssColor("--border", fallbackChartColors.grid),
        axis: resolveCssColor("--muted-foreground", fallbackChartColors.axis),
        background: resolveCssBackground("--background", fallbackChartColors.background),
        positive: resolveCssColor("--chart-2", fallbackChartColors.positive),
        negative: resolveCssColor("--destructive", fallbackChartColors.negative),
      });
    };

    updateColors();

    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => observer.disconnect();
  }, []);

  // ── Transaction data ──
  const transactionChartData = useMemo<TransactionChartPoint[]>(() => {
    if (!transactionGraph?.data) return [];
    return transactionGraph.data.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      deposit: Number(item.deposit ?? 0),
      withdraw: Number(item.withdraw ?? 0),
      ib_withdraw: Number(item.ib_withdraw ?? 0),
    }));
  }, [transactionGraph]);

  // ── Client data ──
  const clientsChartData = useMemo<ClientChartPoint[]>(() => {
    if (!clientsGraph?.data) return [];
    return clientsGraph.data.map((item) => ({
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      clients: Number(item.clients ?? 0),
    }));
  }, [clientsGraph]);

  // ── Summaries ──
  const transactionSummary = useMemo(() => {
    if (!transactionChartData.length) return { total: 0, growthPercent: 0 };
    const first = transactionChartData[0];
    const last = transactionChartData[transactionChartData.length - 1];
    const firstTotal = Number(first.deposit) + Number(first.withdraw) + Number(first.ib_withdraw);
    const lastTotal = Number(last.deposit) + Number(last.withdraw) + Number(last.ib_withdraw);
    const growthPercent = firstTotal > 0 ? ((lastTotal - firstTotal) / firstTotal) * 100 : 0;
    return { total: lastTotal, growthPercent };
  }, [transactionChartData]);

  const clientsSummary = useMemo(() => {
    if (!clientsChartData.length) return { total: 0, growthPercent: 0 };
    const first = Number(clientsChartData[0].clients);
    const last = Number(clientsChartData[clientsChartData.length - 1].clients);
    const growthPercent = first > 0 ? ((last - first) / first) * 100 : 0;
    return { total: last, growthPercent };
  }, [clientsChartData]);

  const transactionHasVariation = useMemo(() => {
    if (!transactionChartData.length) return false;
    return transactionChartData.some(
      (point) =>
        Number(point.deposit) !== 0 ||
        Number(point.withdraw) !== 0 ||
        Number(point.ib_withdraw) !== 0
    );
  }, [transactionChartData]);

  const clientsHasVariation = useMemo(() => {
    if (!clientsChartData.length) return false;
    return clientsChartData.some((point) => Number(point.clients) !== 0);
  }, [clientsChartData]);

  // ── Active dot renderers ──
  const depositDot = (props: ChartDotProps) => {
    const { index, cx, cy } = props;
    return index === transactionChartData.length - 1 ? (
      <GlowDot key="deposit-end" cx={cx} cy={cy} color={chartColors.deposit} innerColor={chartColors.background} />
    ) : <g key={`deposit-${index}`} />;
  };
  const withdrawDot = (props: ChartDotProps) => {
    const { index, cx, cy } = props;
    return index === transactionChartData.length - 1 ? (
      <GlowDot key="withdraw-end" cx={cx} cy={cy} color={chartColors.withdraw} innerColor={chartColors.background} />
    ) : <g key={`withdraw-${index}`} />;
  };
  const ibDot = (props: ChartDotProps) => {
    const { index, cx, cy } = props;
    return index === transactionChartData.length - 1 ? (
      <GlowDot key="ib-end" cx={cx} cy={cy} color={chartColors.ibWithdraw} innerColor={chartColors.background} />
    ) : <g key={`ib-${index}`} />;
  };
  const clientDot = (props: ChartDotProps) => {
    const { index, cx, cy } = props;
    return index === clientsChartData.length - 1 ? (
      <GlowDot key="client-end" cx={cx} cy={cy} color={chartColors.clients} innerColor={chartColors.background} />
    ) : <g key={`client-${index}`} />;
  };

  const cardBase =
    "relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xl";

  const chartTickStyle = {
    fontSize: 11,
    fill: chartColors.axis,
    fontFamily: "inherit",
  } as const;

  return (
    <div className="mb-6 grid gap-6 xl:grid-cols-2">
      {/* ── Transaction Chart ── */}
      {transactionGraph && (
        <div className={cardBase}>
          {/* subtle grid bg */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--foreground)/0.18) 1px,transparent 1px),linear-gradient(90deg,hsl(var(--foreground)/0.18) 1px,transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          {/* glow blob */}
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative p-6 pb-2">
            {/* header row */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  Transaction Metrics
                </p>
                <div className="flex items-baseline gap-3">
                  <p className="text-4xl font-extrabold tracking-tight text-foreground">
                    {formatCurrency(transactionSummary.total)}
                  </p>
                  <GrowthBadge percent={transactionSummary.growthPercent} />
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {transactionGraph.start_date && transactionGraph.end_date
                    ? `${new Date(transactionGraph.start_date).toLocaleDateString()} – ${new Date(transactionGraph.end_date).toLocaleDateString()}`
                    : "vs period start"}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5 pt-1">
                <LegendPill color={chartColors.deposit} label="Deposit" />
                <LegendPill color={chartColors.withdraw} label="Withdraw" />
                <LegendPill color={chartColors.ibWithdraw} label="IB Withdraw" />
              </div>
            </div>

            {/* chart */}
            {transactionChartData.length > 0 ? (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={transactionChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <filter id="glow-green">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                      <filter id="glow-red">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                      <filter id="glow-blue">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="4 0"
                      stroke={chartColors.grid}
                      opacity={0.35}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={chartTickStyle}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                    />
                    <YAxis
                      tick={chartTickStyle}
                      tickLine={false}
                      axisLine={false}
                      domain={transactionHasVariation ? ["auto", "auto"] : [-1, 1]}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      width={44}
                    />
                    <Tooltip
                      content={(props) => <TransactionTooltip {...props} chartColors={chartColors} />}
                      cursor={{ stroke: chartColors.grid, strokeWidth: 1, strokeDasharray: "4 4" }}
                    />
                    <Line
                      dataKey="deposit"
                      name="Deposit"
                      stroke={chartColors.deposit}
                      strokeWidth={2.8}
                      dot={depositDot}
                      activeDot={{ r: 5, fill: chartColors.deposit, stroke: chartColors.background, strokeWidth: 2 }}
                      type="monotone"
                      filter="url(#glow-green)"
                    />
                    <Line
                      dataKey="withdraw"
                      name="Withdraw"
                      stroke={chartColors.withdraw}
                      strokeWidth={2.8}
                      dot={withdrawDot}
                      activeDot={{ r: 5, fill: chartColors.withdraw, stroke: chartColors.background, strokeWidth: 2 }}
                      type="monotone"
                      filter="url(#glow-red)"
                    />
                    <Line
                      dataKey="ib_withdraw"
                      name="IB Withdraw"
                      stroke={chartColors.ibWithdraw}
                      strokeWidth={2.8}
                      dot={ibDot}
                      activeDot={{ r: 5, fill: chartColors.ibWithdraw, stroke: chartColors.background, strokeWidth: 2 }}
                      type="monotone"
                      filter="url(#glow-blue)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
                No transaction data available
              </div>
            )}
          </div>

          {/* bottom stat strip */}
          <div className="relative grid grid-cols-3 divide-x divide-border/60 border-t border-border/60">
            {[
              { label: "Deposit", color: chartColors.deposit, key: "deposit" as TransactionMetricKey },
              { label: "Withdraw", color: chartColors.withdraw, key: "withdraw" as TransactionMetricKey },
              { label: "IB Withdraw", color: chartColors.ibWithdraw, key: "ib_withdraw" as TransactionMetricKey },
            ].map(({ label, color, key }) => {
              const latest = transactionChartData[transactionChartData.length - 1];
              const val = latest ? Number(latest[key]) : 0;
              return (
                <div key={key} className="px-4 py-3 flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                  <div>
                    <p className="mb-1 text-[10px] leading-none text-muted-foreground">{label}</p>
                    <p className="text-[13px] leading-none font-bold text-foreground">{formatCurrency(val)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Client Growth Chart ── */}
      {clientsGraph && (
        <div className={cardBase}>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--foreground)/0.18) 1px,transparent 1px),linear-gradient(90deg,hsl(var(--foreground)/0.18) 1px,transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-48 w-96 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative p-6 pb-2">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
                  Client Growth
                </p>
                <div className="flex items-baseline gap-3">
                  <p className="text-4xl font-extrabold tracking-tight text-foreground">
                    {clientsSummary.total.toLocaleString()}
                  </p>
                  <GrowthBadge percent={clientsSummary.growthPercent} />
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {clientsGraph.start_date && clientsGraph.end_date
                    ? `${new Date(clientsGraph.start_date).toLocaleDateString()} – ${new Date(clientsGraph.end_date).toLocaleDateString()}`
                    : "New registrations"}
                </p>
              </div>
              <LegendPill color={chartColors.clients} label="Clients" />
            </div>

            {clientsChartData.length > 0 ? (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={clientsChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="clientGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColors.clients} stopOpacity={0.35} />
                        <stop offset="60%" stopColor={chartColors.clients} stopOpacity={0.08} />
                        <stop offset="100%" stopColor={chartColors.clients} stopOpacity={0} />
                      </linearGradient>
                      <filter id="glow-violet">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="4 0"
                      stroke={chartColors.grid}
                      opacity={0.35}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={chartTickStyle}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={chartTickStyle}
                      tickLine={false}
                      axisLine={false}
                      domain={clientsHasVariation ? ["auto", "auto"] : [-1, 1]}
                      width={36}
                    />
                    <Tooltip
                      content={(props) => <ClientTooltip {...props} color={chartColors.clients} />}
                      cursor={{ stroke: chartColors.grid, strokeWidth: 1, strokeDasharray: "4 4" }}
                    />
                    <Area
                      dataKey="clients"
                      name="Clients"
                      stroke={chartColors.clients}
                      strokeWidth={2.8}
                      fill="url(#clientGrad)"
                      dot={clientDot}
                      activeDot={{ r: 5, fill: chartColors.clients, stroke: chartColors.background, strokeWidth: 2 }}
                      type="monotone"
                      filter="url(#glow-violet)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
                No client data available
              </div>
            )}
          </div>

          {/* bottom stat strip */}
          <div className="relative border-t border-border/60">
            <div className="grid grid-cols-2 divide-x divide-border/60">
              {[
                {
                  label: "Total Registered",
                  value: clientsSummary.total.toLocaleString(),
                  icon: Users,
                  color: chartColors.clients,
                },
                {
                  label: "Growth",
                  value: `${clientsSummary.growthPercent >= 0 ? "+" : ""}${clientsSummary.growthPercent.toFixed(1)}%`,
                  icon: clientsSummary.growthPercent >= 0 ? TrendingUp : TrendingDown,
                  color: clientsSummary.growthPercent >= 0 ? chartColors.positive : chartColors.negative,
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="px-4 py-3 flex items-center gap-2.5">
                  <span
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                  </span>
                  <div>
                    <p className="mb-1 text-[10px] leading-none text-muted-foreground">{label}</p>
                    <p className="text-[13px] leading-none font-bold text-foreground">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
