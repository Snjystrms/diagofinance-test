"use client";

import React, { useState } from "react";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { binanceDepositApi, type BinanceDepositCreateResponse } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";
import { notifyWalletRefresh } from "@/lib/client-events";
import toast from "react-hot-toast";
import { CheckCircle2, Clock, DollarSign, ShieldCheck, WalletMinimal } from "lucide-react";
import { DepositInfoPanel, MINIMUM_DEPOSIT_AMOUNT } from "./deposit-shared";

export function BinancePayDepositTab({ token }: { token: string | null }) {
  const [binanceAmount, setBinanceAmount] = useState("");
  const [binanceComment, setBinanceComment] = useState("");
  const [isSubmittingBinance, setIsSubmittingBinance] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        token,
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to create Binance deposit");
      }

      const depositData =
        response.data as unknown as BinanceDepositCreateResponse["data"];

      const qrContent =
        depositData?.qr_content ||
        depositData?.checkout_url ||
        depositData?.universal_url;

      if (qrContent) {
        notifyWalletRefresh();
        window.location.href = qrContent;
      } else {
        console.error(
          "Binance deposit response data:",
          JSON.stringify(depositData, null, 2),
        );
        toast.error("Payment link is not available right now. Please try again.");
        setIsSubmittingBinance(false);
      }
    } catch (err) {
      console.error("Error creating Binance deposit:", err);
      setError(
        getFriendlyErrorMessage(err, {
          audience: "client",
          resource: "Binance deposit",
          action: "create",
        }),
      );
      setIsSubmittingBinance(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Left Column - Binance Info */}
      <div className="space-y-6">
        <DepositInfoPanel
          title="Binance Pay flow"
          tagline="Complete a deposit from your preferred funding source using Binance Pay."
          steps={[
            {
              icon: DollarSign,
              title: "Enter the amount",
              text: "Choose how much you want to deposit.",
            },
            {
              icon: WalletMinimal,
              title: "Create a deposit request",
              text: "Submit your amount to start the Binance Pay payment.",
            },
            {
              icon: ShieldCheck,
              title: "Complete payment",
              text: "You'll be redirected to Binance Pay to finish securely.",
            },
          ]}
          verifyTitle="What to verify"
          verify={[
            {
              icon: Clock,
              title: "Processing time",
              text: "Deposit is typically processed within 1 business day.",
            },
            {
              icon: DollarSign,
              title: "Minimum deposit",
              text: "Minimum is provider-dependent.",
            },
            {
              icon: CheckCircle2,
              title: "Credit",
              text: "Funds are credited once the payment is confirmed.",
            },
          ]}
        />
      </div>

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

          <div className="space-y-3">
            <Label htmlFor="binance-comment" className="text-sm font-semibold text-foreground">
              User Comment{" "}
              <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Textarea
              id="binance-comment"
              value={binanceComment}
              onChange={(e) => setBinanceComment(e.target.value)}
              className="min-h-[100px] border-2 border-border focus:border-primary rounded-xl"
              placeholder="Add any comments about this deposit..."
            />
          </div>

          <Button
            onClick={handleBinanceSubmit}
            disabled={
              !binanceAmount.trim() ||
              parseFloat(binanceAmount) < MINIMUM_DEPOSIT_AMOUNT ||
              isSubmittingBinance
            }
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
          {binanceAmount &&
            parseFloat(binanceAmount) > 0 &&
            parseFloat(binanceAmount) < MINIMUM_DEPOSIT_AMOUNT && (
              <p className="text-xs text-destructive font-medium">
                Minimum deposit amount is ${MINIMUM_DEPOSIT_AMOUNT} USD
              </p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
