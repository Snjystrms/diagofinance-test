"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ibRequestsApi, type IbDashboardResponse, type IbInternalTransferRequest } from "@/lib/api";
import { MainLayout } from "@/components/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DollarSign,
  Wallet,
  TrendingUp,
  Users,
  Copy,
  ExternalLink,
  Calendar,
  Clock,
  BarChart3,
  Loader2,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/format";

export default function IbDashboardPage() {
  const { token } = useAuth();
  const [dashboardData, setDashboardData] = useState<IbDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
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

  const copyReferralLink = () => {
    if (dashboardData?.partner_info?.referral_link) {
      navigator.clipboard.writeText(dashboardData.partner_info.referral_link);
      toast.success("Referral link copied to clipboard!");
    }
  };

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
        setIsTransferDialogOpen(false);
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
      <div className="min-h-full w-full p-4 lg:p-6 xl:p-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-blue-950/20 dark:to-indigo-950/10">
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300">Loading IB dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-full w-full p-4 lg:p-6 xl:p-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-blue-950/20 dark:to-indigo-950/10">
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md border-0 shadow-xl bg-card/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Error</CardTitle>
              <CardDescription>{error || "Failed to load dashboard data"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={fetchDashboard} 
                variant="outline"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const {
    user,
    partner_wallet,
    client_wallet,
    today_earning,
    rebates_graph,
    pending_rebates,
    earning_summary,
    partner_info,
  } = dashboardData;

  return (
    <div className="min-h-full w-full p-4 lg:p-6 xl:p-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-blue-950/20 dark:to-indigo-950/10">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 shadow-xl">
          <div className="relative z-10">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-75"></div>
                    <div className="relative flex items-center justify-center w-16 h-16 rounded-xl bg-white/20 backdrop-blur-sm text-white shadow-lg">
                      <BarChart3 className="h-8 w-8" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h1 className="text-4xl font-bold text-white mb-2">
                      IB Dashboard
                    </h1>
                    <p className="text-lg text-white/90 font-medium">
                      Welcome back, <span className="font-semibold text-white">{user.name}</span>! Track your earnings and performance.
                    </p>
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="text-sm font-semibold bg-white/20 backdrop-blur-sm text-white border-white/30">
                Partner ID: {user.partner_id}
              </Badge>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Partner Wallet Card */}
          <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group bg-card/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Partner Wallet</CardTitle>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl blur opacity-50"></div>
                <div className="relative p-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-1">
                {formatCurrency(partner_wallet.balance, partner_wallet.currency)}
              </div>
              <p className="text-xs text-muted-foreground mb-4">Available balance</p>
              <Button
                onClick={() => setIsTransferDialogOpen(true)}
                variant="default"
                size="sm"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Transfer to Client Wallet
              </Button>
            </CardContent>
          </Card>

          {/* Client Wallet Card */}
          <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group bg-card/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Client Wallet</CardTitle>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl blur opacity-50"></div>
                <div className="relative p-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-1">
                {formatCurrency(client_wallet.balance, client_wallet.currency)}
              </div>
              <p className="text-xs text-muted-foreground">Client funds</p>
            </CardContent>
          </Card>

          {/* Today's Earnings Card */}
          <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group bg-card/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Today&apos;s Earnings</CardTitle>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl blur opacity-50"></div>
                <div className="relative p-2 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-1">
                {formatCurrency(today_earning.balance, today_earning.currency)}
              </div>
              <p className="text-xs text-muted-foreground">Earned today</p>
            </CardContent>
          </Card>

          {/* Total Earned Card */}
          <Card className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group bg-card/70 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Earned</CardTitle>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl blur opacity-50"></div>
                <div className="relative p-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-1">
                {formatCurrency(earning_summary.total_earned, earning_summary.currency)}
              </div>
              <p className="text-xs text-muted-foreground">All time earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Partner Info & Referral Link */}
        <Card className="border-0 shadow-xl bg-card/70 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-50"></div>
                <div className="relative p-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Partner Information</CardTitle>
                <CardDescription>Your IB details and referral link</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 hover:shadow-md transition-all">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">IB Name</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{partner_info.ib_name}</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800 hover:shadow-md transition-all">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">IB Plan</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{partner_info.ib_plan}</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-950/20 dark:to-cyan-950/20 border border-emerald-200 dark:border-emerald-800 hover:shadow-md transition-all">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Partner ID</p>
                <p className="text-xl font-bold font-mono text-gray-900 dark:text-gray-100">{partner_info.partner_id}</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 hover:shadow-md transition-all">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Email</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 break-all">{user.email}</p>
              </div>
            </div>
            <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-6 border border-blue-200 dark:border-blue-800">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-gray-900 dark:text-gray-100">Referral Link</p>
                    <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-800 dark:text-blue-300 text-xs border-0">
                      Share & Earn
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={partner_info.referral_link}
                      className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm font-mono text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <Button 
                      onClick={copyReferralLink} 
                      variant="default" 
                      size="icon"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => window.open(partner_info.referral_link, "_blank")}
                      variant="default"
                      size="icon"
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Share this link with others to start earning commissions
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Rebates */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-yellow-950/20 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl blur opacity-50"></div>
                <div className="relative p-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Pending Rebates</CardTitle>
                <CardDescription>Rebates pending for the current cycle</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="p-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg flex-1 min-w-[200px]">
                <p className="text-sm font-semibold text-white/90 uppercase tracking-wide mb-2">Pending Amount</p>
                <p className="text-4xl font-bold text-white">
                  {formatCurrency(pending_rebates.amount, pending_rebates.currency)}
                </p>
              </div>
              <div className="p-6 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg text-right flex-1 min-w-[200px]">
                <p className="text-sm font-semibold text-white/90 uppercase tracking-wide mb-2">Time Remaining</p>
                <p className="text-3xl font-bold text-white">{pending_rebates.remaining_time.formatted}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-4 border-t border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800">
                <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cycle Period</p>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {pending_rebates.cycle_start} - {pending_rebates.cycle_end}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earnings Summary */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Earnings Summary Card */}
          <Card className="border-0 shadow-xl bg-card/70 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl blur opacity-50"></div>
                  <div className="relative p-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Earnings Summary</CardTitle>
                  <CardDescription>Total earnings and transfers</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Total Earned</span>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    {formatCurrency(earning_summary.total_earned, earning_summary.currency)}
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Internal Transfers</span>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    {formatCurrency(earning_summary.total_internal_transfers, earning_summary.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rebates Graph Card */}
          <Card className="border-0 shadow-xl bg-card/70 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl blur opacity-50"></div>
                  <div className="relative p-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Rebates Graph</CardTitle>
                  <CardDescription>Last 7 days rebates</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {(() => {
                  const maxRebate = Math.max(
                    ...rebates_graph.map((r) => r.rebates),
                    1
                  );
                  
                  return rebates_graph.map((item, index) => {
                    const percentage = Math.min((item.rebates / maxRebate) * 100, 100);
                    
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.date}</span>
                          <span className="text-sm font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                            {formatCurrency(item.rebates, "USD")}
                          </span>
                        </div>
                        <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-500 shadow-md"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transfer Dialog */}
        <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
          <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-card/95 backdrop-blur-sm rounded-2xl">
            <DialogHeader>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-50"></div>
                  <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    Transfer to Client Wallet
                  </DialogTitle>
                  <DialogDescription className="text-base mt-2">
                    Transfer funds from your partner wallet to your client wallet.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-5 py-6">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={dashboardData?.partner_wallet.balance}
                  placeholder="Enter amount"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  disabled={isTransferring}
                  className="h-12 text-base border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all rounded-xl"
                />
                {dashboardData && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
                    <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Available: <span className="font-bold">{formatCurrency(partner_wallet.balance, partner_wallet.currency)}</span>
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="comment" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Comment (Optional)</Label>
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
            </div>
            <DialogFooter className="gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => {
                  setIsTransferDialogOpen(false);
                  setTransferAmount("");
                  setTransferComment("");
                }}
                disabled={isTransferring}
                className="border-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleTransfer} 
                disabled={isTransferring}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 min-w-[120px] rounded-xl"
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

