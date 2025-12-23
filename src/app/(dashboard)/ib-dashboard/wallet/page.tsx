"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ibRequestsApi, type IbWalletData } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function IbWalletPage() {
  const { token } = useAuth();
  const [walletData, setWalletData] = useState<IbWalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletData = useCallback(async () => {
    if (!token) {
      setError("Authentication required");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await ibRequestsApi.getIbWallet(token);
      // apiCall returns ApiResponse<IbWalletData>, so response.data is IbWalletData
      if (response?.success && response.data) {
        setWalletData(response.data);
      } else {
        setError("Failed to load wallet data");
      }
    } catch (err) {
      console.error("Failed to fetch IB wallet:", err);
      setError(err instanceof Error ? err.message : "Failed to load wallet");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchWalletData();
  }, [fetchWalletData]);

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const statusLower = status.toLowerCase();
    if (statusLower === "completed" || statusLower === "success" || statusLower === "approved") {
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    }
    if (statusLower === "pending" || statusLower === "processing") {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    }
    if (statusLower === "failed" || statusLower === "rejected" || statusLower === "cancelled") {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs">
        {status}
      </Badge>
    );
  };

  const getTransactionIcon = (type?: string) => {
    if (!type) return <RefreshCw className="h-4 w-4" />;
    const typeLower = type.toLowerCase();
    if (typeLower.includes("deposit") || typeLower.includes("credit") || typeLower.includes("earn")) {
      return <ArrowDownRight className="h-4 w-4 text-green-600" />;
    }
    if (typeLower.includes("withdrawal") || typeLower.includes("debit") || typeLower.includes("transfer")) {
      return <ArrowUpRight className="h-4 w-4 text-red-600" />;
    }
    return <RefreshCw className="h-4 w-4" />;
  };

  const getTransactionColor = (type?: string) => {
    if (!type) return "text-gray-600";
    const typeLower = type.toLowerCase();
    if (typeLower.includes("deposit") || typeLower.includes("credit") || typeLower.includes("earn")) {
      return "text-green-600";
    }
    if (typeLower.includes("withdrawal") || typeLower.includes("debit") || typeLower.includes("transfer")) {
      return "text-red-600";
    }
    return "text-gray-600";
  };

  if (isLoading) {
    return (
      <div className="min-h-full w-full bg-white dark:bg-gray-900 p-6">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600 dark:text-gray-300">Loading wallet data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !walletData) {
    return (
      <div className="min-h-full w-full bg-white dark:bg-gray-900 p-6">
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md border-0 shadow-xl bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Error</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">{error || "Failed to load wallet data"}</p>
            </CardHeader>
            <CardContent>
              <Button onClick={fetchWalletData} variant="outline" className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { wallet_balance, client_wallet, earning_summary, transactions } = walletData;
  const transactionList = transactions?.data || [];

  return (
    <div className="min-h-full w-full bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/ib-dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">IB Wallet</h1>
              <p className="text-gray-600 dark:text-gray-400">View your wallet balance and transaction history</p>
            </div>
          </div>
          <Button onClick={fetchWalletData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Wallet Summary Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Partner Wallet</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(wallet_balance.amount, wallet_balance.currency)}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Client Wallet</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(client_wallet.amount, client_wallet.currency)}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(earning_summary.total_earned, earning_summary.currency)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions History */}
        <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactionList.length > 0 ? (
              <div className="space-y-4">
                {transactionList.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 ${getTransactionColor(transaction.type)}`}>
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {transaction.type || "Transaction"}
                          </p>
                          {getStatusBadge(transaction.status)}
                        </div>
                        {transaction.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{transaction.description}</p>
                        )}
                        {transaction.created_at && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {format(new Date(transaction.created_at), "PPp")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${getTransactionColor(transaction.type)}`}>
                        {transaction.amount !== undefined
                          ? `${transaction.type?.toLowerCase().includes("withdrawal") || transaction.type?.toLowerCase().includes("debit") || transaction.type?.toLowerCase().includes("transfer") ? "-" : "+"}${formatCurrency(Math.abs(transaction.amount), transaction.currency || "USD")}`
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Transaction</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  You haven&apos;t made any transactions yet. Your transaction history will appear here.
                </p>
                <Link href="/ib-dashboard">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}




