'use client'
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MainLayout } from "@/components/main-layout";
import { useAuth } from "@/contexts/auth-context";
import { submitUSDTDeposit } from "@/utils/operations";
import { walletApi, binanceDepositApi, coinsbuyDepositApi, type WalletSummaryData, type BinanceDepositCreateResponse, type CoinsBuyDepositCreateResponse } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";
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
  TrendingUp
} from "lucide-react";

function USDTDepositContent() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<"local" | "crypto">("local");
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
  const [cryptoPaymentMethod, setCryptoPaymentMethod] = useState<"binance" | "coinsbuy">("binance");
  const wallets = walletData ? Object.values(walletData.wallets || {}) : [];
  const primaryWallet = wallets.find((wallet) => wallet.is_primary) || wallets[0];
  const currency = primaryWallet?.currency || "USDT";
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

  const recentDepositAmount = recentDeposit ? parseFloat(recentDeposit.amount || "0") : null;
  const recentDepositLabel = recentDepositAmount
    ? `${formatAmount(recentDepositAmount)} ${currency}`
    : "No recent deposits";
  const recentDepositDate = recentDeposit
    ? new Date(recentDeposit.created_at).toLocaleString()
    : "—";

  const typedAmountNum = parseFloat(amount) || 0;
  const depositReadiness =
    availableBalance > 0 ? Math.min(100, Math.round((typedAmountNum / availableBalance) * 100)) : 0;

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

  // Check if user needs to pay registration fee
  const needsRegistrationFee = user && user.type === 'user' && user.is_account_active === false;

  // Deposit details
  const depositAddress = "0xcD8d359Fe7086f4AEf9C0549542bBCB72E95f7E0";
  const network = "BNB Smart Chain";
  const minimumAmount = needsRegistrationFee ? "25 USDT" : "10 USDT";
  const tokenType = "USDT (BEP20)";

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
        window.location.href = qrContent;
      } else {
        console.error("Binance deposit response data:", JSON.stringify(depositData, null, 2));
        toast.error("QR code link not available. Please check the console for details.");
        setIsSubmittingBinance(false);
      }
    } catch (err) {
      console.error("Error creating Binance deposit:", err);
      setError(err instanceof Error ? err.message : "Failed to create Binance deposit. Please try again.");
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
      setIsSubmittingCoinsbuy(false);
      setCoinsbuyAmount("");
    } catch (err) {
      console.error("Error creating CoinsBuy deposit:", err);
      setError(err instanceof Error ? err.message : "Failed to create CoinsBuy deposit. Please try again.");
      setIsSubmittingCoinsbuy(false);
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
      
      // Simulate confirmation after a delay (in real app, this would come from backend)
      setTimeout(() => {
        setDepositStatus("confirmed");
      }, 3000);

    } catch (err) {
      console.error("Error submitting deposit:", err);
      setError(err instanceof Error ? err.message : "Failed to submit deposit. Please try again.");
      setIsSubmitting(false);
    }
  };

  const isValidHash = transactionHash.trim() === "" || (transactionHash.startsWith("0x") && transactionHash.length >= 10);
  const canSubmit = amount.trim() !== "" && parseFloat(amount) > 0 && (transactionHash.trim() !== "" || paymentProof !== null) && isValidHash;

  // If user needs registration fee, show different content
  if (needsRegistrationFee) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center w-20 h-20 rounded-full mb-4 bg-muted/20">
              <Shield className="h-10 w-10 text-foreground" />
            </div>
            <h1 className="text-3xl font-semibold text-foreground mb-2">
              Registration Fee Required
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-base max-w-2xl mx-auto">
              Complete your account activation by paying the one-time registration fee of 25 USDT
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Card className="border-2 border-orange-200 dark:border-orange-800 shadow-xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-orange-600">
                  One-Time Registration Fee: 25 USDT
                </CardTitle>
                <CardDescription>
                  This fee is required to activate your account and unlock all features
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-lg text-muted-foreground mb-6">
                  After paying the registration fee, you&apos;ll be able to make regular USDT deposits and access all platform features.
                </p>
                <Button 
                  onClick={() => window.location.href = '/test-registration-fee'}
                  className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-8 py-3 text-lg"
                >
                  <Shield className="h-5 w-5 mr-2" />
                  Pay Registration Fee
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full p-4 lg:p-6 xl:p-8 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section - Enhanced */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-emerald-500/5 to-teal-500/5 rounded-2xl blur-3xl -z-10" />
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-foreground mb-1">
              USDT Deposit
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl">
              Scan the QR code or copy the address below to deposit USDT to your account
            </p>
          </div>
        </div>

        {/* Tabs - Enhanced */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "local" | "crypto")} className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="w-full max-w-md bg-muted/50 p-1 rounded-xl gap-1">
              <TabsTrigger 
                value="local" 
                className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-emerald-600 data-[state=active]:text-primary-foreground rounded-lg transition-all duration-200"
              >
                <Hash className="h-4 w-4 mr-2" />
                Local
              </TabsTrigger>
              <TabsTrigger 
                value="crypto" 
                className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-purple-600 data-[state=active]:text-primary-foreground rounded-lg transition-all duration-200"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Cryptocurrency
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Wallet Summary Card - Enhanced */}
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-background to-muted/30 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-emerald-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <CardContent className="p-6 relative z-10">
              {walletLoading ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-40" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ) : walletData ? (
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                      Available Balance
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-foreground tracking-tight">
                        {formatAmount(availableBalance)}
                      </span>
                      <span className="text-lg font-semibold text-muted-foreground">{currency}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Secondary wallets: {formatAmount(secondaryBalance)} {currency}
                    </p>
                  </div>

                  <div className="flex-1 w-full max-w-md">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
                      <span>Deposit readiness</span>
                      <span>{depositReadiness}% of current balance</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-300"
                        style={{ width: `${depositReadiness}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      Adjust your deposit amount to stay within your available wallet capacity.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[220px]">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Last Deposit</p>
                      <p className="text-sm font-semibold text-foreground">{recentDepositLabel}</p>
                      <p className="text-[11px] text-muted-foreground">{recentDepositDate}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchWalletSummary}
                      className="self-start gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh balance
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <p>Wallet summary not available. Please log in to view your balance.</p>
                  <Button variant="outline" size="sm" onClick={fetchWalletSummary}>
                    Retry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

            <TabsContent value="local" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Column - QR Code and Details */}
            <Card className="border-0 shadow-xl bg-card/70 backdrop-blur-sm">
              <CardHeader className="text-center pb-6 relative z-10">
                <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-blue-500/10 border border-primary/20">
                    <QrCode className="h-5 w-5 text-primary" />
                  </div>
                  Deposit Address
                </CardTitle>
                <CardDescription>
                  Use this address to send {tokenType} on {network}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6 relative z-10">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-30 dark:opacity-20"></div>
                    <div className="relative bg-card rounded-2xl p-6 shadow-lg">
                      <img
                        src="/qr_bsc_address.png"
                        alt="USDT (BEP20) QR code"
                        className="w-64 h-64 object-contain bg-white rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Network and Amount Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Network</div>
                    <Badge variant="secondary" className="mt-2 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                      {network}
                    </Badge>
                  </div>
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Minimum</div>
                    <div className="mt-2 font-semibold text-emerald-800 dark:text-emerald-200">{minimumAmount}</div>
                  </div>
                </div>

                {/* Deposit Address */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-foreground">
                    Deposit Address ({tokenType})
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
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-warning-foreground">
                      <p className="font-medium mb-1">Important Notes:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• Only send {tokenType} on {network}</li>
                        <li>• Minimum deposit: {minimumAmount}</li>
                        <li>• Deposits may take 5-10 minutes to confirm</li>
                        <li>• Double-check the address before sending</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Column - Transaction Hash Submission */}
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-background to-muted/30 group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <CardHeader className="relative z-10">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
                    <Hash className="h-5 w-5 text-primary" />
                  </div>
                  Submit Transaction
                </CardTitle>
                <CardDescription>
                  After sending USDT, paste your transaction hash below to track your deposit
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 relative z-10">
                {depositStatus === "pending" && (
                  <>
                    {/* Error Message */}
                    {error && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-destructive">{error}</p>
                        </div>
                      </div>
                    )}

                    {/* Amount Input */}
                    <div className="space-y-3">
                      <Label htmlFor="amount" className="text-sm font-semibold text-foreground">
                        Amount (USDT) <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="pl-10 h-12 border-2 border-border focus:border-primary rounded-xl"
                          placeholder="100.00"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter the amount of USDT you deposited (minimum: {minimumAmount})
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
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-purple-500 dark:hover:border-purple-400 transition-colors">
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
                      className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Clock className="h-5 w-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-5 w-5 mr-2" />
                          Submit Deposit
                        </>
                      )}
                    </Button>
                  </>
                )}

                {depositStatus === "submitted" && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Processing Transaction
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      We&apos;re verifying your transaction on the blockchain...
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-200 break-all">
                        Hash: {transactionHash}
                      </p>
                    </div>
                  </div>
                )}

                {depositStatus === "confirmed" && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
                      Deposit Confirmed!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Your USDT deposit has been successfully processed
                    </p>
                    <div className="space-y-3">
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                        <p className="text-sm text-emerald-800 dark:text-emerald-200">
                          Transaction confirmed on blockchain
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
                        <span>Send USDT from your wallet</span>
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
            </TabsContent>

            <TabsContent value="crypto" className="space-y-8">
              {/* Payment Method Selection - Enhanced with Tabs */}
              <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-background to-muted/30 group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <CardContent className="p-4 relative z-10">
                  <Tabs value={cryptoPaymentMethod} onValueChange={(value) => setCryptoPaymentMethod(value as "binance" | "coinsbuy")} className="w-full">
                    <TabsList className="w-full bg-muted/50 p-1 rounded-xl">
                      <TabsTrigger 
                        value="binance" 
                        className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
                      >
                        <img 
                          src="https://binance.com/favicon.ico" 
                          alt="Binance" 
                          className="h-4 w-4 mr-2"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        Binance Pay
                      </TabsTrigger>
                      <TabsTrigger 
                        value="coinsbuy" 
                        className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white rounded-lg transition-all duration-200"
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        CoinsBuy
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Binance Pay Content */}
              {cryptoPaymentMethod === "binance" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Binance Info */}
                <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-background to-muted/30 group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-orange-600/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
                  <CardHeader className="text-center pb-6 relative z-10">
                    <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-600/10 border border-yellow-500/20">
                        <img 
                          src="https://binance.com/favicon.ico" 
                          alt="Binance" 
                          className="h-5 w-5"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      Binance Pay
                    </CardTitle>
                    <CardDescription>
                      Deposit funds using Binance Pay
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

                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                      <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mb-2">Processing Time</div>
                      <div className="font-semibold text-yellow-800 dark:text-yellow-200">Within 1 Business Day</div>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-2">Minimum Deposit</div>
                      <div className="font-semibold text-emerald-800 dark:text-emerald-200">Unlimited</div>
                    </div>

                    <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-warning-foreground">
                          <p className="font-medium mb-1">Important Information:</p>
                          <p className="text-xs">
                            After submitting your deposit request, you will be redirected to Binance Pay to complete the payment.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Right Column - Binance Deposit Form */}
                <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-background to-muted/30 group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-orange-600/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
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
                      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-destructive">{error}</p>
                        </div>
                      </div>
                    )}

                    {/* Amount Input */}
                    <div className="space-y-3">
                      <Label htmlFor="binance-amount" className="text-sm font-semibold text-foreground">
                        Deposit Amount (USDT) <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="binance-amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={binanceAmount}
                          onChange={(e) => setBinanceAmount(e.target.value)}
                          className="pl-10 h-12 border-2 border-border focus:border-primary rounded-xl"
                          placeholder="100.00"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter the amount of USDT you want to deposit
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
                      className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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

              {/* CoinsBuy Content */}
              {cryptoPaymentMethod === "coinsbuy" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - CoinsBuy Info */}
                <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-background to-muted/30 group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
                  <CardHeader className="text-center pb-6 relative z-10">
                    <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-500/20">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      CoinsBuy
                    </CardTitle>
                    <CardDescription>
                      Deposit funds using CoinsBuy
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

                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">Processing Time</div>
                      <div className="font-semibold text-blue-800 dark:text-blue-200">Within 1 Business Day</div>
                    </div>

                    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-2">Minimum Deposit</div>
                      <div className="font-semibold text-emerald-800 dark:text-emerald-200">Unlimited</div>
                    </div>

                    <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-warning-foreground">
                          <p className="font-medium mb-1">Important Information:</p>
                          <p className="text-xs">
                            After submitting your deposit request, you will be redirected to CoinsBuy to complete the payment.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Right Column - CoinsBuy Deposit Form */}
                <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-background to-muted/30 group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
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
                      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-destructive">{error}</p>
                        </div>
                      </div>
                    )}

                    {/* Amount Input */}
                    <div className="space-y-3">
                      <Label htmlFor="coinsbuy-amount" className="text-sm font-semibold text-foreground">
                        Deposit Amount (USDT) <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="coinsbuy-amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={coinsbuyAmount}
                          onChange={(e) => setCoinsbuyAmount(e.target.value)}
                          className="pl-10 h-12 border-2 border-border focus:border-primary rounded-xl"
                          placeholder="100.00"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter the amount of USDT you want to deposit
                      </p>
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleCoinsbuySubmit}
                      disabled={!coinsbuyAmount.trim() || parseFloat(coinsbuyAmount) <= 0 || isSubmittingCoinsbuy}
                      className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
            </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}

export default function USDTDepositPage() {
  return (
    <MainLayout>
      <USDTDepositContent />
    </MainLayout>
  );
}