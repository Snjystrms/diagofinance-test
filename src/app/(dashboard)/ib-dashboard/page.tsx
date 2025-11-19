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
    
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-600">Loading IB dashboard...</p>
          </div>
        </div>
     
    );
  }

  if (error || !dashboardData) {
    return (
    
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error || "Failed to load dashboard data"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={fetchDashboard} variant="outline">
                Retry
              </Button>
            </CardContent>
          </Card>
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
   
      <div className="space-y-6 p-6 bg-white">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 shadow-lg">
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-white drop-shadow-lg">
                  IB Dashboard
                </h1>
                <p className="text-lg text-indigo-100 font-medium">
                  Welcome back, <span className="font-semibold text-white">{user.name}</span>! Track your earnings and performance.
                </p>
              </div>
              <Badge variant="secondary" className="text-sm font-semibold bg-white/20 text-white border-white/30 backdrop-blur-sm">
                Partner ID: {user.partner_id}
              </Badge>
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-2xl"></div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 bg-white">
          {/* Partner Wallet Card */}
          <Card className="relative overflow-hidden border-2 border-indigo-100 shadow-lg hover:shadow-xl transition-all duration-300 group bg-white">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 opacity-50"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-slate-700">Partner Wallet</CardTitle>
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md">
                <Wallet className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">
                {formatCurrency(partner_wallet.balance, partner_wallet.currency)}
              </div>
              <p className="text-xs text-slate-500 mb-4">Available balance</p>
              <Button
                onClick={() => setIsTransferDialogOpen(true)}
                variant="default"
                size="sm"
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Transfer to Client Wallet
              </Button>
            </CardContent>
          </Card>

          {/* Client Wallet Card */}
          <Card className="relative overflow-hidden border-2 border-purple-100 shadow-lg hover:shadow-xl transition-all duration-300 group bg-white">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-pink-50 opacity-50"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-slate-700">Client Wallet</CardTitle>
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md">
                <Wallet className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
                {formatCurrency(client_wallet.balance, client_wallet.currency)}
              </div>
              <p className="text-xs text-slate-500">Client funds</p>
            </CardContent>
          </Card>

          {/* Today's Earnings Card */}
          <Card className="relative overflow-hidden border-2 border-emerald-100 shadow-lg hover:shadow-xl transition-all duration-300 group bg-white">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-teal-50 opacity-50"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-slate-700">Today's Earnings</CardTitle>
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1">
                {formatCurrency(today_earning.balance, today_earning.currency)}
              </div>
              <p className="text-xs text-slate-500">Earned today</p>
            </CardContent>
          </Card>

          {/* Total Earned Card */}
          <Card className="relative overflow-hidden border-2 border-amber-100 shadow-lg hover:shadow-xl transition-all duration-300 group bg-white">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-white to-orange-50 opacity-50"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-slate-700">Total Earned</CardTitle>
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md">
                <DollarSign className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-1">
                {formatCurrency(earning_summary.total_earned, earning_summary.currency)}
              </div>
              <p className="text-xs text-slate-500">All time earnings</p>
            </CardContent>
          </Card>
        </div>

        {/* Partner Info & Referral Link */}
        <Card className="shadow-lg border-2 border-slate-100 bg-white">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-indigo-50 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">Partner Information</CardTitle>
                <CardDescription className="text-slate-600">Your IB details and referral link</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 bg-white">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 hover:shadow-md transition-all">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">IB Name</p>
                <p className="text-xl font-bold text-slate-800">{partner_info.ib_name}</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 hover:shadow-md transition-all">
                <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">IB Plan</p>
                <p className="text-xl font-bold text-slate-800">{partner_info.ib_plan}</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-slate-50 to-indigo-50 border border-slate-200 hover:shadow-md transition-all">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Partner ID</p>
                <p className="text-xl font-bold font-mono text-slate-800">{partner_info.partner_id}</p>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-br from-pink-50 to-orange-50 border border-pink-100 hover:shadow-md transition-all">
                <p className="text-xs font-semibold text-pink-600 uppercase tracking-wide mb-2">Email</p>
                <p className="text-xl font-bold text-slate-800 break-all">{user.email}</p>
              </div>
            </div>
            <div className="pt-6 mt-6 border-t bg-white">
              <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-6 border border-indigo-100">
                <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-slate-700">Referral Link</p>
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 text-xs">
                      Share & Earn
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={partner_info.referral_link}
                      className="flex-1 px-4 py-3 border-2 border-indigo-200 rounded-lg bg-white text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <Button 
                      onClick={copyReferralLink} 
                      variant="default" 
                      size="icon"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => window.open(partner_info.referral_link, "_blank")}
                      variant="default"
                      size="icon"
                      className="bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Share this link with others to start earning commissions
                  </p>
                </div>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100 rounded-full -mr-16 -mt-16 blur-2xl opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-100 rounded-full -ml-12 -mb-12 blur-xl opacity-50"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Rebates */}
        <Card className="relative overflow-hidden border-2 border-blue-200 shadow-lg bg-white">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-80"></div>
          <CardHeader className="relative z-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-b-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white">Pending Rebates</CardTitle>
                <CardDescription className="text-blue-100">Rebates pending for the current cycle</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="p-6 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                <p className="text-sm font-semibold text-blue-100 uppercase tracking-wide mb-2">Pending Amount</p>
                <p className="text-4xl font-bold text-white">
                  {formatCurrency(pending_rebates.amount, pending_rebates.currency)}
                </p>
              </div>
              <div className="p-6 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg text-right">
                <p className="text-sm font-semibold text-purple-100 uppercase tracking-wide mb-2">Time Remaining</p>
                <p className="text-3xl font-bold text-white">{pending_rebates.remaining_time.formatted}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cycle Period</p>
                  <span className="text-sm font-semibold text-slate-700">
                    {pending_rebates.cycle_start} - {pending_rebates.cycle_end}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earnings Summary */}
        <div className="grid gap-6 md:grid-cols-2 ">
          {/* Earnings Summary Card */}
          <Card className="shadow-lg border-2 border-emerald-100 bg-white">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800">Earnings Summary</CardTitle>
                  <CardDescription className="text-slate-600">Total earnings and transfers</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500 text-white">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">Total Earned</span>
                  </div>
                  <span className="text-xl font-bold text-emerald-700">
                    {formatCurrency(earning_summary.total_earned, earning_summary.currency)}
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500 text-white">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">Internal Transfers</span>
                  </div>
                  <span className="text-xl font-bold text-blue-700">
                    {formatCurrency(earning_summary.total_internal_transfers, earning_summary.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rebates Graph Card */}
          <Card className="shadow-lg border-2 border-purple-100 bg-white">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800">Rebates Graph</CardTitle>
                  <CardDescription className="text-slate-600">Last 7 days rebates</CardDescription>
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
                          <span className="text-sm font-semibold text-slate-700">{item.date}</span>
                          <span className="text-sm font-bold text-purple-700">
                            {formatCurrency(item.rebates, "USD")}
                          </span>
                        </div>
                        <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 rounded-full transition-all duration-500 shadow-md"
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
        <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen} >
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="pb-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50 -mx-6 -mt-6 px-6 pt-6 rounded-t-lg">
              <div className="lex items-center justify-center mt-4 gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-800">Transfer to Client Wallet</DialogTitle>
                  <DialogDescription className="text-slate-600 mt-1">
                    Transfer funds from your partner wallet to your client wallet.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-5 py-6 bg-white">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-semibold text-slate-700">Amount</Label>
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
                  className="h-12 text-base border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                />
                {dashboardData && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-indigo-50 border border-indigo-100">
                    <Wallet className="h-4 w-4 text-indigo-600" />
                    <p className="text-xs font-semibold text-indigo-700">
                      Available: <span className="font-bold">{formatCurrency(partner_wallet.balance, partner_wallet.currency)}</span>
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="comment" className="text-sm font-semibold text-slate-700">Comment (Optional)</Label>
                <Textarea
                  id="comment"
                  placeholder="Transfer from partner wallet to client wallet"
                  value={transferComment}
                  onChange={(e) => setTransferComment(e.target.value)}
                  disabled={isTransferring}
                  rows={3}
                  className="border-2 border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all resize-none"
                />
              </div>
            </div>
            <DialogFooter className="gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsTransferDialogOpen(false);
                  setTransferAmount("");
                  setTransferComment("");
                }}
                disabled={isTransferring}
                className="border-2 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleTransfer} 
                disabled={isTransferring}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all min-w-[120px]"
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

  );
}

