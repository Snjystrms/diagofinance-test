"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  FileText,
  RefreshCw,
  Link as LinkIcon,
  Gem,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/format";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import Link from "next/link";

// Helper function to get time-based greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning!";
  if (hour < 17) return "Good Afternoon!";
  return "Good Evening!";
};

// Helper function to format remaining time
const formatRemainingTime = (remainingTime: {
  days: number;
  days_decimal: number;
  hours: number;
  minutes: number;
  seconds: number;
}) => {
  const days = Math.floor(remainingTime.days_decimal * 10) / 10;
  const hours = String(remainingTime.hours).padStart(2, "0");
  const minutes = String(remainingTime.minutes).padStart(2, "0");
  const seconds = String(remainingTime.seconds).padStart(2, "0");
  return `${days} Days | ${hours}:${minutes}:${seconds}`;
};

export default function IbDashboardPage() {
  const { token, user: authUser } = useAuth();
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

  // Prepare chart data for rebates graph - must be called before early returns
  const chartData = useMemo(() => {
    if (!dashboardData?.rebates_graph) return [];
    return dashboardData.rebates_graph.map((item) => ({
      date: item.date,
      rebates: item.rebates,
    }));
  }, [dashboardData?.rebates_graph]);

  const chartConfig: ChartConfig = {
    rebates: {
      label: "Rebates",
      color: "hsl(217, 91%, 60%)",
    },
  };

  const maxRebate = useMemo(() => {
    if (!dashboardData?.rebates_graph || dashboardData.rebates_graph.length === 0) return 30;
    return Math.max(...dashboardData.rebates_graph.map((r) => r.rebates), 1);
  }, [dashboardData?.rebates_graph]);

  // Calculate progress percentage for pending rebates cycle
  const cycleProgress = useMemo(() => {
    if (!dashboardData?.pending_rebates?.cycle_start || !dashboardData?.pending_rebates?.cycle_end) return 0;
    const start = new Date(dashboardData.pending_rebates.cycle_start).getTime();
    const end = new Date(dashboardData.pending_rebates.cycle_end).getTime();
    const now = new Date().getTime();
    if (end <= start) return 0;
    const progress = ((now - start) / (end - start)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  }, [dashboardData?.pending_rebates]);

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
      <div className="min-h-full w-full bg-white dark:bg-gray-900">
        <div className="bg-gray-900 dark:bg-black px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">{getGreeting()}</span>
              <div className="w-px h-6 bg-blue-500"></div>
              <span className="text-white font-bold text-lg">{authUser?.name || "Loading..."}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600 dark:text-gray-300">Loading IB dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-full w-full bg-white dark:bg-gray-900">
        <div className="bg-gray-900 dark:bg-black px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">{getGreeting()}</span>
              <div className="w-px h-6 bg-blue-500"></div>
              <span className="text-white font-bold text-lg">{authUser?.name || "Error"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
          <Card className="max-w-md border-0 shadow-xl bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Error</CardTitle>
              <CardDescription>{error || "Failed to load dashboard data"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={fetchDashboard} 
                variant="outline"
                className="bg-blue-600 hover:bg-blue-700 text-white border-0"
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
    <div className="min-h-full w-full bg-white dark:bg-gray-900">
      {/* Dark Header Bar */}
      <div className="bg-gray-900 dark:bg-black px-6 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">{getGreeting()}</span>
            <div className="w-px h-6 bg-blue-500"></div>
            <span className="text-white font-bold text-lg">{user.name}</span>
          </div>
          <Button
            variant="outline"
            className="bg-blue-100 hover:bg-blue-200 text-gray-900 border-0 rounded-lg font-medium"
          >
            IB Agreement <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">

        {/* Top Row: Partner Wallet, Today Earning Graph, Pending Rebates */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Partner Wallet Card - Large with Gradient Background */}
          <Card className="relative overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Wallet className="h-12 w-12 text-white" />
                </div>
                <div>
                  <p className="text-white text-lg font-medium mb-2">Partner Wallet</p>
                  <p className="text-white text-5xl font-bold">
                    {formatCurrency(partner_wallet.balance, partner_wallet.currency)}
                  </p>
                </div>
                <div className="flex gap-3 w-full">
                  <Button
                    onClick={() => setIsTransferDialogOpen(true)}
                    variant="outline"
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/30 rounded-xl"
                  >
                    Transfer Funds
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
                    asChild
                  >
                    <Link href="/ib-dashboard/wallet">
                      Transactions History
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today Earning & Rebates Graph Card */}
          <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-700 dark:text-gray-300">
                Today Earning {formatCurrency(today_earning.balance, today_earning.currency)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {chartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <LineChart data={chartData} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, Math.max(maxRebate, 30)]}
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={false}
                      label={{ value: "Rebates ($)", angle: -90, position: "insideLeft", style: { textAnchor: "middle", fill: "#6b7280", fontSize: 10 } }}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      cursor={{ stroke: "#3b82f6", strokeWidth: 1 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rebates"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Rebates Card */}
          <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Pending Rebates</p>
                  <p className="text-gray-900 dark:text-white text-3xl font-bold mb-2">
                    {formatCurrency(pending_rebates.amount, pending_rebates.currency)}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-3">
                    Remaining time for Rebate payment
                  </p>
                  <p className="text-gray-900 dark:text-white text-xl font-bold mb-4">
                    {formatRemainingTime(pending_rebates.remaining_time)}
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{pending_rebates.cycle_start}</span>
                      <span>{pending_rebates.cycle_end}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${cycleProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row: IB Plan & Partner ID, Referral Link */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* IB Plan & Partner ID Card */}
          <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Gem className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">IB Plan</p>
                  <p className="text-blue-600 dark:text-blue-400 text-2xl font-bold mb-4">{partner_info.ib_plan}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mb-1">Your Partner ID</p>
                  <p className="text-blue-600 dark:text-blue-400 text-3xl font-bold">{partner_info.partner_id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Link Card */}
          <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                  <LinkIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-700 dark:text-gray-300 font-semibold mb-3">Referral Link</p>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-blue-500 dark:text-blue-400 text-sm font-mono flex-1 break-all">
                      {partner_info.referral_link}
                    </p>
                    <Button
                      onClick={copyReferralLink}
                      variant="outline"
                      size="sm"
                      className="bg-blue-100 hover:bg-blue-200 text-gray-900 border-0 rounded-lg whitespace-nowrap"
                    >
                      Copy Link
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section: Earning Summary */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Earning Summary</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Total Earned Card */}
            <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Total Earned</p>
                    <p className="text-blue-600 dark:text-blue-400 text-3xl font-bold">
                      {formatCurrency(earning_summary.total_earned, earning_summary.currency)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Internal Transfers Card */}
            <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Total Internal Transfers</p>
                    <p className="text-gray-900 dark:text-white text-3xl font-bold">
                      {formatCurrency(earning_summary.total_internal_transfers, earning_summary.currency)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-4">
            <Link
              href="/ib-dashboard/wallet"
              className="text-blue-600 dark:text-blue-400 font-medium hover:underline inline-flex items-center gap-1"
            >
              Transactions History <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
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

