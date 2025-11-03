'use client'
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/main-layout";
import { useAuth } from "@/contexts/auth-context";
import { submitUSDTDeposit } from "@/utils/operations";
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
  X
} from "lucide-react";

function USDTDepositContent() {
  const { user, token } = useAuth();
  const [amount, setAmount] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [depositStatus, setDepositStatus] = useState("pending"); // pending, submitted, confirmed
  const [error, setError] = useState<string | null>(null);

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
            <div className="mx-auto flex items-center justify-center w-20 h-20 bg-gradient-to-r from-red-500 to-orange-600 rounded-full mb-4 shadow-lg">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-2">
              Registration Fee Required
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
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
                  After paying the registration fee, you'll be able to make regular USDT deposits and access all platform features.
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
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full mb-4 shadow-lg">
            <Wallet className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
            USDT Deposit
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Scan the QR code or copy the address below to deposit USDT to your account
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column - QR Code and Details */}
            <Card className="border-0 shadow-xl bg-card/70 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                  <QrCode className="h-6 w-6 text-blue-600" />
                  Deposit Address
                </CardTitle>
                <CardDescription>
                  Use this address to send {tokenType} on {network}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
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
                  <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
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
            <Card className="border-0 shadow-xl bg-card/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Hash className="h-6 w-6 text-purple-600" />
                  Submit Transaction
                </CardTitle>
                <CardDescription>
                  After sending USDT, paste your transaction hash below to track your deposit
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {depositStatus === "pending" && (
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
                          min="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="pl-10 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 rounded-lg"
                          placeholder="100.00"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Enter the amount of USDT you deposited (minimum: {minimumAmount})
                      </p>
                    </div>

                    {/* Transaction Hash Input */}
                    <div className="space-y-3">
                      <Label htmlFor="txhash" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Transaction Hash <span className="text-gray-400 text-xs">(Optional if screenshot provided)</span>
                      </Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          id="txhash"
                          value={transactionHash}
                          onChange={(e) => setTransactionHash(e.target.value)}
                          className="pl-10 h-12 border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 rounded-lg"
                          placeholder="0x1234567890abcdef..."
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        You can find this in your wallet's transaction history or on the blockchain explorer
                      </p>
                    </div>

                    {/* Payment Proof Upload */}
                    <div className="space-y-3">
                      <Label htmlFor="payment_proof" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Payment Proof (Screenshot) <span className="text-gray-400 text-xs">(Optional if transaction hash provided)</span>
                      </Label>
                      {!paymentProof ? (
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:border-purple-500 dark:hover:border-purple-400 transition-colors">
                          <label
                            htmlFor="payment_proof"
                            className="flex flex-col items-center justify-center cursor-pointer"
                          >
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                              Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">
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
                        <div className="relative border-2 border-gray-200 dark:border-gray-600 rounded-lg p-4">
                          <div className="flex items-center gap-4">
                            {paymentProofPreview && (
                              <img
                                src={paymentProofPreview}
                                alt="Payment proof preview"
                                className="w-20 h-20 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {paymentProof.name}
                              </p>
                              <p className="text-xs text-gray-500">
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
                      <p className="text-xs text-gray-500">
                        Upload a screenshot of your transaction (JPEG, PNG, or WebP, max 5MB)
                      </p>
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleSubmitHash}
                      disabled={!canSubmit || isSubmitting}
                      className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      We're verifying your transaction on the blockchain...
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
        </div>
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