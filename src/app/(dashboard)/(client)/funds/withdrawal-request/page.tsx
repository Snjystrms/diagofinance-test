"use client";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import {
  withdrawalApi,
  walletApi,
  type WalletSummaryData,
  type WithdrawalItem,
} from "@/lib/api";
import {
  authApi,
  userCurrencyRatesApi,
  userPaymentMethodsApi,
  type CurrencyRateItem,
  type UserBankDetailsData,
  type UserPaymentMethod,
} from "@/lib/api-auth-admin";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";
import {
  CLIENT_WALLET_REFRESH_EVENT,
  notifyWalletRefresh,
} from "@/lib/client-events";
import {
  Wallet,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Network,
  Copy,
  ShieldCheck,
  ExternalLink,
  TrendingDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateTimeInIST } from "@/lib/formatters";

const CHAIN_OPTIONS = [
  { value: "TRC20", label: "TRC20 (Tron)", network: "Tron Network" },
  { value: "ERC20", label: "ERC20 (Ethereum)", network: "Ethereum Network" },
  {
    value: "BEP20",
    label: "BEP20 (BNB Smart Chain)",
    network: "BNB Smart Chain",
  },
  { value: "BSC", label: "BSC (BNB Smart Chain)", network: "BNB Smart Chain" },
  { value: "ETH", label: "ETH (Ethereum)", network: "Ethereum Network" },
];

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  india: "INR",
  "united states": "USD",
  usa: "USD",
  "united kingdom": "GBP",
  uk: "GBP",
  "great britain": "GBP",
  canada: "CAD",
  australia: "AUD",
  singapore: "SGD",
  uae: "AED",
  "united arab emirates": "AED",
  germany: "EUR",
  france: "EUR",
  italy: "EUR",
  spain: "EUR",
  netherlands: "EUR",
  ireland: "EUR",
  "new zealand": "NZD",
  japan: "JPY",
  china: "CNY",
  "south africa": "ZAR",
};

const getCurrencyFromCountry = (country?: string | null): string | null => {
  if (!country) return null;
  const normalizedCountry = country.trim().toLowerCase();
  if (!normalizedCountry) return null;
  return COUNTRY_CURRENCY_MAP[normalizedCountry] ?? null;
};


function WithdrawalRequestContent() {
  const { token } = useAuth();
  const [withdrawalType, setWithdrawalType] = useState<"crypto" | "bank">(
    "crypto",
  );
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [chainId, setChainId] = useState("TRC20");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState<WithdrawalItem | null>(
    null,
  );
  const [submittedWithdrawalType, setSubmittedWithdrawalType] = useState<
    "crypto" | "bank" | null
  >(null);
  const [submittedBankCredit, setSubmittedBankCredit] = useState<number | null>(
    null,
  );
  const [submittedBankCurrency, setSubmittedBankCurrency] = useState("");
  const [copied, setCopied] = useState(false);
  const [walletData, setWalletData] = useState<WalletSummaryData | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [bankDetails, setBankDetails] = useState<UserBankDetailsData | null>(
    null,
  );
  const [bankDetailsLoading, setBankDetailsLoading] = useState(true);
  const [bankTransferMethodId, setBankTransferMethodId] = useState<
    number | null
  >(null);
  const [localPaymentMethodId, setLocalPaymentMethodId] = useState<
    number | null
  >(null);
  const [currencyRates, setCurrencyRates] = useState<CurrencyRateItem[]>([]);
  const [withdrawalCurrency, setWithdrawalCurrency] = useState("INR");

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
    const fetchCurrencyRates = async () => {
      if (!token || withdrawalType !== "bank") {
        return;
      }
      try {
        const response = await userCurrencyRatesApi.list({
          token,
          page: 1,
          per_page: 500,
        });
        const rates = Array.isArray(response.data?.currencyRates)
          ? response.data.currencyRates
          : [];
        setCurrencyRates(rates);
      } catch (fetchError) {
        console.error("Failed to load currency rates:", fetchError);
        setCurrencyRates([]);
      }
    };
    void fetchCurrencyRates();
  }, [token, withdrawalType]);

  useEffect(() => {
    const fetchWithdrawalMeta = async () => {
      if (!token) {
        setBankDetails(null);
        setBankTransferMethodId(null);
        setLocalPaymentMethodId(null);
        setBankDetailsLoading(false);
        return;
      }
      try {
        setBankDetailsLoading(true);
        const [bankDetailsResponse, paymentMethodsResponse] = await Promise.all(
          [authApi.getBankDetails(token), userPaymentMethodsApi.list(token)],
        );

        const bankPayload = bankDetailsResponse.data as
          | UserBankDetailsData[]
          | UserBankDetailsData
          | { data?: UserBankDetailsData[] | UserBankDetailsData }
          | null
          | undefined;
        const bankList: UserBankDetailsData[] = Array.isArray(bankPayload)
          ? bankPayload
          : bankPayload && Array.isArray((bankPayload as { data?: unknown }).data)
            ? ((bankPayload as { data?: UserBankDetailsData[] }).data ?? [])
            : bankPayload && "id" in bankPayload
              ? [bankPayload as UserBankDetailsData]
              : [];
        const preferredBank =
          bankList.find((entry) => (entry.status ?? "").toLowerCase() === "approved") ??
          bankList[0] ??
          null;
        setBankDetails(preferredBank);

        const paymentPayload = paymentMethodsResponse.data as
          | { data?: UserPaymentMethod[] }
          | UserPaymentMethod[]
          | null
          | undefined;
        const methods: UserPaymentMethod[] = Array.isArray(paymentPayload)
          ? paymentPayload
          : Array.isArray(paymentPayload?.data)
            ? paymentPayload.data
            : [];
        const bankTransferMethod = methods.find(
          (method) => method.type === "bank_transfer",
        );
        const localPaymentMethod = methods.find(
          (method) => method.type === "local",
        );
        setBankTransferMethodId(
          typeof bankTransferMethod?.id === "number"
            ? bankTransferMethod.id
            : null,
        );
        setLocalPaymentMethodId(
          typeof localPaymentMethod?.id === "number"
            ? localPaymentMethod.id
            : null,
        );
      } catch (fetchError) {
        console.error("Failed to load withdrawal metadata:", fetchError);
        setBankDetails(null);
        setBankTransferMethodId(null);
        setLocalPaymentMethodId(null);
      } finally {
        setBankDetailsLoading(false);
      }
    };

    void fetchWithdrawalMeta();
  }, [token]);

  useEffect(() => {
    const handleWalletRefresh = () => {
      void fetchWalletSummary();
    };

    window.addEventListener(CLIENT_WALLET_REFRESH_EVENT, handleWalletRefresh);
    return () => {
      window.removeEventListener(
        CLIENT_WALLET_REFRESH_EVENT,
        handleWalletRefresh,
      );
    };
  }, [token]);

  const totalBalance = walletData?.total_balance || 0;
  const withdrawalAmount = parseFloat(amount) || 0;
  const remainingBalance = totalBalance - withdrawalAmount;
  const wallets = walletData ? Object.values(walletData.wallets) : [];
  const mainWallet = wallets.find((wallet) => wallet.is_primary) || wallets[0];
  const mainWalletBalance =
    walletData?.wallets?.main?.balance ?? mainWallet?.balance ?? 0;
  const currency = mainWallet?.currency || "USDT";
  const withdrawalExposure =
    totalBalance > 0
      ? Math.min(100, Math.round((withdrawalAmount / totalBalance) * 100))
      : 0;
  const supportsBankWithdrawal = !!bankTransferMethodId && !!bankDetails?.id;
  const isCryptoWithdrawal = withdrawalType === "crypto";
  const isBankWithdrawal = withdrawalType === "bank";

  const activeRatesFromUsd = useMemo(
    () =>
      currencyRates.filter((rate) => {
        const rawStatus = String(rate.status).toLowerCase();
        return (
          rate.from_currency?.toUpperCase() === "USD" &&
          (rawStatus === "true" || rawStatus === "1" || rawStatus === "active")
        );
      }),
    [currencyRates],
  );
  const availableWithdrawalCurrencies = useMemo(() => {
    const unique = Array.from(
      new Set(
        activeRatesFromUsd
          .map((rate) => rate.to_currency?.toUpperCase())
          .filter(Boolean),
      ),
    );
    return unique.sort((a, b) => a.localeCompare(b));
  }, [activeRatesFromUsd]);
  const destinationBankCurrency = withdrawalCurrency;
  
  // Set default withdrawal currency when available currencies are loaded
  useEffect(() => {
    if (availableWithdrawalCurrencies.length === 0) return;
    if (!availableWithdrawalCurrencies.includes(withdrawalCurrency.toUpperCase())) {
      setWithdrawalCurrency(availableWithdrawalCurrencies[0]);
    }
  }, [availableWithdrawalCurrencies, withdrawalCurrency]);

  const destinationCurrencyFromUsdRate = activeRatesFromUsd.find(
    (rate) =>
      rate.to_currency?.toUpperCase() ===
      destinationBankCurrency?.toUpperCase(),
  );
  const amountNumeric = parseFloat(amount);
  const selectedWithdrawalRate = Number(destinationCurrencyFromUsdRate?.withdrawal_rate ?? 0);
  const convertedBankAmount =
    !isNaN(amountNumeric) && amountNumeric > 0 && destinationBankCurrency
      ? destinationBankCurrency.toUpperCase() === "USD"
        ? amountNumeric
        : selectedWithdrawalRate > 0
          ? amountNumeric * selectedWithdrawalRate
          : null
      : null;

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
    setSubmittedWithdrawalType(null);
    setSubmittedBankCredit(null);
    setSubmittedBankCurrency("");

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
      setError(
        `Insufficient balance. Available: ${formatAmount(totalBalance)} ${currency}`,
      );
      return;
    }

    if (isCryptoWithdrawal) {
      if (!walletAddress.trim()) {
        setError("Wallet address is required");
        return;
      }
      if (!chainId) {
        setError("Please select a network");
        return;
      }
      if (!localPaymentMethodId) {
        setError("Crypto withdrawal is unavailable right now.");
        return;
      }
    } else if (!supportsBankWithdrawal) {
      setError(
        "Bank withdrawal is unavailable. Please add bank details first.",
      );
      return;
    } else if (convertedBankAmount === null) {
      setError("Bank withdrawal conversion rate is currently unavailable.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await withdrawalApi.create(
        isCryptoWithdrawal
          ? {
              amount,
              payment_method_id: localPaymentMethodId ?? undefined,
              wallet_address: walletAddress.trim(),
              chain_id: chainId,
            }
          : {
              amount,
              payment_method_id: bankTransferMethodId ?? undefined,
              bank_detail_id: bankDetails?.id ?? undefined,
            },
        token,
      );

      if (!response.success) {
        throw new Error(
          response.message || "Failed to create withdrawal request",
        );
      }

      setWithdrawalData(response.data || null);
      setSubmittedWithdrawalType(withdrawalType);
      setSubmittedBankCredit(isBankWithdrawal ? convertedBankAmount : null);
      setSubmittedBankCurrency(isBankWithdrawal ? withdrawalCurrency.toUpperCase() : "");
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
        }),
      );
      setIsSubmitting(false);
    }
  };

  const amountNum = parseFloat(amount);
  const isValidAmount =
    amount.trim() !== "" &&
    !isNaN(amountNum) &&
    amountNum >= minimumAmount &&
    amountNum > 0;
  const hasWalletAddress = isCryptoWithdrawal
    ? walletAddress.trim().length > 0
    : true;
  const hasChainId = isCryptoWithdrawal ? chainId !== "" : true;
  const hasBankSetup = isCryptoWithdrawal ? true : supportsBankWithdrawal;
  const hasToken = !!token;
  const canSubmit =
    isValidAmount &&
    hasWalletAddress &&
    hasChainId &&
    hasBankSetup &&
    !isSubmitting &&
    hasToken;

  return (
    <div className="min-h-screen w-full bg-background px-4 py-6 lg:px-6 xl:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-sm">
            <TrendingDown className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Withdrawal Request
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Choose Crypto or Bank withdrawal, fill required details, and
              submit your request for review.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Main Wallet
              </p>
              <p className="text-sm font-semibold text-foreground">
                {walletLoading
                  ? "--"
                  : `${formatAmount(mainWalletBalance)} USD`}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Type
              </p>
              <p className="text-sm font-semibold text-foreground">
                {isCryptoWithdrawal ? "Crypto" : "Bank"}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Network
              </p>
              <p className="truncate text-sm font-semibold text-foreground">
                {isCryptoWithdrawal
                  ? selectedChain?.value || "--"
                  : bankDetails?.bank_name || "Not configured"}
              </p>
            </div>
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
                      Select withdrawal type, enter amount, and submit with the
                      required details.
                    </p>
                  </div>

                  <Tabs
                    value={withdrawalType}
                    onValueChange={(value) =>
                      setWithdrawalType(value as "crypto" | "bank")
                    }
                    className="space-y-4"
                  >
                    <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl p-1">
                      <TabsTrigger value="crypto" className="rounded-lg">
                        Crypto Withdrawal
                      </TabsTrigger>
                      <TabsTrigger value="bank" className="rounded-lg">
                        Bank Withdrawal
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

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
                    <Label
                      htmlFor="amount"
                      className="text-sm font-semibold text-foreground"
                    >
                      Amount <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="amount"
                        type="number"
                        step="1"
                        min={minimumAmount}
                        value={amount}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        onChange={(event) => setAmount(event.target.value)}
                        className="h-12 rounded-xl border-2 border-border bg-background pl-10 focus:border-primary"
                        placeholder="10.00"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Minimum withdrawal amount: {formatAmount(minimumAmount)}{" "}
                      {currency}
                    </p>
                    {isBankWithdrawal && (
                      <div className="space-y-3">
                        <Label
                          htmlFor="withdrawal-currency"
                          className="text-sm font-semibold text-foreground"
                        >
                          Withdrawal Currency
                        </Label>
                        <select
                          id="withdrawal-currency"
                          value={withdrawalCurrency}
                          onChange={(e) => setWithdrawalCurrency(e.target.value)}
                          className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {availableWithdrawalCurrencies.length === 0 ? (
                            <option value="INR">No currencies available</option>
                          ) : (
                            availableWithdrawalCurrencies.map((code) => (
                              <option key={code} value={code}>
                                {code}
                              </option>
                            ))
                          )}
                        </select>
                        <p className="text-xs text-muted-foreground">
                          {selectedWithdrawalRate > 0
                            ? `Rate: 1 USD = ${selectedWithdrawalRate.toFixed(2)} ${withdrawalCurrency.toUpperCase()}`
                            : "Withdrawal conversion rate is currently unavailable for this currency."}
                        </p>
                        {amount.trim() !== "" &&
                          !isNaN(amountNumeric) &&
                          amountNumeric > 0 &&
                          convertedBankAmount !== null && (
                            <p className="text-xs font-medium text-foreground">
                              Estimated bank credit: {formatAmount(convertedBankAmount.toFixed(2))} {withdrawalCurrency.toUpperCase()}
                            </p>
                          )}
                      </div>
                    )}
                  </div>

                  {!isCryptoWithdrawal ? (
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground">
                        Your Bank Account (Withdrawal Destination)
                      </Label>
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Account Holder
                            </p>
                            <p className="font-medium text-foreground">
                              {bankDetails?.account_holder_name || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Bank Name
                            </p>
                            <p className="font-medium text-foreground">
                              {bankDetails?.bank_name || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Account Number
                            </p>
                            <p className="font-mono text-foreground">
                              {bankDetails?.account_number || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              IBAN
                            </p>
                            <p className="font-mono text-foreground">
                              {bankDetails?.iban_number || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              IFSC / SWIFT
                            </p>
                            <p className="font-mono text-foreground">
                              {bankDetails?.swift_ifsc_code || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Country
                            </p>
                            <p className="font-medium text-foreground">
                              {bankDetails?.country || "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                      {/* {!supportsBankWithdrawal && !bankDetailsLoading && (
                        <p className="text-xs text-destructive">
                          Bank withdrawal requires active `bank_transfer`
                          payment method and saved bank details.
                        </p>
                      )} */}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <Label
                          htmlFor="chain_id"
                          className="text-sm font-semibold text-foreground"
                        >
                          Blockchain Network{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Select value={chainId} onValueChange={setChainId}>
                          <SelectTrigger className="h-10 w-full rounded-xl border-2 border-border bg-background focus:border-primary px-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Network className="h-4 w-4 text-muted-foreground shrink-0" />
                              <SelectValue
                                placeholder="Select network"
                                className="truncate"
                              />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {CHAIN_OPTIONS.map((chain) => (
                              <SelectItem key={chain.value} value={chain.value}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {chain.label}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    · {chain.network}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedChain && (
                          <p className="text-xs text-muted-foreground">
                            Selected: {selectedChain.network}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Label
                          htmlFor="wallet_address"
                          className="text-sm font-semibold text-foreground"
                        >
                          Destination Wallet Address{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Wallet className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="wallet_address"
                            value={walletAddress}
                            onChange={(event) =>
                              setWalletAddress(event.target.value)
                            }
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
                            Paste the destination address exactly as shown by
                            the receiving wallet, and make sure it supports the
                            selected network.
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="rounded-2xl border border-amber-300/60 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
                      <div className="space-y-1 text-xs text-amber-900 dark:text-amber-100">
                        <p className="font-semibold">Before you submit:</p>
                        <ul className="space-y-1">
                          <li>
                            {isCryptoWithdrawal
                              ? "Double-check wallet address and selected network."
                              : "Confirm your saved bank account details are correct."}
                          </li>
                          <li>
                            Processing can take 24-48 hours depending on review
                            and network conditions.
                          </li>
                          <li>
                            {isCryptoWithdrawal
                              ? "Network fees can differ by chain and destination wallet."
                              : "Bank processing times may vary by country and bank."}
                          </li>
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
                    Your withdrawal request has been successfully submitted and
                    is pending review.
                  </p>

                  {withdrawalData && (
                    <div className="mb-6 space-y-4">
                      <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {submittedWithdrawalType === "bank"
                              ? "Requested Amount:"
                              : "Amount:"}
                          </span>
                          <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                            {typeof withdrawalData.amount === "number"
                              ? withdrawalData.amount.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 8,
                                })
                              : parseFloat(
                                  withdrawalData.amount || amount,
                                ).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 8,
                                })}{" "}
                            USD
                          </span>
                        </div>
                        {submittedWithdrawalType === "bank" ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                Bank Credit:
                              </span>
                              <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                                {submittedBankCredit !== null
                                  ? `${formatAmount(submittedBankCredit.toFixed(2))} ${submittedBankCurrency}`
                                  : "--"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                Bank:
                              </span>
                              <span className="max-w-[70%] truncate text-right text-sm font-medium text-emerald-800 dark:text-emerald-200">
                                {bankDetails?.bank_name || "-"}
                              </span>
                            </div>
                            <div className="flex items-start justify-between">
                              <span className="text-sm text-muted-foreground">
                                Account:
                              </span>
                              <code className="max-w-[70%] break-all rounded bg-emerald-100 px-2 py-1 text-right text-xs font-mono dark:bg-emerald-900">
                                {bankDetails?.account_number || "-"}
                              </code>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                Network:
                              </span>
                              <Badge
                                variant="outline"
                                className="bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100"
                              >
                                {withdrawalData.chain_id || chainId}
                              </Badge>
                            </div>
                            <div className="flex items-start justify-between">
                              <span className="text-sm text-muted-foreground">
                                Wallet:
                              </span>
                              <code className="max-w-[70%] break-all rounded bg-emerald-100 px-2 py-1 text-right text-xs font-mono dark:bg-emerald-900">
                                {withdrawalData.wallet_address || walletAddress}
                              </code>
                            </div>
                          </>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Status:
                          </span>
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                            <Clock className="mr-1 h-3 w-3" />
                            {withdrawalData.status || "Pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    {submittedWithdrawalType === "bank" ? (
                      <Button
                        variant="outline"
                        disabled
                        className="border-emerald-200 text-emerald-700 disabled:opacity-80 dark:border-emerald-800 dark:text-emerald-300"
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Pending Admin Review
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        asChild
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                      >
                        <Link href="/funds/withdraw">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Withdrawal Status
                        </Link>
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        setSuccess(false);
                        setWithdrawalData(null);
                        setSubmittedWithdrawalType(null);
                        setSubmittedBankCredit(null);
                        setSubmittedBankCurrency("");
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
                  <h3 className="text-lg font-semibold text-foreground">
                    How it works
                  </h3>
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
                      <p className="text-sm leading-6 text-muted-foreground">
                        {step}
                      </p>
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
                  <h3 className="text-lg font-semibold text-foreground">
                    What to verify
                  </h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="rounded-xl border border-border/50 bg-background/80 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Address format
                    </p>
                    <p className="mt-1 leading-6 text-muted-foreground">
                      Make sure the destination address belongs to the same
                      chain you selected in the network dropdown.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/80 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Processing window
                    </p>
                    <p className="mt-1 leading-6 text-muted-foreground">
                      Requests can remain pending while the team verifies the
                      destination and network before release.
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/80 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Fee awareness
                    </p>
                    <p className="mt-1 leading-6 text-muted-foreground">
                      Different chains can have different final delivery costs
                      and settlement times.
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

import { KyCGuard } from "@/components/kyc-guard";

export default function WithdrawalRequestPage() {
  return (
    <KyCGuard>
      <WithdrawalRequestContent />
    </KyCGuard>
  );
}
