"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const PREMIUM_RADIAL_BG =
  "radial-gradient(140% 120% at 90% 105%, #ffd9c9 0%, #ffe9de 14%, #fff4ee 30%, #fbfaf9 46%, transparent 62%), #fbfaf9";

const PREMIUM_BORDER_GRADIENT =
  "linear-gradient(#fbfaf9, #fbfaf9) padding-box, linear-gradient(100.15deg, #fde8e8 -5.5%, #b10430 56.77%, #fde8e8 111.96%) border-box";

const PREMIUM_NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.15' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='1.4' intercept='0'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function PremiumBrightLayers() {
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
          mixBlendMode: "multiply" as React.CSSProperties["mixBlendMode"],
          opacity: 0.1,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}
      />
    </>
  );
}

type PremiumBrightCardProps = React.HTMLAttributes<HTMLDivElement> & {
  innerClassName?: string;
};

export function PremiumBrightCard({
  className,
  innerClassName,
  children,
  ...props
}: PremiumBrightCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[28px]",
        className
      )}
      style={{ border: "1px solid transparent", background: PREMIUM_BORDER_GRADIENT }}
      {...props}
    >
      <PremiumBrightLayers />
      <div className={cn("relative z-10", innerClassName)}>{children}</div>
    </div>
  );
}