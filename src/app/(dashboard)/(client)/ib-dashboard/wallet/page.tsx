"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { ApiErrorState } from "@/components/errors/api-error-state";
import { IbMetricCard, IbPageHeader, IbPageShell, IbSectionCard } from "@/components/ib/ib-page-primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { type IbWalletData, ibRequestsApi, type IbInternalTransferWalletTransaction } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { formatDateTimeInIST } from "@/lib/formatters";
import { getIbWalletSnapshot, normalizeIbWalletData } from "@/lib/ib";

function WalletLoadingState() {
  return (
    <IbPageShell>
      <section className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-10 w-64 rounded-full" />
          <Skeleton className="h-4 w-full max-w-xl rounded-full" />
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
            <div className="space-y-4">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-8 w-36 rounded-full" />
              <Skeleton className="h-4 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </IbPageShell>
  );
}

function getStatusBadge(status?: string) {
  if (!status) {
    return <Badge variant="outline">Unknown</Badge>;
  }

  const normalized = status.toLowerCase();

  if (["completed", "success", "approved"].includes(normalized)) {
    return <Badge className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{status}</Badge>;
  }

  if (["pending", "processing"].includes(normalized)) {
    return <Badge className="border-0 bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">{status}</Badge>;
  }

  if (["failed", "rejected", "cancelled"].includes(normalized)) {
    return <Badge className="border-0 bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{status}</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
}

function getDirection(type?: string) {
  const normalized = type?.toLowerCase() ?? "";
  const isOutflow =
    normalized.includes("withdrawal") ||
    normalized.includes("debit") ||
    normalized.includes("transfer");

  return {
    isOutflow,
    icon: isOutflow ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />,
    tone: isOutflow
      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
  };
}

function PaginationControls({
  pagination,
  isLoading,
  onPageChange,
}: {
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  isLoading: boolean;
  onPageChange: (page: number) => void;
}) {
  if (pagination.total_pages <= 1) return null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
      <div className="text-sm text-muted-foreground">
        Showing {(pagination.current_page - 1) * pagination.per_page + 1}–
        {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of {pagination.total} results
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.current_page - 1)}
          disabled={pagination.current_page === 1 || isLoading}
        >
          Previous
        </Button>
        {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === pagination.total_pages || Math.abs(p - pagination.current_page) <= 1)
          .map((p, idx, arr) => (
            <div key={p} className="flex items-center gap-2">
              {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-muted-foreground">…</span>}
              <Button
                variant={p === pagination.current_page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(p)}
                disabled={isLoading}
                className="min-w-[2.5rem]"
              >
                {p}
              </Button>
            </div>
          ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pagination.current_page + 1)}
          disabled={pagination.current_page === pagination.total_pages || isLoading}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function IbWalletPage() {
  const { token } = useAuth();
  const [walletData, setWalletData] = useState<IbWalletData | null>(null);
  const [transactions, setTransactions] = useState<IbInternalTransferWalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    total_pages: 1,
  });

  const fetchWalletData = useCallback(async () => {
    if (!token) {
      setError("Authentication required");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const [walletResponse, transactionsResponse] = await Promise.all([
        ibRequestsApi.getIbWallet(token),
        ibRequestsApi.getIbWalletTransactions(token, { page, limit: 10 })
      ]);

      const normalized = normalizeIbWalletData(walletResponse?.data);

      if (normalized) {
        setWalletData(normalized);
      } else {
        setWalletData(null);
        setError("Unable to load wallet data");
      }

      if (transactionsResponse?.success && Array.isArray(transactionsResponse?.data?.data)) {
        setTransactions(transactionsResponse.data.data);
        const pag = transactionsResponse.data.pagination;
        if (pag) {
          setPagination({
            current_page: pag.current_page || page,
            per_page: pag.per_page || 10,
            total: pag.total || 0,
            total_pages: pag.last_page || 1,
          });
        }
      } else if (transactionsResponse?.data && Array.isArray(transactionsResponse.data.data)) {
        setTransactions(transactionsResponse.data.data);
        const pag = transactionsResponse.data.pagination;
        if (pag) {
          setPagination({
            current_page: pag.current_page || page,
            per_page: pag.per_page || 10,
            total: pag.total || 0,
            total_pages: pag.last_page || 1,
          });
        }
      } else {
        setTransactions([]);
      }
    } catch (fetchError) {
      console.error("Failed to fetch Partner wallet:", fetchError);
      setWalletData(null);
      setTransactions([]);
      setError(fetchError);
    } finally {
      setIsLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    void fetchWalletData();
  }, [fetchWalletData]);

  const snapshot = useMemo(() => getIbWalletSnapshot(walletData), [walletData]);

  if (isLoading) {
    return <WalletLoadingState />;
  }

  if (error || !walletData) {
    return (
      <IbPageShell>
        <ApiErrorState
          error={error || "Unable to load Partner wallet data"}
          audience="client"
          resource="Partner wallet"
          action="load"
          variant="panel"
          onRetry={fetchWalletData}
        />
      </IbPageShell>
    );
  }

  return (
    <IbPageShell>
      <IbPageHeader
        eyebrow="Partner Wallet"
        title="Partner and main wallet ledger"
        description="Review current balances and the latest transfer activity linked to your Partner account."
        actions={
          <>
            <Button variant="outline" onClick={fetchWalletData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <IbMetricCard
          title="Partner Wallet"
          value={formatCurrency(snapshot.partnerWallet.amount, snapshot.partnerWallet.currency)}
          description="Current Partner-side balance."
          icon={<Wallet className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title="Main Wallet"
          value={formatCurrency(snapshot.clientWallet.amount, snapshot.clientWallet.currency)}
          description="Funds currently available inside the main wallet."
          icon={<Wallet className="h-5 w-5" />}
          accent="emerald"
        />
        <IbMetricCard
          title="Total Earned"
          value={formatCurrency(snapshot.earningSummary.total_earned, snapshot.earningSummary.currency)}
          description={`Internal transfers: ${formatCurrency(snapshot.earningSummary.total_internal_transfers, snapshot.earningSummary.currency)}`}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="slate"
        />
      </div>

      <IbSectionCard
        title="Transaction history"
        description="Latest Partner wallet entries returned by the wallet ledger API."
      >
        {transactions.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-3">
              {transactions.map((transaction, index) => {
                const isOutflow = transaction.direction === "debit";
                const direction = {
                  isOutflow,
                  icon: isOutflow ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />,
                  tone: isOutflow
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
                };
                const amount = typeof transaction.amount === "number" ? transaction.amount : 0;
                const currency = snapshot.currency;

                // Map transaction_type to display name
                const displayType =
                  transaction.transaction_type === "transfer_out"
                    ? "Transfer Out"
                    : transaction.transaction_type === "credit"
                      ? "Credit"
                      : (transaction.transaction_type || "Transaction");

                return (
                  <div
                    key={index}
                    className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-muted/15 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${direction.tone}`}>
                        {direction.icon}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{displayType}</p>
                          {getStatusBadge(transaction.status)}
                        </div>
                        {transaction.description ? (
                          <p className="text-sm text-muted-foreground">{transaction.description}</p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{transaction.created_at ? formatDateTimeInIST(transaction.created_at) : "Date unavailable"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="sm:text-right">
                      <p className={`text-lg font-semibold ${direction.isOutflow ? "text-rose-600 dark:text-rose-300" : "text-emerald-600 dark:text-emerald-300"}`}>
                        {direction.isOutflow ? "-" : "+"}
                        {formatCurrency(Math.abs(amount), currency)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <PaginationControls
              pagination={pagination}
              isLoading={isLoading}
              onPageChange={setPage}
            />
          </div>
        ) : (
          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-muted/10 px-6 text-center">
            <Clock className="mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">No transactions yet</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Your Partner wallet ledger is empty right now. Transfers and earnings will appear here once activity starts.
            </p>
          </div>
        )}
      </IbSectionCard>
    </IbPageShell>
  );
}
