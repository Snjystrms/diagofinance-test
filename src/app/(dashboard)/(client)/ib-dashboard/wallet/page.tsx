"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Clock,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { ApiErrorState } from "@/components/errors/api-error-state";
import { IbMetricCard, IbPageHeader, IbPageShell, IbSectionCard } from "@/components/ib/ib-page-primitives";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { type IbWalletData, ibRequestsApi, type IbInternalTransferWalletTransaction } from "@/lib/api";
import { type IbInternalTransferWalletTransactionsResponse } from "@/lib/api-trading-ib";
import { formatCurrency } from "@/lib/format";
import { formatDateTimeInIST } from "@/lib/formatters";
import { getIbWalletSnapshot, normalizeIbWalletData } from "@/lib/ib";
import { 
  ReusableDataTable, 
  getStatusBadge, 
  getTransactionTypeIcon,
  type ColumnDef 
} from "@/components/data-table/reusable-data-table";

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
            <Skeleton key={index} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </IbPageShell>
  );
}

/* ─── Column Definitions ────────────────────────────────────────────────── */

const getTransactionColumns = (currency: string): ColumnDef<IbInternalTransferWalletTransaction>[] => [
  {
    header: "Type",
    key: "type",
    render: (tx) => {
      const isOutflow = tx.direction === "debit";
      const displayType =
        tx.transaction_type === "transfer_out"
          ? "Transfer Out"
          : tx.transaction_type === "ib_withdrawal"
            ? "IB Withdrawal"
            : tx.transaction_type === "credit"
              ? "Credit"
              : tx.transaction_type === "ib_commission"
                ? "Commission"
                : tx.transaction_type || "Transaction";
      
      return getTransactionTypeIcon(isOutflow, displayType);
    },
    className: "whitespace-nowrap",
  },
  {
    header: "Description",
    key: "description",
    render: (tx) => (
      <div className="max-w-[220px] break-words text-muted-foreground">
        {tx.description || <span className="text-border">—</span>}
      </div>
    ),
  },
  {
    header: "Status",
    key: "status",
    render: (tx) => getStatusBadge(tx.status),
    className: "whitespace-nowrap",
  },
  {
    header: "Date",
    key: "date",
    render: (tx) => (
      <span className="tabular-nums text-xs text-muted-foreground">
        {tx.created_at ? formatDateTimeInIST(tx.created_at) : "—"}
      </span>
    ),
    className: "whitespace-nowrap",
  },
  {
    header: "Before",
    key: "balance_before",
    align: "right",
    render: (tx) => (
      <span className="tabular-nums text-xs text-muted-foreground">
        {typeof tx.balance_before === "number"
          ? formatCurrency(tx.balance_before, "USD")
          : <span className="text-border">—</span>}
      </span>
    ),
    className: "whitespace-nowrap",
    hideOnMobile: true,
  },
  {
    header: "After",
    key: "balance_after",
    align: "right",
    render: (tx) => (
      <span className="tabular-nums text-xs text-muted-foreground">
        {typeof tx.balance_after === "number"
          ? formatCurrency(tx.balance_after, "USD")
          : <span className="text-border">—</span>}
      </span>
    ),
    className: "whitespace-nowrap",
    hideOnMobile: true,
  },
  {
    header: "Amount",
    key: "amount",
    align: "right",
    render: (tx) => {
      const isOutflow = tx.direction === "debit";
      const amount = typeof tx.amount === "number" ? tx.amount : 0;
      
      return (
        <span
          className={`font-semibold tabular-nums ${
            isOutflow
              ? "text-rose-600 dark:text-rose-300"
              : "text-emerald-600 dark:text-emerald-300"
          }`}
        >
          {isOutflow ? "−" : "+"}
          {formatCurrency(Math.abs(amount), currency)}
        </span>
      );
    },
    className: "whitespace-nowrap",
  },
];

export default function IbWalletPage() {
  const { token } = useAuth();
  const [walletData, setWalletData] = useState<IbWalletData | null>(null);
  const [transactions, setTransactions] = useState<IbInternalTransferWalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
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
        ibRequestsApi.getIbWalletTransactions(token, { page, limit: perPage }),
      ]);

      const normalized = normalizeIbWalletData(walletResponse?.data);

      if (normalized) {
        setWalletData(normalized);
      } else {
        setWalletData(null);
        setError("Unable to load wallet data");
      }

      const txResponse = transactionsResponse as unknown as IbInternalTransferWalletTransactionsResponse;

      if (txResponse?.success && Array.isArray(txResponse?.data)) {
        setTransactions(txResponse.data);

        const pag = txResponse.pagination;
        if (pag) {
          setPagination({
            current_page: pag.current_page || page,
            per_page: pag.per_page || perPage,
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
  }, [token, page, perPage]);

  useEffect(() => {
    void fetchWalletData();
  }, [fetchWalletData]);

  const snapshot = useMemo(() => getIbWalletSnapshot(walletData), [walletData]);

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1); // Reset to first page when changing rows per page
  };

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
          <Button variant="outline" onClick={fetchWalletData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          description="Total earnings accumulated."
          icon={<TrendingUp className="h-5 w-5" />}
          accent="slate"
        />
        <IbMetricCard
          title="Total Internal Transfers"
          value={formatCurrency(snapshot.earningSummary.total_internal_transfers, snapshot.earningSummary.currency)}
          description="Total internal transfers made."
          icon={<TrendingUp className="h-5 w-5" />}
          accent="amber"
        />
      </div>

      <IbSectionCard
        title="Transaction history"
        description=""
      >
        <ReusableDataTable
          data={transactions}
          columns={getTransactionColumns(snapshot.currency)}
          pagination={pagination}
          isLoading={isLoading}
          showSerialNumber={true}
          serialNumberStart={(pagination.current_page - 1) * pagination.per_page + 1}
          onPageChange={setPage}
          onPerPageChange={handlePerPageChange}
          emptyState={
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-muted/10 px-6 text-center">
              <Clock className="mb-4 h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">No transactions yet</h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Your Partner wallet ledger is empty right now. Transfers and earnings will appear here once activity starts.
              </p>
            </div>
          }
        />
      </IbSectionCard>
    </IbPageShell>
  );
}