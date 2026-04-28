"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="whitespace-nowrap text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
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
      <DialogContent className="max-h-[82vh] max-w-2xl overflow-y-auto rounded-2xl border border-border/70 p-0">
        <DialogHeader>
          <div className="px-6 pt-6">
            <DialogTitle className="text-3xl font-semibold tracking-tight text-foreground">
              MT5 Account Details
            </DialogTitle>
          </div>
        </DialogHeader>

        {!account ? (
          <div className="px-6 py-6 text-sm text-muted-foreground">No account details available.</div>
        ) : isLoadingDetail && !detail ? (
          <div className="px-6 pb-4">
          <Card className="overflow-hidden rounded-2xl border border-border/60">
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <Skeleton className="h-8 w-40" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
              <div className="grid gap-4 border-t border-border/60 pt-6 md:grid-cols-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>
          </div>
        ) : (
          <div className="px-6 pb-4">
          <Card className="overflow-hidden rounded-2xl border border-sky-100 bg-sky-50/40 shadow-sm">
            <CardHeader className="space-y-6 bg-sky-50/50 p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-4">
                  <CardTitle className="max-w-[18ch] text-2xl font-semibold leading-tight text-sky-900 sm:text-3xl">
                    {accountTypeName}
                  </CardTitle>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-sky-700">Account ID</div>
                      <div className="flex items-center gap-2">
                        <code className="break-all text-2xl font-semibold tracking-tight text-sky-600 sm:text-3xl">
                          {account.account_id}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 rounded-full text-sky-600 hover:bg-sky-100 hover:text-sky-700"
                          onClick={() => copyToClipboard(account.account_id, "Account ID")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-sky-700">Available Balance</div>
                      <div className="whitespace-nowrap text-2xl font-semibold tracking-tight text-sky-600 sm:text-3xl">
                        {balanceValue}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 lg:max-w-[220px] lg:justify-end">
                  <StatusBadge status={detail?.status} />
                  <span className="rounded-md border border-sky-200 bg-white px-4 py-1.5 text-sm font-medium text-sky-900">
                    MT5
                  </span>
                  <span className="rounded-md border border-amber-400/70 bg-white px-4 py-1.5 text-sm font-medium text-amber-600">
                    {mt5Mode}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="grid gap-6 bg-white/65 p-6 md:grid-cols-3">
              <InfoMetric
                label="Free Margin"
                value={freeMarginValue}
                className="md:border-r md:border-sky-100 md:pr-6"
              />
              <InfoMetric
                label="Equity"
                value={equityValue}
                className="md:border-r md:border-sky-100 md:px-2"
              />
              <InfoMetric label="Leverage" value={leverageValue} className="md:pl-2" />
            </CardContent>
          </Card>
          </div>
        )}

        <DialogFooter className="px-6 pb-6 sm:justify-between">
          <Button variant="outline" className="rounded-xl border-sky-200 text-sky-800 hover:bg-sky-50 hover:text-sky-900" asChild>
            <Link href="/my_accounts/open-trading-account">Open Another Account</Link>
          </Button>
          <Button className="rounded-xl bg-sky-600 hover:bg-sky-700" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
