"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, Copy, Mail, User, Wallet, Zap } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { type UserMT5AccountDetail, userMT5AccountsApi } from "@/lib/api";

type AccountSummary = {
  id: number;
  account_id: string;
  mt5_id?: string | null;
  name?: string | null;
  email?: string | null;
  balance?: number | null;
};

function formatMode(value?: string) {
  return value?.toLowerCase() === "demo" ? "DEMO" : "LIVE";
}

function normalizeCurrencyCode(value?: string) {
  if (!value) return "USD";

  const match = value.toUpperCase().match(/\b[A-Z]{3}\b/);
  if (match) {
    return match[0];
  }

  const trimmed = value.trim().toUpperCase();
  return trimmed.length >= 3 ? trimmed.slice(0, 3) : "USD";
}

function formatTradingAmount(amount: number | string | null | undefined, currency: string) {
  const normalizedAmount =
    amount === undefined || amount === null || Number.isNaN(Number(amount))
      ? 0
      : Number(amount);

  return `${currency} ${normalizedAmount.toFixed(2)}`;
}

type DetailWithRuntimeMetrics = UserMT5AccountDetail & {
  equity?: string | number;
  free_margin?: string | number;
};

function StatusBadge({ status }: { status?: string | number }) {
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
    return <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-300">Active</span>;
  }

  if (isPending) {
    return <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-300">Pending</span>;
  }

  return (
    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {normalizedStatus ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1) : "Unknown"}
    </span>
  );
}

function InfoMetric({
  label,
  value,
  className = "",
  valueClassName = "",
}: {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={`rounded-lg bg-white/40 p-3 dark:bg-black/10 ${className}`}>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold text-foreground ${valueClassName}`}>{value}</div>
    </div>
  );
}

export function ClientMt5AccountDetailsDialog({
  open,
  onOpenChange,
  account,
  initialDetail = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AccountSummary | null;
  initialDetail?: UserMT5AccountDetail | null;
}) {
  const { token } = useAuth();
  const [detail, setDetail] = useState<UserMT5AccountDetail | null>(initialDetail);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const detailMetrics = detail as DetailWithRuntimeMetrics | null;
  const currency = normalizeCurrencyCode(detail?.base_currency);
  const accountTypeName = detail?.accountType?.name ?? "MT5 Account";
  const balanceValue = formatTradingAmount(account?.balance, currency);
  const equityValue = formatTradingAmount(detailMetrics?.equity, currency);
  const freeMarginValue = formatTradingAmount(detailMetrics?.free_margin, currency);
  const leverageValue = detail?.leverage ? `1:${detail.leverage}` : "N/A";
  const mt5Mode = formatMode(detail?.account_mode);
  const groupName = detail?.group?.name ?? detail?.mt5_group_name ?? "N/A";
  const accountHolder = detail?.name ?? account?.name ?? "N/A";
  const emailValue = detail?.email ?? account?.email ?? "N/A";
  const mt5Login = account?.mt5_id ?? "N/A";

  useEffect(() => {
    setDetail(initialDetail);
  }, [initialDetail, account?.id]);

  useEffect(() => {
    if (!open || !account?.id || detail || !token) {
      return;
    }

    let active = true;

    const loadDetail = async () => {
      try {
        setIsLoadingDetail(true);
        const response = await userMT5AccountsApi.getById(account.id, token);
        if (active) {
          setDetail(response.data?.mt5_account ?? null);
        }
      } catch (error) {
        console.error(`Failed to load MT5 account detail for ${account.id}:`, error);
      } finally {
        if (active) {
          setIsLoadingDetail(false);
        }
      }
    };

    void loadDetail();

    return () => {
      active = false;
    };
  }, [account?.id, detail, open, token]);

  const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[82vh] overflow-hidden border border-border/70 bg-card/95 p-0 shadow-xl sm:max-w-4xl">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
            MT5 Account Details
          </DialogTitle>
          <DialogDescription>
            Review login, account metadata, and runtime trading metrics for this MT5 account.
          </DialogDescription>
        </DialogHeader>

        {!account ? (
          <div className="px-6 py-6 text-sm text-muted-foreground">No account details available.</div>
        ) : isLoadingDetail && !detail ? (
          <div className="px-6 py-6">
            <Card className="overflow-hidden border border-border/60 bg-gradient-to-br from-card to-muted/20 shadow-sm">
              <CardContent className="space-y-6 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-7 w-48" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                    </div>
                  </div>
                  <Skeleton className="h-9 w-28 rounded-lg" />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-h-[calc(82vh-9rem)] overflow-y-auto px-6 py-6">
            <Card className="overflow-hidden border border-border/60 bg-gradient-to-br from-card to-muted/20 shadow-sm">
              <CardHeader className="space-y-6 border-b border-border/60 bg-transparent p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-sm">
                      5
                    </div>
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg font-bold text-foreground">
                          {accountTypeName}
                        </CardTitle>
                        <StatusBadge status={detail?.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-border/70 bg-background px-2.5 py-1 text-xs font-medium">
                          {mt5Mode}
                        </span>
                        <span className="text-xs text-muted-foreground">{groupName}</span>
                      </div>
                    </div>
                  </div>
                  <span className="rounded-md border border-border/70 bg-background px-3 py-1.5 text-sm font-medium text-foreground">
                    MT5
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 p-6">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-white/60 p-3 dark:bg-black/20">
                    <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Wallet className="h-3 w-3" />
                      Account ID
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="break-all text-sm font-semibold">{account.account_id}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => copyToClipboard(account.account_id, "Account ID")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg bg-white/60 p-3 dark:bg-black/20">
                    <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <BarChart3 className="h-3 w-3" />
                      MT5 Login
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="break-all text-sm font-semibold">{mt5Login}</code>
                      {account.mt5_id ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => copyToClipboard(mt5Login, "MT5 login")}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <InfoMetric label="Balance" value={balanceValue} valueClassName="text-primary" />
                  <InfoMetric label="Equity" value={equityValue} />
                  <InfoMetric label="Free Margin" value={freeMarginValue} />
                  <InfoMetric label="Leverage" value={leverageValue} />
                  <InfoMetric label="Account Holder" value={accountHolder} />
                  <InfoMetric label="Email" value={emailValue} valueClassName="break-all" />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg bg-white/40 p-3 dark:bg-black/10">
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Zap className="h-3.5 w-3.5 text-orange-500" />
                      Platform
                    </div>
                    <div className="text-sm font-semibold">MetaTrader 5</div>
                  </div>
                  <div className="rounded-lg bg-white/40 p-3 dark:bg-black/10">
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      Mode
                    </div>
                    <div className="text-sm font-semibold">{mt5Mode}</div>
                  </div>
                  <div className="rounded-lg bg-white/40 p-3 dark:bg-black/10">
                    <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      Group
                    </div>
                    <div className="text-sm font-semibold">{groupName}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="gap-3 border-t border-border/60 px-6 py-5 sm:justify-between">
          <Button variant="outline" className="rounded-xl" asChild>
            <Link href="/my_accounts/open-trading-account">Open Another Account</Link>
          </Button>
          <Button className="rounded-xl" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
