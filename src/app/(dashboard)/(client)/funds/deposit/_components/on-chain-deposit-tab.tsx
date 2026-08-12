"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { submitUSDTDeposit } from "@/utils/operations";
import { userBrokerCryptoWalletsApi, type BrokerCryptoWalletItem } from "@/lib/api-auth-admin";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";
import { notifyWalletRefresh } from "@/lib/client-events";
import toast from "react-hot-toast";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  Hash,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import {
  MINIMUM_DEPOSIT_AMOUNT,
  MINIMUM_DEPOSIT_AMOUNT_LABEL,
  SETTLEMENT_LABEL,
  getExplorerTxUrl,
  useAuthImageUrl,
} from "./deposit-shared";

export function OnChainDepositTab({ token }: { token: string | null }) {
  const [cryptoWallets, setCryptoWallets] = useState<BrokerCryptoWalletItem[]>([]);
  const [cryptoWalletsLoading, setCryptoWalletsLoading] = useState(false);
  const [cryptoWalletsError, setCryptoWalletsError] = useState<string | null>(null);
  const [selectedCryptoWalletId, setSelectedCryptoWalletId] = useState<number | null>(null);
  const [cryptoCopied, setCryptoCopied] = useState(false);

  const [amount, setAmount] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [usdtComment, setUsdtComment] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [depositStatus, setDepositStatus] = useState("pending");
  const [error, setError] = useState<string | null>(null);

  const selectedCryptoWallet =
    cryptoWallets.find((w) => w.id === selectedCryptoWalletId) ||
    cryptoWallets[0] ||
    null;
  const authScreenshotUrl = useAuthImageUrl(
    selectedCryptoWallet?.wallet_screenshot_url,
    token,
  );

  const fetchCryptoWallets = useCallback(async () => {
    if (!token) {
      setCryptoWallets([]);
      setCryptoWalletsError(null);
      return;
    }
    try {
      setCryptoWalletsLoading(true);
      setCryptoWalletsError(null);
      const response = await userBrokerCryptoWalletsApi.list(token);
      const wallets = Array.isArray(response.data) ? response.data : [];
      setCryptoWallets(wallets);
      if (wallets.length > 0 && selectedCryptoWalletId === null) {
        setSelectedCryptoWalletId(wallets[0].id);
      }
    } catch (fetchError) {
      console.error("Failed to fetch crypto wallets:", fetchError);
      setCryptoWallets([]);
      setCryptoWalletsError(
        getFriendlyErrorMessage(fetchError, {
          audience: "client",
          resource: "crypto wallet details",
          action: "load",
        }),
      );
    } finally {
      setCryptoWalletsLoading(false);
    }
  }, [token, selectedCryptoWalletId]);

  useEffect(() => {
    void fetchCryptoWallets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handlePaymentProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentProof(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePaymentProof = () => {
    setPaymentProof(null);
    setPaymentProofPreview(null);
  };

  const handleSubmitHash = async () => {
    setError(null);

    if (!amount.trim()) {
      setError("Amount is required");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a valid positive number");
      return;
    }

    if (!transactionHash.trim() && !paymentProof) {
      setError("Transaction hash and payment proof are both required");
      return;
    }
    if (!transactionHash.trim()) {
      setError("Transaction hash is required");
      return;
    }
    if (!paymentProof) {
      setError("Payment proof (screenshot) is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await submitUSDTDeposit(
        {
          amount: amount,
          transaction_hash: transactionHash.trim(),
          payment_proof: paymentProof || undefined,
          comment: usdtComment.trim() || undefined,
        },
        token || undefined,
      );

      if (!data.success) {
        throw new Error(data.message || "Failed to submit deposit");
      }

      setDepositStatus("submitted");
      setIsSubmitting(false);
      notifyWalletRefresh();

      setTimeout(() => {
        setDepositStatus("confirmed");
      }, 3000);
    } catch (err) {
      console.error("Error submitting deposit:", err);
      setError(
        getFriendlyErrorMessage(err, {
          audience: "client",
          resource: "deposit",
          action: "submit",
        }),
      );
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    amount.trim() !== "" &&
    parseFloat(amount) > 0 &&
    transactionHash.trim() !== "" &&
    paymentProof !== null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column - Crypto Wallet Details */}
        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="text-center pb-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex-1" />
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                  <div className="rounded-lg border border-primary/20 bg-primary/10 p-1.5">
                    <QrCode className="h-5 w-5 text-primary" />
                  </div>
                  Transfer Destination
                </CardTitle>
                <CardDescription>
                  Select a wallet and use the transfer details below for your
                  deposit.
                </CardDescription>
              </div>
              <div className="flex flex-1 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchCryptoWallets}
                  disabled={cryptoWalletsLoading}
                  aria-label="Refresh crypto wallets"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${cryptoWalletsLoading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 relative z-10">
            {cryptoWalletsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-border/50 bg-muted/20 p-4"
                  >
                    <Skeleton className="mb-3 h-5 w-40" />
                    <Skeleton className="h-20 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : cryptoWalletsError ? (
              <ApiErrorState
                message={cryptoWalletsError}
                audience="client"
                resource="crypto wallet details"
                action="load"
                variant="inline"
              />
            ) : cryptoWallets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                Crypto wallet details are not available right now. Please contact
                support before sending funds.
              </div>
            ) : (
              <>
                {/* Wallet Selector - show if multiple wallets */}
                {cryptoWallets.length > 1 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">
                      Select Wallet
                    </Label>
                    <div className="flex flex-col gap-2">
                      {cryptoWallets.map((wallet) => (
                        <button
                          key={wallet.id}
                          type="button"
                          onClick={() => setSelectedCryptoWalletId(wallet.id)}
                          className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                            selectedCryptoWalletId === wallet.id
                              ? "border-primary bg-primary/5"
                              : "border-border/60 bg-muted/20 hover:border-primary/40"
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                              selectedCryptoWalletId === wallet.id
                                ? "bg-primary/20 text-primary"
                                : "bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            <QrCode className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <div className="text-sm font-semibold text-foreground truncate">
                              {wallet.currency ? `${wallet.currency} · ` : ""}
                              {wallet.label || wallet.network}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono truncate">
                              {wallet.wallet_address}
                            </div>
                          </div>
                          <Badge
                            variant={
                              selectedCryptoWalletId === wallet.id
                                ? "default"
                                : "secondary"
                            }
                            className="shrink-0 max-w-[140px] truncate"
                          >
                            {wallet.network}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Wallet Details */}
                {selectedCryptoWallet && (
                  <>
                    {selectedCryptoWallet.wallet_screenshot_url && (
                      <div className="flex justify-center">
                        <div className="rounded-[28px] border border-border/60 bg-muted/20 p-5 shadow-inner">
                          {authScreenshotUrl ? (
                            <img
                              src={authScreenshotUrl}
                              alt={`${selectedCryptoWallet.label || selectedCryptoWallet.network} wallet QR code`}
                              className="h-64 w-64 rounded-2xl bg-white object-contain"
                            />
                          ) : (
                            <Skeleton className="h-64 w-64 rounded-2xl" />
                          )}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                        <div className="text-xs font-medium text-muted-foreground">
                          Network
                        </div>
                        <Badge variant="secondary" className="mt-1.5 max-w-full truncate">
                          {selectedCryptoWallet.network}
                        </Badge>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                        <div className="text-xs font-medium text-muted-foreground">
                          Currency
                        </div>
                        <Badge variant="secondary" className="mt-1.5 max-w-full truncate">
                          {selectedCryptoWallet.currency}
                        </Badge>
                      </div>
                      <div className="col-span-2 rounded-2xl border border-border/60 bg-muted/20 p-3">
                        <div className="text-xs font-medium text-muted-foreground">
                          Minimum
                        </div>
                        <div className="mt-1.5 font-semibold text-foreground">
                          {MINIMUM_DEPOSIT_AMOUNT_LABEL}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground">
                        Destination Address
                      </Label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted/50 rounded-lg p-3 border">
                          <code className="text-sm font-mono break-all">
                            {selectedCryptoWallet.wallet_address}
                          </code>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard
                              .writeText(selectedCryptoWallet.wallet_address)
                              .then(() => {
                                setCryptoCopied(true);
                                setTimeout(() => setCryptoCopied(false), 1500);
                              });
                          }}
                          className="h-12 px-3 bg-background hover:bg-accent border-border"
                        >
                          <Copy className="h-4 w-4" />
                          {cryptoCopied ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Important Notes */}
                <div className="rounded-2xl border border-amber-300/40 bg-amber-50/70 p-4 dark:border-amber-800/50 dark:bg-amber-950/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="text-sm text-amber-900 dark:text-amber-100">
                      <p className="font-medium mb-1">Important Notes:</p>
                      <ul className="space-y-1 text-xs text-amber-800/90 dark:text-amber-200/90">
                        <li>
                          Only send supported assets on the selected network
                        </li>
                        <li>Minimum deposit: {MINIMUM_DEPOSIT_AMOUNT_LABEL}</li>
                        <li>
                          Confirmation time may vary depending on network traffic
                        </li>
                        <li>
                          Double-check the address and network before sending
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right Column - Transaction Hash Submission */}
        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="relative z-10">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <div className="rounded-lg border border-primary/20 bg-primary/10 p-1.5">
                <Hash className="h-5 w-5 text-primary" />
              </div>
              Submit Transfer Details
            </CardTitle>
            <CardDescription>
              After sending funds, submit the transfer details for review. We
              will verify the payment and process the deposit shortly.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 relative z-10">
            {depositStatus === "pending" && (
              <>
                {error && (
                  <ApiErrorState
                    message={error}
                    audience="client"
                    resource="deposit"
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
                      step="1"
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      className="pl-10 h-12 border-2 border-border focus:border-primary rounded-xl"
                      placeholder="100.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the amount you transferred (minimum:{" "}
                    {MINIMUM_DEPOSIT_AMOUNT_LABEL})
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="txhash" className="text-sm font-semibold text-foreground">
                    Transaction Hash <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="txhash"
                      value={transactionHash}
                      onChange={(e) => setTransactionHash(e.target.value)}
                      className="pl-10 h-12 border-2 border-border focus:border-primary rounded-xl"
                      placeholder="Enter your transaction hash"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You can find this in your wallet&apos;s transaction history
                    or on the blockchain explorer
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="usdt-comment" className="text-sm font-semibold text-foreground">
                    Comment{" "}
                    <span className="text-muted-foreground font-normal">
                      (Optional)
                    </span>
                  </Label>
                  <textarea
                    id="usdt-comment"
                    value={usdtComment}
                    onChange={(e) => setUsdtComment(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border-2 border-border focus:border-primary bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none resize-none transition-colors"
                    placeholder="Add any additional notes for this deposit (optional)"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="payment_proof" className="text-sm font-semibold text-foreground">
                    Payment Proof (Screenshot){" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  {!paymentProof ? (
                    <div className="rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50">
                      <label
                        htmlFor="payment_proof"
                        className="flex flex-col items-center justify-center cursor-pointer"
                      >
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-foreground mb-1">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, WEBP up to 5MB
                        </p>
                      </label>
                      <input
                        id="payment_proof"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handlePaymentProofChange}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="relative border-2 border-border rounded-xl p-4">
                      <div className="flex items-center gap-4">
                        {paymentProofPreview && (
                          <img
                            src={paymentProofPreview}
                            alt="Payment proof preview"
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
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
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Upload a screenshot of your transaction (JPEG, PNG, or WebP,
                    max 5MB)
                  </p>
                </div>

                <Button
                  onClick={handleSubmitHash}
                  disabled={
                    !canSubmit ||
                    isSubmitting ||
                    parseFloat(amount) < MINIMUM_DEPOSIT_AMOUNT
                  }
                  className="h-12 w-full rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-5 w-5 mr-2" />
                      Submit Deposit Details
                    </>
                  )}
                </Button>
                {amount &&
                  parseFloat(amount) > 0 &&
                  parseFloat(amount) < MINIMUM_DEPOSIT_AMOUNT && (
                    <p className="text-xs text-destructive font-medium">
                      Minimum deposit amount is ${MINIMUM_DEPOSIT_AMOUNT} USD
                    </p>
                  )}
              </>
            )}

            {depositStatus === "submitted" && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Clock className="h-8 w-8 animate-spin text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  Deposit Submitted
                </h3>
                <p className="mb-4 text-muted-foreground">
                  Your deposit request is under review by the admin team.
                  We&apos;ll verify the transaction details and process it soon.
                </p>
                <div className="mb-3 rounded-lg border border-border bg-muted/40 p-4">
                  <p className="break-all text-sm text-foreground">
                    Hash: {transactionHash}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Once approved, the deposit will reflect in your wallet and
                  account history.
                </p>
              </div>
            )}

            {depositStatus === "confirmed" && (
              <div className="py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  Deposit Processed
                </h3>
                <p className="mb-4 text-muted-foreground">
                  Your deposit is under review and will be credited soon!
                </p>
                <div className="space-y-3">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
                    <p className="text-sm text-emerald-800 dark:text-emerald-200">
                      The admin team is reviewing your deposit and will credit
                      the funds to your wallet once approved.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      className="w-full border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                      onClick={() => {
                        const url = getExplorerTxUrl(
                          selectedCryptoWallet?.network,
                          transactionHash,
                        );
                        if (url) {
                          window.open(url, "_blank");
                        } else {
                          toast.error(
                            "Explorer URL not available for this network",
                          );
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on{" "}
                      {selectedCryptoWallet?.network?.split(" ")[0] ||
                        "Block"}{" "}
                      Explorer
                    </Button>
                    <Button
                      variant="default"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => {
                        setDepositStatus("pending");
                        setAmount("");
                        setTransactionHash("");
                        setPaymentProof(null);
                        setPaymentProofPreview(null);
                        setError(null);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Make Another Deposit
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {depositStatus === "pending" && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
                  How it works:
                </h4>
                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">
                        1
                      </span>
                    </div>
                    <span>Scan QR or copy the deposit address</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">
                        2
                      </span>
                    </div>
                    <span>Send funds using your preferred wallet</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">
                        3
                      </span>
                    </div>
                    <span>Submit the transaction hash here</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
