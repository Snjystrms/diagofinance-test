"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Mail, User, Wallet } from "lucide-react";
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
import { formatCurrency } from "@/lib/format";
import { formatDateTimeInIST } from "@/lib/formatters";

type AccountSummary = {
  id: number;
  account_id: string;
  mt5_id?: string | null;
  name?: string | null;
  email?: string | null;
  balance?: number | null;
};

function formatDateTime(value?: string) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return formatDateTimeInIST(value);
}

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
      <DialogContent className="max-h-[82vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{detail?.accountType?.name ?? "MT5 Account Details"}</DialogTitle>
          <DialogDescription>
            Review the MT5 account credentials and metadata returned by the account management APIs.
          </DialogDescription>
        </DialogHeader>

        {!account ? (
          <div className="py-6 text-sm text-muted-foreground">No account details available.</div>
        ) : isLoadingDetail && !detail ? (
          <div className="grid gap-3 py-1 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="px-4 pb-2 pt-4">
                  <Skeleton className="h-5 w-28" />
                </CardHeader>
                <CardContent className="space-y-2 px-4 pb-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 py-1 md:grid-cols-2">
            <Card>
              <CardHeader className="px-4 pb-2 pt-4">
                <CardTitle className="text-base">Identity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{detail?.name ?? account.name ?? "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="break-all">{detail?.email ?? account.email ?? "N/A"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">Mobile</span>
                  <span>{detail?.mobile ?? "N/A"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={detail?.status} />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">Mode</span>
                  <span className="font-medium uppercase">{detail?.account_mode ?? "live"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-4 pb-2 pt-4">
                <CardTitle className="text-base">Credentials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4 text-sm">
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <div className="mb-1 text-xs text-muted-foreground">Account ID</div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-semibold">{account.account_id}</code>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(account.account_id, "Account ID")}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <div className="mb-1 text-xs text-muted-foreground">MT5 Login</div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-semibold">{detail?.mt5_id ?? account.mt5_id ?? "N/A"}</code>
                    {detail?.mt5_id ?? account.mt5_id ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(String(detail?.mt5_id ?? account.mt5_id), "MT5 login")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">Platform</span>
                  <span className="font-medium">MT5</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">Group</span>
                  <span className="break-all text-right">{detail?.group?.mt5_group_name ?? detail?.mt5_group_name ?? "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-4 pb-2 pt-4">
                <CardTitle className="text-base">Trading Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">Balance</span>
                  <span>{formatCurrency(Number(account.balance ?? 0), detail?.base_currency ?? "USD")}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">Account Type</span>
                  <span className="text-right">{detail?.accountType?.name ?? "N/A"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">Leverage</span>
                  <span>{detail?.leverage ? `1:${detail.leverage}` : "N/A"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">Spread From</span>
                  <span>{detail?.spread_from ?? "N/A"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">Maximum Leverage</span>
                  <span className="text-right">{detail?.maximum_leverage ?? "N/A"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">Base Currency</span>
                  <span>{detail?.base_currency ?? "N/A"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">Minimum Deposit</span>
                  <span>{detail?.minimum_deposit ?? "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-4 pb-2 pt-4">
                <CardTitle className="text-base">Audit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-right">{formatDateTime(detail?.created_at)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">Updated</span>
                  <span className="text-right">{formatDateTime(detail?.updated_at)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">Stop Out Level</span>
                  <span>{detail?.stop_out_level ?? "N/A"}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                  <span className="text-muted-foreground">Swap Free</span>
                  <span>{detail?.swap_free_option ? "Enabled" : "Disabled"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" asChild>
            <Link href="/my_accounts/open-trading-account">Open Another Account</Link>
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
