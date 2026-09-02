"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { coinsbuyDepositApi, type CoinsBuyDepositCreateResponse, type CoinsBuyDepositStatusResponse } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";
import { notifyWalletRefresh } from "@/lib/client-events";
import toast from "react-hot-toast";
import { AlertCircle, CheckCircle2, Clock, DollarSign, ExternalLink, ShieldCheck, Wallet, RefreshCw } from "lucide-react";
import { DepositInfoPanel, MINIMUM_DEPOSIT_AMOUNT } from "./deposit-shared";

type PendingDeposit = {
  coinsbuyDepositId: string;
  depositId: string | number;
  trackingId: string;
  amount: number;
};

const STORAGE_KEY = "coinsbuy_pending_deposit";
const POLL_INTERVAL_MS = 5000;

export function CoinsBuyDepositTab({ token }: { token: string | null }) {
  const searchParams = useSearchParams();
  const [coinsbuyAmount, setCoinsbuyAmount] = useState("");
  const [isSubmittingCoinsbuy, setIsSubmittingCoinsbuy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingDeposit, setPendingDeposit] = useState<PendingDeposit | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [depositStatus, setDepositStatus] = useState<number | null>(null);
  const [statusData, setStatusData] = useState<CoinsBuyDepositStatusResponse["data"] | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasTriedSuccessRef = useRef(false);

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const fetchStatus = useCallback(
    async (coinsbuyDepositId: string) => {
      if (!token) return;
      try {
        const res = await coinsbuyDepositApi.getStatus(coinsbuyDepositId, token);
        if (res.success && res.data) {
          setStatusData(res.data);
          setDepositStatus(res.data.deposit_status);
          setPollError(null);
          // deposit_status 0 = pending, 1 = credited — trustworthy DB state; don't gate on coinsbuy_status alone
          if (res.data.deposit_status === 1) {
            toast.success("Deposit credited to your wallet!");
            notifyWalletRefresh();
            clearPolling();
            try {
              sessionStorage.removeItem(STORAGE_KEY);
            } catch {}
          }
        } else {
          setPollError(res.message || "Failed to fetch deposit status");
        }
      } catch (err) {
        setPollError(
          getFriendlyErrorMessage(err, {
            audience: "client",
            resource: "CoinsBuy deposit status",
            action: "load",
          })
        );
      }
    },
    [token, clearPolling]
  );

  const startPolling = useCallback(
    (pending: PendingDeposit) => {
      setPendingDeposit(pending);
      setIsPolling(true);
      setDepositStatus(null);
      setStatusData(null);
      setPollError(null);
      // immediate fetch
      void fetchStatus(pending.coinsbuyDepositId);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        void fetchStatus(pending.coinsbuyDepositId);
      }, POLL_INTERVAL_MS);
    },
    [fetchStatus]
  );

  // On mount: restore pending from sessionStorage and handle return-from-checkout landing page
  useEffect(() => {
    // restore from storage if user navigated back without query params
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PendingDeposit;
        if (parsed?.coinsbuyDepositId && !pendingDeposit) {
          // don't auto-poll unless we have query params indicating return, but keep for manual resume
          // we will auto-start polling if query params indicate return below
          setPendingDeposit(parsed);
        }
      }
    } catch {}

    const depositIdParam = searchParams.get("deposit_id");
    const trackingIdParam = searchParams.get("tracking_id");
    // CoinsBuy checkout redirects back to payment_page_redirect_url which is the success endpoint.
    // When the user lands back on the frontend (e.g. /funds/deposit?deposit_id=...&tracking_id=...),
    // we should hit the informational success endpoint then poll status until deposit_status === 1.
    if (depositIdParam && trackingIdParam && token && !hasTriedSuccessRef.current) {
      hasTriedSuccessRef.current = true;
      const coinsbuyDepositId = depositIdParam;
      const trackingId = trackingIdParam;
      // informational success call — does not credit, just confirms processing
      coinsbuyDepositApi
        .getSuccess({ deposit_id: coinsbuyDepositId, tracking_id: trackingId }, token)
        .catch(() => {
          // non-blocking; polling is what matters
        })
        .finally(() => {
          const pending: PendingDeposit = {
            coinsbuyDepositId,
            depositId: coinsbuyDepositId,
            trackingId,
            amount: 0,
          };
          // try to enrich amount from stored
          try {
            const stored = sessionStorage.getItem(STORAGE_KEY);
            if (stored) {
              const p = JSON.parse(stored) as PendingDeposit;
              if (p.coinsbuyDepositId === coinsbuyDepositId && p.amount) pending.amount = p.amount;
            }
          } catch {}
          startPolling(pending);
        });
    } else if (depositIdParam && trackingIdParam && !token) {
      // token not ready yet, still show waiting state so user sees something
      setPendingDeposit({
        coinsbuyDepositId: depositIdParam,
        depositId: depositIdParam,
        trackingId: trackingIdParam,
        amount: 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, token, startPolling]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleCoinsbuySubmit = async () => {
    setError(null);

    if (!coinsbuyAmount.trim()) {
      setError("Amount is required");
      return;
    }

    const amountNum = parseFloat(coinsbuyAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a valid positive number");
      return;
    }

    if (!token) {
      setError("Authentication required");
      return;
    }

    setIsSubmittingCoinsbuy(true);

    try {
      const response = await coinsbuyDepositApi.create(
        {
          amount: amountNum,
        },
        token,
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to create CoinsBuy deposit");
      }

      const depositData = response.data as unknown as CoinsBuyDepositCreateResponse["data"];
      const coinsbuyDepositId = (depositData?.coinsbuy_deposit_id ?? (depositData as unknown as Record<string, unknown>)?.["coinsbuy_deposit_id"]) as string | undefined;
      const trackingId = depositData?.tracking_id as string | undefined;
      const depositId = (depositData?.deposit_id ?? (depositData as unknown as Record<string, unknown>)?.["deposit_uuid"] ?? coinsbuyDepositId) as string | number | undefined;

      if (!coinsbuyDepositId) {
        throw new Error("CoinsBuy deposit ID not found in response");
      }

      // payment_url is the hosted CoinsBuy checkout (QR / address). Fall back to legacy fields for compatibility.
      const rawData = depositData as unknown as Record<string, unknown>;
      const paymentUrl =
        (rawData["payment_url"] as string | undefined) ||
        (rawData["payment_page"] as string | undefined) ||
        depositData.payment_page_redirect_url ||
        (rawData["payment_page_redirect_url"] as string | undefined);

      if (!paymentUrl) {
        throw new Error("Payment URL not returned by CoinsBuy");
      }

      const pending: PendingDeposit = {
        coinsbuyDepositId,
        depositId: depositId ?? coinsbuyDepositId,
        trackingId: trackingId ?? "",
        amount: amountNum,
      };
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
      } catch {}

      toast.success(depositData ? "Redirecting to CoinsBuy checkout..." : "CoinsBuy deposit created successfully!");
      // Frontend flow: redirect browser to CoinsBuy hosted checkout — they own the address/QR UI
      window.location.href = paymentUrl;
      // keep submitting true until redirect unloads; don't clear here
      return;
    } catch (err) {
      console.error("Error creating CoinsBuy deposit:", err);
      setError(
        getFriendlyErrorMessage(err, {
          audience: "client",
          resource: "CoinsBuy deposit",
          action: "create",
        }),
      );
      setIsSubmittingCoinsbuy(false);
    }
  };

  const handleResumePolling = () => {
    if (pendingDeposit) startPolling(pendingDeposit);
  };

  const handleCancelPending = () => {
    clearPolling();
    setPendingDeposit(null);
    setStatusData(null);
    setDepositStatus(null);
    setPollError(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  // Waiting screen derives from deposit_status (0 pending, 1 credited) — not coinsbuy_status alone
  const renderWaitingScreen = () => {
    if (!pendingDeposit) return null;
    const isCredited = depositStatus === 1;
    const isPending = depositStatus === 0 || depositStatus === null;

    return (
      <Card className="border border-border/60 bg-card shadow-sm">
        <CardHeader className="relative z-10">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/20">
              <Clock className={`h-5 w-5 ${isPolling ? "text-amber-600 animate-pulse" : "text-primary"}`} />
            </div>
            {isCredited ? "Payment Credited" : "Waiting for Payment"}
          </CardTitle>
          <CardDescription>
            {isCredited
              ? "Your deposit has been credited to your wallet."
              : "Polling CoinsBuy status — deposit_status is the source of truth."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 relative z-10">
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">CoinsBuy Deposit ID</span>
              <span className="font-mono font-semibold text-foreground">{pendingDeposit.coinsbuyDepositId}</span>
            </div>
            {pendingDeposit.trackingId && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tracking ID</span>
                <span className="font-mono font-semibold text-foreground break-all ml-4 text-right">{pendingDeposit.trackingId}</span>
              </div>
            )}
            {pendingDeposit.amount > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold text-foreground">${pendingDeposit.amount}</span>
              </div>
            )}
            {statusData?.address && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Address</span>
                <span className="font-mono text-foreground break-all ml-4 text-right text-[11px]">{statusData.address}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Deposit Status</span>
              <span className={`font-semibold ${isCredited ? "text-green-600" : "text-amber-600"}`}>
                {depositStatus === 1 ? "1 — Credited" : depositStatus === 0 ? "0 — Pending" : "Checking..."}
              </span>
            </div>
            {statusData?.coinsbuy_status !== undefined && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">CoinsBuy Status</span>
                <span className="font-semibold text-foreground">{String(statusData.coinsbuy_status)}</span>
              </div>
            )}
            {statusData?.amount !== undefined && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Confirmed Amount</span>
                <span className="font-semibold text-foreground">{String(statusData.amount)}</span>
              </div>
            )}
          </div>

          {pollError && (
            <ApiErrorState message={pollError} audience="client" resource="CoinsBuy deposit status" action="load" variant="inline" />
          )}

          <div className="rounded-2xl border border-amber-300/40 bg-amber-50/70 p-4 dark:border-amber-800/50 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-sm text-amber-900 dark:text-amber-100">
                <p className="font-medium mb-1">How it works</p>
                <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
                  CoinsBuy status can stay at <span className="font-mono">2</span> even after funds are confirmed for open-address deposits.
                  We poll <span className="font-mono">deposit_status</span> (0 pending → 1 credited) every {POLL_INTERVAL_MS / 1000}s.
                </p>
              </div>
            </div>
          </div>

          {isCredited ? (
            <div className="rounded-2xl border border-green-300/40 bg-green-50/70 p-4 dark:border-green-800/50 dark:bg-green-950/20 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-sm font-medium text-green-900 dark:text-green-100">Deposit credited — you can close this or make another deposit.</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className={`h-3.5 w-3.5 ${isPolling ? "animate-spin" : ""}`} />
              {isPolling ? `Polling every ${POLL_INTERVAL_MS / 1000}s...` : "Paused"}
            </div>
          )}

          <div className="flex gap-3">
            {!isPolling && !isCredited && (
              <Button onClick={handleResumePolling} className="flex-1 h-11 rounded-xl" variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Resume Polling
              </Button>
            )}
            {isPolling && !isCredited && (
              <Button onClick={clearPolling} variant="outline" className="flex-1 h-11 rounded-xl">
                Pause Polling
              </Button>
            )}
            {isCredited ? (
              <Button onClick={handleCancelPending} variant="outline" className="flex-1 h-11 rounded-xl">
                New Deposit
              </Button>
            ) : (
              <Button onClick={handleCancelPending} variant="ghost" className="flex-1 h-11 rounded-xl">
                Cancel
              </Button>
            )}
            {statusData?.payment_page && (
              <Button asChild variant="outline" className="h-11 rounded-xl">
                <a href={String(statusData.payment_page)} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Checkout
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Left Column - CoinsBuy Info */}
      <div className="space-y-6">
        <DepositInfoPanel
          title="CoinsBuy flow"
          tagline="Use CoinsBuy to start a guided, secure checkout deposit flow."
          steps={[
            {
              icon: DollarSign,
              title: "Enter the amount",
              text: "Choose how much you want to deposit.",
            },
            {
              icon: Wallet,
              title: "Start checkout",
              text: "Create a deposit and get redirected to the CoinsBuy checkout.",
            },
            {
              icon: ShieldCheck,
              title: "Complete payment",
              text: "Pay through the CoinsBuy hosted checkout, then track it here.",
            },
          ]}
          verifyTitle="What to verify"
          verify={[
            {
              icon: Clock,
              title: "Processing time",
              text: "Deposit is typically processed within 1 business day.",
            },
            {
              icon: DollarSign,
              title: "Minimum deposit",
              text: "Minimum is provider-dependent.",
            },
            {
              icon: CheckCircle2,
              title: "Credit",
              text: "Funds are credited once payment is confirmed.",
            },
          ]}
        />
      </div>

      {/* Right Column - CoinsBuy Deposit Form OR Waiting Screen */}
      {pendingDeposit && (isPolling || depositStatus !== null || pollError) ? (
        renderWaitingScreen()
      ) : (
        <Card className="overflow-hidden border border-border/60 bg-card shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-primary/80 via-primary to-primary/30" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              Create Deposit
            </CardTitle>
            <CardDescription>
              Enter the amount you want to deposit via CoinsBuy
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 relative z-10">
            {error && (
              <ApiErrorState
                message={error}
                audience="client"
                resource="CoinsBuy deposit"
                action="submit"
                variant="inline"
              />
            )}

            {pendingDeposit && !isPolling && (
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Previous deposit{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {pendingDeposit.coinsbuyDepositId}
                  </span>{" "}
                  pending
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResumePolling}
                  className="h-8 rounded-lg"
                >
                  Resume
                </Button>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="coinsbuy-amount"
                  className="text-sm font-semibold text-foreground"
                >
                  Deposit Amount{" "}
                  <span className="text-destructive">*</span>
                </Label>
                {coinsbuyAmount &&
                  parseFloat(coinsbuyAmount) >= MINIMUM_DEPOSIT_AMOUNT && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Valid amount
                    </span>
                  )}
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="coinsbuy-amount"
                  type="number"
                  step="1"
                  min="1"
                  value={coinsbuyAmount}
                  onChange={(e) => setCoinsbuyAmount(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className="pl-10 h-12 border-2 border-border focus:border-primary rounded-xl"
                  placeholder="100.00"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the amount you want to deposit
              </p>
            </div>

            {coinsbuyAmount && parseFloat(coinsbuyAmount) > 0 && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    You&apos;ll be credited
                  </span>
                  <span className="text-foreground font-semibold">
                    ${parseFloat(coinsbuyAmount).toFixed(2)} USD
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={handleCoinsbuySubmit}
              disabled={
                !coinsbuyAmount.trim() ||
                parseFloat(coinsbuyAmount) < MINIMUM_DEPOSIT_AMOUNT ||
                isSubmittingCoinsbuy
              }
              className="h-12 w-full rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmittingCoinsbuy ? (
                <>
                  <Clock className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5 mr-2" />
                  Proceed to Deposit
                </>
              )}
            </Button>
            {coinsbuyAmount &&
              parseFloat(coinsbuyAmount) > 0 &&
              parseFloat(coinsbuyAmount) < MINIMUM_DEPOSIT_AMOUNT && (
                <p className="text-xs text-destructive font-medium">
                  Minimum deposit amount is ${MINIMUM_DEPOSIT_AMOUNT} USD
                </p>
              )}

            <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
              <h4 className="font-semibold text-foreground mb-3 text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Quick Steps
              </h4>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center mt-0.5 border border-primary/20">
                    <span className="text-primary font-bold text-xs">1</span>
                  </div>
                  <span>Enter deposit amount</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center mt-0.5 border border-primary/20">
                    <span className="text-primary font-bold text-xs">2</span>
                  </div>
                  <span>Complete payment on CoinsBuy checkout</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center mt-0.5 border border-primary/20">
                    <span className="text-primary font-bold text-xs">3</span>
                  </div>
                  <span>Return to see your deposit credited</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
