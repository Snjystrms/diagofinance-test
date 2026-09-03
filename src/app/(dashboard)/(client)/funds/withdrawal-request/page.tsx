"use client";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { FeatureDisabledPanel } from "@/components/errors/feature-disabled-panel";
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
  type WithdrawalRequest,
} from "@/lib/api";
import {
  authApi,
  userCurrencyRatesApi,
  userPaymentMethodsApi,
  type CurrencyRateItem,
  type UserBankDetailsData,
  type UserPaymentMethod,
} from "@/lib/api-auth-admin";
import { mt5AccountsApi, type MT5Account } from "@/lib/api-trading-ib";
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
  Plus,
  Landmark,
  Banknote,
  Hash,
  User,
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
  const { token, defaultSettings } = useAuth();
  const [withdrawalType, setWithdrawalType] = useState<"crypto" | "bank" | "cash">(
    "crypto",
  );
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [chainId, setChainId] = useState("TRC20");
  const [source, setSource] = useState<"wallet" | "mt5">("wallet");
  const [selectedMt5Account, setSelectedMt5Account] = useState<string>("");
  const [mt5Accounts, setMt5Accounts] = useState<MT5Account[]>([]);
  const [mt5AccountsLoading, setMt5AccountsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState<WithdrawalItem | null>(
    null,
  );
  const [submittedWithdrawalType, setSubmittedWithdrawalType] = useState<
    "crypto" | "bank" | "cash" | null
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
  const [userBankAccounts, setUserBankAccounts] = useState<UserBankDetailsData[]>([]);
  const [bankDetailsLoading, setBankDetailsLoading] = useState(true);
  const [bankTransferMethodId, setBankTransferMethodId] = useState<
    number | null
  >(null);
  const [localPaymentMethodId, setLocalPaymentMethodId] = useState<
    number | null
  >(null);
  const [cashPaymentMethodId, setCashPaymentMethodId] = useState<number | null>(null);
  const [currencyRates, setCurrencyRates] = useState<CurrencyRateItem[]>([]);
  const [withdrawalCurrency, setWithdrawalCurrency] = useState("INR");

  const selectedChain = CHAIN_OPTIONS.find((chain) => chain.value === chainId);

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

  const fetchMt5Accounts = async () => {
    if (!token) return;
    try {
      setMt5AccountsLoading(true);
      const response = await mt5AccountsApi.getAll(token);
      const accounts = Array.isArray(response.data?.mt5_accounts)
        ? response.data.mt5_accounts
        : [];
      setMt5Accounts(accounts.filter((acc) => acc.account_mode === "live"));
    } catch (err) {
      console.error("Error fetching MT5 accounts:", err);
    } finally {
      setMt5AccountsLoading(false);
    }
  };

  useEffect(() => {
    void fetchWalletSummary();
  }, [token]);

  useEffect(() => {
    void fetchMt5Accounts();
  }, [token]);

  useEffect(() => {
    const fetchCurrencyRates = async () => {
      if (
        !token ||
        (withdrawalType !== "bank" && withdrawalType !== "cash")
      ) {
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
        setUserBankAccounts([]);
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
        
        setUserBankAccounts(bankList);

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
        const cashPaymentMethod = methods.find(
          (method) => method.type === "cash",
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
        setCashPaymentMethodId(
          typeof cashPaymentMethod?.id === "number"
            ? cashPaymentMethod.id
            : null,
        );
      } catch (fetchError) {
        console.error("Failed to load withdrawal metadata:", fetchError);
        setBankDetails(null);
        setUserBankAccounts([]);
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

  const withdrawalAmount = parseFloat(amount) || 0;
  const wallets = walletData ? Object.values(walletData.wallets) : [];
  const mainWallet = wallets.find((wallet) => wallet.is_primary) || wallets[0];
  const mainWalletBalance =
    walletData?.wallets?.main?.balance ?? mainWallet?.balance ?? 0;
  const currency = mainWallet?.currency || "USDT";
  const supportsBankWithdrawal = !!bankTransferMethodId && !!bankDetails?.id;
  const supportsCashWithdrawal = !!cashPaymentMethodId;
  const isCryptoWithdrawal = withdrawalType === "crypto";
  const isBankWithdrawal = withdrawalType === "bank";
  const isCashWithdrawal = withdrawalType === "cash";
  const minimumAmount = 25.0;

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
    } else if (isBankWithdrawal) {
      if (!supportsBankWithdrawal) {
        setError(
          "Bank withdrawal is unavailable. Please add bank details first.",
        );
        return;
      } else if (convertedBankAmount === null) {
        setError("Bank withdrawal conversion rate is currently unavailable.");
        return;
      }
    } else if (isCashWithdrawal) {
      if (!supportsCashWithdrawal) {
        setError("Cash withdrawal is unavailable right now.");
        return;
      }
    }

    // Validate MT5 account selection if source is mt5
    if (source === "mt5" && !selectedMt5Account.trim()) {
      setError("Please select an MT5 account");
      return;
    }

    setIsSubmitting(true);

    try {
      let payload: WithdrawalRequest = {
        amount,
        source,
      };

      if (source === "mt5") {
        payload.mt5_account_id = selectedMt5Account;
      }

      if (isCryptoWithdrawal) {
        payload = {
          ...payload,
          payment_method_id: localPaymentMethodId ?? undefined,
          wallet_address: walletAddress.trim(),
          chain_id: chainId,
        };
      } else if (isBankWithdrawal) {
        payload = {
          ...payload,
          payment_method_id: bankTransferMethodId ?? undefined,
          bank_detail_id: bankDetails?.id ?? undefined,
        };
      } else {
        payload = {
          ...payload,
          payment_method_id: cashPaymentMethodId ?? undefined,
        };
      }

      const response = await withdrawalApi.create(payload, token);

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
  const hasBankSetup = isCryptoWithdrawal ? true : (isBankWithdrawal ? supportsBankWithdrawal : supportsCashWithdrawal);
  const hasToken = !!token;
  const canSubmit =
    isValidAmount &&
    hasWalletAddress &&
    hasChainId &&
    hasBankSetup &&
    !isSubmitting &&
    hasToken;

  type PanelItem = { icon: typeof Wallet; title: string; text: string };
  const rightPanel: {
    title: string;
    tagline: string;
    verifyTitle: string;
    steps: PanelItem[];
    verify: PanelItem[];
  } = (() => {
    const baseStep: PanelItem = {
      icon: Wallet,
      title: "Enter amount",
      text: `Minimum ${formatAmount(minimumAmount)} USD from Main Wallet or MT5.`,
    };
    if (isCryptoWithdrawal) {
      return {
        title: "Crypto transfer flow",
        tagline: "Move funds safely in a few quick steps.",
        verifyTitle: "What to verify",
        steps: [
          baseStep,
          {
            icon: Network,
            title: "Pick a network",
            text: "Must match your receiving wallet's chain.",
          },
          {
            icon: Copy,
            title: "Paste address",
            text: "Use the exact wallet address from your receiving platform.",
          },
          {
            icon: ShieldCheck,
            title: "Submit",
            text: "Reviewed within 24–48 hours.",
          },
        ],
        verify: [
          {
            icon: Hash,
            title: "Address format",
            text: "Use the same chain as the network you selected.",
          },
          {
            icon: Clock,
            title: "Processing",
            text: "Stays pending while the team verifies the destination.",
          },
          {
            icon: Network,
            title: "Fees",
            text: "Delivery cost varies by chain.",
          },
        ],
      };
    }
    if (isBankWithdrawal) {
      return {
        title: "Bank transfer flow",
        tagline: "Send funds to your bank in a few quick steps.",
        verifyTitle: "What to verify",
        steps: [
          baseStep,
          {
            icon: DollarSign,
            title: "Pick currency",
            text: "Choose your withdrawal currency and live rate.",
          },
          {
            icon: Landmark,
            title: "Confirm account",
            text: "Ensure your saved bank details are correct.",
          },
          {
            icon: ShieldCheck,
            title: "Submit",
            text: "Bank processing varies by country and bank.",
          },
        ],
        verify: [
          {
            icon: Landmark,
            title: "Account details",
            text: "Check holder name, bank, and account number.",
          },
          {
            icon: Clock,
            title: "Processing window",
            text: "Approval depends on admin review.",
          },
          {
            icon: DollarSign,
            title: "Rates",
            text: "Live USD conversion shown in the form.",
          },
        ],
      };
    }
    return {
      title: "Cash pickup flow",
      tagline: "Collect your funds in person in a few quick steps.",
      verifyTitle: "What to verify",
      steps: [
        baseStep,
        {
          icon: Banknote,
          title: "Pick currency",
          text: "Choose the currency for your cash pickup.",
        },
        {
          icon: User,
          title: "No destination needed",
          text: "Collect cash at your registered branch.",
        },
        {
          icon: ShieldCheck,
          title: "Submit",
          text: "Processed at the branch after review.",
        },
      ],
      verify: [
        {
          icon: Banknote,
          title: "Pickup method",
          text: "Cash is collected at your registered branch.",
        },
        {
          icon: Clock,
          title: "Processing",
          text: "Approval happens after internal review.",
        },
        {
          icon: ShieldCheck,
          title: "Security",
          text: "Our team verifies every request before release.",
        },
      ],
    };
  })();

  if (defaultSettings?.disable_withdraw) {
    return (
      <div className="min-h-screen w-full bg-background px-4 py-6 lg:px-6 xl:px-8">
        <FeatureDisabledPanel
          title="Withdrawals Temporarily Unavailable"
          message="Withdrawal services are currently disabled by the administrator. Please try again later. If you have any urgent concerns, please contact our support team."
        />
      </div>
    );
  }

  const renderAmountField = () => (
    <div className="space-y-3">
      <Label
        htmlFor="amount"
        className="text-sm font-semibold text-foreground"
      >
        Amount <span className="text-destructive">*</span>
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          (Min: ${formatAmount(minimumAmount)} USD)
        </span>
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
          placeholder={`${minimumAmount.toFixed(2)}`}
        />
      </div>
      {amount.trim() !== "" && !isNaN(amountNum) && amountNum > 0 && amountNum < minimumAmount && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Minimum withdrawal amount is ${formatAmount(minimumAmount)} USD. Please enter at least ${formatAmount(minimumAmount)} USD to proceed.
          </p>
        </div>
      )}
      {(!amount.trim() || isNaN(amountNum) || amountNum === 0) && (
        <p className="text-xs text-muted-foreground">
          Enter an amount between ${formatAmount(minimumAmount)} USD and ${formatAmount(mainWalletBalance)} USD
        </p>
      )}
      {amount.trim() !== "" && !isNaN(amountNum) && amountNum >= minimumAmount && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Valid withdrawal amount
        </p>
      )}
    </div>
  );

  const renderSourceField = () => (
    <div className="space-y-3">
      <Label htmlFor="withdrawal-source" className="text-sm font-semibold text-foreground">
        Withdrawal Source <span className="text-destructive">*</span>
      </Label>
      <Select value={source} onValueChange={(val) => setSource(val as "wallet" | "mt5")}>
        <SelectTrigger id="withdrawal-source" className="h-10 w-full rounded-xl border-2 border-border bg-background focus:border-primary">
          <SelectValue placeholder="Select source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="wallet">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span>Main Wallet (USD)</span>
            </div>
          </SelectItem>
          <SelectItem value="mt5">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              <span>MT5 Account</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      {source === "mt5" && (
        <div className="space-y-2">
          <Label htmlFor="mt5-account" className="text-sm font-semibold text-foreground">
            MT5 Account <span className="text-destructive">*</span>
          </Label>
          {mt5AccountsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Clock className="h-4 w-4 animate-spin" />
              Loading MT5 accounts...
            </div>
          ) : mt5Accounts.length === 0 ? (
            <p className="text-sm text-destructive">
              No live MT5 accounts found. Please add an MT5 account first.
            </p>
          ) : (
            <Select value={selectedMt5Account} onValueChange={setSelectedMt5Account}>
              <SelectTrigger id="mt5-account" className="h-10 w-full rounded-xl border-2 border-border bg-background focus:border-primary">
                <SelectValue placeholder="Select MT5 account" />
              </SelectTrigger>
              <SelectContent>
                {mt5Accounts.map((acc) => (
                  <SelectItem key={acc.account_id} value={acc.account_id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{acc.account_id}</span>
                      <span className="text-xs text-muted-foreground">
                        {acc.account_mode} • {acc.mt5_id}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );

  const renderCurrencyField = () => (
    <div className="space-y-3">
      <Label
        htmlFor="withdrawal-currency"
        className="text-sm font-semibold text-foreground"
      >
        Withdrawal Currency
      </Label>
      <Select
        value={withdrawalCurrency}
        onValueChange={setWithdrawalCurrency}
        disabled={availableWithdrawalCurrencies.length === 0}
      >
        <SelectTrigger
          id="withdrawal-currency"
          className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:ring-1 focus-visible:ring-ring"
        >
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent>
          {availableWithdrawalCurrencies.length === 0 ? (
            <SelectItem value="INR">No currencies available</SelectItem>
          ) : (
            availableWithdrawalCurrencies.map((code) => (
              <SelectItem key={code} value={code}>
                {code}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
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
            {isBankWithdrawal
              ? "Estimated bank credit:"
              : "Estimated cash amount:"}{" "}
            {formatAmount(convertedBankAmount.toFixed(2))} {withdrawalCurrency.toUpperCase()}
          </p>
        )}
    </div>
  );

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
              Choose Crypto, Bank, or Cash withdrawal, fill required details, and
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
                {isCryptoWithdrawal ? "Crypto" : isBankWithdrawal ? "Bank" : "Cash"}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Network
              </p>
              <p className="truncate text-sm font-semibold text-foreground">
                {isCryptoWithdrawal
                  ? selectedChain?.value || "--"
                  : isBankWithdrawal
                    ? bankDetails?.bank_name || "Not configured"
                    : "Cash Pickup"}
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
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      Submit Withdrawal Details
                    </h2>
                  </div>

                  <Tabs
                    value={withdrawalType}
                    onValueChange={(value) =>
                      setWithdrawalType(value as "crypto" | "bank" | "cash")
                    }
                    className="space-y-4"
                  >
                    <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl p-1">
                      <TabsTrigger value="crypto" className="rounded-md py-2 px-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        Crypto Withdrawal
                      </TabsTrigger>
                      <TabsTrigger value="bank" className="rounded-md py-2 px-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        Bank Withdrawal
                      </TabsTrigger>
                      <TabsTrigger value="cash" className="rounded-md py-2 px-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        Cash Withdrawal
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
                    {isBankWithdrawal || isCashWithdrawal ? (
                      <>
                        {renderSourceField()}
                        {renderCurrencyField()}
                        {renderAmountField()}
                      </>
                    ) : (
                      <>
                        {renderAmountField()}
                        {renderSourceField()}
                      </>
                    )}
                  </div>

                  {isBankWithdrawal ? (
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-foreground">
                        Your Bank Account (Withdrawal Destination)
                      </Label>
                      {userBankAccounts.length > 1 && (
                        <Select
                          value={bankDetails?.id ? String(bankDetails.id) : undefined}
                          onValueChange={(val) => {
                            const found = userBankAccounts.find((acc) => String(acc.id) === val);
                            if (found) setBankDetails(found);
                          }}
                        >
                          <SelectTrigger className="h-10 w-full rounded-xl border-2 border-border bg-background focus:border-primary px-3 shadow-sm">
                            <SelectValue placeholder="Select a bank account" />
                          </SelectTrigger>
                          <SelectContent>
                            {userBankAccounts.map((acc) => (
                              <SelectItem key={acc.id} value={String(acc.id)}>
                                {acc.bank_name} - {acc.account_number} ({acc.account_holder_name})
                                {acc.status && ` [${acc.status}]`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
                        {userBankAccounts.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <p className="mb-4 text-sm text-muted-foreground">
                              No bank account added yet. Please add a bank account to proceed with withdrawal.
                            </p>
                            <Link href="/profile/view_profile?tab=bank">
                              <Button variant="outline" size="sm" className="gap-2">
                                <Plus className="h-3.5 w-3.5" />
                                Add Bank Account
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <div className="grid gap-3 md:grid-cols-2">
                            {bankDetails?.account_holder_name && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Account Holder
                                </p>
                                <p className="font-medium text-foreground">
                                  {bankDetails.account_holder_name}
                                </p>
                              </div>
                            )}
                            {bankDetails?.bank_name && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Bank Name
                                </p>
                                <p className="font-medium text-foreground">
                                  {bankDetails.bank_name}
                                </p>
                              </div>
                            )}
                            {bankDetails?.account_number && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Account Number
                                </p>
                                <p className="font-mono text-foreground">
                                  {bankDetails.account_number}
                                </p>
                              </div>
                            )}
                            {bankDetails?.iban_number && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  IBAN
                                </p>
                                <p className="font-mono text-foreground">
                                  {bankDetails.iban_number}
                                </p>
                              </div>
                            )}
                            {bankDetails?.swift_ifsc_code && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  IFSC / SWIFT
                                </p>
                                <p className="font-mono text-foreground">
                                  {bankDetails.swift_ifsc_code}
                                </p>
                              </div>
                            )}
                            {bankDetails?.country && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                  Country
                                </p>
                                <p className="font-medium text-foreground">
                                  {bankDetails.country}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* {!supportsBankWithdrawal && !bankDetailsLoading && (
                        <p className="text-xs text-destructive">
                          Bank withdrawal requires active `bank_transfer`
                          payment method and saved bank details.
                        </p>
                      )} */}
                    </div>
                  ) : isCashWithdrawal ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
                        <div className="flex items-start gap-3">
                          <DollarSign className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">
                              Cash Pickup
                            </p>
                            <p className="text-xs text-muted-foreground">
                              You will receive the cash amount at your registered
                              branch. No additional destination details are
                              required.
                            </p>
                          </div>
                        </div>
                      </div>
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
                      </div>
                    </>
                  )}

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
                        ) : submittedWithdrawalType === "cash" ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                Method:
                              </span>
                              <span className="max-w-[70%] truncate text-right text-sm font-medium text-emerald-800 dark:text-emerald-200">
                                Cash Pickup
                              </span>
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
            <Card className="overflow-hidden border border-border/60 bg-card shadow-sm">
              <div className="h-1.5 bg-gradient-to-r from-primary/80 via-primary to-primary/30" />
              <CardContent className="space-y-5 p-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Transfer Flow
                  </p>
                  <h3 className="text-lg font-semibold text-foreground">
                    {rightPanel.title}
                  </h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {rightPanel.tagline}
                  </p>
                </div>

                <div className="space-y-3">
                  {rightPanel.steps.map((step) => (
                    <div
                      key={step.title}
                      className="flex items-start gap-3 rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/30 px-4 py-3 transition-colors hover:border-primary/40"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <step.icon className="h-4 w-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-foreground">
                          {step.title}
                        </p>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {step.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border border-border/60 bg-card shadow-sm">
              <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300" />
              <CardContent className="space-y-4 p-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Request Signals
                  </p>
                  <h3 className="text-lg font-semibold text-foreground">
                    {rightPanel.verifyTitle}
                  </h3>
                </div>

                <div className="space-y-3 text-sm">
                  {rightPanel.verify.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/80 px-4 py-3"
                    >
                      <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {item.title}
                        </p>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  ))}
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

// =========================================================================
// TEMPORARY WITHDRAWAL MAINTENANCE BLOCKER
// To reopen withdrawals:
// 1. Set IS_WITHDRAWAL_CLOSED to false, OR
// 2. Delete this entire block (from here to the end of the file) and restore the default export.
// =========================================================================
const IS_WITHDRAWAL_CLOSED = false;

import { Lock, ArrowLeft } from "lucide-react";

function WithdrawalClosedOverlay() {
  return (
    <div className="flex min-h-[85vh] w-full items-center justify-center px-4 py-12 bg-background/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg border-2 border-border/60 bg-card shadow-2xl rounded-[28px] overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
        <CardContent className="pt-10 pb-10 px-8 flex flex-col items-center text-center space-y-6">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-500/20 bg-amber-500/10 shadow-md">
            <div className="absolute inset-0 rounded-3xl bg-amber-500/5 animate-pulse" />
            <Lock className="h-10 w-10 text-amber-500" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-3xl">
              Withdrawals Temporarily Closed
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We are currently performing scheduled maintenance on our withdrawal processing systems to enhance security and speed. 
              During this brief window, withdrawal requests cannot be submitted.
            </p>
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-medium max-w-md mx-auto">
              Your patience and understanding are highly appreciated. If you have any urgent concerns, please contact our support team.
            </div>
          </div>

          <div className="w-full pt-4">
            <Button asChild className="w-full h-12 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function WithdrawalRequestPage() {
  if (IS_WITHDRAWAL_CLOSED) {
    return <WithdrawalClosedOverlay />;
  }

  return (
    <KyCGuard>
      <WithdrawalRequestContent />
    </KyCGuard>
  );
}
