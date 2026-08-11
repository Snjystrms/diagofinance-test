"use client";

import React, { useState } from "react";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { coinsbuyDepositApi, type CoinsBuyDepositCreateResponse } from "@/lib/api";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";
import { notifyWalletRefresh } from "@/lib/client-events";
import toast from "react-hot-toast";
import { AlertCircle, Clock, DollarSign, ShieldCheck, Wallet } from "lucide-react";
import { MINIMUM_DEPOSIT_AMOUNT } from "./deposit-shared";

export function CoinsBuyDepositTab({ token }: { token: string | null }) {
  const [coinsbuyAmount, setCoinsbuyAmount] = useState("");
  const [isSubmittingCoinsbuy, setIsSubmittingCoinsbuy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const response = await coinsbuyDepositApi.create(
        {
          amount: amountNum,
        },
        token,
      );

      if (!response.success || !response.data) {
        throw new Error(
          response.message || "Failed to create CoinsBuy deposit",
        );
      }

      const depositData =
        response.data as unknown as CoinsBuyDepositCreateResponse["data"];
      const coinsbuyDepositId = depositData?.coinsbuy_deposit_id;

      if (!coinsbuyDepositId) {
        throw new Error("CoinsBuy deposit ID not found in response");
      }

      try {
        const webhookResponse = await coinsbuyDepositApi.triggerWebhook(
          {
            data: {
              type: "deposit",
              id: coinsbuyDepositId,
            },
          },
          token,
        );

        if (!webhookResponse.success) {
          console.warn("Webhook trigger warning:", webhookResponse.message);
        }
      } catch (webhookErr) {
        console.error("Error triggering webhook:", webhookErr);
      }

      toast.success("CoinsBuy deposit created successfully!");
      notifyWalletRefresh();
      setIsSubmittingCoinsbuy(false);
      setCoinsbuyAmount("");
    } catch (err) {
      console.error("Error creating CoinsBuy deposit:", err);
      setError(
        getFriendlyErrorMessage(err, {
          audience: "client",
          resource: "CoinsBuy deposit",
          action: "create",
        }),
      );
      setIsSubmittingCoinsbuy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                  <span className="text-lg font-semibold text-white">
                    CoinsBuy
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Processing Time
            </div>
            <div className="font-semibold text-foreground">
              Within 1 Business Day
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Minimum Deposit
            </div>
            <div className="font-semibold text-foreground">Provider dependent</div>
          </div>

          <div className="rounded-2xl border border-amber-300/40 bg-amber-50/70 p-4 dark:border-amber-800/50 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-sm text-amber-900 dark:text-amber-100">
                <p className="font-medium mb-1">Important Information:</p>
                <p className="text-xs text-amber-800/90 dark:text-amber-200/90">
                  After submitting your deposit request, you will be redirected
                  to CoinsBuy to complete the payment.
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

          <Button
            onClick={handleCoinsbuySubmit}
            disabled={
              !coinsbuyAmount.trim() ||
              parseFloat(coinsbuyAmount) < MINIMUM_DEPOSIT_AMOUNT ||
              isSubmittingCoinsbuy
            }
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
          {coinsbuyAmount &&
            parseFloat(coinsbuyAmount) > 0 &&
            parseFloat(coinsbuyAmount) < MINIMUM_DEPOSIT_AMOUNT && (
              <p className="text-xs text-destructive font-medium">
                Minimum deposit amount is ${MINIMUM_DEPOSIT_AMOUNT} USD
              </p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
