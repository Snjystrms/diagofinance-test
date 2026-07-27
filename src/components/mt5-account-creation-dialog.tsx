"use client";

import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, BarChart2, Globe2, Zap } from "lucide-react";

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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl gap-0">
        {/* ── Header ── */}
        <div className="relative overflow-hidden bg-[#0B1220] px-6 pt-6 pb-7">
          {/* Candlestick chart decoration */}
          <svg
            className="absolute bottom-0 inset-x-0 w-full opacity-[0.12] pointer-events-none"
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
                  stroke={c.bull ? "#FFB401" : "#ef4444"}
                  strokeWidth="0.8"
                />
                <line
                  x1={c.x + 4}
                  y1={c.bodyY + c.bodyH}
                  x2={c.x + 4}
                  y2={c.wickB}
                  stroke={c.bull ? "#FFB401" : "#ef4444"}
                  strokeWidth="0.8"
                />
                {/* Body */}
                <rect
                  x={c.x}
                  y={c.bodyY}
                  width={8}
                  height={c.bodyH}
                  rx="1"
                  fill={c.bull ? "#FFB401" : "#ef4444"}
                />
              </g>
            ))}
          </svg>

          {/* Glow orbs */}
          <div className="absolute -right-6 -top-6 w-36 h-36 rounded-full bg-[#FFB401]/10 blur-2xl pointer-events-none" />
          <div className="absolute left-0 bottom-0 w-28 h-28 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
          {/* Bottom gold line */}
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFB401] to-transparent opacity-70" />

          <div className="relative flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFB401] to-[#f97316] flex items-center justify-center shadow-lg shadow-[#FFB401]/30">
              <TrendingUp className="h-5 w-5 text-black" strokeWidth={2.5} />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#FFB401]">
                  MetaTrader 5
                </span>
                <span className="w-1 h-1 rounded-full bg-[#FFB401]/40" />
                <span className="text-[10px] tracking-widest uppercase text-white/35">
                  Diago Finance
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight leading-tight">
                Open Your Trading Account
              </h2>
              <p className="text-sm text-white/50 mt-1 leading-relaxed">
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
              className="flex items-center gap-3.5 rounded-xl border border-border/60 bg-card px-4 py-3
                hover:border-[#FFB401]/30 hover:bg-[#FFB401]/[0.03] transition-all duration-200 group"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#FFB401]/10 border border-[#FFB401]/20 flex items-center justify-center">
                <Icon className="h-4 w-4 text-[#FFB401]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-none mb-0.5">
                  {label}
                </p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}

          {/* CTA block */}
          <div className="relative rounded-xl border border-[#FFB401]/25 bg-gradient-to-br from-[#FFB401]/8 to-transparent p-4 mt-1">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#FFB401]/5 to-transparent pointer-events-none" />
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
            className="bg-[#FFB401] hover:bg-[#FFB401]/90 text-black font-semibold text-sm gap-2 shadow-md shadow-[#FFB401]/20"
          >
            Create MT5 Account
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
