"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ThemePillProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  tone?: "default" | "subtle" | "reverse";
}

export function ThemePill({
  icon,
  tone = "default",
  className,
  children,
  ...props
}: ThemePillProps) {
  return (
    <div
      data-tone={tone}
      className={cn(
        "ib-theme-pill inline-flex items-center gap-2 border px-3 py-1.5 backdrop-blur-md",
        className
      )}
      {...props}
    >
      {icon ? <span className="shrink-0">{icon}</span> : null}
      {children}
    </div>
  );
}
