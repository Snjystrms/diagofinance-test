'use client';

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ActiveProjects } from "@/components/active-projects"
import { AccentCard } from "@/components/AccentCard"
import { GlowingEffect } from "@/components/ui/glowing-effect"
import { ACCENT_COLORS } from "@/utils/accent"
import { ActivityTimeline, type ActivityTimelineItem } from "@/components/activity-timeline"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardTrendChart } from "@/components/dashboard-trend-chart"
import { 
  Users, 
  Building2, 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
  BarChart3,
  PieChart,
  Settings,
  Scale,
  FileText,
  CheckCircle2,
  Clock,
  Wallet,
  Shield,
  Lock,
  TrendingDown,
  PlusCircle,
  ArrowLeftRight,
  Sparkles
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ProfileCompletionDialog } from "@/components/profile-completion-dialog"
import { authApi, type TradingAccountSummaryItem, type TradingAccountsSummaryResponse, type UserDashboardData } from "@/lib/api"
import toast from "react-hot-toast"

const formatCurrency = (value?: number, currency: string = "USD") =>
  typeof value === "number" ? `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}` : `0.00 ${currency}`

const formatAmount = (amount?: number) => {
  const numAmount = typeof amount === 'number' ? amount : 0
  return numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8
  })
}

const formatLabel = (label?: string) => {
  if (!label) return "";
  return label
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export default function DashboardPage() {
  const auth = useAuth();
  const { user, token } = auth;
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [incompleteSections, setIncompleteSections] = useState<Array<{
    key: "personal_information" | "legal_information" | "documents_verification";
    title: string;
    message: string;
    route: string;
  }>>([]);

  const isUser = user?.type === "user";
  const [dashboardData, setDashboardData] = useState<UserDashboardData | null>(null);
  const [tradingSummary, setTradingSummary] = useState<TradingAccountsSummaryResponse | null>(null);
  const [depositsStatistics, setDepositsStatistics] = useState<Array<{ day: string; date: string; amount: number }>>([]);
  const [withdrawalsStatistics, setWithdrawalsStatistics] = useState<Array<{ day: string; date: string; amount: number }>>([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(isUser);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Check for incomplete profile sections on mount
  useEffect(() => {
    const checkIncompleteSections = () => {
      const stored = sessionStorage.getItem('incomplete_profile_sections');
      if (stored) {
        try {
          const sections = JSON.parse(stored);
          if (Array.isArray(sections) && sections.length > 0) {
            setIncompleteSections(sections);
            setShowProfileDialog(true);
            sessionStorage.removeItem('incomplete_profile_sections');
          }
        } catch (error) {
          console.error('Error parsing incomplete sections:', error);
        }
      }
    };

    checkIncompleteSections();
    const timer = setTimeout(checkIncompleteSections, 500);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isUser || !token) {
      setIsDashboardLoading(false);
      return;
    }

    let isMounted = true;
    const fetchDashboardData = async () => {
      setIsDashboardLoading(true);
      setDashboardError(null);
      try {
        const [dashboardResponse, tradingResponse, depositsStatsResponse, withdrawalsStatsResponse] = await Promise.all([
          authApi.getUserDashboard(token),
          authApi.getTradingAccountsSummary(token),
          authApi.getWalletStatistics(token, "deposits"),
          authApi.getWalletStatistics(token, "withdrawals")
        ]);

        if (!isMounted) return;

        if (dashboardResponse.success) {
          setDashboardData(dashboardResponse.data ?? null);
        }

        if (tradingResponse.success) {
          setTradingSummary(tradingResponse.data ?? null);
        }

        if (depositsStatsResponse.success && depositsStatsResponse.data) {
          setDepositsStatistics(depositsStatsResponse.data.statistics ?? []);
        }

        if (withdrawalsStatsResponse.success && withdrawalsStatsResponse.data) {
          setWithdrawalsStatistics(withdrawalsStatsResponse.data.statistics ?? []);
        }
      } catch (error: any) {
        console.error("Failed to fetch dashboard data:", error);
        if (isMounted) {
          const message = error?.message || "Unable to load dashboard";
          setDashboardError(message);
          toast.error(message);
        }
      } finally {
        if (isMounted) {
          setIsDashboardLoading(false);
        }
      }
    };

    fetchDashboardData();
    return () => {
      isMounted = false;
    };
  }, [isUser, token]);

  const profileTimeline: ActivityTimelineItem[] = useMemo(() => {
    const checklist = dashboardData?.profile_status?.checklist;
    if (!checklist) return [];

    return Object.entries(checklist).map(([key, value]) => {
      const completed = value?.completed ?? false;
      return {
        id: key,
        title: value?.label || formatLabel(key),
        time: completed ? "Completed" : "Pending",
        status: completed ? "Completed" : "Pending",
        badgeVariant: completed ? "default" : "outline",
        description: completed ? "Details verified successfully." : "Action required to finish this section.",
        icon: completed ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />,
        iconColor: completed ? "bg-green-500" : "bg-amber-500"
      };
    });
  }, [dashboardData]);

  const mtAccountSummary: TradingAccountSummaryItem[] = tradingSummary?.summary ?? [];
  const overallAccounts = tradingSummary?.overall;
  const walletCurrency = dashboardData?.wallet?.currency ?? "USD";
  const depositsCurrency = dashboardData?.deposits?.currency ?? "USD";
  const withdrawalsCurrency = dashboardData?.withdrawals?.currency ?? "USD";
  
  // Static Dashboard for Admin/Manager
  const StaticDashboard = () => (
    <div className="min-h-full w-full p-4 lg:p-6 xl:p-8 bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back! Here's what's happening with your business today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2350</div>
            <p className="text-xs text-muted-foreground">+180.1% from last month</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+12,234</div>
            <p className="text-xs text-muted-foreground">+19% from last month</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground">+201 since last hour</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Active Projects */}
        <div>
          <ActiveProjects />
        </div>

        {/* Additional Cards */}
        <div className="space-y-4">
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </div>
              <CardDescription>Track your recent activities and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Activity feed will appear here</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Analytics</CardTitle>
              </div>
              <CardDescription>View detailed analytics and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Analytics dashboard coming soon</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <ProtectedRoute>
      {/* Conditionally render User Dashboard or Static Dashboard */}
      {isUser ? (
        <div className="min-h-full w-full p-4 lg:p-6 xl:p-8 bg-gradient-to-br from-background via-background to-muted/20">
          <style jsx>{`
            @keyframes spin-slow {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .custom-scrollbar::-webkit-scrollbar {
              width: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: hsl(var(--muted-foreground) / 0.3);
              border-radius: 2px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: hsl(var(--muted-foreground) / 0.5);
            }
          `}</style>
          {/* Header Section - Enhanced */}
          <div className="mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5 rounded-2xl blur-3xl -z-10" />
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Dashboard
                  </h1>
                </div>
                <p className="text-muted-foreground text-sm sm:text-base ml-14">
                  Welcome back! Here's what's happening with your account today.
                </p>
              </div>
              <Badge variant="outline" className="px-4 py-2 text-xs font-semibold border-primary/30 bg-primary/5">
                <Activity className="h-3 w-3 mr-1.5 text-primary" />
                Live Data
              </Badge>
            </div>
          </div>

          {isDashboardLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
            </div>
          </div>
        ) : dashboardError ? (
          <div className="flex items-center justify-center py-12">
            <Card className="w-full max-w-md">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-destructive mb-2">Error loading dashboard</p>
                  <p className="text-xs text-muted-foreground">{dashboardError}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Key Metrics Summary Row */}
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            {/* Total Deposits Card */}
            <Card className="relative overflow-hidden border-2 border-indigo-500/30 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent rounded-3xl group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <CardContent className="relative z-10 pt-6 pb-6 px-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      Total Deposits
                    </p>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                      {formatCurrency(
                        dashboardData?.deposits?.total ?? 0,
                        depositsCurrency
                      )}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <TrendingUp className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
                <div className="pt-3 border-t border-indigo-500/20">
                  <p className="text-xs text-muted-foreground">All time deposits</p>
                </div>
              </CardContent>
            </Card>
            
            {/* Total Withdrawals Card */}
            <Card className="relative overflow-hidden border-2 border-amber-500/30 hover:border-amber-500/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent rounded-3xl group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <CardContent className="relative z-10 pt-6 pb-6 px-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Total Withdrawals
                    </p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      {formatCurrency(
                        dashboardData?.withdrawals?.total ?? 0,
                        withdrawalsCurrency
                      )}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <TrendingDown className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <div className="pt-3 border-t border-amber-500/20">
                  <p className="text-xs text-muted-foreground">All time withdrawals</p>
                </div>
              </CardContent>
            </Card>

            {/* Trading Accounts Card */}
            <Card className="relative overflow-hidden border-2 border-violet-500/30 hover:border-violet-500/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent rounded-3xl group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <CardContent className="relative z-10 pt-6 pb-6 px-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                      Trading Accounts
                    </p>
                    <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                      {overallAccounts?.total_accounts ?? dashboardData?.account_types?.total_accounts ?? 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Building2 className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
                <div className="pt-3 border-t border-violet-500/20">
                  <p className="text-xs text-muted-foreground">Active MT5 accounts</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Cards Row - Enhanced grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Wallet Balance Card - Enhanced */}
            <Card className="sm:col-span-1 lg:col-span-1 relative overflow-hidden border-none shadow-2xl text-white bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-800 dark:via-indigo-900 dark:to-purple-950 rounded-3xl hover:shadow-3xl hover:scale-[1.02] transition-all duration-500 group">
              <div className="absolute inset-0 opacity-60">
                <div className="absolute -left-20 -top-20 w-60 h-60 bg-white/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute right-10 top-10 w-40 h-40 bg-white/15 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              <CardHeader className="relative z-10 pb-3 px-6 pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="uppercase tracking-wider text-xs font-bold text-white/80 flex items-center gap-2">
                    <Wallet className="h-3.5 w-3.5" />
                    Wallet Balance
                  </p>
                  <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-extrabold leading-tight drop-shadow-lg">
                    {formatAmount(dashboardData?.wallet?.balance)}
                  </span>
                  <span className="text-lg font-bold text-white/80">
                    {walletCurrency}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 pt-4 pb-6 px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-white text-sm font-semibold mb-1">Your Safe Wallet</p>
                      <p className="text-white/80 text-xs leading-relaxed">
                        Securely manage balances across deposits and transfers.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/90 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/20">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                      <span className="font-medium">Instant transfers available</span>
                    </div>
                    <Link href="/my-wallet/transfer-funds" className="inline-block mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-4 text-white hover:text-white hover:bg-white/20 text-xs font-bold border border-white/30 backdrop-blur-sm transition-all duration-300 hover:scale-105"
                      >
                        <ArrowLeftRight className="h-4 w-4 mr-2" />
                        Transfer Funds
                      </Button>
                    </Link>
                  </div>
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div className="p-4 rounded-2xl border-2 border-white/30 bg-white/10 backdrop-blur-md shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Lock className="h-8 w-8 text-white" />
                    </div>
                    <span className="text-[10px] font-semibold text-white/90 uppercase tracking-wider">Protected</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deposit Funds Card - Enhanced */}
            {(!dashboardData?.wallet?.balance || dashboardData.wallet.balance === 0) && (
              <Card className="sm:col-span-1 lg:col-span-1 relative overflow-hidden border-2 border-dashed border-primary/30 hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardContent className="pt-6 pb-6 relative z-10">
                  <div className="flex flex-col items-center justify-center text-center space-y-4">
                    <div className="relative w-24 h-24 flex items-center justify-center animate-pulse">
                      <div className="absolute inset-0 border-2 border-dashed border-primary/40 rounded-full animate-spin-slow" style={{ animation: 'spin 8s linear infinite' }}></div>
                      <div className="absolute inset-2 border-2 border-primary/20 rounded-full"></div>
                      <div className="relative p-4 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30">
                        <Wallet className="h-8 w-8 text-primary" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 animate-bounce">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg border-2 border-background">
                          <PlusCircle className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-bold text-foreground">Wallet Empty</h3>
                      <p className="text-sm text-muted-foreground">
                        Deposit funds to start your trading journey
                      </p>
                    </div>
                    <Link href="/funds/deposit" className="w-full mt-2">
                      <Button size="sm" className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Deposit Funds
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Profile Status Card - Enhanced */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Card className="h-full relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-background to-muted/30 group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
                <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5 relative z-10 border-b bg-gradient-to-r from-transparent to-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
                      <Target className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">Profile Status</CardTitle>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {dashboardData?.profile_status?.status === "Verified" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <p className="text-xs font-semibold text-green-600 dark:text-green-400">Verified</p>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 text-amber-500" />
                            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Pending</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-4 relative z-10">
                  {profileTimeline.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <FileText className="h-10 w-10 text-muted-foreground/30 mb-2" />
                      <p className="text-xs text-muted-foreground">No profile status information</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                      {profileTimeline.slice(0, 3).map((activity, index) => (
                        <div key={activity.id} className="flex gap-3 items-start p-2 rounded-lg hover:bg-muted/50 transition-colors group/item">
                          <div
                            className={`size-7 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md transition-transform group-hover/item:scale-110 ${
                              activity.iconColor ?? "bg-primary"
                            }`}
                          >
                            {activity.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-semibold truncate">{activity.title}</h4>
                              <Badge 
                                variant={activity.badgeVariant ?? "secondary"} 
                                className={`text-[10px] px-2 py-0.5 font-semibold ${
                                  activity.status === "Completed" 
                                    ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" 
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                }`}
                              >
                                {activity.status}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{activity.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {profileTimeline.some(item => item.status === "Pending") && (
                    <Link href="/profile/view_profile" className="block mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs h-9 font-semibold border-primary/30 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300"
                      >
                        <Settings className="h-3.5 w-3.5 mr-2" />
                        Complete Profile
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Deposits and Withdrawals Charts */}
          <div className="grid gap-4 xl:grid-cols-2">
            <DashboardTrendChart
              title="Deposits"
              subtitle={
                depositsStatistics.length
                  ? `${depositsCurrency} Deposits`
                  : "Deposits"
              }
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 24 24"
                  className="size-5"
                  aria-hidden="true"
                >
                  <g fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 12c0-4.714 0-7.071 1.464-8.536C4.93 2 7.286 2 12 2s7.071 0 8.535 1.464C22 4.93 22 7.286 22 12s0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12Z" />
                    <path strokeLinecap="round" d="M7 18V9m5 9V6m5 12v-5" />
                  </g>
                </svg>
              }
              stats={depositsStatistics}
              lineColor="#22c55e"
              primaryColor="#22c55e"
              emptyStateLabel="No deposit data available"
              formatValue={(value) => formatCurrency(value, depositsCurrency)}
            />

            <DashboardTrendChart
              title="Withdrawals"
              subtitle={
                withdrawalsStatistics.length
                  ? `${withdrawalsCurrency} Withdrawals`
                  : "Withdrawals"
              }
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 24 24"
                  className="size-5"
                  aria-hidden="true"
                >
                  <g fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 12c0-4.714 0-7.071 1.464-8.536C4.93 2 7.286 2 12 2s7.071 0 8.535 1.464C22 4.93 22 7.286 22 12s0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12Z" />
                    <path strokeLinecap="round" d="M7 18V9m5 9V6m5 12v-5" />
                  </g>
                </svg>
              }
              stats={withdrawalsStatistics}
              lineColor="#ef4444"
              primaryColor="#ef4444"
              emptyStateLabel="No withdrawal data available"
              formatValue={(value) => formatCurrency(value, withdrawalsCurrency)}
            />
          </div>

          {/* MT5 Accounts Card - Enhanced */}
          {(mtAccountSummary.length > 0 || dashboardData?.mt5_users?.length) && (
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-background to-primary/5 group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <CardHeader className="pb-3 pt-5 px-5 relative z-10 border-b bg-gradient-to-r from-transparent to-primary/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">Trading Accounts</CardTitle>
                    <CardDescription className="text-xs flex items-center gap-1.5">
                      <Target className="h-3 w-3" />
                      Your MT5 accounts overview
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-4 relative z-10">
                {mtAccountSummary.length > 0 ? (
                  <div className="space-y-3">
                    {mtAccountSummary.map((accountType, index) => (
                      <div key={accountType.account_type_id || index} className="p-4 border-2 rounded-xl hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-muted/30 to-transparent group/item">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-foreground">{accountType.account_type_name}</h4>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30">
                                  <Scale className="h-2.5 w-2.5 mr-1" />
                                  {accountType.spread_from}
                                </Badge>
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-purple-500/30">
                                  <TrendingUp className="h-2.5 w-2.5 mr-1" />
                                  {accountType.maximum_leverage}
                                </Badge>
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-pink-500/30">
                                  {accountType.base_currency}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Badge className="text-xs px-3 py-1 bg-gradient-to-r from-primary to-purple-600 text-white font-semibold">
                            {accountType.total_accounts} {accountType.total_accounts === 1 ? 'Account' : 'Accounts'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 mb-3">
                          <span className="text-xs font-semibold text-muted-foreground">Total Balance:</span>
                          <span className="font-bold text-sm text-foreground">
                            {formatCurrency(accountType.total_balance, accountType.currency)}
                          </span>
                        </div>
                        {accountType.accounts && accountType.accounts.length > 0 && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            {accountType.accounts.map((account) => (
                              <div key={account.id} className="flex items-center justify-between p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg border hover:border-primary/30 hover:shadow-md transition-all duration-300 group/acc">
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 rounded-md bg-primary/10 border border-primary/20">
                                    <Wallet className="h-3.5 w-3.5 text-primary" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-mono font-bold text-xs text-foreground">{account.account_id}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                        {account.account_mode}
                                      </Badge>
                                      <span className="text-[9px] text-muted-foreground">Lev: {account.leverage}</span>
                                    </div>
                                  </div>
                                </div>
                                <span className="font-bold text-sm text-foreground group-hover/acc:text-primary transition-colors">
                                  {formatCurrency(account.balance, accountType.currency)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : dashboardData?.mt5_users && dashboardData.mt5_users.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.mt5_users.map((mt5User) => (
                      <div key={mt5User.id} className="flex items-center justify-between p-4 border-2 rounded-xl hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-gradient-to-br from-muted/30 to-transparent">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-sm text-foreground">{mt5User.account_id}</span>
                            <span className="text-xs text-muted-foreground font-medium">{mt5User.name}</span>
                            <span className="text-[10px] text-muted-foreground">{mt5User.email}</span>
                          </div>
                        </div>
                        <Badge className={`text-xs px-3 py-1 font-semibold ${
                          mt5User.mt5_id 
                            ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white" 
                            : "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                        }`}>
                          {mt5User.mt5_id ? `MT5: ${mt5User.mt5_id}` : "Pending"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
          )}
        </div>
      ) : (
        <StaticDashboard />
      )}
      
      {/* Profile Completion Dialog - Only for users */}
      {isUser && (
        <ProfileCompletionDialog
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          incompleteSections={incompleteSections.map(section => ({
            ...section,
            icon: section.key === 'personal_information' ? (
              <Settings className="h-5 w-5 text-orange-600" />
            ) : section.key === 'legal_information' ? (
              <Scale className="h-5 w-5 text-orange-600" />
            ) : (
              <FileText className="h-5 w-5 text-orange-600" />
            ),
          }))}
        />
      )}
    </ProtectedRoute>
  )
}