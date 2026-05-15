'use client'
import React, { useEffect, useState } from "react";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { withdrawalApi, walletApi, type WalletSummaryData, type WithdrawalItem } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";
import { CLIENT_WALLET_REFRESH_EVENT, notifyWalletRefresh } from "@/lib/client-events";
import {
  Wallet,
  DollarSign,
  ArrowUpRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Network,
  Copy,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  TrendingDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTimeInIST } from "@/lib/formatters";

const CHAIN_OPTIONS = [
  { value: "TRC20", label: "TRC20 (Tron)", network: "Tron Network" },
  { value: "ERC20", label: "ERC20 (Ethereum)", network: "Ethereum Network" },
  { value: "BEP20", label: "BEP20 (BNB Smart Chain)", network: "BNB Smart Chain" },
  { value: "BSC", label: "BSC (BNB Smart Chain)", network: "BNB Smart Chain" },
  { value: "ETH", label: "ETH (Ethereum)", network: "Ethereum Network" },
];

function WithdrawalRequestContent() {
  const { token } = useAuth();
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [chainId, setChainId] = useState("TRC20");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState<WithdrawalItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [walletData, setWalletData] = useState<WalletSummaryData | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);

  const selectedChain = CHAIN_OPTIONS.find((chain) => chain.value === chainId);
  const minimumAmount = 10.0;

  const fetchWalletSummary = async () => {
    if (!token) {
      setWalletLoading(false);
      return;
    }

    try {
      setWalletLoading(true);
      const response = await walletApi.getSummary(token);

      if (response.success && response.data) {
        setWalletData(response.data);
      }
    } catch (err) {
      console.error("Error fetching wallet summary:", err);
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    void fetchWalletSummary();
  }, [token]);

  useEffect(() => {
    const handleWalletRefresh = () => {
      void fetchWalletSummary();
    };

    window.addEventListener(CLIENT_WALLET_REFRESH_EVENT, handleWalletRefresh);
    return () => {
      window.removeEventListener(CLIENT_WALLET_REFRESH_EVENT, handleWalletRefresh);
    };
  }, [token]);

  const totalBalance = walletData?.total_balance || 0;
  const withdrawalAmount = parseFloat(amount) || 0;
  const remainingBalance = totalBalance - withdrawalAmount;
  const wallets = walletData ? Object.values(walletData.wallets) : [];
  const mainWallet = wallets.find((wallet) => wallet.is_primary) || wallets[0];
  const currency = mainWallet?.currency || "USDT";
  const withdrawalExposure =
    totalBalance > 0 ? Math.min(100, Math.round((withdrawalAmount / totalBalance) * 100)) : 0;

  const formatAmount = (value: string | number) => {
    const numericValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numericValue)) return "0.00";
    return numericValue.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  };

  const handleCopyAddress = async () => {
    if (!walletAddress) return;

    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (copyError) {
      console.error("Failed to copy address:", copyError);
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      setError("Authentication required. Please log in again.");
      return;
    }

    setError(null);
    setSuccess(false);

    if (!amount.trim()) {
      setError("Amount is required");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a valid positive number");
      return;
    }

    if (amountNum < minimumAmount) {
      setError(`Minimum withdrawal amount is ${minimumAmount} ${currency}`);
      return;
    }

    if (amountNum > totalBalance) {
      setError(`Insufficient balance. Available: ${formatAmount(totalBalance)} ${currency}`);
      return;
    }

    if (!walletAddress.trim()) {
      setError("Wallet address is required");
      return;
    }

    if (!chainId) {
      setError("Please select a network");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await withdrawalApi.create(
        {
          amount,
          wallet_address: walletAddress.trim(),
          chain_id: chainId,
        },
        token
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to create withdrawal request");
      }

      setWithdrawalData(response.data || null);
      setSuccess(true);
      setIsSubmitting(false);
      void fetchWalletSummary();
      notifyWalletRefresh();

      setTimeout(() => {
        setAmount("");
        setWalletAddress("");
      }, 3000);
    } catch (err) {
      console.error("Error creating withdrawal request:", err);
      setError(
        getFriendlyErrorMessage(err, {
          audience: "client",
          resource: "withdrawal request",
          action: "create",
        })
      );
      setIsSubmitting(false);
    }
  };

  const amountNum = parseFloat(amount);
  const isValidAmount =
    amount.trim() !== "" && !isNaN(amountNum) && amountNum >= minimumAmount && amountNum > 0;
  const hasWalletAddress = walletAddress.trim().length > 0;
  const hasChainId = chainId !== "";
  const hasToken = !!token;
  const canSubmit = isValidAmount && hasWalletAddress && hasChainId && !isSubmitting && hasToken;

  return (
    <div className="min-h-screen w-full bg-background px-4 py-6 lg:px-6 xl:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-sm">
            <TrendingDown className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Crypto Withdrawal
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Move funds from your wallet to an external crypto address by choosing the correct
              network, confirming the destination, and submitting the request for review.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-border/60 bg-gradient-to-br from-card via-card to-muted/20 shadow-sm">
          <div className="grid gap-6 p-6 md:p-8 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="flex flex-col space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Withdrawal Desk
              </div>

              <div className="rounded-2xl border border-border/50 bg-background/70 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Network-Aware Transfers
                </p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground md:text-[15px]">
                  This request flow supports multiple blockchain networks. Match the selected
                  network to the receiving wallet exactly to avoid rejected or delayed transfers.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Available Balance
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {walletLoading ? "--" : formatAmount(totalBalance)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{currency}</p>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Selected Network
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {selectedChain?.label ?? "Choose a network"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selectedChain?.network ?? "No network selected"}
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Last Request
                  </p>
                  <p className="mt-2 text-base font-semibold text-foreground">
                    {withdrawalData?.amount
                      ? `${formatAmount(withdrawalData.amount)} ${currency}`
                      : "No recent withdrawals"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {withdrawalData?.created_at
                      ? formatDateTimeInIST(withdrawalData.created_at)
                      : "Your latest submitted request will appear here"}
                  </p>
                </div>
              </div>
            </div>

            <Card className="border border-border/60 bg-card/90 shadow-none">
              <CardContent className="space-y-5 p-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                    <div className="rounded-lg border border-border/60 bg-muted/40 p-1.5">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    </div>
                    Withdrawal Readiness
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Validate balance coverage, network choice, and destination details before
                    sending the request.
                  </p>
                </div>

                {walletLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-2 w-full rounded-full" />
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <span>Amount entered</span>
                        <span>{withdrawalExposure}% of available balance</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full transition-all duration-300 ${
                            remainingBalance < 0
                              ? "bg-destructive"
                              : remainingBalance < minimumAmount
                                ? "bg-amber-500"
                                : "bg-gradient-to-r from-primary to-primary/70"
                          }`}
                          style={{ width: `${withdrawalExposure}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <p className="text-xs font-medium text-muted-foreground">
                        Projected remaining balance
                      </p>
                      <p
                        className={`mt-2 text-2xl font-semibold ${
                          remainingBalance < 0
                            ? "text-destructive"
                            : remainingBalance < minimumAmount
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-foreground"
                        }`}
                      >
                        {formatAmount(Math.max(remainingBalance, 0))} {currency}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Minimum request threshold: {formatAmount(minimumAmount)} {currency}
                      </p>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/80 px-4 py-3">
                        <span className="text-muted-foreground">Destination network</span>
                        <span className="font-medium text-foreground">
                          {selectedChain?.value ?? "Pending"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/80 px-4 py-3">
                        <span className="text-muted-foreground">Wallet address</span>
                        <span className="max-w-[160px] truncate font-mono text-xs text-foreground">
                          {walletAddress || "Not provided yet"}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void fetchWalletSummary()}
                      className="gap-2"
                      disabled={walletLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${walletLoading ? "animate-spin" : ""}`} />
                      Refresh balance
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardContent className="space-y-6 p-6 md:p-8">
              {!success ? (
                <>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Transfer Request
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      Submit Withdrawal Details
                    </h2>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                      Enter the amount, select the destination blockchain, and provide the exact
                      receiving wallet address for your withdrawal request.
                    </p>
                  </div>

                  {error && (
                    <ApiErrorState
                      message={error}
                      audience="client"
                      resource="withdrawal request"
                      action="submit"
                      variant="inline"
                    />
                  )}

                  <div className="space-y-3">
                    <Label htmlFor="amount" className="text-sm font-semibold text-foreground">
                      Amount <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min={minimumAmount}
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        className="h-12 rounded-xl border-2 border-border bg-background pl-10 focus:border-primary"
                        placeholder="10.00"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Minimum withdrawal amount: {formatAmount(minimumAmount)} {currency}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="chain_id" className="text-sm font-semibold text-foreground">
                      Blockchain Network <span className="text-destructive">*</span>
                    </Label>
                    <Select value={chainId} onValueChange={setChainId}>
                      <SelectTrigger className="h-12 w-full rounded-xl border-2 border-border bg-background focus:border-primary">
                        <div className="flex items-center gap-2">
                          <Network className="h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Select network" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {CHAIN_OPTIONS.map((chain) => (
                          <SelectItem key={chain.value} value={chain.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{chain.label}</span>
                              <span className="text-xs text-muted-foreground">{chain.network}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedChain && (
                      <p className="text-xs text-muted-foreground">
                        Selected network: {selectedChain.network}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="wallet_address" className="text-sm font-semibold text-foreground">
                      Destination Wallet Address <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="wallet_address"
                        value={walletAddress}
                        onChange={(event) => setWalletAddress(event.target.value)}
                        className="h-12 rounded-xl border-2 border-border bg-background pl-10 pr-20 font-mono text-sm focus:border-primary"
                        placeholder="Paste your wallet address"
                      />
                      {walletAddress && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyAddress}
                          className="absolute right-2 top-2 h-8 px-2 text-xs"
                        >
                          <Copy className="h-4 w-4" />
                          {copied ? "Copied!" : "Copy"}
                        </Button>
                      )}
                    </div>
                    <div className="flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-50/80 px-3 py-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                      <p>
                        Paste the destination address exactly as shown by the receiving wallet, and
                        make sure it supports the selected network.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-300/60 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                      <div className="space-y-1 text-xs text-amber-900 dark:text-amber-100">
                        <p className="font-semibold">Before you submit:</p>
                        <ul className="space-y-1">
                          <li>Double-check the wallet address and network combination.</li>
                          <li>Processing can take 24-48 hours depending on review and network conditions.</li>
                          <li>Network fees can differ by chain and destination wallet.</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="h-12 w-full rounded-xl text-base font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-5 w-5" />
                        Submit Withdrawal Request
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <div className="py-4">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/20">
                    <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-emerald-900 dark:text-emerald-100">
                    Withdrawal Request Submitted!
                  </h3>
                  <p className="mb-6 text-sm leading-6 text-muted-foreground">
                    Your withdrawal request has been successfully submitted and is pending review.
                  </p>

                  {withdrawalData && (
                    <div className="mb-6 space-y-4">
                      <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Amount:</span>
                          <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                            {typeof withdrawalData.amount === "number"
                              ? withdrawalData.amount.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 8,
                                })
                              : parseFloat(withdrawalData.amount || amount).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 8,
                                })}{" "}
                            {currency}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Network:</span>
                          <Badge
                            variant="outline"
                            className="bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100"
                          >
                            {withdrawalData.chain_id || chainId}
                          </Badge>
                        </div>
                        <div className="flex items-start justify-between">
                          <span className="text-sm text-muted-foreground">Wallet:</span>
                          <code className="max-w-[70%] break-all rounded bg-emerald-100 px-2 py-1 text-right text-xs font-mono dark:bg-emerald-900">
                            {withdrawalData.wallet_address || walletAddress}
                          </code>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status:</span>
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                            <Clock className="mr-1 h-3 w-3" />
                            {withdrawalData.status || "Pending"}
                          </Badge>
                        </div>
                        {withdrawalData.id && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Request ID:</span>
                            <span className="font-mono text-sm text-emerald-800 dark:text-emerald-200">
                              #{withdrawalData.id}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.location.href = "/funds/withdraw";
                      }}
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Withdrawal Status
                    </Button>
                    <Button
                      onClick={() => {
                        setSuccess(false);
                        setWithdrawalData(null);
                        setAmount("");
                        setWalletAddress("");
                      }}
                    >
                      New Withdrawal
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border border-border/60 bg-card shadow-sm">
              <CardContent className="space-y-5 p-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Transfer Flow
                  </p>
                  <h3 className="text-lg font-semibold text-foreground">How it works</h3>
                </div>

                <div className="space-y-3">
                  {[
                    `Enter the withdrawal amount with a minimum of ${formatAmount(minimumAmount)} USD.`,
                    "Select the blockchain network that matches the receiving wallet.",
                    "Paste the destination wallet address exactly as provided by the receiving platform.",
                    "Submit the request and wait for internal review plus network-side processing.",
                  ].map((step, index) => (
                    <div
                      key={step}
                      className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">{step}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 bg-card shadow-sm">
              <CardContent className="space-y-4 p-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Request Signals
                  </p>
                  <h3 className="text-lg font-semibold text-foreground">What to verify</h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="rounded-xl border border-border/50 bg-background/80 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Address format
                    </p>
                    <p className="mt-1 leading-6 text-muted-foreground">
                      Make sure the destination address belongs to the same chain you selected in
                      the network dropdown.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/80 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Processing window
                    </p>
                    <p className="mt-1 leading-6 text-muted-foreground">
                      Requests can remain pending while the team verifies the destination and
                      network before release.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/80 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Fee awareness
                    </p>
                    <p className="mt-1 leading-6 text-muted-foreground">
                      Different chains can have different final delivery costs and settlement times.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WithdrawalRequestPage() {
  return <WithdrawalRequestContent />;
}
