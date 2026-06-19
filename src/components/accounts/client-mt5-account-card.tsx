"use client";

import Image from "next/image";
import Link from "next/link";
import { type LucideIcon, CheckCircle2, Clock, Copy, DollarSign, MoreVertical, Wallet, XCircle, Zap } from "lucide-react";
import toast from "react-hot-toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ClientMt5AccountMenuAction = {
  icon: LucideIcon;
  label: string;
  onSelect: () => void;
};

export type ClientMt5AccountCardProps = {
  title: string;
  status: string | number | undefined;
  mode: string | undefined;
  currency?: string;
  accountId: string;
  mt5Login?: string | null;
  balance: number | string | null | undefined;
  balanceCurrency?: string;
  leverage?: number | string | null;
  spread?: number | string | null;
  server?: string | null;
  depositHref?: string;
  onDeposit?: () => void;
  menuActions?: ClientMt5AccountMenuAction[];
  className?: string;
};

function formatMode(value?: string) {
  return value?.toLowerCase().includes("demo") ? "DEMO" : "LIVE";
}

function normalizeCurrencyCode(value?: string) {
  if (!value) return "USD";

  const match = value.toUpperCase().match(/\b[A-Z]{3}\b/);
  if (match) {
    return match[0];
  }

  return "USD";
}

function formatBalance(value: number | string | null | undefined, currency: string) {
  const normalizedValue =
    value === undefined || value === null || Number.isNaN(Number(value)) ? 0 : Number(value);

  return `${normalizedValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function formatLeverage(value?: number | string | null) {
  if (value === undefined || value === null || `${value}`.trim() === "") {
    return "N/A";
  }

  const normalizedValue = String(value).trim();
  return normalizedValue.includes(":") ? normalizedValue : `1:${normalizedValue}`;
}

function getStatusBadge(status: string | number | undefined) {
  const normalizedStatus = String(status ?? "").toLowerCase();
  const isActive =
    status === 1 ||
    normalizedStatus === "1" ||
    normalizedStatus === "live" ||
    normalizedStatus === "active";
  const isPending =
    status === 0 ||
    normalizedStatus === "0" ||
    normalizedStatus === "pending" ||
    normalizedStatus === "inactive";

  if (isActive) {
    return (
      <Badge className="shrink-0 border-0 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Active
      </Badge>
    );
  }

  if (isPending) {
    return (
      <Badge className="shrink-0 border-0 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
        <Clock className="mr-1 h-3 w-3" />
        Pending
      </Badge>
    );
  }

  return (
    <Badge className="shrink-0 border-0 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
      <XCircle className="mr-1 h-3 w-3" />
      {normalizedStatus ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1) : "Unknown"}
    </Badge>
  );
}

function copyToClipboard(value: string, label: string) {
  navigator.clipboard.writeText(value);
  toast.success(`${label} copied to clipboard!`);
}

function AccountValue({
  icon: Icon,
  label,
  value,
  copyLabel,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  copyLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/40 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-xl border border-border/60 bg-background/80 px-3 py-2.5 font-mono text-xs font-medium text-foreground sm:text-sm">
          {value}
        </code>
        {copyLabel ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-xl border-border/70 bg-background/80"
            onClick={() => copyToClipboard(value, copyLabel)}
          >
            <Copy className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ClientMt5AccountCard({
  title,
  status,
  mode,
  currency,
  accountId,
  mt5Login,
  balance,
  balanceCurrency,
  leverage,
  spread,
  server,
  depositHref,
  onDeposit,
  menuActions = [],
  className,
}: ClientMt5AccountCardProps) {
  const normalizedCurrency = normalizeCurrencyCode(balanceCurrency ?? currency);
  const accountMode = formatMode(mode);

  return (
    <Card
      className={cn(
        "group h-full border border-border/60 bg-card shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg",
        className
      )}
    >
      <CardContent className="flex h-full flex-col p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-primary/10 text-lg font-bold text-primary shadow-sm transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/metatrader-5.svg"
                alt="MetaTrader 5"
                width={48}
                height={48}
                className="h-full w-full object-contain p-1.5"
                priority={false}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <h3 className="break-words text-lg font-bold leading-snug text-foreground">{title}</h3>
              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge(status)}
                <Badge variant="outline" className="border-border text-xs">
                  {accountMode}
                </Badge>
                <span className="text-xs text-muted-foreground">{normalizedCurrency}</span>
              </div>
            </div>
          </div>

          {menuActions.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {menuActions.map((action) => {
                  const ActionIcon = action.icon;

                  return (
                    <DropdownMenuItem key={action.label} onClick={action.onSelect} className="cursor-pointer">
                      <ActionIcon className="mr-2 h-4 w-4" />
                      {action.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        <div className="mb-5 space-y-3">
          {/* <AccountValue icon={Wallet} label="Account ID" value={accountId} copyLabel="Account ID" /> */}
          {mt5Login ? <AccountValue icon={Zap} label="MT5 Login" value={mt5Login} copyLabel="MT5 login" /> : null}
          {server ? <AccountValue icon={Zap} label="Server" value={server} copyLabel="Server" /> : null}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/30 p-3.5">
            <span className="text-sm font-medium text-foreground">Balance</span>
            <span className="truncate text-right font-bold text-primary">
              {formatBalance(balance, normalizedCurrency)}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/30 p-3.5">
              {/* <div className="space-y-1"> */}
                <span className="text-xs text-muted-foreground">Leverage</span>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Zap className="h-3 w-3 text-primary" />
                  {formatLeverage(leverage)}
                {/* </div> */}
              </div>
            </div>
            {/* <div className="rounded-xl border border-border/30 bg-muted/20 p-3">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Spread</span>
                <div className="text-sm font-semibold text-foreground">
                  {spread ?? "N/A"}
                </div>
              </div>
            </div> */}
          </div>
        </div>

        <div className="mt-auto pt-5">
          {depositHref ? (
            <Button
              size="sm"
              variant="outline"
              className="h-10 w-full border-border bg-background hover:bg-accent hover:text-accent-foreground"
              asChild
            >
              <Link href={depositHref}>
                <DollarSign className="mr-1.5 h-4 w-4 shrink-0" />
                Deposit Funds
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-10 w-full border-border bg-background hover:bg-accent hover:text-accent-foreground"
              onClick={onDeposit}
              disabled={!onDeposit}
            >
              <DollarSign className="mr-1.5 h-4 w-4 shrink-0" />
              Deposit Funds
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
