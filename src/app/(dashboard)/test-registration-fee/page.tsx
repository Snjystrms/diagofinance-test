'use client'

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  AlertCircle, 
  CheckCircle, 
  Copy, 
  QrCode,
  Shield,
  DollarSign,
  Clock
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { userOperations } from "@/utils/operations";

export default function TestRegistrationFeePage() {
  const { token } = useAuth();
  const [transactionHash, setTransactionHash] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [depositStatus, setDepositStatus] = useState("pending");
  const [errorMessage, setErrorMessage] = useState("");

  // Registration fee details
  const depositAddress = "0xcD8d359Fe7086f4AEf9C0549542bBNB72E95f7E0";
  const network = "BNB Smart Chain";
  const registrationFee = "25 USDT";
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

  const handleSubmitHash = async () => {
    if (!transactionHash.trim()) return;
    
    setIsSubmitting(true);
    setErrorMessage("");
    
    try {
      // Use the operations function to submit transaction hash
      const data = await userOperations.submitRegistrationFee(transactionHash.trim(), token!);

      if (data.success) {
        setDepositStatus("submitted");
        
        // Simulate blockchain confirmation delay
        setTimeout(() => {
          setDepositStatus("confirmed");
        }, 3000);
      } else {
        throw new Error(data.message || 'Failed to submit transaction hash');
      }
    } catch (error) {
      console.error('Error submitting transaction hash:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit transaction hash');
      setDepositStatus("pending");
    } finally {
      setIsSubmitting(false);
    }
  };

  // const isValidHash = transactionHash.startsWith("0x") && transactionHash.length >= 10;
const isValidHash = true;
  return (
    <div className="bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center p-6 border-b mb-6">
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-muted/20">
            <Shield className="h-8 w-8 text-foreground" />
          </div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            One-Time Registration Fee Required
          </h1>
          <p className="text-muted-foreground text-base">
            Complete your account activation by paying the one-time registration fee of {registrationFee}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column - QR Code and Details */}
          <Card className="border-2 border-orange-200 dark:border-orange-800 shadow-xl">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-bold flex items-center justify-center gap-2 text-orange-600">
                <QrCode className="h-5 w-5" />
                Registration Fee Payment
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Use this address to send {tokenType} on {network}
              </p>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl blur opacity-30"></div>
                  <div className="relative bg-card rounded-xl p-4 shadow-lg">
                    <img
                      src="/qr_bsc_address.png"
                      alt="Registration Fee QR code"
                      className="w-48 h-48 object-contain bg-white rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Fee Amount - Highlighted */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-4 border-2 border-orange-200 dark:border-orange-800">
                <div className="text-center">
                  <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-2">Registration Fee Amount</div>
                  <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">{registrationFee}</div>
                  <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">One-time payment</div>
                </div>
              </div>

              {/* Network and Amount Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Network</div>
                  <Badge variant="secondary" className="mt-2 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                    {network}
                  </Badge>
                </div>
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Token</div>
                  <div className="mt-2 font-semibold text-emerald-800 dark:text-emerald-200">{tokenType}</div>
                </div>
              </div>

              {/* Deposit Address */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-foreground">
                  Payment Address ({tokenType})
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/50 rounded-lg p-2 border text-xs">
                    <code className="break-all">
                      {depositAddress}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAddress}
                    className="h-10 px-3"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>

              {/* Important Notes */}
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-orange-800 dark:text-orange-200">
                    <p className="font-medium mb-1">Important:</p>
                    <ul className="space-y-1">
                      <li>• Only send {tokenType} on {network}</li>
                      <li>• Exact amount: {registrationFee}</li>
                      <li>• Payment may take 5-10 minutes to confirm</li>
                      <li>• Double-check the address before sending</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Transaction Hash Submission */}
          <Card className="border-2 border-purple-200 dark:border-purple-800 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-purple-600">
                <DollarSign className="h-5 w-5" />
                Submit Payment Proof
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                After sending {registrationFee}, paste your transaction hash below to verify payment
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {depositStatus === "pending" && (
                <>
                  {/* Transaction Hash Input */}
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-foreground">
                      Transaction Hash
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        value={transactionHash}
                        onChange={(e) => {
                          setTransactionHash(e.target.value);
                          if (errorMessage) setErrorMessage("");
                        }}
                        className="w-full pl-10 h-10 border-2 border-gray-200 dark:border-gray-600 focus:border-purple-500 dark:focus:border-purple-400 rounded-lg px-3 bg-background"
                        placeholder="0x1234567890abcdef..."
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Find this in your wallet&apos;s transaction history or blockchain explorer
                    </p>
                  </div>

                  {/* Error Message Display */}
                  {errorMessage && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-red-800 dark:text-red-200">
                          <p className="font-medium mb-1">Error:</p>
                          <p>{errorMessage}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    onClick={handleSubmitHash}
                    disabled={!isValidHash || isSubmitting}
                    className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="h-5 w-5 mr-2 animate-spin" />
                        Verifying Payment...
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5 mr-2" />
                        Verify Registration Payment
                      </>
                    )}
                  </Button>
                </>
              )}

              {depositStatus === "submitted" && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400 animate-spin" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Payment Submitted Successfully!
                  </h3>
                  <p className="text-muted-foreground mb-3 text-sm">
                    Your transaction hash has been submitted and is being verified on the blockchain...
                  </p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-800 dark:text-blue-200 break-all">
                      Hash: {transactionHash}
                    </p>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Please wait while we confirm your payment...
                  </p>
                </div>
              )}

              {depositStatus === "confirmed" && (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
                    Payment Confirmed!
                  </h3>
                  <p className="text-muted-foreground mb-3 text-sm">
                    Your registration fee has been verified. Account activation in progress...
                  </p>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-xs text-emerald-800 dark:text-emerald-200">
                      Registration fee payment confirmed
                    </p>
                  </div>
                  
                  {/* Reset Button */}
                  <Button
                    onClick={() => {
                      setTransactionHash("");
                      setDepositStatus("pending");
                      setErrorMessage("");
                    }}
                    variant="outline"
                    className="mt-4"
                  >
                    Submit Another Transaction
                  </Button>
                </div>
              )}

              {/* How it Works */}
              {depositStatus === "pending" && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <h4 className="font-semibold text-foreground mb-2 text-sm">
                    How to complete registration:
                  </h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-orange-600 dark:text-orange-400 font-bold text-xs">1</span>
                      </div>
                      <span>Scan QR or copy the payment address</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-purple-600 dark:text-purple-400 font-bold text-xs">2</span>
                      </div>
                      <span>Send exactly {registrationFee} from your wallet</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">3</span>
                      </div>
                      <span>Submit the transaction hash here</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 p-6 border-t bg-muted/30 rounded-lg">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              After payment verification, your account will be activated and you&apos;ll have access to all features.
            </p>
            <p className="text-xs text-muted-foreground">
              This is a test page for the registration fee UI. In production, this would be integrated with the main application.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 