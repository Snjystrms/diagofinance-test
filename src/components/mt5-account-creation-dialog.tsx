"use client";

import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, BarChart2, Globe2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientCustomization } from "@/contexts/client-customization-context";
import { getDashboardThemeArtwork } from "@/components/theme-customizer";

interface Mt5AccountCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateAccount?: () => void;
  onSkip?: () => void;
}

const FEATURES = [
  {
    icon: Globe2,
    label: "Global Markets",
    desc: "Forex, indices, commodities & crypto",
  },
  {
    icon: BarChart2,
    label: "Advanced Charting",
    desc: "30+ indicators & 21 timeframes",
  },
  {
    icon: Zap,
    label: "Lightning Execution",
    desc: "Ultra-low latency order routing",
  },
];

// Subtle animated candlestick bars for the header decoration
const CANDLES = [
  { x: 6, bodyH: 22, bodyY: 14, wickT: 8, wickB: 40, bull: true },
  { x: 18, bodyH: 14, bodyY: 22, wickT: 16, wickB: 40, bull: false },
  { x: 30, bodyH: 28, bodyY: 8, wickT: 4, wickB: 40, bull: true },
  { x: 42, bodyH: 10, bodyY: 26, wickT: 20, wickB: 40, bull: false },
  { x: 54, bodyH: 20, bodyY: 12, wickT: 6, wickB: 36, bull: true },
  { x: 66, bodyH: 32, bodyY: 4, wickT: 2, wickB: 40, bull: true },
  { x: 78, bodyH: 12, bodyY: 20, wickT: 14, wickB: 36, bull: false },
  { x: 90, bodyH: 24, bodyY: 10, wickT: 6, wickB: 38, bull: true },
];

export function Mt5AccountCreationDialog({
  open,
  onOpenChange,
  onCreateAccount,
  onSkip,
}: Mt5AccountCreationDialogProps) {
  const { themePairId, themeMode } = useClientCustomization();
  const dashboardThemeArtwork = getDashboardThemeArtwork(themePairId, themeMode);

  const handleCreateAccount = () => {
    onOpenChange(false);
    onCreateAccount?.();
  };

  const handleSkip = () => {
    onOpenChange(false);
    onSkip?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ib-portal-surface sm:max-w-md overflow-hidden rounded-[28px] border p-0 shadow-2xl gap-0">
        {/* ── Header ── */}
        <div className="ib-portal-hero relative overflow-hidden border-b border-border/50 px-6 pt-6 pb-7">
          {dashboardThemeArtwork ? (
            <div
              className={cn(
                "dashboard-theme-overlay dashboard-theme-welcome-overlay opacity-20",
                `theme-art-${dashboardThemeArtwork}`,
              )}
            />
          ) : null}
          {/* Candlestick chart decoration */}
          <svg
            className="pointer-events-none absolute inset-x-0 bottom-0 z-0 w-full opacity-[0.14]"
            viewBox="0 0 100 44"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {CANDLES.map((c, i) => (
              <g key={i}>
                {/* Wick */}
                <line
                  x1={c.x + 4}
                  y1={c.wickT}
                  x2={c.x + 4}
                  y2={c.bodyY}
                  stroke={c.bull ? "var(--primary)" : "var(--destructive)"}
                  strokeWidth="0.8"
                />
                <line
                  x1={c.x + 4}
                  y1={c.bodyY + c.bodyH}
                  x2={c.x + 4}
                  y2={c.wickB}
                  stroke={c.bull ? "var(--primary)" : "var(--destructive)"}
                  strokeWidth="0.8"
                />
                {/* Body */}
                <rect
                  x={c.x}
                  y={c.bodyY}
                  width={8}
                  height={c.bodyH}
                  rx="1"
                  fill={c.bull ? "var(--primary)" : "var(--destructive)"}
                />
              </g>
            ))}
          </svg>

          {/* Glow orbs */}
          <div className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-28 w-28 rounded-full bg-accent/10 blur-2xl" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-70" />

          <div className="relative z-10 flex items-start gap-4">
            {/* Icon */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25">
              <TrendingUp className="h-5 w-5" strokeWidth={2.5} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="ib-portal-kicker inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
                  MetaTrader 5
                </span>
                <span className="h-1 w-1 rounded-full bg-primary/40" />
                <span className="text-[10px] tracking-widest uppercase text-muted-foreground/80">
                  Diago Finance
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground tracking-tight leading-tight">
                Open Your Trading Account
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Access global markets in minutes — no delays.
              </p>
            </div>
          </div>
        </div>

        {/* ── Feature List ── */}
        <div className="bg-background px-5 pt-5 pb-4 space-y-3">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="group flex items-center gap-3.5 rounded-xl border border-border/60 bg-card px-4 py-3 transition-all duration-200 hover:border-primary/30 hover:bg-primary/[0.03]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-none mb-0.5">
                  {label}
                </p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <span className="h-1.5 w-1.5 rounded-full bg-accent opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          ))}

          {/* CTA block */}
          <div className="relative mt-1 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/8 to-transparent p-4">
            <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your MT5 account gives you access to{" "}
              <span className="text-foreground font-medium">
                1000+ instruments
              </span>
              , real-time data, and one-click execution — all within the
              vinnexia platform.
            </p>
          </div>
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="px-5 py-4 border-t border-border/60 bg-muted/30 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            I&apos;ll do this later
          </Button>
          <Button
            onClick={handleCreateAccount}
            className="gap-2 text-sm font-semibold shadow-md shadow-primary/20"
          >
            Create MT5 Account
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
