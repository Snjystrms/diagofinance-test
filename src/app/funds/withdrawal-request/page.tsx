'use client'
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/main-layout";
import { useAuth } from "@/contexts/auth-context";
import { withdrawalApi, walletApi, type WithdrawalResponse, type WalletSummaryData, type WithdrawalItem } from "@/lib/api";
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
  TrendingDown
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Supported chain options
const CHAIN_OPTIONS = [
  { value: "TRC20", label: "TRC20 (Tron)", network: "Tron Network" },
  { value: "ERC20", label: "ERC20 (Ethereum)", network: "Ethereum Network" },
  { value: "BEP20", label: "BEP20 (BNB Smart Chain)", network: "BNB Smart Chain" },
  { value: "BSC", label: "BSC (BNB Smart Chain)", network: "BNB Smart Chain" },
  { value: "ETH", label: "ETH (Ethereum)", network: "Ethereum Network" },
];

function WithdrawalRequestContent() {
  const { user, token } = useAuth();
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

  const selectedChain = CHAIN_OPTIONS.find(chain => chain.value === chainId);
  const minimumAmount = 10.00;

  // Fetch wallet balance
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
      console.error('Error fetching wallet summary:', err);
    } finally {
      setWalletLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletSummary();
  }, [token]);

  // Calculate remaining balance
  const totalBalance = walletData?.total_balance || 0;
  const withdrawalAmount = parseFloat(amount) || 0;
  const remainingBalance = totalBalance - withdrawalAmount;
  const wallets = walletData ? Object.values(walletData.wallets) : [];
  const mainWallet = wallets.find(w => w.is_primary) || wallets[0];
  const currency = mainWallet?.currency || 'USDT';

  const formatAmount = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '0.00';
    return numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    });
  };

  const handleCopyAddress = async () => {
    if (walletAddress) {
      try {
        await navigator.clipboard.writeText(walletAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch (error) {
        console.error("Failed to copy address:", error);
      }
    }
  };

  const validateWalletAddress = (address: string, chain: string): boolean => {
    if (!address.trim()) return false;
    
    const trimmedAddress = address.trim();
    
    // TRC20 addresses start with T and are typically 34 characters (allow 25-40 for flexibility)
    if (chain === "TRC20") {
      return trimmedAddress.startsWith("T") && trimmedAddress.length >= 25 && trimmedAddress.length <= 40;
    }
    
    // ERC20/BEP20 addresses start with 0x and are typically 42 characters (allow 30-50 for flexibility)
    if (chain === "ERC20" || chain === "BEP20" || chain === "BSC" || chain === "ETH") {
      return trimmedAddress.startsWith("0x") && trimmedAddress.length >= 30 && trimmedAddress.length <= 50;
    }
    
    // For other chains, just check minimum length
    return trimmedAddress.length >= 20;
  };

  const handleSubmit = async () => {
    if (!token) {
      setError("Authentication required. Please log in again.");
      return;
    }

    setError(null);
    setSuccess(false);

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

    if (amountNum < minimumAmount) {
      setError(`Minimum withdrawal amount is ${minimumAmount} USDT`);
      return;
    }

    // Validate sufficient balance
    if (amountNum > totalBalance) {
      setError(`Insufficient balance. Available: ${formatAmount(totalBalance)} ${currency}`);
      return;
    }

    // Validate wallet address
    if (!walletAddress.trim()) {
      setError("Wallet address is required");
      return;
    }

    if (!validateWalletAddress(walletAddress, chainId)) {
      setError(`Invalid ${chainId} wallet address format`);
      return;
    }

    // Validate chain ID
    if (!chainId) {
      setError("Please select a network");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await withdrawalApi.create(
        {
          amount: amount,
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
      
      // Refresh wallet balance after successful withdrawal
      fetchWalletSummary();
      
      // Reset form after successful submission
      setTimeout(() => {
        setAmount("");
        setWalletAddress("");
      }, 3000);

    } catch (err) {
      console.error("Error creating withdrawal request:", err);
      setError(err instanceof Error ? err.message : "Failed to create withdrawal request. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Button validation - allow button to be enabled with basic checks
  // Strict validation happens in handleSubmit
  const amountNum = parseFloat(amount);
  const isValidAmount = amount.trim() !== "" && !isNaN(amountNum) && amountNum >= minimumAmount && amountNum > 0;
  const hasWalletAddress = walletAddress.trim().length > 0;
  const hasChainId = chainId !== "";
  const hasToken = !!token;
  const canSubmit = isValidAmount && hasWalletAddress && hasChainId && !isSubmitting && hasToken;
  
  // Debug: Uncomment to see validation state
  // console.log('Validation:', { isValidAmount, hasWalletAddress, hasChainId, hasToken, isSubmitting, canSubmit, amount, walletAddress, chainId });

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center w-20 h-20 bg-gradient-to-r from-red-500 to-orange-600 rounded-full mb-4 shadow-lg">
            <ArrowUpRight className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
            Withdraw USDT
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Request a withdrawal to your external wallet address
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Wallet Balance Card */}
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardContent className="p-6">
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
              ) : (
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Available Balance
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-foreground tracking-tight">
                        {formatAmount(totalBalance)}
                      </span>
                      <span className="text-lg font-semibold text-muted-foreground">{currency}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Keeping at least {formatAmount(minimumAmount)} {currency} ensures future withdrawals.
                    </p>
                  </div>

                  <div className="flex-1 w-full max-w-md">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground mb-2">
                      <span>Impact of this withdrawal</span>
                      <span>
                        {amountNum > 0
                          ? `${((amountNum / (totalBalance || 1)) * 100).toFixed(0)}%`
                          : "0%"}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          remainingBalance < 0
                            ? "bg-destructive"
                            : remainingBalance < minimumAmount
                              ? "bg-yellow-500"
                              : "bg-gradient-to-r from-blue-500 to-indigo-500"
                        }`}
                        style={{
                          width: `${Math.min(100, (amountNum / (totalBalance || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    {amount && !isNaN(amountNum) && amountNum > 0 && (
                      <div className="mt-3 text-xs text-muted-foreground space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Remaining balance</span>
                          <span
                            className={`font-semibold ${
                              remainingBalance < 0
                                ? "text-destructive"
                                : remainingBalance < minimumAmount
                                  ? "text-yellow-600"
                                  : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {formatAmount(remainingBalance)} {currency}
                          </span>
                        </div>
                        {remainingBalance < 0 && (
                          <p className="text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Insufficient balance for this withdrawal
                          </p>
                        )}
                        {remainingBalance >= 0 && remainingBalance < minimumAmount && (
                          <p className="text-yellow-600 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Remaining balance will be below the minimum withdrawal amount
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 min-w-[220px]">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Last Request</p>
                      {withdrawalData?.created_at ? (
                        <>
                          <p className="text-sm font-semibold text-foreground">
                            {formatAmount(withdrawalData.amount || amount)} {currency}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {new Date(withdrawalData.created_at).toLocaleString()}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No recent withdrawals</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchWalletSummary}
                      className="self-start gap-2"
                      disabled={walletLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${walletLoading ? "animate-spin" : ""}`} />
                      Refresh balance
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-card/70 backdrop-blur-sm">
            {/* <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <Wallet className="h-6 w-6 text-red-600" />
                Withdrawal Request
              </CardTitle>
              <CardDescription>
                Enter your withdrawal details below
              </CardDescription>
            </CardHeader> */}

            <CardContent className="space-y-6">
              {!success ? (
                <>
                  {/* Error Message */}
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-destructive">{error}</p>
                      </div>
                    </div>
                  )}

                  {/* Amount Input */}
                  <div className="space-y-3">
                    <Label htmlFor="amount" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Amount (USDT) <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min={minimumAmount}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-10 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-red-500 dark:focus:border-red-400 rounded-lg"
                        placeholder="10.00"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Minimum withdrawal amount: {minimumAmount} USDT
                    </p>
                  </div>

                  {/* Network Selection */}
                  <div className="space-y-3">
                    <Label htmlFor="chain_id" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Network <span className="text-destructive">*</span>
                    </Label>
                    <Select value={chainId} onValueChange={setChainId}>
                      <SelectTrigger className="w-full h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-red-500 dark:focus:border-red-400 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Network className="h-4 w-4 text-gray-400" />
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
                      <p className="text-xs text-gray-500">
                        Selected: {selectedChain.network}
                      </p>
                    )}
                  </div>

                  {/* Wallet Address Input */}
                  <div className="space-y-3">
                    <Label htmlFor="wallet_address" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Wallet Address <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <Input
                        id="wallet_address"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        className="pl-10 pr-20 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-red-500 dark:focus:border-red-400 rounded-lg font-mono text-sm"
                        placeholder={chainId === "TRC20" ? "T..." : "0x..."}
                      />
                      {walletAddress && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyAddress}
                          className="absolute right-2 top-2 h-8 px-2"
                        >
                          <Copy className="h-4 w-4" />
                          {copied ? "Copied!" : "Copy"}
                        </Button>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-gray-500">
                        {chainId === "TRC20" 
                          ? "TRC20 addresses start with 'T' and are typically 25-40 characters long" 
                          : "ERC20/BEP20 addresses start with '0x' and are typically 30-50 characters long"}
                      </p>
                    </div>
                  </div>

                  {/* Important Notes */}
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-warning-foreground">
                        <p className="font-medium mb-1">Important Notes:</p>
                        <ul className="space-y-1 text-xs">
                          <li>• Double-check your wallet address before submitting</li>
                          <li>• Ensure the network matches your wallet type</li>
                          <li>• Withdrawal requests may take 24-48 hours to process</li>
                          <li>• Minimum withdrawal: {minimumAmount} USDT</li>
                          <li>• Network fees may apply depending on the selected chain</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-5 w-5 mr-2" />
                        Submit Withdrawal Request
                      </>
                    )}
                  </Button>
                </>
              ) : (
                /* Success State */
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
                    Withdrawal Request Submitted!
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Your withdrawal request has been successfully submitted and is pending review.
                  </p>
                  
                  {withdrawalData && (
                    <div className="space-y-4 mb-6">
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Amount:</span>
                          <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                            {typeof withdrawalData.amount === 'number' 
                              ? withdrawalData.amount.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 8
                                })
                              : parseFloat(withdrawalData.amount || amount).toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 8
                                })} USDT
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Network:</span>
                          <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100">
                            {withdrawalData.chain_id || chainId}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Wallet:</span>
                          <code className="text-xs font-mono bg-emerald-100 dark:bg-emerald-900 px-2 py-1 rounded break-all text-right max-w-[70%]">
                            {withdrawalData.wallet_address || walletAddress}
                          </code>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                            <Clock className="h-3 w-3 mr-1" />
                            {withdrawalData.status || 'Pending'}
                          </Badge>
                        </div>
                        {withdrawalData.id && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Request ID:</span>
                            <span className="font-mono text-sm text-emerald-800 dark:text-emerald-200">
                              #{withdrawalData.id}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => window.location.href = '/funds/withdraw'}
                      className="border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Withdrawal Status
                    </Button>
                    <Button
                      onClick={() => {
                        setSuccess(false);
                        setWithdrawalData(null);
                        setAmount("");
                        setWalletAddress("");
                      }}
                      className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
                    >
                      New Withdrawal
                    </Button>
                  </div>
                </div>
              )}

              {/* How it Works */}
              {!success && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
                    How it works:
                  </h4>
                  <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-red-600 dark:text-red-400 font-bold text-xs">1</span>
                      </div>
                      <span>Enter the withdrawal amount (minimum {minimumAmount} USDT)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-orange-600 dark:text-orange-400 font-bold text-xs">2</span>
                      </div>
                      <span>Select your network (TRC20, ERC20, BEP20, etc.)</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">3</span>
                      </div>
                      <span>Enter your external wallet address</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">4</span>
                      </div>
                      <span>Submit and wait for approval (24-48 hours)</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function WithdrawalRequestPage() {
  return (
    <MainLayout>
      <WithdrawalRequestContent />
    </MainLayout>
  );
}