'use client'
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { submitUSDTDeposit } from "@/utils/operations";
import { walletApi, binanceDepositApi, coinsbuyDepositApi, bankDepositApi, userBrokerBankDetailsApi, type WalletSummaryData, type BinanceDepositCreateResponse, type CoinsBuyDepositCreateResponse, type BankDepositRecord, type BrokerBankDetailItem } from "@/lib/api";
import { userPaymentMethodsApi, userCurrencyRatesApi, type UserPaymentMethod, type CurrencyRateItem } from "@/lib/api-auth-admin";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";
import { CLIENT_WALLET_REFRESH_EVENT, notifyWalletRefresh } from "@/lib/client-events";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
import { formatDateTimeInIST } from "@/lib/formatters";
import { 
  Copy, 
  Hash, 
  ShieldCheck, 
  Wallet, 
  CheckCircle, 
  Clock,
  ExternalLink,
  QrCode,
  AlertCircle,
  Shield,
  DollarSign,
  Upload,
  X,
  RefreshCw,
  Building2,
  FileText,
  CheckCircle2,
  Loader2,
  WalletMinimal
} from "lucide-react";

const isBrokerBankDetailActive = (detail: BrokerBankDetailItem) =>
  detail.is_active === true || detail.is_active === 1;

function ComingSoonTab({ name, description }: { name: string; description?: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
      <Clock className="h-10 w-10 opacity-40" />
      <p className="text-lg font-semibold text-foreground">{name}</p>
      {description && <p className="text-sm">{description}</p>}
      <Badge variant="outline">Coming Soon</Badge>
    </div>
  );
}

function USDTDepositContent() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("");

  // Payment methods from API
  const [paymentMethods, setPaymentMethods] = useState<UserPaymentMethod[]>([]);
  const [pmLoading, setPmLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [depositStatus, setDepositStatus] = useState("pending"); // pending, submitted, confirmed
  const [error, setError] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<WalletSummaryData | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  
  // Binance deposit state
  const [binanceAmount, setBinanceAmount] = useState("");
  const [binanceComment, setBinanceComment] = useState("");
  const [isSubmittingBinance, setIsSubmittingBinance] = useState(false);
  
  // CoinsBuy deposit state
  const [coinsbuyAmount, setCoinsbuyAmount] = useState("");
  const [isSubmittingCoinsbuy, setIsSubmittingCoinsbuy] = useState(false);

  // Bank deposit state
  const [bankAmount, setBankAmount] = useState("");
  const [bankTxId, setBankTxId] = useState("");
  const [bankError, setBankError] = useState<string | null>(null);
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);
  const [bankSubmitResult, setBankSubmitResult] = useState<{ id: number; status: string; created_at: string } | null>(null);
  const [bankRequests, setBankRequests] = useState<BankDepositRecord[]>([]);
  const [bankRequestsLoading, setBankRequestsLoading] = useState(false);
  const [brokerBankDetails, setBrokerBankDetails] = useState<BrokerBankDetailItem[]>([]);
  const [brokerBankDetailsLoading, setBrokerBankDetailsLoading] = useState(false);
  const [brokerBankDetailsError, setBrokerBankDetailsError] = useState<string | null>(null);
  const [bankCurrency, setBankCurrency] = useState("INR");
  const [currencyRates, setCurrencyRates] = useState<CurrencyRateItem[]>([]);
  const [currencyRatesLoading, setCurrencyRatesLoading] = useState(false);
  const wallets = walletData ? Object.values(walletData.wallets || {}) : [];
  const primaryWallet = wallets.find((wallet) => wallet.is_primary) || wallets[0];
  const currency = primaryWallet?.currency || "USD";
  const totalBalance = walletData?.total_balance ?? 0;
  const availableBalance = primaryWallet?.balance ?? totalBalance;
  const secondaryBalance = wallets
    .filter((wallet) => wallet.id !== primaryWallet?.id)
    .reduce((sum, wallet) => sum + wallet.balance, 0);
  const recentDeposit = walletData?.recent_transactions?.find(
    (tx) => tx.type?.toLowerCase() === "deposit" || tx.type?.toLowerCase() === "credit"
  );

  const formatAmount = (value: number) =>
    value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });

  const recentDepositAmount = recentDeposit ? parseFloat(String(recentDeposit.amount ?? 0)) : null;
  const recentDepositLabel = recentDepositAmount
    ? `${formatAmount(recentDepositAmount)} USD`
    : "No recent deposits";
  const recentDepositDate = recentDeposit ? formatDateTimeInIST(recentDeposit.created_at) : "-";
  const enabledMethodCount = paymentMethods.length;
  const needsRegistrationFee = user && user.type === "user" && user.is_account_active === false;
  const registrationFeeLabel = "$25 equivalent";
  const minimumAmountLabel = needsRegistrationFee ? "$25 equivalent" : "$10 equivalent";
  const settlementLabel = "Supported digital asset";

  const typedAmountNum = parseFloat(amount) || 0;
  const depositReadiness =
    availableBalance > 0 ? Math.min(100, Math.round((typedAmountNum / availableBalance) * 100)) : 0;
  const visibleBrokerBankDetails = useMemo(() => {
    const activeDetails = brokerBankDetails.filter((detail) => isBrokerBankDetailActive(detail));
    return activeDetails.length > 0 ? activeDetails : brokerBankDetails;
  }, [brokerBankDetails]);
  const availableBankCurrencies = useMemo(() => {
    const activeRates = currencyRates.filter((rate) => {
      const rawStatus = String(rate.status).toLowerCase();
      return rate.to_currency?.toUpperCase() === "USD" && (rawStatus === "true" || rawStatus === "1" || rawStatus === "active");
    });
    const unique = Array.from(new Set(activeRates.map((rate) => rate.from_currency?.toUpperCase()).filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b));
  }, [currencyRates]);
  const selectedRateToUsd = useMemo(() => {
    return currencyRates.find((rate) => {
      const rawStatus = String(rate.status).toLowerCase();
      return (
        rate.from_currency?.toUpperCase() === bankCurrency.toUpperCase() &&
        rate.to_currency?.toUpperCase() === "USD" &&
        (rawStatus === "true" || rawStatus === "1" || rawStatus === "active")
      );
    });
  }, [bankCurrency, currencyRates]);
  const bankAmountNum = parseFloat(bankAmount);
  const convertedUsdAmount =
    !isNaN(bankAmountNum) && bankAmountNum > 0 && selectedRateToUsd?.deposit_rate
      ? bankAmountNum * Number(selectedRateToUsd.deposit_rate)
      : null;

  // Derive which tabs to show from API response
  const hasLocal    = paymentMethods.some(p => p.type === "local");
  const hasBinance  = paymentMethods.some(p => p.type === "binance_pay");
  const hasCoinsbuy = paymentMethods.some(p => p.type === "coinsbuy");
  const hasBank     = paymentMethods.some(p => p.type === "bank_transfer");
  const KNOWN_TYPES = ["local", "binance_pay", "coinsbuy", "bank_transfer"];
  const comingSoonMethods = paymentMethods.filter(p => !KNOWN_TYPES.includes(p.type));

  // Fetch active payment methods
  useEffect(() => {
    if (!token) { setPmLoading(false); return; }
    userPaymentMethodsApi.list(token)
      .then(res => {
        const methods = (res as unknown as { data?: UserPaymentMethod[] })?.data ?? [];
        setPaymentMethods(methods);
        setActiveTab("");
      })
      .catch(() => {})
      .finally(() => setPmLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
    } catch (fetchError) {
      console.error("Failed to load wallet summary:", fetchError);
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Deposit details
  const depositAddress = "0xcD8d359Fe7086f4AEf9C0549542bBCB72E95f7E0";
  const network = "BNB Smart Chain";
  const networkLabel = `${settlementLabel} on ${network}`;

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(depositAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  const handlePaymentProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentProof(file);
      // Create preview
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

  const handleBinanceSubmit = async () => {
    setError(null);

    if (!binanceAmount.trim()) {
      setError("Amount is required");
      return;
    }

    const amountNum = parseFloat(binanceAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a valid positive number");
      return;
    }

    if (!token) {
      setError("Authentication required");
      return;
    }

    setIsSubmittingBinance(true);

    try {
      const response = await binanceDepositApi.create(
        {
          amount: amountNum,
          user_comment: binanceComment.trim() || undefined,
        },
        token
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to create Binance deposit");
      }

      // apiCall returns ApiResponse<T>, and based on the console log, response.data is already the nested data object
      // So response.data contains qr_content directly, not response.data.data
      const depositData = (response.data as unknown) as BinanceDepositCreateResponse['data'];
      
      // Get qr_content, checkout_url, or universal_url (in order of preference)
      const qrContent = depositData?.qr_content || depositData?.checkout_url || depositData?.universal_url;
      
      if (qrContent) {
        notifyWalletRefresh();
        window.location.href = qrContent;
      } else {
        console.error("Binance deposit response data:", JSON.stringify(depositData, null, 2));
        toast.error("Payment link is not available right now. Please try again.");
        setIsSubmittingBinance(false);
      }
    } catch (err) {
      console.error("Error creating Binance deposit:", err);
      setError(getFriendlyErrorMessage(err, {
        audience: "client",
        resource: "Binance deposit",
        action: "create",
      }));
      setIsSubmittingBinance(false);
    }
  };

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
      // Step 1: Create CoinsBuy deposit
      const response = await coinsbuyDepositApi.create(
        {
          amount: amountNum,
        },
        token
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to create CoinsBuy deposit");
      }

      const depositData = (response.data as unknown) as CoinsBuyDepositCreateResponse['data'];
      const coinsbuyDepositId = depositData?.coinsbuy_deposit_id;

      if (!coinsbuyDepositId) {
        throw new Error("CoinsBuy deposit ID not found in response");
      }

      // Step 2: Trigger webhook immediately after successful creation
      try {
        const webhookResponse = await coinsbuyDepositApi.triggerWebhook(
          {
            data: {
              type: "deposit",
              id: coinsbuyDepositId,
            },
          },
          token
        );

        if (!webhookResponse.success) {
          console.warn("Webhook trigger warning:", webhookResponse.message);
          // Don't throw error, just log warning
        }
      } catch (webhookErr) {
        console.error("Error triggering webhook:", webhookErr);
        // Don't block the flow, just log the error
      }

      // Show success toast and reset form
      toast.success("CoinsBuy deposit created successfully!");
      notifyWalletRefresh();
      setIsSubmittingCoinsbuy(false);
      setCoinsbuyAmount("");
    } catch (err) {
      console.error("Error creating CoinsBuy deposit:", err);
      setError(getFriendlyErrorMessage(err, {
        audience: "client",
        resource: "CoinsBuy deposit",
        action: "create",
      }));
      setIsSubmittingCoinsbuy(false);
    }
  };

  const fetchBankRequests = useCallback(async () => {
    if (!token) return;
    try {
      setBankRequestsLoading(true);
      const res = await bankDepositApi.listRequests(token);
      const raw = res as unknown as { success: boolean; data: { requests: BankDepositRecord[] } };
      if (raw.success && Array.isArray(raw.data?.requests)) {
        setBankRequests(raw.data.requests);
      }
    } catch (e) {
      console.error("Failed to fetch bank requests:", e);
    } finally {
      setBankRequestsLoading(false);
    }
  }, [token]);

  const fetchBrokerBankDetails = useCallback(async () => {
    if (!token) {
      setBrokerBankDetails([]);
      setBrokerBankDetailsError(null);
      return;
    }

    try {
      setBrokerBankDetailsLoading(true);
      setBrokerBankDetailsError(null);
      const response = await userBrokerBankDetailsApi.list(token);
      setBrokerBankDetails(Array.isArray(response.data) ? response.data : []);
    } catch (fetchError) {
      console.error("Failed to fetch broker bank details:", fetchError);
      setBrokerBankDetails([]);
      setBrokerBankDetailsError(
        getFriendlyErrorMessage(fetchError, {
          audience: "client",
          resource: "bank account details",
          action: "load",
        })
      );
    } finally {
      setBrokerBankDetailsLoading(false);
    }
  }, [token]);

  const fetchCurrencyRates = useCallback(async () => {
    if (!token) {
      setCurrencyRates([]);
      return;
    }
    try {
      setCurrencyRatesLoading(true);
      const response = await userCurrencyRatesApi.list({ token, page: 1, per_page: 500 });
      const rates = Array.isArray(response.data?.currencyRates) ? response.data.currencyRates : [];
      setCurrencyRates(rates);
    } catch (fetchError) {
      console.error("Failed to fetch currency rates:", fetchError);
      setCurrencyRates([]);
    } finally {
      setCurrencyRatesLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === "bank") {
      void fetchBankRequests();
      void fetchBrokerBankDetails();
      void fetchCurrencyRates();
    }
  }, [activeTab, fetchBankRequests, fetchBrokerBankDetails, fetchCurrencyRates]);

  useEffect(() => {
    if (availableBankCurrencies.length === 0) return;
    if (!availableBankCurrencies.includes(bankCurrency.toUpperCase())) {
      setBankCurrency(availableBankCurrencies[0]);
    }
  }, [availableBankCurrencies, bankCurrency]);

  const handleBankSubmit = async () => {
    setBankError(null);
    const amountNum = parseFloat(bankAmount);
    if (!bankAmount.trim() || isNaN(amountNum) || amountNum <= 0) {
      setBankError("Please enter a valid amount");
      return;
    }
    if (!bankTxId.trim()) {
      setBankError("Transaction ID is required");
      return;
    }
    if (!token) {
      setBankError("Authentication required");
      return;
    }
    try {
      setIsSubmittingBank(true);
      const res = await bankDepositApi.submit({ amount: amountNum, transaction_id: bankTxId.trim() }, token);
      const raw = res as unknown as { success: boolean; message?: string; data?: { id: number; status: string; created_at: string } };
      if (raw.success && raw.data) {
        setBankSubmitResult(raw.data);
        setBankAmount("");
        setBankTxId("");
        toast.success(raw.message || "Bank deposit request submitted successfully");
        void fetchBankRequests();
        notifyWalletRefresh();
      } else {
        setBankError((raw as { message?: string }).message || "Submission failed");
      }
    } catch (e) {
      console.error("Bank deposit error:", e);
      setBankError(getFriendlyErrorMessage(e, { audience: "client", resource: "bank deposit", action: "submit" }));
    } finally {
      setIsSubmittingBank(false);
    }
  };

  const handleSubmitHash = async () => {
    setError(null);

    // Validate amount
    if (!amount.trim()) {
      setError("Amount is required");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a valid positive number");
      return;
    }

    // Validate that at least one of transaction_hash or payment_proof is provided
    if (!transactionHash.trim() && !paymentProof) {
      setError("Either transaction hash or payment proof (screenshot) is required");
      return;
    }

    // Validate transaction hash format if provided
    if (transactionHash.trim() && (!transactionHash.startsWith("0x") || transactionHash.length < 10)) {
      setError("Invalid transaction hash format");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Call API using the function from operations.ts
      const data = await submitUSDTDeposit(
        {
          amount: amount,
          transaction_hash: transactionHash.trim() || undefined,
          payment_proof: paymentProof || undefined,
        },
        token || undefined
      );

      if (!data.success) {
        throw new Error(data.message || "Failed to submit deposit");
      }

      setDepositStatus("submitted");
      setIsSubmitting(false);
      notifyWalletRefresh();
      
      // Simulate confirmation after a delay (in real app, this would come from backend)
      setTimeout(() => {
        setDepositStatus("confirmed");
      }, 3000);

    } catch (err) {
      console.error("Error submitting deposit:", err);
      setError(getFriendlyErrorMessage(err, {
        audience: "client",
        resource: "deposit",
        action: "submit",
      }));
      setIsSubmitting(false);
    }
  };

  const isValidHash = transactionHash.trim() === "" || (transactionHash.startsWith("0x") && transactionHash.length >= 10);
  const canSubmit = amount.trim() !== "" && parseFloat(amount) > 0 && (transactionHash.trim() !== "" || paymentProof !== null) && isValidHash;

  // If user needs registration fee, show different content
  if (needsRegistrationFee) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="rounded-[28px] border border-amber-300/40 bg-gradient-to-br from-amber-50 via-background to-background p-6 shadow-sm dark:border-amber-700/40 dark:from-amber-950/20">
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-100/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:border-amber-700/40 dark:bg-amber-950/30 dark:text-amber-300">
                    <Shield className="h-3.5 w-3.5" />
                    Account Activation
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                      Registration Fee Required
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                      Complete your account activation by paying the one-time registration fee. Once this is done, you can continue with regular deposits and access the full platform.
                    </p>
                  </div>
                </div>

                <Card className="border border-border/60 bg-card/90 shadow-sm">
                  <CardHeader className="space-y-2">
                    <CardDescription>One-time activation amount</CardDescription>
                    <CardTitle className="text-3xl font-bold text-foreground">
                      {registrationFeeLabel}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                      This fee unlocks account access and enables future deposits through the payment methods available to your profile.
                    </div>
                    <Button
                      onClick={() => window.location.href = '/test-registration-fee'}
                      className="h-11 w-full rounded-xl text-base font-semibold"
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Pay Registration Fee
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background px-4 py-6 lg:px-6 xl:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-sm">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              Fund Deposit
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Choose a payment method below, follow the transfer instructions, then submit your payment details for review.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Balance</p>
              <p className="text-sm font-semibold text-foreground">{walletLoading ? "--" : `${formatAmount(totalBalance)} USD`}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Main Wallet</p>
              <p className="text-sm font-semibold text-foreground">{walletLoading ? "--" : `${formatAmount(availableBalance)} USD`}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Last Deposit</p>
              <p className="text-sm font-semibold text-foreground">{walletLoading ? "--" : recentDepositLabel}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Method</p>
              <p className="text-sm font-semibold text-foreground">{activeTab === "bank" ? "Bank" : activeTab === "binance_pay" ? "Binance" : activeTab === "coinsbuy" ? "CoinsBuy" : activeTab === "local" ? "On-Chain" : "Not selected"}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Readiness</p>
              <p className="text-sm font-semibold text-foreground">{depositReadiness}%</p>
            </div>
          </div>
        </div>

        {/* Deposit type toggle */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)} className="space-y-6">
          {pmLoading ? (
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-32 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          ) : (
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-2xl border border-border/60 bg-card p-2 shadow-sm">
              {hasLocal    && <TabsTrigger className="min-w-[132px] rounded-xl px-4 py-2.5" value="local">On-Chain</TabsTrigger>}
              {hasBinance  && <TabsTrigger className="min-w-[132px] rounded-xl px-4 py-2.5" value="binance_pay">Binance Pay</TabsTrigger>}
              {hasCoinsbuy && <TabsTrigger className="min-w-[132px] rounded-xl px-4 py-2.5" value="coinsbuy">CoinsBuy</TabsTrigger>}
              {hasBank     && <TabsTrigger className="min-w-[132px] rounded-xl px-4 py-2.5" value="bank">Bank Deposit</TabsTrigger>}
              {comingSoonMethods.map(p => (
                <TabsTrigger className="min-w-[132px] rounded-xl px-4 py-2.5" key={p.type} value={p.type}>{p.name}</TabsTrigger>
              ))}
            </TabsList>
          )}

          {!pmLoading && !activeTab && (
            <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-accent/30 to-muted/40 p-6 shadow-[0_20px_80px_-30px_hsl(var(--primary)/0.45)]">
              <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-accent/35 blur-3xl" />
              <div className="relative grid gap-5 lg:grid-cols-[1.3fr_1fr] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary shadow-sm">
                    <Wallet className="h-3.5 w-3.5" />
                    Start Deposit
                  </div>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                    Pick your transfer rail
                  </p>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Choose a method from the tabs above to unlock tailored instructions, fields, and settlement details.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Available methods</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {hasLocal && <Badge className="rounded-full border-primary/20 bg-primary/15 text-primary hover:bg-primary/20">On-Chain</Badge>}
                    {hasBinance && <Badge className="rounded-full border-primary/20 bg-primary/15 text-primary hover:bg-primary/20">Binance Pay</Badge>}
                    {hasCoinsbuy && <Badge className="rounded-full border-primary/20 bg-primary/15 text-primary hover:bg-primary/20">CoinsBuy</Badge>}
                    {hasBank && <Badge className="rounded-full border-primary/20 bg-primary/15 text-primary hover:bg-primary/20">Bank Deposit</Badge>}
                    {comingSoonMethods.length > 0 && <Badge variant="outline" className="rounded-full">More options</Badge>}
                  </div>
                </div>
              </div>
            </div>
          )}

            {hasLocal && <TabsContent value="local" className="space-y-6">
              <div className="rounded-[28px] border border-border/60 bg-card p-5 shadow-sm md:p-6">
                <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      <QrCode className="h-3.5 w-3.5" />
                      On-Chain Transfer
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      Deposit using wallet transfer details
                    </h2>
                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                      Use the destination address and network below, then submit either the transaction hash or a payment proof screenshot for review.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Network</div>
                      <div className="mt-2 text-sm font-semibold text-foreground">{network}</div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Minimum</div>
                      <div className="mt-2 text-sm font-semibold text-foreground">{minimumAmountLabel}</div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Settlement</div>
                      <div className="mt-2 text-sm font-semibold text-foreground">{settlementLabel}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 
                 {/* Left Column - QR Code and Details */}
            <Card className="border border-border/60 bg-card shadow-sm">
              <CardHeader className="text-center pb-6 relative z-10">
                <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                  <div className="rounded-lg border border-primary/20 bg-primary/10 p-1.5">
                    <QrCode className="h-5 w-5 text-primary" />
                  </div>
                  Transfer Destination
                </CardTitle>
                <CardDescription>
                  Use these transfer details for deposits routed through {network}.
                </CardDescription>
              </CardHeader>
               
              <CardContent className="space-y-6 relative z-10">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="rounded-[28px] border border-border/60 bg-muted/20 p-5 shadow-inner">
                    <img
                      src="/qr_bsc_address.png"
                      alt="Deposit QR code"
                      className="h-64 w-64 rounded-2xl bg-white object-contain"
                    />
                  </div>
                </div>

                {/* Network and Amount Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="text-xs font-medium text-muted-foreground">Network</div>
                    <Badge variant="secondary" className="mt-2">
                      {network}
                    </Badge>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="text-xs font-medium text-muted-foreground">Minimum</div>
                    <div className="mt-2 font-semibold text-foreground">{minimumAmountLabel}</div>
                  </div>
                </div>

                {/* Deposit Address */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground">
                    Destination Address
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted/50 rounded-lg p-3 border">
                      <code className="text-sm font-mono break-all">
                        {depositAddress}
                      </code>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyAddress}
                      className="h-12 px-3 bg-background hover:bg-accent border-border"
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>

                {/* Important Notes */}
                <div className="rounded-2xl border border-amber-300/40 bg-amber-50/70 p-4 dark:border-amber-800/50 dark:bg-amber-950/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="text-sm text-amber-900 dark:text-amber-100">
                      <p className="font-medium mb-1">Important Notes:</p>
                      <ul className="space-y-1 text-xs text-amber-800/90 dark:text-amber-200/90">
                        <li>Only send supported assets on {network}</li>
                        <li>Minimum deposit: {minimumAmountLabel}</li>
                        <li>Confirmation time may vary depending on network traffic</li>
                        <li>Double-check the address and network before sending</li>
                      </ul>
                    </div>
                  </div>
                </div>
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
                  After sending funds, submit the transfer details for review. We will verify the payment and process the deposit shortly.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 relative z-10">
                {depositStatus === "pending" && (
                  <>
                    {/* Error Message */}
                    {error && (
                      <ApiErrorState
                        message={error}
                        audience="client"
                        resource="deposit"
                        action="submit"
                        variant="inline"
                      />
                    )}

                    {/* Amount Input */}
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
                        Enter the amount you transferred (minimum: {minimumAmountLabel})
                      </p>
                    </div>

                    {/* Transaction Hash Input */}
                    <div className="space-y-3">
                      <Label htmlFor="txhash" className="text-sm font-semibold text-foreground">
                        Transaction Hash <span className="text-muted-foreground text-xs">(Optional if screenshot provided)</span>
                      </Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="txhash"
                          value={transactionHash}
                          onChange={(e) => setTransactionHash(e.target.value)}
                          className="pl-10 h-12 border-2 border-border focus:border-primary rounded-xl"
                          placeholder="0x1234567890abcdef..."
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        You can find this in your wallet&apos;s transaction history or on the blockchain explorer
                      </p>
                    </div>

                    {/* Payment Proof Upload */}
                    <div className="space-y-3">
                      <Label htmlFor="payment_proof" className="text-sm font-semibold text-foreground">
                        Payment Proof (Screenshot) <span className="text-muted-foreground text-xs">(Optional if transaction hash provided)</span>
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
                        Upload a screenshot of your transaction (JPEG, PNG, or WebP, max 5MB)
                      </p>
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleSubmitHash}
                      disabled={!canSubmit || isSubmitting}
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
                        Your deposit request is under review by the admin team. We&apos;ll verify the transaction details and process it soon.
                      </p>
                      <div className="mb-3 rounded-lg border border-border bg-muted/40 p-4">
                        <p className="break-all text-sm text-foreground">
                          Hash: {transactionHash}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Once approved, the deposit will reflect in your wallet and account history.
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
                      Your deposit has been reviewed and credited successfully.
                    </p>
                    <div className="space-y-3">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
                        <p className="text-sm text-emerald-800 dark:text-emerald-200">
                          The admin team has completed the review and released the funds to your wallet.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Explorer
                      </Button>
                    </div>
                  </div>
                )}

                {/* How it Works */}
                {depositStatus === "pending" && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
                      How it works:
                    </h4>
                    <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">1</span>
                        </div>
                        <span>Scan QR or copy the deposit address</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">2</span>
                        </div>
                        <span>Send funds using your preferred wallet</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-5 h-5 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">3</span>
                        </div>
                        <span>Submit the transaction hash here</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
            </TabsContent>}

            {/* â”€â”€ Binance Pay tab â”€â”€ */}
            {hasBinance && <TabsContent value="binance_pay" className="space-y-8">
              {/* Binance Pay Content */}
              {(
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Binance Info */}
                <Card className="border border-border/60 bg-card shadow-sm">
                  <CardHeader className="text-center pb-6 relative z-10">
                    <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-500/20">
                        <WalletMinimal className="h-5 w-5 text-primary" />
                      </div>
                      Binance Pay
                    </CardTitle>
                    <CardDescription>
                      Use Binance Pay to complete a deposit from your preferred funding source.
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    <div className="flex justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl blur opacity-30 dark:opacity-20"></div>
                        <div className="relative bg-card rounded-2xl p-6 shadow-lg">
                          <img
                            src="https://play-lh.googleusercontent.com/T1_WHAGs5WZePQejNSqqrxZah4uhBvYr698nTCFhXMjMZo5oSCoko5yW2wtmeO1ClRU"
                            alt="Binance Logo"
                            className="w-32 h-32 object-contain bg-white rounded-xl"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="50" font-size="50">B</text></svg>';
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <div className="mb-2 text-xs font-medium text-muted-foreground">Processing Time</div>
                      <div className="font-semibold text-foreground">Within 1 Business Day</div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <div className="mb-2 text-xs font-medium text-muted-foreground">Minimum Deposit</div>
                      <div className="font-semibold text-foreground">Provider dependent</div>
                    </div>

                    <div className="rounded-2xl border border-amber-300/40 bg-amber-50/70 p-4 dark:border-amber-800/50 dark:bg-amber-950/20">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                        <div className="text-sm text-amber-900 dark:text-amber-100">
                          <p className="font-medium mb-1">Important Information:</p>
                          <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
                            After submitting your deposit request, you will be redirected to Binance Pay to complete the payment.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Right Column - Binance Deposit Form */}
                <Card className="border border-border/60 bg-card shadow-sm">
                  <CardHeader className="relative z-10">
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-600/10 border border-yellow-500/20">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      Create Deposit
                    </CardTitle>
                    <CardDescription>
                      Enter the amount you want to deposit via Binance Pay
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-6 relative z-10">
                    {error && (
                      <ApiErrorState
                        message={error}
                        audience="client"
                        resource="Binance deposit"
                        action="submit"
                        variant="inline"
                      />
                    )}

                    {/* Amount Input */}
                    <div className="space-y-3">
                      <Label htmlFor="binance-amount" className="text-sm font-semibold text-foreground">
                        Deposit Amount <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="binance-amount"
                          type="number"
                          step="1"
                          min="1"
                          value={binanceAmount}
                          onChange={(e) => setBinanceAmount(e.target.value)}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          className="pl-10 h-12 border-2 border-border focus:border-primary rounded-xl"
                          placeholder="100.00"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter the amount you want to deposit
                      </p>
                    </div>

                    {/* User Comment Input */}
                    <div className="space-y-3">
                      <Label htmlFor="binance-comment" className="text-sm font-semibold text-foreground">
                        User Comment <span className="text-muted-foreground text-xs">(Optional)</span>
                      </Label>
                      <Textarea
                        id="binance-comment"
                        value={binanceComment}
                        onChange={(e) => setBinanceComment(e.target.value)}
                        className="min-h-[100px] border-2 border-border focus:border-primary rounded-xl"
                        placeholder="Add any comments about this deposit..."
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleBinanceSubmit}
                      disabled={!binanceAmount.trim() || parseFloat(binanceAmount) <= 0 || isSubmittingBinance}
                      className="h-12 w-full rounded-xl bg-primary text-lg font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmittingBinance ? (
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
                  </CardContent>
                </Card>
              </div>
              )}
            </TabsContent>}

            {/* â”€â”€ CoinsBuy tab â”€â”€ */}
            {hasCoinsbuy && <TabsContent value="coinsbuy" className="space-y-8">
              {/* CoinsBuy Content */}
              {(
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - CoinsBuy Info */}
                <Card className="border border-border/60 bg-card shadow-sm">
                  <CardHeader className="text-center pb-6 relative z-10">
                    <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-500/20">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      CoinsBuy
                    </CardTitle>
                    <CardDescription>
                      Use CoinsBuy to start a guided checkout deposit flow.
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-6 relative z-10">
                    <div className="flex justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl blur opacity-30 dark:opacity-20"></div>
                        <div className="relative bg-card rounded-2xl p-6 shadow-lg">
                          <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex flex-col items-center justify-center gap-2">
                            <Wallet className="h-8 w-8 text-white" />
                            <span className="text-lg font-semibold text-white">CoinsBuy</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <div className="mb-2 text-xs font-medium text-muted-foreground">Processing Time</div>
                      <div className="font-semibold text-foreground">Within 1 Business Day</div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <div className="mb-2 text-xs font-medium text-muted-foreground">Minimum Deposit</div>
                      <div className="font-semibold text-foreground">Provider dependent</div>
                    </div>

                    <div className="rounded-2xl border border-amber-300/40 bg-amber-50/70 p-4 dark:border-amber-800/50 dark:bg-amber-950/20">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                        <div className="text-sm text-amber-900 dark:text-amber-100">
                          <p className="font-medium mb-1">Important Information:</p>
                          <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
                            After submitting your deposit request, you will be redirected to CoinsBuy to complete the payment.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Right Column - CoinsBuy Deposit Form */}
                <Card className="border border-border/60 bg-card shadow-sm">
                  <CardHeader className="relative z-10">
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-500/20">
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

                    {/* Amount Input */}
                    <div className="space-y-3">
                      <Label htmlFor="coinsbuy-amount" className="text-sm font-semibold text-foreground">
                        Deposit Amount <span className="text-destructive">*</span>
                      </Label>
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

                    {/* Submit Button */}
                    <Button
                      onClick={handleCoinsbuySubmit}
                      disabled={!coinsbuyAmount.trim() || parseFloat(coinsbuyAmount) <= 0 || isSubmittingCoinsbuy}
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
                  </CardContent>
                </Card>
              </div>
              )}
            </TabsContent>}

            {/* â”€â”€ Bank Transfer tab â”€â”€ */}
            {hasBank && <TabsContent value="bank" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left â€” Bank account details (dummy) */}
                <div className="space-y-6">
                  <Card className="border border-border/60 bg-card shadow-sm">
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-xl font-bold">
                          <div className="rounded-lg border border-primary/20 bg-primary/10 p-1.5">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          Bank Account Details
                        </CardTitle>
                        <CardDescription>
                          Transfer funds to one of the approved accounts below, then submit the Transaction ID.
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchBrokerBankDetails}
                        disabled={brokerBankDetailsLoading}
                        aria-label="Refresh bank account details"
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${brokerBankDetailsLoading ? "animate-spin" : ""}`}
                        />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {brokerBankDetailsLoading ? (
                        <div className="space-y-3">
                          {[1, 2].map((item) => (
                            <div
                              key={item}
                              className="rounded-2xl border border-border/50 bg-muted/20 p-4"
                            >
                              <Skeleton className="mb-3 h-5 w-40" />
                              <div className="grid gap-3 md:grid-cols-2">
                                {[1, 2, 3, 4].map((field) => (
                                  <div key={field} className="space-y-2">
                                    <Skeleton className="h-3 w-24" />
                                    <Skeleton className="h-5 w-full" />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : brokerBankDetailsError ? (
                        <ApiErrorState
                          message={brokerBankDetailsError}
                          audience="client"
                          resource="bank account details"
                          action="load"
                          variant="inline"
                        />
                      ) : visibleBrokerBankDetails.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
                          Bank deposit details are not available right now. Please contact support before sending funds.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {visibleBrokerBankDetails.map((detail) => {
                            const active = isBrokerBankDetailActive(detail);

                            return (
                              <div
                                key={detail.id}
                                className="rounded-2xl border border-border/60 bg-muted/20 p-4 shadow-sm"
                              >
                                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="text-base font-semibold text-foreground">
                                      {detail.bank_name}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {detail.country}
                                    </div>
                                  </div>
                                  <Badge variant={active ? "default" : "secondary"}>
                                    {active ? "Active" : "Inactive"}
                                  </Badge>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                  {[
                                    { label: "Account Name", value: detail.account_holder_name },
                                    { label: "Account Number", value: detail.account_number },
                                    { label: "IBAN Number", value: detail.iban_number },
                                    { label: "IFSC / SWIFT", value: detail.swift_ifsc_code },
                                    { label: "Address", value: detail.address },
                                  ].map(({ label, value }) => (
                                    <div
                                      key={`${detail.id}-${label}`}
                                      className="rounded-xl border border-border/50 bg-background/80 px-4 py-3"
                                    >
                                      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        {label}
                                      </div>
                                      <div className="mt-1 break-all font-mono text-sm font-medium text-foreground">
                                        {value || "-"}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="rounded-xl border border-amber-300/60 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                          <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1">
                            <p className="font-semibold">Before transferring:</p>
                            <ul className="space-y-0.5 list-none">
                              <li>â€¢ Keep a record of the Transaction / Reference ID</li>
                              <li>â€¢ Transfers typically reflect within 1â€“2 business days</li>
                              <li>â€¢ Minimum deposit: <strong>$10 USD</strong> equivalent</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right â€” Submit form + history */}
                <div className="space-y-6">

                  {/* Submit form */}
                  <Card className="border border-border/60 bg-card shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl font-bold">
                        <div className="rounded-lg border border-primary/20 bg-primary/10 p-1.5">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        Submit Transfer
                      </CardTitle>
                      <CardDescription>
                        Select your transfer currency, enter amount, and transaction ID from your bank transfer.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">

                      {/* Success receipt */}
                      {bankSubmitResult && (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-4 dark:bg-emerald-950/20 space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm">
                              Request submitted successfully
                            </p>
                          </div>
                          <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70"><Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300">{bankSubmitResult.status}</Badge>
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-emerald-700 dark:text-emerald-400 h-7 px-2"
                            onClick={() => setBankSubmitResult(null)}
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}

                      {bankError && (
                        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                          {bankError}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="bank-currency" className="text-sm font-semibold">
                          Deposit Currency <span className="text-destructive">*</span>
                        </Label>
                        <select
                          id="bank-currency"
                          value={bankCurrency}
                          onChange={(e) => setBankCurrency(e.target.value)}
                          disabled={isSubmittingBank || currencyRatesLoading || availableBankCurrencies.length === 0}
                          className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {availableBankCurrencies.length === 0 ? (
                            <option value="INR">No currencies available</option>
                          ) : (
                            availableBankCurrencies.map((code) => (
                              <option key={code} value={code}>
                                {code}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Amount */}
                      <div className="space-y-2">
                        <Label htmlFor="bank-amount" className="text-sm font-semibold">
                          Amount ({bankCurrency.toUpperCase()}) <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="bank-amount"
                            type="number"
                            step="1"
                            min="1"
                            value={bankAmount}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            onChange={(e) => setBankAmount(e.target.value)}
                            className="pl-9 h-11 rounded-xl"
                            placeholder="100.00"
                            disabled={isSubmittingBank}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {selectedRateToUsd?.deposit_rate
                            ? `Rate: 1 ${bankCurrency.toUpperCase()} = ${Number(selectedRateToUsd.deposit_rate).toFixed(6)} USD`
                            : "USD conversion rate is currently unavailable for this currency."}
                        </p>
                        {convertedUsdAmount !== null && (
                          <p className="text-xs font-medium text-foreground">
                            USD equivalent: ${convertedUsdAmount.toFixed(2)}
                          </p>
                        )}
                      </div>

                      {/* Transaction ID */}
                      <div className="space-y-2">
                        <Label htmlFor="bank-txid" className="text-sm font-semibold">
                          Transaction / Reference ID <span className="text-destructive">*</span>
                        </Label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="bank-txid"
                            value={bankTxId}
                            onChange={(e) => setBankTxId(e.target.value)}
                            className="pl-9 h-11 rounded-xl"
                            placeholder="e.g. TXN1234567890"
                            disabled={isSubmittingBank}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Found on your bank statement or payment receipt.
                        </p>
                      </div>

                      <Button
                        onClick={handleBankSubmit}
                        disabled={
                          isSubmittingBank ||
                          !bankAmount.trim() ||
                          !bankTxId.trim() ||
                          visibleBrokerBankDetails.length === 0
                        }
                        className="h-11 w-full rounded-xl text-base font-semibold"
                      >
                        {isSubmittingBank ? (
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
                    </CardContent>
                  </Card>

                  {/* Request history */}
                  <Card className="border border-border/60 bg-card shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
                      <div>
                        <CardTitle className="text-base font-semibold">Your Requests</CardTitle>
                        <CardDescription className="text-xs">Recent bank deposit submissions</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={fetchBankRequests} disabled={bankRequestsLoading}>
                        <RefreshCw className={`h-3.5 w-3.5 ${bankRequestsLoading ? "animate-spin" : ""}`} />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      {bankRequestsLoading ? (
                        <div className="space-y-2 p-4">
                          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
                        </div>
                      ) : bankRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
                          <FileText className="h-8 w-8 opacity-40" />
                          <p className="text-sm">No bank deposit requests yet</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                <TableHead className="text-xs">ID</TableHead>
                                <TableHead className="text-xs">Amount</TableHead>
                                <TableHead className="text-xs">Txn ID</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs">Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {bankRequests.map((req, index) => {
                                const statusColor =
                                  req.status === "approved"
                                    ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                                    : req.status === "rejected"
                                    ? "border-red-500/40 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20"
                                    : "border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20";
                                return (
                                  <TableRow key={req.id}>
                                     <TableCell className="font-medium">{index + 1}</TableCell>
                                    <TableCell className="text-sm font-semibold">${Number(req.amount).toFixed(2)}</TableCell>
                                    <TableCell className="font-mono text-xs max-w-[80px] truncate">{req.transaction_id}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={`text-xs capitalize ${statusColor}`}>
                                        {req.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                      {formatDateTimeInIST(req.created_at)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>}

            {/* â”€â”€ Coming-soon tabs for unrecognised payment method types â”€â”€ */}
            {comingSoonMethods.map(p => (
              <TabsContent key={p.type} value={p.type} className="space-y-8">
                <ComingSoonTab name={p.name} description={p.description} />
              </TabsContent>
            ))}
          </Tabs>
      </div>
    </div>
  );
}

export function USDTDepositPageContent() {
  return (
    
      <USDTDepositContent />
    
  );
}
