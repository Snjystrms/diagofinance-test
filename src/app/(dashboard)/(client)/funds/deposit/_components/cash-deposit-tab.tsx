"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cashDepositApi, type CashDepositRecord, type CashDepositTarget } from "@/lib/api";
import { userCurrencyRatesApi, type CurrencyRateItem } from "@/lib/api-auth-admin";
import { mt5AccountsApi, type MT5Account } from "@/lib/api-trading-ib";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";
import { notifyWalletRefresh } from "@/lib/client-events";
import toast from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Banknote,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import {
  CashStatusBadge,
  DepositInfoPanel,
  formatDateTime,
  MINIMUM_DEPOSIT_AMOUNT,
} from "./deposit-shared";

export function CashDepositTab({ token }: { token: string | null }) {
  const [target, setTarget] = useState<CashDepositTarget>("wallet");
  const [accountRef, setAccountRef] = useState("");
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    id: number;
    amount: number;
    target: string;
    status_label: string;
    created_at: string;
    mt5_account_id: string | null;
  } | null>(null);

  const [requests, setRequests] = useState<CashDepositRecord[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [mt5Accounts, setMt5Accounts] = useState<MT5Account[]>([]);
  const [mt5AccountsLoading, setMt5AccountsLoading] = useState(false);
  const [currency, setCurrency] = useState("INR");
  const [currencyRates, setCurrencyRates] = useState<CurrencyRateItem[]>([]);
  const [currencyRatesLoading, setCurrencyRatesLoading] = useState(false);

  const [detailRequest, setDetailRequest] = useState<CashDepositRecord | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const amountNum = parseFloat(amount);
  const selectedMt5Account = mt5Accounts.find(
    (acc) => String(acc.account_id) === accountRef,
  );
  const availableCurrencies = useMemo(() => {
    const activeRates = currencyRates.filter((rate) => {
      const rawStatus = String(rate.status).toLowerCase();
      return (
        rate.from_currency?.toUpperCase() === "USD" &&
        (rawStatus === "true" || rawStatus === "1" || rawStatus === "active")
      );
    });
    const unique = Array.from(
      new Set(
        activeRates
          .map((rate) => rate.to_currency?.toUpperCase())
          .filter(Boolean),
      ),
    );
    return unique.sort((a, b) => a.localeCompare(b));
  }, [currencyRates]);
  const selectedUsdToCurrencyRate = useMemo(() => {
    return currencyRates.find((rate) => {
      const rawStatus = String(rate.status).toLowerCase();
      return (
        rate.from_currency?.toUpperCase() === "USD" &&
        rate.to_currency?.toUpperCase() === currency.toUpperCase() &&
        (rawStatus === "true" || rawStatus === "1" || rawStatus === "active")
      );
    });
  }, [currency, currencyRates]);
  const selectedDepositRate = Number(
    selectedUsdToCurrencyRate?.deposit_rate ?? 0,
  );
  const convertedUsdAmount =
    !isNaN(amountNum) && amountNum > 0 && selectedDepositRate > 0
      ? amountNum / selectedDepositRate
      : null;

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    try {
      setRequestsLoading(true);
      const statusParam = statusFilter !== "all" ? statusFilter : undefined;
      const res = await cashDepositApi.listRequests(token, 1, 50, statusParam);
      const raw = res as unknown as {
        success: boolean;
        data: { requests: CashDepositRecord[] };
      };
      if (raw.success && Array.isArray(raw.data?.requests)) {
        const sorted = [...raw.data.requests].sort((a, b) => {
          const idA = typeof a.id === "number" ? a.id : 0;
          const idB = typeof b.id === "number" ? b.id : 0;
          return idB - idA;
        });
        setRequests(sorted);
      }
    } catch (e) {
      console.error("Failed to fetch cash deposit requests:", e);
    } finally {
      setRequestsLoading(false);
    }
  }, [token, statusFilter]);

  const fetchMt5Accounts = useCallback(async () => {
    if (!token) {
      setMt5Accounts([]);
      return;
    }
    try {
      setMt5AccountsLoading(true);
      const response = await mt5AccountsApi.getAll(token);
      const accounts = Array.isArray(response.data?.mt5_accounts)
        ? response.data.mt5_accounts
        : [];
      setMt5Accounts(accounts);
    } catch (e) {
      console.error("Failed to fetch MT5 accounts:", e);
      setMt5Accounts([]);
    } finally {
      setMt5AccountsLoading(false);
    }
  }, [token]);

  const fetchCurrencyRates = useCallback(async () => {
    if (!token) {
      setCurrencyRates([]);
      return;
    }
    try {
      setCurrencyRatesLoading(true);
      const response = await userCurrencyRatesApi.list({
        token,
        page: 1,
        per_page: 500,
      });
      const rates = Array.isArray(response.data?.currencyRates)
        ? response.data.currencyRates
        : [];
      setCurrencyRates(rates);
    } catch (e) {
      console.error("Failed to fetch currency rates:", e);
      setCurrencyRates([]);
    } finally {
      setCurrencyRatesLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchRequests();
    void fetchMt5Accounts();
    void fetchCurrencyRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (availableCurrencies.length === 0) return;
    if (!availableCurrencies.includes(currency.toUpperCase())) {
      setCurrency(availableCurrencies[0]);
    }
  }, [availableCurrencies, currency]);

  useEffect(() => {
    if (!token) return;
    void fetchRequests();
  }, [statusFilter, fetchRequests, token]);

  const handleViewDetail = async (id: number) => {
    if (!token) return;
    setDetailOpen(true);
    setDetailRequest(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await cashDepositApi.getRequest(id, token);
      const raw = res as unknown as {
        success: boolean;
        data?: CashDepositRecord;
      };
      if (raw.success && raw.data) {
        setDetailRequest(raw.data);
      } else {
        setDetailError("Failed to load request details");
      }
    } catch (e) {
      console.error("Failed to fetch cash deposit request:", e);
      setDetailError(
        getFriendlyErrorMessage(e, {
          audience: "client",
          resource: "cash deposit request",
          action: "load",
        }),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handlePaymentProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentProof(file);
      const reader = new FileReader();
      reader.onloadend = () => setPaymentProofPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePaymentProof = () => {
    setPaymentProof(null);
    setPaymentProofPreview(null);
  };

  const handleNewDeposit = () => {
    setSubmitResult(null);
    setError(null);
    setPaymentProof(null);
    setPaymentProofPreview(null);
    setAmount("");
    setComment("");
    setTarget("wallet");
    setAccountRef("");
  };

  const handleSubmit = async () => {
    setError(null);

    if (!amount.trim()) {
      setError("Amount is required");
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a valid positive number");
      return;
    }
    if (target === "mt5" && !accountRef.trim()) {
      setError("Please select an MT5 account to credit the deposit");
      return;
    }
    if (!token) {
      setError("Authentication required");
      return;
    }
    if (!convertedUsdAmount || convertedUsdAmount <= 0) {
      setError(
        "Deposit conversion rate is currently unavailable for this currency",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await cashDepositApi.submit(
        {
          target,
          account_ref: target === "mt5" ? accountRef.trim() : undefined,
          amount: convertedUsdAmount,
          comment: comment.trim() || undefined,
          payment_proof: paymentProof || undefined,
        },
        token,
      );
      const raw = res as unknown as {
        success: boolean;
        message?: string;
        data?: {
          id: number;
          amount: number;
          target: string;
          status_label: string;
          created_at: string;
          mt5_account_id: string | null;
        };
      };
      if (raw.success && raw.data) {
        setSubmitResult(raw.data);
        setAmount("");
        setComment("");
        setPaymentProof(null);
        setPaymentProofPreview(null);
        toast.success(
          raw.message || "Cash deposit request submitted successfully",
        );
        void fetchRequests();
        notifyWalletRefresh();
      } else {
        setError(
          (raw as { message?: string }).message || "Submission failed",
        );
      }
    } catch (e) {
      console.error("Cash deposit error:", e);
      setError(
        getFriendlyErrorMessage(e, {
          audience: "client",
          resource: "cash deposit",
          action: "submit",
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left — Cash deposit info */}
        <div className="space-y-6">
          <DepositInfoPanel
            title="Cash deposit flow"
            tagline="Deposit cash into your account and submit a receipt or voucher for review."
            steps={[
              {
                icon: Wallet,
                title: "Choose credit target",
                text: "Credit to your main wallet or a specific MT5 trading account.",
              },
              {
                icon: Banknote,
                title: "Enter the amount",
                text: `Minimum deposit of ${MINIMUM_DEPOSIT_AMOUNT} USD equivalent.`,
              },
              {
                icon: Upload,
                title: "Attach a receipt",
                text: "Add a clear cash receipt or voucher as proof of payment.",
              },
            ]}
            verifyTitle="What to verify"
            verify={[
              {
                icon: Clock,
                title: "Processing time",
                text: "Your deposit is reviewed within 1-2 business days.",
              },
              {
                icon: Banknote,
                title: "Minimum deposit",
                text: `${MINIMUM_DEPOSIT_AMOUNT} USD equivalent is required.`,
              },
              {
                icon: ShieldCheck,
                title: "Credit",
                text: "Funds are credited after the admin team verifies your deposit.",
              },
            ]}
          />
        </div>

        {/* Right — Submit form */}
        <div className="space-y-6">
          <Card className="border border-border/60 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-bold">
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-1.5">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                Submit Cash Deposit
              </CardTitle>
              <CardDescription>
                Choose where the approved deposit should be credited and enter
                the deposit amount.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {submitResult ? (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                    <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">
                    Deposit Submitted
                  </h3>
                  <p className="mb-4 text-muted-foreground">
                    Your cash deposit request is under review and will be
                    credited soon.
                  </p>
                  <div className="space-y-3">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
                      <p className="text-sm text-emerald-800 dark:text-emerald-200">
                        The admin team is reviewing your deposit and will credit
                        the funds once approved.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                      onClick={handleNewDeposit}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Make New Cash Deposit
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  {/* Target */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Credit to <span className="text-destructive">*</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTarget("wallet")}
                        className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all ${
                          target === "wallet"
                            ? "border-primary bg-primary/5"
                            : "border-border/60 bg-muted/20 hover:border-primary/40"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            target === "wallet"
                              ? "bg-primary/20 text-primary"
                              : "bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          <Wallet className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            Main Wallet
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Credit to wallet
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTarget("mt5")}
                        className={`flex items-center gap-2 rounded-xl border-2 p-3 text-left transition-all ${
                          target === "mt5"
                            ? "border-primary bg-primary/5"
                            : "border-border/60 bg-muted/20 hover:border-primary/40"
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            target === "mt5"
                              ? "bg-primary/20 text-primary"
                              : "bg-muted/40 text-muted-foreground"
                          }`}
                        >
                          <Banknote className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            MT5 Account
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Credit to trading account
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* MT5 account selector */}
                  {target === "mt5" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">
                        MT5 Account <span className="text-destructive">*</span>
                      </Label>
                      {mt5AccountsLoading ? (
                        <Skeleton className="h-11 w-full rounded-xl" />
                      ) : mt5Accounts.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-4 text-center text-sm text-muted-foreground">
                          No MT5 accounts available right now.
                        </div>
                      ) : (
                        <Select
                          value={accountRef}
                          onValueChange={setAccountRef}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger
                            id="cash-mt5-account"
                            className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <SelectValue placeholder="Select an MT5 account" />
                          </SelectTrigger>
                          <SelectContent>
                            {mt5Accounts.map((acc) => (
                              <SelectItem key={acc.id} value={acc.account_id}>
                                {acc.account_id} · {acc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {selectedMt5Account && (
                        <p className="text-xs text-muted-foreground">
                          Crediting to {selectedMt5Account.account_id} (
                          {selectedMt5Account.name})
                        </p>
                      )}
                    </div>
                  )}

                  {/* Deposit Currency */}
                  <div className="space-y-2">
                    <Label htmlFor="cash-currency" className="text-sm font-semibold">
                      Deposit Currency <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={currency}
                      onValueChange={setCurrency}
                      disabled={
                        isSubmitting ||
                        currencyRatesLoading ||
                        availableCurrencies.length === 0
                      }
                    >
                      <SelectTrigger
                        id="cash-currency"
                        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCurrencies.length === 0 ? (
                          <SelectItem value="INR">
                            No currencies available
                          </SelectItem>
                        ) : (
                          availableCurrencies.map((code) => (
                            <SelectItem key={code} value={code}>
                              {code}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="cash-amount" className="text-sm font-semibold">
                      Amount ({currency.toUpperCase()}) <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Banknote className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="cash-amount"
                        type="number"
                        step="1"
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className="h-11 rounded-xl pl-9"
                        placeholder="100.00"
                        disabled={isSubmitting}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedDepositRate > 0
                        ? `Rate: 1 USD = ${selectedDepositRate.toFixed(2)} ${currency.toUpperCase()}`
                        : "USD conversion rate is currently unavailable for this currency."}
                    </p>
                    {convertedUsdAmount !== null && (
                      <p className="text-xs font-medium text-foreground">
                        USD equivalent: ${convertedUsdAmount.toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Comment */}
                  <div className="space-y-2">
                    <Label htmlFor="cash-comment" className="text-sm font-semibold">
                      Comment{" "}
                      <span className="text-muted-foreground font-normal">
                        (Optional)
                      </span>
                    </Label>
                    <textarea
                      id="cash-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border-2 border-border focus:border-primary bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none resize-none transition-colors"
                      placeholder="e.g. cash receipt / voucher reference"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Payment proof */}
                  <div className="space-y-2">
                    <Label htmlFor="cash-payment-proof" className="text-sm font-semibold">
                      Payment Proof{" "}
                      <span className="text-muted-foreground font-normal">
                        (Optional)
                      </span>
                    </Label>
                    {!paymentProof ? (
                      <div className="rounded-lg border-2 border-dashed border-border p-4 transition-colors hover:border-primary/50">
                        <label
                          htmlFor="cash-payment-proof"
                          className="flex flex-col items-center justify-center cursor-pointer"
                        >
                          <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                          <p className="text-xs text-foreground mb-1">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Image or document, up to 5MB
                          </p>
                        </label>
                        <input
                          id="cash-payment-proof"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                          onChange={handlePaymentProofChange}
                          className="hidden"
                          disabled={isSubmitting}
                        />
                      </div>
                    ) : (
                      <div className="relative border-2 border-border rounded-xl p-3">
                        <div className="flex items-center gap-3">
                          {paymentProofPreview && (
                            <img
                              src={paymentProofPreview}
                              alt="Payment proof preview"
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {paymentProof.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(paymentProof.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemovePaymentProof}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Optional cash receipt image or document (max 5MB).
                    </p>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={
                      isSubmitting ||
                      !amount.trim() ||
                      isNaN(amountNum) ||
                      amountNum <= 0 ||
                      !convertedUsdAmount ||
                      convertedUsdAmount < MINIMUM_DEPOSIT_AMOUNT ||
                      (target === "mt5" && !accountRef.trim())
                    }
                    className="h-11 w-full rounded-xl text-base font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Submit Deposit Request
                      </>
                    )}
                  </Button>
                  {convertedUsdAmount !== null &&
                    convertedUsdAmount > 0 &&
                    convertedUsdAmount < MINIMUM_DEPOSIT_AMOUNT && (
                      <p className="text-xs text-destructive font-medium">
                        Minimum deposit amount is ${MINIMUM_DEPOSIT_AMOUNT} USD
                        (equivalent:{" "}
                        {(MINIMUM_DEPOSIT_AMOUNT * selectedDepositRate).toFixed(
                          2,
                        )}{" "}
                        {currency.toUpperCase()})
                      </p>
                    )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Request history — full width below the grid */}
      <Card className="border border-border/60 bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Your Requests
            </CardTitle>
            <CardDescription className="text-xs">
              Recent cash deposit submissions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="h-8 w-[140px] rounded-lg px-2 text-xs">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRequests}
              disabled={requestsLoading}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${requestsLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {requestsLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
              <FileText className="h-8 w-8 opacity-40" />
              <p className="text-sm">No cash deposit requests yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs">Sr. No.</TableHead>
                    <TableHead className="text-xs">Amount (USD)</TableHead>
                    <TableHead className="text-xs">Target</TableHead>
                    <TableHead className="text-xs">MT5 Account</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req, index) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="text-sm font-semibold">
                        ${Number(req.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs capitalize">
                        {req.target === "mt5" ? "MT5 Account" : "Wallet"}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">
                        {req.mt5_account_id || "-"}
                      </TableCell>
                      <TableCell>
                        <CashStatusBadge status={req.status_label} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(req.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleViewDetail(req.id)}
                          className="h-8 w-8 p-0"
                          aria-label={`View cash deposit request ${req.id}`}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Cash Deposit Request Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about the selected cash deposit request.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-5 w-full rounded-lg" />
              <Skeleton className="h-5 w-full rounded-lg" />
              <Skeleton className="h-5 w-3/4 rounded-lg" />
              <Skeleton className="h-5 w-1/2 rounded-lg" />
            </div>
          ) : detailError ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {detailError}
            </div>
          ) : detailRequest ? (
            <div className="space-y-3 py-2">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Request ID
                    </div>
                    <div className="mt-1 text-sm font-medium text-foreground">
                      #{detailRequest.id}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </div>
                    <div className="mt-1">
                      <CashStatusBadge status={detailRequest.status_label} />
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Amount
                    </div>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      ${Number(detailRequest.amount).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Credit Target
                    </div>
                    <div className="mt-1 text-sm font-medium text-foreground capitalize">
                      {detailRequest.target === "mt5"
                        ? "MT5 Account"
                        : "Wallet"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      MT5 Account
                    </div>
                    <div className="mt-1 font-mono text-sm font-medium text-foreground">
                      {detailRequest.mt5_account_id || "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      MT5 Login
                    </div>
                    <div className="mt-1 font-mono text-sm font-medium text-foreground">
                      {detailRequest.mt5_login ?? "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Created At
                    </div>
                    <div className="mt-1 text-sm text-foreground">
                      {formatDateTime(detailRequest.created_at)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Updated At
                    </div>
                    <div className="mt-1 text-sm text-foreground">
                      {formatDateTime(detailRequest.updated_at)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  User Comment
                </div>
                <p className="mt-1 text-sm text-foreground">
                  {detailRequest.user_comment || "-"}
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Admin Comment
                </div>
                <p className="mt-1 text-sm text-foreground">
                  {detailRequest.admin_comment || "-"}
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Payment Proof
                </div>
                {detailRequest.file ? (
                  <p className="mt-1 font-mono text-xs break-all text-foreground">
                    {detailRequest.file}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    No payment proof attached
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
