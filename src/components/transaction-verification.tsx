"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Info, Hash, Code, ShieldCheck, ArrowLeft } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { transactionOperations } from "@/utils/operations";

interface TransactionVerificationProps {
  verificationCode?: string;
  transactionHash?: string;
  network?: string;
  amount?: string;
  address?: string;
}

export default function TransactionVerification({
  verificationCode = "489791",
  transactionHash = "0xcD8d359Fe7086f4AEf9C0549542bBCB72E95f7E0",
  network = "BNB Smart Chain",
  amount = "30 USDT (BEP20)",
  address = "0xcD8d359Fe7086f4AEf9C0549542bBCB72E95f7E0",
}: TransactionVerificationProps) {
  const [hashcode, setHashcode] = useState(verificationCode);
  const [txHash, setTxHash] = useState(transactionHash);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setHashcode(verificationCode);
  }, [verificationCode]);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const extractTokenFromPath = (path: string | null): string | null => {
    if (!path) return null;
    const match = path.match(/\/user\/verify-email\/([^\/?#]+)/);
    return match?.[1] ?? null;
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const token = extractTokenFromPath(pathname);
      if (!token) {
        alert("❌ Unable to read verification token from URL.");
        return;
      }

      const result = await transactionOperations.verifyEmailWithTransaction(
        token,
        hashcode,     // 6-digit OTP
        txHash        // transaction hash
      );

      if (result?.status === "payment_verified") {
        const successData = encodeURIComponent(
          JSON.stringify({
            message: result.message,
            status: result.status,
            data: result.data,
          }),
        );
        router.push(`/verification-success?data=${successData}`);
      } else {
        const errorMessage = result?.message || result?.error || "Verification failed";
        alert(`❌ ${errorMessage}`);
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("❌ Error submitting verification. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const otpValid = /^\d{6}$/.test(hashcode);

  return (
    <div className="min-h-screen flex">

      {/* Right side — Content */}
      <div className="flex-1 flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl">
          {/* Page header */}
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Payment Verification</h1>
            <p className="text-muted-foreground mt-2">
              Scan the QR, send the amount, and enter the 6-digit code from your email.
            </p>
          </div>

          <Card className="border-2 border-primary/20 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">Affiliate CRM Platform</CardTitle>
              <CardDescription>Securely confirm your transaction details</CardDescription>
            </CardHeader>

            <CardContent className="p-6 md:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT — QR + details */}
                <div className="space-y-6">
                  {/* QR box with gradient “border” effect */}
                  <div className="flex justify-center">
                    <div className="relative rounded-xl p-[1px] bg-gradient-to-r from-violet-600/60 to-cyan-400/40">
                      <div className="rounded-xl bg-card p-3 border border-border">
                        <Image
                          src="/qr_bsc_address.png"
                          alt="USDT (BEP20) QR code"
                          width={192}
                          height={192}
                          className="w-48 h-48 object-contain bg-white rounded-md"
                          priority
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary badges */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Network</div>
                      <div className="mt-1">
                        <Badge variant="secondary" className="font-medium">{network}</Badge>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Amount</div>
                      <div className="mt-1 font-semibold">{amount}</div>
                    </div>
                  </div>

                  {/* Address row */}
                  <div className="space-y-2">
                    <span className="text-sm text-muted-foreground">Address</span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-muted px-2 py-1 rounded font-mono break-all border border-border">
                        {address}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyAddress}
                        className="h-8 px-2"
                        aria-label="Copy address"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Scan the QR above or paste this address in your wallet (USDT • BEP20).
                    </p>
                  </div>
                </div>

                {/* RIGHT — Form */}
                <div className="space-y-6">
                  {/* Security Code (OTP) */}
                  <div className="space-y-3">
                    <Label htmlFor="hashcode" className="text-sm font-medium">
                      Security Code (6 digits)
                    </Label>
                    <div className="flex items-center gap-3">
                      <Code className="h-4 w-4 text-muted-foreground" />
                      <InputOTP
                        id="hashcode"
                        maxLength={6}
                        value={hashcode}
                        onChange={(val) => setHashcode(val.replace(/\D/g, "").slice(0, 6))}
                        onComplete={(val) => setHashcode(val)}
                        className="flex-1"
                      >
                        <InputOTPGroup className="gap-2">
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-5 h-5 bg-muted rounded-full flex items-center justify-center border border-border">
                          <Info className="h-3 w-3" />
                        </div>
                        <span>Check your email</span>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Hash */}
                  <div className="space-y-3">
                    <Label htmlFor="txhash" className="text-sm font-medium">
                      Transaction Hash
                    </Label>
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <Input
                        id="txhash"
                        value={txHash}
                        onChange={(e) => setTxHash(e.target.value)}
                        className="flex-1"
                        placeholder="0x..."
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Paste the hash from your wallet or explorer after sending.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <Button
                      onClick={handleSubmit}
                      className="w-full"
                      disabled={isSubmitting || !otpValid || !txHash}
                    >
                      {isSubmitting ? "Verifying..." : "Submit Verification"}
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => router.back()}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      It may take up to a minute for the transaction to appear on-chain.
                    </p>
                  </div>
                </div>
              </div>

              {/* Divider note */}
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">
                  Note: Your 6-digit security code was sent to your email address.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
