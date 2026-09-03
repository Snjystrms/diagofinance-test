"use client";

import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemePill } from "@/components/ui/theme-pill";
import { PremiumDarkCard, PremiumDarkLayers } from "@/components/ui/premium-dark-card";
import { getDashboardThemeArtwork } from "@/components/theme-customizer";
import { useClientCustomization } from "@/contexts/client-customization-context";
import { cn } from "@/lib/utils";

interface IbPageShellProps {
  children: ReactNode;
  className?: string;
}

interface IbPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

interface IbMetricCardProps {
  title: string;
  value: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  accent?: "primary" | "emerald" | "amber" | "slate";
  footer?: ReactNode;
  className?: string;
}

interface IbSectionCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

const accentStyles: Record<NonNullable<IbMetricCardProps["accent"]>, string> = {
  primary:
    "ib-portal-surface ib-portal-surface-primary",
  emerald:
    "ib-portal-surface ib-portal-surface-emerald",
  amber:
    "ib-portal-surface ib-portal-surface-amber",
  slate:
    "ib-portal-surface",
};

export function IbPageShell({ children, className }: IbPageShellProps) {
  return (
    <div className={cn("ib-portal-shell min-h-full w-full bg-background", className)}>
      <div className="mx-auto flex w-full max-w-none flex-col gap-4 sm:gap-6 px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </div>
    </div>
  );
}

export function IbPageHeader({
  eyebrow = "IB Workspace",
  title,
  description,
  actions,
}: IbPageHeaderProps) {
  const { themePairId, themeMode } = useClientCustomization();
  const dashboardThemeArtwork = getDashboardThemeArtwork(themePairId, themeMode);

  return (
    <>
      {/* Desktop: original themed hero — falls back to dark premium when no artwork */}
      <section
        className={`hidden xl:block rounded-[20px] sm:rounded-[28px] border px-4 py-5 sm:px-7 sm:py-6 ${
          dashboardThemeArtwork
            ? "ib-portal-hero ib-dash-artwork-surface"
            : "premium-dark-border group relative overflow-hidden border-white/5 bg-[#050505]"
        }`}
      >
        {dashboardThemeArtwork ? (
          <div
            className={`dashboard-theme-overlay dashboard-theme-welcome-overlay theme-art-${dashboardThemeArtwork}`}
          />
        ) : (
          <PremiumDarkLayers />
        )}
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <ThemePill
              icon={<Sparkles className="h-3.5 w-3.5" />}
              className={`rounded-full text-xs font-semibold uppercase tracking-[0.22em] ${
                dashboardThemeArtwork
                  ? ""
                  : "border border-white/10 bg-white/5 text-white/80 backdrop-blur-[6px]"
              }`}
            >
              {eyebrow}
            </ThemePill>
            <div className="space-y-1">
              <h1
                className={`text-3xl font-semibold tracking-tight sm:text-[2.15rem] ${
                  dashboardThemeArtwork ? "text-zinc-50" : "text-white"
                }`}
              >
                {title}
              </h1>
              {description ? (
                <p
                  className={`max-w-3xl text-sm sm:text-base ${
                    dashboardThemeArtwork ? "text-zinc-50/80" : "text-white/45"
                  }`}
                >
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
      </section>

      {/* Mobile / narrow: premium dark backup — visible below xl */}
      {/* Mirrors dashboard-page-content.tsx header pattern: hidden xl:block + block xl:hidden */}
      <section className="block xl:hidden">
        <PremiumDarkCard
          className="rounded-[20px] sm:rounded-[28px] px-4 py-5 sm:px-7 sm:py-6"
          aria-label={eyebrow}
        >
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <ThemePill
                icon={<Sparkles className="h-3.5 w-3.5" />}
                className="rounded-full border border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur-[6px]"
              >
                {eyebrow}
              </ThemePill>
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-[-0.01em] text-white sm:text-[2.15rem]">
                  {title}
                </h1>
                {description ? (
                  <p className="max-w-3xl text-sm text-white/45 sm:text-base">{description}</p>
                ) : null}
              </div>
            </div>
            {actions ? (
              <div className="flex flex-wrap items-center gap-3 [&_button]:!border-white/15 [&_button]:!bg-white/[0.06] [&_button]:!text-white/90 [&_button]:backdrop-blur-[6px]">
                {actions}
              </div>
            ) : null}
          </div>
        </PremiumDarkCard>
      </section>
    </>
  );
}

export function IbMetricCard({
  title,
  value,
  description,
  icon,
  accent = "slate",
  footer,
  className,
}: IbMetricCardProps) {
  return (
    <Card className={cn("overflow-hidden rounded-[20px] sm:rounded-[28px] border shadow-sm", accentStyles[accent], className)}>
      <CardContent className="flex h-full flex-col gap-4 p-4 sm:gap-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0 space-y-1.5 sm:space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
            <div className="break-all text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-3xl">{value}</div>
          </div>
          {icon ? (
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border border-border/60 bg-background/80 text-foreground shadow-sm backdrop-blur-sm">
              {icon}
            </div>
          ) : null}
        </div>
        {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
        {footer ? <div className="mt-auto border-t border-border/50 pt-3 sm:pt-4 text-sm">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

export function IbSectionCard({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: IbSectionCardProps) {
  return (
    <Card className={cn("ib-portal-surface rounded-[20px] sm:rounded-[28px] border shadow-sm", className)}>
      <CardHeader className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold text-foreground sm:text-xl">{title}</CardTitle>
          {description ? <CardDescription className="text-sm">{description}</CardDescription> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">{actions}</div> : null}
      </CardHeader>
      <CardContent className={cn("p-4 pt-0 sm:p-6 sm:pt-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
