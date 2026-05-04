"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ArrowRightLeft, CheckCircle2, Loader2, RefreshCw, Wallet } from "lucide-react";

import { ApiErrorState } from "@/components/errors/api-error-state";
import { IbMetricCard, IbPageHeader, IbPageShell, IbSectionCard } from "@/components/ib/ib-page-primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { type IbDashboardResponse, type IbInternalTransferRequest, ibRequestsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";

/* ─── Transfer response types ──────────────────────────────────────────── */

type WalletSnapshot = {
  before: number;
  after: number;
  currency: string;
};

type TransferResult = {
  amount: number;
  ib_wallet: WalletSnapshot;
  client_wallet: WalletSnapshot;
  debit_uuid: string;
  credit_uuid: string;
};

function TransferLoadingState() {
  return (
    <IbPageShell>
      <section className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-10 w-64 rounded-full" />
          <Skeleton className="h-4 w-full max-w-xl rounded-full" />
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
            <div className="space-y-4">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-8 w-36 rounded-full" />
              <Skeleton className="h-4 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <div className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-11 w-40 rounded-2xl" />
          </div>
        </div>
        <div className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </IbPageShell>
  );
}

export default function TransferPage() {
  const { token } = useAuth();
  const [dashboardData, setDashboardData] = useState<IbDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferComment, setTransferComment] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!token) {
      setError("Authentication required");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await ibRequestsApi.getDashboard(token);
      if (response?.data) {
        setDashboardData(response.data);
      } else {
        setDashboardData(null);
        setError("Unable to load transfer data");
      }
    } catch (fetchError) {
      console.error("Failed to fetch IB dashboard:", fetchError);
      setDashboardData(null);
      setError(fetchError);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const handleTransfer = useCallback(async () => {
    if (!token || !dashboardData) {
      toast.error("Authentication required");
      return;
    }

    const amount = Number(transferAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > dashboardData.partner_wallet.balance) {
      toast.error("Insufficient partner wallet balance");
      return;
    }

    try {
      setIsTransferring(true);
      setTransferResult(null);
      const payload: IbInternalTransferRequest = {
        amount,
        ...(transferComment.trim() ? { comment: transferComment.trim() } : {}),
      };

      const response = await ibRequestsApi.internalTransfer(payload, token);
      const raw = response as unknown as { success: boolean; message?: string; data?: TransferResult };

      if (raw.success && raw.data) {
        const result = raw.data;
        setTransferResult(result);

        // Update the local dashboard snapshot so wallet cards reflect the new balances
        // without waiting for a full refetch.
        setDashboardData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            partner_wallet: { ...prev.partner_wallet, balance: result.ib_wallet.after },
            client_wallet:  { ...prev.client_wallet,  balance: result.client_wallet.after },
          };
        });

        toast.success(raw.message || "Transfer completed successfully");
        setTransferAmount("");
        setTransferComment("");
        return;
      }

      toast.error(
        getFriendlyErrorMessage((raw as { message?: string }).message || "Transfer failed", {
          audience: "client",
          resource: "IB transfer",
          action: "submit",
        }),
      );
    } catch (transferError) {
      console.error("Transfer error:", transferError);
      toast.error(
        getFriendlyErrorMessage(transferError, {
          audience: "client",
          resource: "IB transfer",
          action: "submit",
        }),
      );
    } finally {
      setIsTransferring(false);
    }
  }, [dashboardData, token, transferAmount, transferComment]);

  if (isLoading) {
    return <TransferLoadingState />;
  }

  if (error || !dashboardData) {
    return (
      <IbPageShell>
        <ApiErrorState
          error={error || "Unable to load transfer data"}
          audience="client"
          resource="IB transfer"
          action="load"
          variant="panel"
          onRetry={fetchDashboard}
        />
      </IbPageShell>
    );
  }

  const { partner_wallet, client_wallet } = dashboardData;
  const amount = Number(transferAmount);
  const projectedPartnerBalance =
    Number.isFinite(amount) && amount > 0 ? Math.max(partner_wallet.balance - amount, 0) : partner_wallet.balance;
  const projectedClientBalance =
    Number.isFinite(amount) && amount > 0 ? client_wallet.balance + amount : client_wallet.balance;

  return (
    <IbPageShell>
      <IbPageHeader
        eyebrow="IB Transfer"
        title="Move funds into the client wallet"
        description="Use internal transfer to shift balance from the partner wallet into the client wallet instantly."
        actions={
          <>
            <Button variant="outline" onClick={fetchDashboard}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <IbMetricCard
          title="Partner Wallet"
          value={formatCurrency(partner_wallet.balance, partner_wallet.currency)}
          description="Source wallet for this transfer."
          icon={<Wallet className="h-5 w-5" />}
          accent="primary"
        />
        <IbMetricCard
          title="Client Wallet"
          value={formatCurrency(client_wallet.balance, client_wallet.currency)}
          description="Destination wallet that receives the transferred amount."
          icon={<Wallet className="h-5 w-5" />}
          accent="emerald"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <IbSectionCard
          title="Transfer request"
          description="Submit an internal transfer from partner to client wallet."
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="ib-amount">Amount</Label>
              <Input
                id="ib-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={partner_wallet.balance}
                placeholder="Enter amount"
                value={transferAmount}
                onChange={(event) => setTransferAmount(event.target.value)}
                disabled={isTransferring}
              />
              <p className="text-sm text-muted-foreground">
                Available balance: {formatCurrency(partner_wallet.balance, partner_wallet.currency)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ib-comment">Comment</Label>
              <Textarea
                id="ib-comment"
                rows={4}
                placeholder="Optional note for this transfer"
                value={transferComment}
                onChange={(event) => setTransferComment(event.target.value)}
                disabled={isTransferring}
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={handleTransfer} disabled={isTransferring}>
                {isTransferring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Transfer funds
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTransferAmount("");
                  setTransferComment("");
                }}
                disabled={isTransferring}
              >
                Reset
              </Button>
            </div>
          </div>
        </IbSectionCard>

        {/* Receipt after a confirmed transfer */}
        {transferResult ? (
          <IbSectionCard
            title="Transfer confirmed"
            description="The balances below are the actual values returned by the server."
          >
            <div className="space-y-4">
              {/* Success banner */}
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 dark:bg-emerald-950/20">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    {formatCurrency(transferResult.amount, transferResult.ib_wallet.currency)} transferred successfully
                  </p>
                  <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">
                    IB wallet → Client wallet
                  </p>
                </div>
              </div>

              {/* Wallet snapshots */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    IB Wallet
                  </p>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Before</span>
                      <span>{formatCurrency(transferResult.ib_wallet.before, transferResult.ib_wallet.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-muted-foreground">After</span>
                      <span className="text-foreground">{formatCurrency(transferResult.ib_wallet.after, transferResult.ib_wallet.currency)}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Client Wallet
                  </p>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Before</span>
                      <span>{formatCurrency(transferResult.client_wallet.before, transferResult.client_wallet.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-muted-foreground">After</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(transferResult.client_wallet.after, transferResult.client_wallet.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction IDs */}
              <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Transaction references
                </p>
                <div className="space-y-1.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Debit ID</span>
                    <span className="font-mono text-xs break-all text-foreground">{transferResult.debit_uuid}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Credit ID</span>
                    <span className="font-mono text-xs break-all text-foreground">{transferResult.credit_uuid}</span>
                  </div>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={() => setTransferResult(null)}>
                Dismiss
              </Button>
            </div>
          </IbSectionCard>
        ) : (
          <IbSectionCard title="Transfer preview" description="Estimated balances after applying the entered amount.">
            <div className="space-y-4">
              <div className="rounded-3xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Partner Wallet After Transfer
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {formatCurrency(projectedPartnerBalance, partner_wallet.currency)}
                </p>
              </div>
              <div className="rounded-3xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Client Wallet After Transfer
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {formatCurrency(projectedClientBalance, client_wallet.currency)}
                </p>
              </div>
              <div className="ib-portal-note rounded-3xl border p-4 text-sm text-muted-foreground">
                Transfers are immediate and reflected in the IB wallet history once the backend confirms the operation.
              </div>
            </div>
          </IbSectionCard>
        )}
      </div>
    </IbPageShell>
  );
}
