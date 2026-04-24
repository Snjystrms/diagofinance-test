import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="mx-auto flex w-full max-w-none flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
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
  return (
    <section className="ib-portal-hero rounded-[28px] border px-6 py-6 sm:px-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="ib-portal-kicker inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em]">
            <Sparkles className="h-3.5 w-3.5" />
            {eyebrow}
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.15rem]">{title}</h1>
            {description ? (
              <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-3">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
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
    <Card className={cn("overflow-hidden rounded-[28px] border shadow-sm", accentStyles[accent], className)}>
      <CardContent className="flex h-full flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
            <div className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{value}</div>
          </div>
          {icon ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-background/80 text-foreground shadow-sm backdrop-blur-sm">
              {icon}
            </div>
          ) : null}
        </div>
        {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
        {footer ? <div className="mt-auto border-t border-border/50 pt-4 text-sm">{footer}</div> : null}
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
    <Card className={cn("ib-portal-surface rounded-[28px] border shadow-sm", className)}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold text-foreground">{title}</CardTitle>
          {description ? <CardDescription className="text-sm">{description}</CardDescription> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent className={cn("pt-0", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
