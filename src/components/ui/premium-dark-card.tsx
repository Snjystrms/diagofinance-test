"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const PREMIUM_RADIAL_BG =
  "radial-gradient(140% 120% at 90% 105%, #ff4a1f 0%, #e8330f 10%, #8a1608 26%, #2b0803 44%, transparent 62%), #050505";

const PREMIUM_NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.15' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='1.4' intercept='0'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function PremiumDarkLayers() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: PREMIUM_RADIAL_BG }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: PREMIUM_NOISE_BG,
          backgroundSize: "180px 180px",
          mixBlendMode: "screen" as React.CSSProperties["mixBlendMode"],
          opacity: 0.22,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" }}
      />
    </>
  );
}

type PremiumDarkCardProps = React.HTMLAttributes<HTMLDivElement> & {
  innerClassName?: string;
};

export function PremiumDarkCard({
  className,
  innerClassName,
  children,
  ...props
}: PremiumDarkCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[28px] border border-white/5 bg-[#050505]",
        className
      )}
      {...props}
    >
      <PremiumDarkLayers />
      <div className={cn("relative z-10", innerClassName)}>{children}</div>
    </div>
  );
}
