"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ibRequestsApi, type IbDashboardResponse, type IbInternalTransferRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Wallet,
  ArrowLeftRight,
  ArrowLeft,
  Loader2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import toast from "react-hot-toast";
import Link from "next/link";

export default function TransferPage() {
  const { token, user: authUser } = useAuth();
  const [dashboardData, setDashboardData] = useState<IbDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferComment, setTransferComment] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!token) {
      setError("Authentication required");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await ibRequestsApi.getDashboard(token);
      if (response?.data) {
        setDashboardData(response.data);
      } else {
        setError("Failed to load dashboard data");
      }
    } catch (err) {
      console.error("Failed to fetch IB dashboard:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const handleTransfer = async () => {
    if (!token || !dashboardData) {
      toast.error("Authentication required");
      return;
    }

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > dashboardData.partner_wallet.balance) {
      toast.error("Insufficient balance in partner wallet");
      return;
    }

    try {
      setIsTransferring(true);
      const transferData: IbInternalTransferRequest = {
        amount,
        ...(transferComment.trim() && { comment: transferComment.trim() }),
      };

      const response = await ibRequestsApi.internalTransfer(transferData, token);
      
      if (response.success) {
        toast.success(response.message || "Transfer completed successfully");
        setTransferAmount("");
        setTransferComment("");
        // Refresh dashboard data
        await fetchDashboard();
      } else {
        toast.error(response.message || "Transfer failed");
      }
    } catch (err) {
      console.error("Transfer error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to complete transfer");
    } finally {
      setIsTransferring(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full w-full bg-white dark:bg-gray-900 p-6">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600 dark:text-gray-300">Loading transfer page...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-full w-full bg-white dark:bg-gray-900 p-6">
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md border-0 shadow-xl bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Error</CardTitle>
              <CardDescription>{error || "Failed to load dashboard data"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button onClick={fetchDashboard} variant="outline" className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                  Retry
                </Button>
                <Link href="/ib-dashboard">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { partner_wallet, client_wallet } = dashboardData;

  return (
    <div className="min-h-full w-full bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/ib-dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">IB Internal Transfer</h1>
              <p className="text-gray-600 dark:text-gray-400">Transfer funds from your partner wallet to your client wallet</p>
            </div>
          </div>
          <Button onClick={fetchDashboard} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Wallet Balance Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white/80 text-sm font-medium mb-1">Partner Wallet</p>
                  <p className="text-white text-2xl font-bold">
                    {formatCurrency(partner_wallet.balance, partner_wallet.currency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Client Wallet</p>
                  <p className="text-gray-900 dark:text-white text-2xl font-bold">
                    {formatCurrency(client_wallet.balance, client_wallet.currency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transfer Form */}
        <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-50"></div>
                <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
                  <ArrowLeftRight className="h-6 w-6" />
                </div>
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Transfer to Client Wallet</CardTitle>
                <CardDescription className="text-base mt-1">
                  Transfer funds from your partner wallet to your client wallet
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={partner_wallet.balance}
                placeholder="Enter amount"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                disabled={isTransferring}
                className="h-12 text-base border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all rounded-xl"
              />
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
                <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Available: <span className="font-bold">{formatCurrency(partner_wallet.balance, partner_wallet.currency)}</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Comment (Optional)
              </Label>
              <Textarea
                id="comment"
                placeholder="Transfer from partner wallet to client wallet"
                value={transferComment}
                onChange={(e) => setTransferComment(e.target.value)}
                disabled={isTransferring}
                rows={3}
                className="border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all resize-none rounded-xl"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Link href="/ib-dashboard" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full border-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl"
                  disabled={isTransferring}
                >
                  Cancel
                </Button>
              </Link>
              <Button
                onClick={handleTransfer}
                disabled={isTransferring || !transferAmount || parseFloat(transferAmount) <= 0}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl"
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Transfer
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-0 shadow-xl bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About Internal Transfers</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Internal transfers allow you to move funds between your partner wallet and client wallet. 
                  Funds transferred to your client wallet can be used for trading or withdrawals. 
                  All transfers are processed instantly and reflected in your transaction history.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
