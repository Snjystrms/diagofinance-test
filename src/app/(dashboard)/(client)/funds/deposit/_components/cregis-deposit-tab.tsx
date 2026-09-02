"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cregisDepositApi, type CregisDepositCreateResponse, type CregisDepositStatusData } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";
import { notifyWalletRefresh } from "@/lib/client-events";
import toast from "react-hot-toast";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Loader2,
  RefreshCw,
  Shield,
  X,
} from "lucide-react";
import { formatDateTime, DepositInfoPanel, MINIMUM_DEPOSIT_AMOUNT } from "./deposit-shared";

interface CregisStatusInfo {
  label: string;
  variant: "outline" | "default" | "destructive";
  color: string;
  icon: typeof Clock;
  message: string;
  canRefresh: boolean;
  showNewDeposit: boolean;
}

function getCregisStatusInfo(cregisStatus: string): CregisStatusInfo {
  const status = cregisStatus.toLowerCase();

  switch (status) {
    case "new":
      return {
        label: "Pending",
        variant: "outline" as const,
        color: "amber",
        icon: Clock,
        message:
          "Your deposit is being processed. You will be notified once the funds are approved.",
        canRefresh: true,
        showNewDeposit: false,
      };
    case "paid":
    case "completed":
      return {
        label: "Completed",
        variant: "default" as const,
        color: "emerald",
        icon: CheckCircle2,
        message:
          "Your deposit has been approved and credited to your wallet.",
        canRefresh: false,
        showNewDeposit: true,
      };
    case "expired":
      return {
        label: "Expired",
        variant: "destructive" as const,
        color: "red",
        icon: AlertCircle,
        message: "This deposit has expired. Please create a new deposit.",
        canRefresh: false,
        showNewDeposit: true,
      };
    case "cancelled":
      return {
        label: "Cancelled",
        variant: "destructive" as const,
        color: "red",
        icon: X,
        message:
          "This deposit was cancelled. Please try again or contact support.",
        canRefresh: false,
        showNewDeposit: true,
      };
    case "paid_partial":
      return {
        label: "Partial Payment",
        variant: "outline" as const,
        color: "amber",
        icon: AlertCircle,
        message:
          "Partial payment received. The remaining amount is required to complete this deposit.",
        canRefresh: true,
        showNewDeposit: false,
      };
    case "paid_over":
      return {
        label: "Overpaid",
        variant: "outline" as const,
        color: "amber",
        icon: AlertCircle,
        message:
          "Overpayment detected. Our team will review and process the excess amount.",
        canRefresh: true,
        showNewDeposit: false,
      };
    default:
      return {
        label: status.charAt(0).toUpperCase() + status.slice(1),
        variant: "outline" as const,
        color: "gray",
        icon: Clock,
        message: "Processing your deposit...",
        canRefresh: true,
        showNewDeposit: false,
      };
  }
}

export function CregisDepositTab({ token }: { token: string | null }) {
  const searchParams = useSearchParams();

  const [cregisAmount, setCregisAmount] = useState("");
  const [isSubmittingCregis, setIsSubmittingCregis] = useState(false);
  const [cregisOutTradeNo, setCregisOutTradeNo] = useState<string | null>(null);
  const [cregisDepositStatus, setCregisDepositStatus] =
    useState<CregisDepositStatusData | null>(null);
  const [isPollingCregisStatus, setIsPollingCregisStatus] = useState(false);
  const [cregisHistory, setCregisHistory] = useState<
    { outTradeNo: string; amount: number; timestamp: string; status?: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const hasMountedCregisCheck = useRef(false);

  const addToCregisHistory = useCallback(
    (outTradeNo: string, amount: number) => {
      const raw = localStorage.getItem("cregis_deposit_history");
      const history: {
        outTradeNo: string;
        amount: number;
        timestamp: string;
        status?: string;
      }[] = raw ? JSON.parse(raw) : [];
      if (!history.find((h) => h.outTradeNo === outTradeNo)) {
        const updated = [
          { outTradeNo, amount, timestamp: new Date().toISOString() },
          ...history,
        ].slice(0, 20);
        localStorage.setItem("cregis_deposit_history", JSON.stringify(updated));
        setCregisHistory(updated);
      }
    },
    [],
  );

  const checkCregisStatus = useCallback(
    async (outTradeNo: string) => {
      if (!token) return;

      try {
        setIsPollingCregisStatus(true);
        const response = await cregisDepositApi.getStatus(outTradeNo, token);

        if (response.success && response.data) {
          setCregisDepositStatus(response.data);

          setCregisHistory((prevHistory) => {
            const updated = prevHistory.map((item) =>
              item.outTradeNo === outTradeNo
                ? { ...item, status: response.data!.cregis_status }
                : item,
            );
            localStorage.setItem(
              "cregis_deposit_history",
              JSON.stringify(updated),
            );
            return updated;
          });

          const finalStatuses = ["paid", "completed", "expired", "cancelled"];
          if (
            finalStatuses.includes(response.data.cregis_status.toLowerCase())
          ) {
            localStorage.removeItem("cregis_pending_deposit");

            if (
              ["paid", "completed"].includes(
                response.data.cregis_status.toLowerCase(),
              )
            ) {
              toast.success("Crypto payment completed successfully!");
              notifyWalletRefresh();
            } else if (
              response.data.cregis_status.toLowerCase() === "expired"
            ) {
              toast.error("Payment expired. Please create a new deposit.");
            } else if (
              response.data.cregis_status.toLowerCase() === "cancelled"
            ) {
              toast.error("Payment was cancelled.");
            }
          }
        }
      } catch (err) {
        console.error("Error checking Cregis status:", err);
      } finally {
        setIsPollingCregisStatus(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (hasMountedCregisCheck.current) return;
    hasMountedCregisCheck.current = true;

    setIsSubmittingCregis(false);

    const rawHistory = localStorage.getItem("cregis_deposit_history");
    if (rawHistory) {
      try {
        setCregisHistory(JSON.parse(rawHistory));
      } catch {
        /* ignore */
      }
    }

    const pendingOutTradeNo = localStorage.getItem("cregis_pending_deposit");
    if (pendingOutTradeNo && token) {
      setCregisOutTradeNo(pendingOutTradeNo);
      checkCregisStatus(pendingOutTradeNo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const urlTabParam = searchParams.get("tab");
    if (urlTabParam === "cryptocurrency" && token) {
      const pendingOutTradeNo = localStorage.getItem("cregis_pending_deposit");
      if (pendingOutTradeNo) {
        setCregisOutTradeNo(pendingOutTradeNo);
        checkCregisStatus(pendingOutTradeNo);
      }
    }
  }, [searchParams, token, checkCregisStatus]);

  const handleCregisSubmit = async () => {
    setError(null);

    if (!cregisAmount.trim()) {
      setError("Amount is required");
      return;
    }

    const amountNum = parseFloat(cregisAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a valid positive number");
      return;
    }

    if (!token) {
      setError("Authentication required");
      return;
    }

    setIsSubmittingCregis(true);

    try {
      const response = await cregisDepositApi.create(
        {
          amount: amountNum,
          currency: "USD",
        },
        token,
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to create Cregis deposit");
      }

      const depositData =
        response.data as unknown as CregisDepositCreateResponse["data"];
      const checkoutUrl = depositData?.checkout_url;
      const outTradeNo = depositData?.out_trade_no;

      if (checkoutUrl && outTradeNo) {
        localStorage.setItem("cregis_pending_deposit", outTradeNo);
        addToCregisHistory(outTradeNo, amountNum);

        const returnUrl = `${window.location.origin}/funds/deposit?tab=cryptocurrency`;

        const finalCheckoutUrl = checkoutUrl.includes("?")
          ? `${checkoutUrl}&return_url=${encodeURIComponent(returnUrl)}`
          : `${checkoutUrl}?return_url=${encodeURIComponent(returnUrl)}`;

        notifyWalletRefresh();
        window.location.href = finalCheckoutUrl;
      } else {
        console.error(
          "Cregis deposit response data:",
          JSON.stringify(depositData, null, 2),
        );
        toast.error(
          "Payment link is not available right now. Please try again.",
        );
        setIsSubmittingCregis(false);
      }
    } catch (err) {
      console.error("Error creating Cregis deposit:", err);
      setError(
        getFriendlyErrorMessage(err, {
          audience: "client",
          resource: "Cregis deposit",
          action: "create",
        }),
      );
      setIsSubmittingCregis(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column - Cregis Info */}
        <div className="space-y-6">
          <DepositInfoPanel
            title="Crypto gateway flow"
            tagline="A fast, secure, multi-blockchain payment solution for your deposit."
            steps={[
              {
                icon: DollarSign,
                title: "Enter the amount",
                text: "Choose how much you want to deposit in USD.",
              },
              {
                icon: Shield,
                title: "Complete payment",
                text: "Pay on the hosted checkout using your preferred blockchain.",
              },
              {
                icon: CheckCircle2,
                title: "Instant credit",
                text: "Your deposit is confirmed and credited once the payment is received.",
              },
            ]}
            verifyTitle="What to verify"
            verify={[
              {
                icon: DollarSign,
                title: "Rate",
                text: "1 USD = 1 USDT for every deposit.",
              },
              {
                icon: Shield,
                title: "Networks",
                text: "BTC, ETH, BSC, TRX and more supported.",
              },
              {
                icon: CheckCircle2,
                title: "Speed",
                text: "Instant confirmation with secure and transparent processing.",
              },
            ]}
          />
        </div>

        {/* Right Column - Cregis Deposit Form */}
        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="relative z-10">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              Deposit Amount
            </CardTitle>
            <CardDescription>
              Enter amount and complete payment via crypto gateway
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 relative z-10">
            {error && (
              <ApiErrorState
                message={error}
                audience="client"
                resource="Crypto Currency deposit"
                action="submit"
                variant="inline"
              />
            )}

            <div className="space-y-3">
              <Label htmlFor="cregis-amount" className="text-sm font-semibold text-foreground">
                Amount (USD) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="cregis-amount"
                  type="number"
                  step="1"
                  min="1"
                  value={cregisAmount}
                  onChange={(e) => setCregisAmount(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className="pl-10 h-12 border-2 border-border focus:border-primary rounded-xl"
                  placeholder="100.00"
                />
              </div>
              {cregisAmount && parseFloat(cregisAmount) > 0 && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      You&apos;ll pay (USDT)
                    </span>
                    <span className="text-foreground font-semibold">
                      {parseFloat(cregisAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleCregisSubmit}
              disabled={
                !cregisAmount.trim() ||
                parseFloat(cregisAmount) < MINIMUM_DEPOSIT_AMOUNT ||
                isSubmittingCregis
              }
              className="h-12 w-full rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmittingCregis ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Redirecting...
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5 mr-2" />
                  Continue to Payment
                </>
              )}
            </Button>
            {cregisAmount &&
              parseFloat(cregisAmount) > 0 &&
              parseFloat(cregisAmount) < MINIMUM_DEPOSIT_AMOUNT && (
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
                  <span>Choose your blockchain network</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center mt-0.5 border border-primary/20">
                    <span className="text-primary font-bold text-xs">3</span>
                  </div>
                  <span>Complete payment & return</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Display - Show if there's a pending/completed status */}
      {cregisDepositStatus &&
        (() => {
          const statusInfo = getCregisStatusInfo(
            cregisDepositStatus.cregis_status,
          );
          const StatusIcon = statusInfo.icon;

          return (
            <Card
              className={`relative overflow-hidden border-2 ${
                statusInfo.color === "emerald"
                  ? "border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 to-background dark:from-emerald-950/20 dark:to-background"
                  : statusInfo.color === "red"
                    ? "border-red-500/30 bg-gradient-to-br from-red-50/50 to-background dark:from-red-950/20 dark:to-background"
                    : statusInfo.color === "amber"
                      ? "border-amber-500/30 bg-gradient-to-br from-amber-50/50 to-background dark:from-amber-950/20 dark:to-background"
                      : "border-border/30 bg-gradient-to-br from-muted/50 to-background"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left side - Icon and Status */}
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icon */}
                    <div
                      className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 ${
                        statusInfo.color === "emerald"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : statusInfo.color === "red"
                            ? "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
                            : statusInfo.color === "amber"
                              ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "border-border/20 bg-muted/10 text-muted-foreground"
                      }`}
                    >
                      <StatusIcon className="h-10 w-10" />
                    </div>

                    {/* Status Info */}
                    <div className="flex-1 space-y-2">
                      <Badge
                        variant={statusInfo.variant}
                        className="text-xs uppercase tracking-wider"
                      >
                        {statusInfo.label}
                      </Badge>

                      <h3 className="text-3xl font-bold text-foreground">
                        ${cregisDepositStatus.amount.toFixed(2)}
                      </h3>

                      <p className="text-sm text-muted-foreground">
                        Crypto Currency • {cregisDepositStatus.currency}
                      </p>

                      <div className="pt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Order ID</span>
                          <code className="text-xs font-mono text-foreground bg-muted/50 px-2 py-1 rounded">
                            {cregisDepositStatus.out_trade_no}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                cregisDepositStatus.out_trade_no,
                              );
                              toast.success("Transaction ID copied!");
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right side - Details Grid */}
                  <div className="flex flex-col gap-4 md:min-w-[280px]">
                    <div className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-sm">Amount</span>
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          ${cregisDepositStatus.amount.toFixed(2)}
                        </span>
                      </div>

                      <div className="h-px bg-border" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <RefreshCw className="h-4 w-4" />
                          <span className="text-sm">Rate</span>
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          1 USD = 1 {cregisDepositStatus.currency}
                        </span>
                      </div>
                    </div>

                    {statusInfo.canRefresh && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          checkCregisStatus(cregisDepositStatus.out_trade_no)
                        }
                        disabled={isPollingCregisStatus}
                      >
                        {isPollingCregisStatus ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Checking Status...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Refresh Status
                          </>
                        )}
                      </Button>
                    )}

                    {statusInfo.showNewDeposit && (
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={() => {
                          setCregisDepositStatus(null);
                          setCregisOutTradeNo(null);
                          setCregisAmount("");
                          localStorage.removeItem("cregis_pending_deposit");
                        }}
                      >
                        New Deposit
                      </Button>
                    )}
                  </div>
                </div>

                {/* Bottom Message */}
                <div
                  className={`mt-6 rounded-lg p-4 ${
                    statusInfo.color === "emerald"
                      ? "bg-emerald-500/10 border border-emerald-500/20"
                      : statusInfo.color === "red"
                        ? "bg-red-500/10 border border-red-500/20"
                        : statusInfo.color === "amber"
                          ? "bg-amber-500/10 border border-amber-500/20"
                          : "bg-muted/50 border border-border/50"
                  }`}
                >
                  <p
                    className={`text-sm ${
                      statusInfo.color === "emerald"
                        ? "text-emerald-900 dark:text-emerald-100"
                        : statusInfo.color === "red"
                          ? "text-red-900 dark:text-red-100"
                          : statusInfo.color === "amber"
                            ? "text-amber-900 dark:text-amber-100"
                            : "text-foreground"
                    }`}
                  >
                    {statusInfo.message}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })()}

      {/* Cregis Deposit History */}
      {cregisHistory.length > 0 && (
        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent Crypto Deposits
            </CardTitle>
            <CardDescription>
              Your last {cregisHistory.length} deposit order(s). Click
              &quot;Check Status&quot; to refresh any pending order.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {cregisHistory.map((entry) => {
                const isCurrent = entry.outTradeNo === cregisOutTradeNo;
                return (
                  <div
                    key={entry.outTradeNo}
                    className={`flex items-center justify-between px-6 py-4 transition-colors ${
                      isCurrent ? "bg-primary/5" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <code className="text-xs font-mono text-foreground truncate">
                        {entry.outTradeNo}
                      </code>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          ${entry.amount.toFixed(2)}
                        </span>
                        <span>{formatDateTime(entry.timestamp)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      {entry.status
                        ? (() => {
                            const statusInfo = getCregisStatusInfo(
                              entry.status,
                            );
                            return (
                              <Badge
                                variant={statusInfo.variant}
                                className={`text-xs font-semibold ${
                                  statusInfo.color === "emerald"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                    : statusInfo.color === "red"
                                      ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
                                      : statusInfo.color === "amber"
                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                                        : "border-border"
                                }`}
                              >
                                {statusInfo.label}
                              </Badge>
                            );
                          })()
                        : isCurrent && (
                            <Badge
                              variant="outline"
                              className="text-xs border-primary/30 text-primary"
                            >
                              Current
                            </Badge>
                          )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={isPollingCregisStatus}
                        onClick={() => {
                          setCregisOutTradeNo(entry.outTradeNo);
                          checkCregisStatus(entry.outTradeNo);
                        }}
                      >
                        {isPollingCregisStatus && isCurrent ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Checking...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Check Status
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
