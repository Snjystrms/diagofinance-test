'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AccountTypeCardGrid } from "@/components/accounts/account-type-card-grid"
import { ClientMt5AccountCard } from "@/components/accounts/client-mt5-account-card"
import { ClientMt5PasswordResetDialog } from "@/components/accounts/client-mt5-password-reset-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiErrorState } from "@/components/errors/api-error-state"
import { ClientCardGridSkeleton } from "@/components/loading/client-page-skeletons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ActivityTimelineItem } from "@/components/activity-timeline"
import { ProtectedRoute } from "@/components/protected-route"
import dynamic from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"
import type { DashboardWidget } from "@/components/dashboard-grid"
import { AdminDashboardSkeleton, ClientDashboardSkeleton } from "./dashboard-skeletons"

const DashboardTrendChart = dynamic(() => import("@/components/dashboard-trend-chart").then((m) => ({ default: m.DashboardTrendChart })), {
  ssr: false,
  loading: () => <Skeleton className="h-[200px] w-full" />,
})
const DashboardGrid = dynamic(() => import("@/components/dashboard-grid").then((m) => ({ default: m.DashboardGrid })), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
})
import { 
  Building2, 
  TrendingUp, 
  ArrowRight,
  Activity,
  Target,
  BarChart3,
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
  Sparkles,
  Copy,
  LayoutGrid,
  Grid3x3,
  DollarSign,
  Key,
  RefreshCw,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { ProfileCompletionDialog } from "@/components/profile-completion-dialog"
import { Mt5AccountCreationDialog } from "@/components/mt5-account-creation-dialog"
import { NewsDialog } from "@/components/news-dialog"
import { PromotionDialog } from "@/components/promotion-dialog"
import {
  authApi,
  ibRequestsApi,
  adminDashboardApi,
  managerDashboardApi,
  adminNotificationApi,
  userMT5AccountsApi,
  type TradingAccountSummaryItem,
  type TradingAccountsSummaryResponse,
  type UserDashboardData,
  type IbWalletData,
  type AdminDashboardData,
  type ManagerDashboardData,
  type UserMT5DemoDepositData,
} from "@/lib/api"
import { mt5SdkApi } from "@/lib/api-trading-ib"
import { NewsPromotionCarousel } from "@/components/news-promotion-carousel"
import type { NewsItem } from "@/lib/api-auth-admin"
const AdminDashboardView = dynamic(() => import("../admin-dashboard-view").then((m) => ({ default: m.AdminDashboardView })), {
  ssr: false,
  loading: () => <AdminDashboardSkeleton />,
})
const ManagerDashboardView = dynamic(() => import("../manager-dashboard-view").then((m) => ({ default: m.ManagerDashboardView })), {
  ssr: false,
  loading: () => <AdminDashboardSkeleton />,
})
import toast from "react-hot-toast"
import { useQuery } from "@tanstack/react-query"
import { useQueryClient } from "@tanstack/react-query"
import { useClientCustomization } from "@/contexts/client-customization-context"
import { isGoldenBullTheme } from "@/components/theme-customizer"

import { formatCurrency } from "@/lib/formatters"
import { getFriendlyErrorMessage } from "@/lib/friendly-errors"
import { useActiveAccountTypes } from "@/hooks/use-active-account-types"
import { normalizeIbWalletData } from "@/lib/ib"
import { CLIENT_WALLET_REFRESH_EVENT } from "@/lib/client-events"
import { mapPositionRows } from "@/app/(dashboard)/(client)/trade-history/all-trades/_lib/trade-history"
import { LivePositionsTable } from "@/app/(dashboard)/(client)/trade-history/all-trades/_components/live-positions-table"

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

const DEMO_DEPOSIT_OPTIONS = [1000, 2500, 5000, 10000, 100000] as const;

type DashboardTradingAccount = {
  id: number;
  account_id: string;
  account_mode: string;
  balance: number;
  leverage: string | number;
  accountType?: { account_type_name: string; currency: string; spread_from: string };
  equity?: number;
  free_margin?: number;
  mt5_id?: string | null;
  name?: string | null;
  email?: string | null;
  server?: string | null;
};

export function DashboardPageContent() {
  const auth = useAuth();
  const router = useRouter();
  const { user, token } = auth;
  const { canCustomizeDashboard, getDashboardMode, getDashboardPreset, setDashboardMode, themePairId, themeMode } =
    useClientCustomization();
  const isBullTheme = isGoldenBullTheme(themePairId, themeMode);
  const queryClient = useQueryClient();
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showMt5Dialog, setShowMt5Dialog] = useState(false);
  const [showNewsDialog, setShowNewsDialog] = useState(false);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [incompleteSections, setIncompleteSections] = useState<Array<{
    key: "personal_information" | "legal_information" | "documents_verification";
    title: string;
    message: string;
    route: string;
  }>>([]);

  const isUser = user?.type === "user";
  const isManager = user?.type === "manager";
  const isAdmin = user?.type === "admin" || user?.type === "subadmin" || isManager;

  // Dashboard-only poller for admin/manager unread count.
  // Header reads this value from React Query cache without fetching.
  useQuery({
    queryKey: ["adminUnreadCount", token],
    queryFn: async () => {
      if (!token) return 0;
      try {
        const response = await adminNotificationApi.getUnreadCount(token);
        if (response.success && response.data) {
          return response.data.unread_count || 0;
        }
      } catch {
        return 0;
      }
      return 0;
    },
    enabled: Boolean(token) && Boolean(isAdmin),
    // Call once when dashboard renders (no polling)
    refetchInterval: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  // Share userDashboard data with header via the same React Query key.
  const { data: userDashboardResponse } = useQuery({
    queryKey: ["userDashboard", token],
    queryFn: () => authApi.getUserDashboard(token!),
    enabled: Boolean(token) && isUser,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
  });

  const [dashboardData, setDashboardData] = useState<UserDashboardData | null>(null);
  const [adminDashboardData, setAdminDashboardData] = useState<AdminDashboardData | null>(null);
  const [managerDashboardData, setManagerDashboardData] = useState<ManagerDashboardData | null>(null);
  const [tradingSummary, setTradingSummary] = useState<TradingAccountsSummaryResponse | null>(null);
  const [ibWalletData, setIbWalletData] = useState<IbWalletData | null>(null);
  const [depositsStatistics, setDepositsStatistics] = useState<Array<{ day: string; date: string; amount: number }>>([]);
  const [withdrawalsStatistics, setWithdrawalsStatistics] = useState<Array<{ day: string; date: string; amount: number }>>([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(isUser || isAdmin);
  const [isDepositsStatisticsLoading, setIsDepositsStatisticsLoading] = useState(false);
  const [isWithdrawalsStatisticsLoading, setIsWithdrawalsStatisticsLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<unknown | null>(null);
  const [tradingSummaryError, setTradingSummaryError] = useState<unknown | null>(null);
  const [depositStatisticsPeriod, setDepositStatisticsPeriod] = useState<7 | 30>(30);
  const [withdrawalStatisticsPeriod, setWithdrawalStatisticsPeriod] = useState<7 | 30>(30);

  // Track wallet card width for responsive theme switching
  const [walletCardWidth, setWalletCardWidth] = useState<number>(0);
const walletCardRef = useCallback((node: HTMLDivElement | null) => {
  if (!node) return;
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      setWalletCardWidth(entry.contentRect.width);
    }
  });
  observer.observe(node);
  // No cleanup needed — the observer is scoped to this node's lifetime
}, []);
  // When card is too narrow (<=235px), force the gradient theme (without bull image)
  const forceGradientTheme = walletCardWidth > 0 && walletCardWidth <= 285;
  const effectiveTheme = forceGradientTheme ? false : isBullTheme;

  // Get news and promotions from userDashboard data
  const dashboardNewsItems = useMemo(() => {
    if (!dashboardData?.latest_news) return [];
    return (dashboardData.latest_news as unknown as NewsItem[]).filter((i) => i.type === "news");
  }, [dashboardData?.latest_news]);

  const dashboardPromoItems = useMemo(() => {
    if (!dashboardData?.latest_news) return [];
    return (dashboardData.latest_news as unknown as NewsItem[]).filter((i) => i.type === "promotion");
  }, [dashboardData?.latest_news]);
  
  // Filter items updated within last 24 hours
  // API returns UTC time like "2026-06-19T07:37:14" (without Z)
  const isWithin24Hours = (dateString?: string | null) => {
    if (!dateString) return false;
    // Treat the date string as UTC by appending 'Z' if it doesn't have timezone info
    const dateStr = dateString.includes('Z') || dateString.includes('+') || dateString.includes('-', 10)
      ? dateString 
      : dateString + 'Z';
    const itemDate = new Date(dateStr);
    const now = new Date();
    const diffInHours = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60);
    return diffInHours <= 24;
  };

  const recentNews = dashboardNewsItems.filter((item) => 
    isWithin24Hours(item.updated_at || item.created_at)
  );
  
  const recentPromotions = dashboardPromoItems.filter((item) => 
    isWithin24Hours(item.updated_at || item.created_at)
  );

  const dashboardNewsPromotionItems = useMemo(
    () =>
      [...dashboardNewsItems, ...dashboardPromoItems].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      }),
    [dashboardNewsItems, dashboardPromoItems]
  );
  // MT4 dashboard tabs are intentionally hidden for now. Restore the original union when MT4 UI returns.
  // const [activeTab, setActiveTab] = useState<'mt5-live' | 'mt5-demo' | 'mt4-live' | 'mt4-demo'>('mt5-live');
  const [activeTab, setActiveTab] = useState<'mt5-live' | 'mt5-demo'>('mt5-live');
  const [resetPasswordAccount, setResetPasswordAccount] = useState<DashboardTradingAccount | null>(null);
  const [depositAccount, setDepositAccount] = useState<DashboardTradingAccount | null>(null);
  const [selectedLivePositionsLogin, setSelectedLivePositionsLogin] = useState("");
  const [selectedDepositAmount, setSelectedDepositAmount] = useState("");
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [dateRange] = useState<{ start_date?: string; end_date?: string }>({});
  const dashboardArea = isAdmin ? 'admin' : 'client';
  const isCustomDashboard = getDashboardMode(dashboardArea);
  const dashboardPreset = getDashboardPreset(dashboardArea);
  const hasIbWalletData = Boolean(
    ibWalletData?.wallet_balance &&
      ibWalletData?.client_wallet &&
      ibWalletData?.earning_summary
  );

  const handleDashboardModeChange = (mode: 'normal' | 'custom') => {
    setDashboardMode(dashboardArea, mode);
  };

  const refreshClientDashboardData = useCallback(async () => {
    if (!isUser || !token) {
      return;
    }

    try {
      const [userDashboardResult, tradingResponse, ibWalletResponse, depositsStatsResponse, withdrawalsStatsResponse] = await Promise.all([
        authApi.getUserDashboard(token),
        authApi.getTradingAccountsSummary(token).catch((err) => {
          console.error("Trading accounts summary failed:", err);
          setTradingSummaryError(err);
          return { success: false, data: null };
        }),
        ibRequestsApi.getIbWallet(token).catch((err) => {
          console.log("IB Wallet not available (user may not be IB):", err);
          return null;
        }),
        authApi.getWalletStatistics(token, "deposits", depositStatisticsPeriod),
        authApi.getWalletStatistics(token, "withdrawals", withdrawalStatisticsPeriod),
      ]);

      if (userDashboardResult.success && userDashboardResult.data) {
        setDashboardData(userDashboardResult.data);
      }

      if (tradingResponse.success) {
        setTradingSummary(tradingResponse.data ?? null);
      }

      if (ibWalletResponse?.success && ibWalletResponse.data) {
        setIbWalletData(normalizeIbWalletData(ibWalletResponse.data));
      } else {
        setIbWalletData(null);
      }

      if (depositsStatsResponse.success && depositsStatsResponse.data) {
        setDepositsStatistics(depositsStatsResponse.data.statistics ?? []);
      }

      if (withdrawalsStatsResponse.success && withdrawalsStatsResponse.data) {
        setWithdrawalsStatistics(withdrawalsStatsResponse.data.statistics ?? []);
      }
    } catch (error) {
      console.error("Failed to refresh dashboard after transaction:", error);
    } finally {
      void queryClient.invalidateQueries({ queryKey: ["userDashboard", token] });
    }
  }, [depositStatisticsPeriod, isUser, queryClient, token, withdrawalStatisticsPeriod]);

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

  // Check if MT5 dialog should be shown (only if user has no MT5 accounts and profile is complete)
  useEffect(() => {
    if (!isUser || !dashboardData) return;
    
    // Don't show MT5 dialog if profile dialog is showing
    if (showProfileDialog) return;
    
    // Check if user has any MT5 accounts
    const hasMt5Accounts = Boolean(dashboardData.mt5_users && dashboardData.mt5_users.length > 0);
    
    // Only show MT5 dialog if user has no accounts and hasn't seen it this session
    if (!hasMt5Accounts && !showMt5Dialog) {
      const hasSeenMt5Dialog = sessionStorage.getItem('mt5_dialog_shown');
      if (!hasSeenMt5Dialog) {
        setShowMt5Dialog(true);
        sessionStorage.setItem('mt5_dialog_shown', 'true');
      }
    }
  }, [isUser, dashboardData, showProfileDialog, showMt5Dialog]);

  // Show news and promotion dialogs for recent items (within 24 hours)
  useEffect(() => {
    if (!isUser) return;

    // Only show dialogs after profile and MT5 dialogs are handled
    if (showProfileDialog || showMt5Dialog) return;

    // Get list of seen item IDs from localStorage
    const getSeenIds = (key: string): Set<string> => {
      const stored = localStorage.getItem(key);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    };

    const setSeenIds = (key: string, ids: Set<string>) => {
      localStorage.setItem(key, JSON.stringify([...ids]));
    };

    const seenNewsIds = getSeenIds('seen_news_ids');
    const seenPromoIds = getSeenIds('seen_promo_ids');

    // Filter out news/promotions that haven't been seen
    const unseenNews = recentNews.filter(item => !seenNewsIds.has(String(item.id)));
    const unseenPromos = recentPromotions.filter(item => !seenPromoIds.has(String(item.id)));

    // Show news dialog if there are unseen recent news
    if (unseenNews.length > 0 && !showNewsDialog) {
      setShowNewsDialog(true);
      // Mark these as seen
      unseenNews.forEach(item => seenNewsIds.add(String(item.id)));
      setSeenIds('seen_news_ids', seenNewsIds);
      return;
    }

    // Show promotion dialog if there are unseen recent promotions
    if (unseenPromos.length > 0 && !showPromotionDialog) {
      setShowPromotionDialog(true);
      // Mark these as seen
      unseenPromos.forEach(item => seenPromoIds.add(String(item.id)));
      setSeenIds('seen_promo_ids', seenPromoIds);
    }
  }, [isUser, showProfileDialog, showMt5Dialog, recentNews, recentPromotions, showNewsDialog, showPromotionDialog]);

  // Sync userDashboard React Query data into local state used by widgets.
  useEffect(() => {
    if (userDashboardResponse?.success && userDashboardResponse.data) {
      setDashboardData(userDashboardResponse.data ?? null);
    }
  }, [userDashboardResponse]);

  // Initial dashboard data load (trading summary + IB wallet; userDashboard is handled by React Query above)
  useEffect(() => {
    if (!isUser || !token) {
      if (!isAdmin) {
        setIsDashboardLoading(false);
      }
      return;
    }

    let isMounted = true;
    const fetchDashboardData = async () => {
      setIsDashboardLoading(true);
      setDashboardError(null);
      setTradingSummaryError(null);
      try {
        const [tradingResponse, ibWalletResponse] = await Promise.all([
          authApi.getTradingAccountsSummary(token).catch((err) => {
            console.error("Trading accounts summary failed:", err);
            if (isMounted) setTradingSummaryError(err);
            return { success: false, data: null };
          }),
          ibRequestsApi.getIbWallet(token).catch((err) => {
            console.log("IB Wallet not available (user may not be IB):", err);
            return null;
          }),
        ]);

        if (!isMounted) return;

        if (tradingResponse.success) {
          setTradingSummary(tradingResponse.data ?? null);
        }

        if (ibWalletResponse?.success && ibWalletResponse.data) {
          setIbWalletData(normalizeIbWalletData(ibWalletResponse.data));
        } else {
          setIbWalletData(null);
        }
      } catch (error: unknown) {
        console.error("Failed to fetch dashboard data:", error);
        if (isMounted) {
          setDashboardError(error);
          toast.error(getFriendlyErrorMessage(error, {
            audience: "client",
            resource: "dashboard",
            action: "load",
          }));
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
  }, [isUser, token, isAdmin]);

  // Admin / Manager dashboard data load
  useEffect(() => {
    if (!isAdmin || !token) {
      return;
    }

    let isMounted = true;
    const fetchAdminDashboardData = async () => {
      setIsDashboardLoading(true);
      setDashboardError(null);
      try {
        if (isManager) {
          const response = await managerDashboardApi.getDashboard({ token, ...dateRange });
          if (!isMounted) return;
          if (response.success && response.data) {
            setManagerDashboardData(response.data);
          } else {
            setDashboardError("Unable to load manager dashboard");
          }
        } else {
          const response = await adminDashboardApi.getDashboard({ token, ...dateRange });
          if (!isMounted) return;
          if (response.success && response.data) {
            setAdminDashboardData(response.data);
          } else {
            setDashboardError("Unable to load admin dashboard");
          }
        }
      } catch (error: unknown) {
        if (isMounted) {
          setDashboardError(error);
        }
      } finally {
        if (isMounted) {
          setIsDashboardLoading(false);
        }
      }
    };

    fetchAdminDashboardData();
    return () => {
      isMounted = false;
    };
  }, [isAdmin, isManager, token, dateRange.start_date, dateRange.end_date]);

  // Separate effects for statistics so each chart can manage its own period independently.
  useEffect(() => {
    if (!isUser || !token) {
      return;
    }

    let isMounted = true;
    const fetchDepositStatistics = async () => {
      setIsDepositsStatisticsLoading(true);
      try {
        const depositsStatsResponse = await authApi.getWalletStatistics(token, "deposits", depositStatisticsPeriod);

        if (!isMounted) return;

        if (depositsStatsResponse.success && depositsStatsResponse.data) {
          setDepositsStatistics(depositsStatsResponse.data.statistics ?? []);
        }
      } catch (error: unknown) {
        console.error("Failed to fetch deposit statistics:", error);
        if (isMounted) {
          toast.error(getFriendlyErrorMessage(error, {
            audience: "client",
            resource: "deposit statistics",
            action: "load",
          }));
        }
      } finally {
        if (isMounted) {
          setIsDepositsStatisticsLoading(false);
        }
      }
    };

    fetchDepositStatistics();
    return () => {
      isMounted = false;
    };
  }, [depositStatisticsPeriod, isUser, token]);

  useEffect(() => {
    if (!isUser || !token) {
      return;
    }

    let isMounted = true;
    const fetchWithdrawalStatistics = async () => {
      setIsWithdrawalsStatisticsLoading(true);
      try {
        const withdrawalsStatsResponse = await authApi.getWalletStatistics(token, "withdrawals", withdrawalStatisticsPeriod);

        if (!isMounted) return;

        if (withdrawalsStatsResponse.success && withdrawalsStatsResponse.data) {
          setWithdrawalsStatistics(withdrawalsStatsResponse.data.statistics ?? []);
        }
      } catch (error: unknown) {
        console.error("Failed to fetch withdrawal statistics:", error);
        if (isMounted) {
          toast.error(getFriendlyErrorMessage(error, {
            audience: "client",
            resource: "withdrawal statistics",
            action: "load",
          }));
        }
      } finally {
        if (isMounted) {
          setIsWithdrawalsStatisticsLoading(false);
        }
      }
    };

    fetchWithdrawalStatistics();
    return () => {
      isMounted = false;
    };
  }, [isUser, token, withdrawalStatisticsPeriod]);

  useEffect(() => {
    if (!isUser || !token) {
      return;
    }

    const handleWalletRefresh = () => {
      void refreshClientDashboardData();
    };

    window.addEventListener(CLIENT_WALLET_REFRESH_EVENT, handleWalletRefresh);
    return () => {
      window.removeEventListener(CLIENT_WALLET_REFRESH_EVENT, handleWalletRefresh);
    };
  }, [isUser, refreshClientDashboardData, token]);

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
  const totalMt5Accounts = mtAccountSummary.reduce(
    (total, accountType) => total + (accountType.accounts?.length ?? 0),
    0
  );
  const hasAnyMt5Accounts =
    totalMt5Accounts > 0 || Boolean(dashboardData?.mt5_users?.length);

  const {
    data: activeAccountTypes = [],
    isLoading: isAccountTypesLoading,
    error: accountTypesError,
    refetch: refetchAccountTypes,
  } = useActiveAccountTypes({
    token,
    enabled: isUser && !isDashboardLoading && !dashboardError && !hasAnyMt5Accounts,
  });

  // Helper function to get tab title
  const getTabTitle = () => {
    switch (activeTab) {
      case 'mt5-live':
        return 'MT5 Live Accounts';
      case 'mt5-demo':
        return 'MT5 Demo Accounts';
      default:
        return 'MT5 Live Accounts';
    }
  };

  const currentAccounts = useMemo(() => {
    const allAccounts: DashboardTradingAccount[] = [];

    // Collect accounts from mtAccountSummary
    mtAccountSummary.forEach((accountType) => {
      if (accountType.accounts && accountType.accounts.length > 0) {
        accountType.accounts.forEach((account) => {
          allAccounts.push({
            ...account,
            accountType: {
              account_type_name: accountType.account_type_name,
              currency: accountType.currency,
              spread_from: accountType.spread_from,
            },
          });
        });
      }
    });

    // Filter accounts based on active tab
    return allAccounts.filter((account) => {
      const isDemo = account.account_mode?.toLowerCase().includes('demo');
      const isLive = activeTab.includes('live');
      const isDemoTab = activeTab.includes('demo');

      if (isLive) {
        return !isDemo;
      }
      if (isDemoTab) {
        return isDemo;
      }

      return false;
    });
  }, [activeTab, mtAccountSummary]);
  const { data: accountServersById = {} } = useQuery<Record<number, string | null>>({
    queryKey: ["dashboardAccountServers", token, currentAccounts.map((account) => account.id).join(",")],
    queryFn: async () => {
      const serverEntries = await Promise.all(
        currentAccounts.map(async (account) => {
          const response = await userMT5AccountsApi.getById(account.id, token!);
          return [account.id, response.data?.server ?? response.data?.mt5_account?.server ?? null] as const;
        })
      );

      return Object.fromEntries(serverEntries);
    },
    enabled: isUser && Boolean(token) && currentAccounts.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const selectedLivePositionsAccount =
    currentAccounts.find((account) => account.mt5_id === selectedLivePositionsLogin) ?? null;
  const createAccountMode = activeTab === "mt5-demo" ? "demo" : "live";
  const createAccountHref = `/my_accounts/open-trading-account?mode=${createAccountMode}`;
  const createAccountTitle =
    activeTab === "mt5-demo" ? "Create MT5 Demo Account" : "Create MT5 Live Account";
  const createAccountDescription =
    activeTab === "mt5-demo"
      ? "Spin up another demo login to test strategies, EAs, or fresh risk setups."
      : "Open an additional live MT5 account to separate strategies or funded capital.";

  const openDashboardDepositDialog = (account: DashboardTradingAccount) => {
    setDepositAccount(account);
    setSelectedDepositAmount("");
  };

  const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard!`);
  };

  useEffect(() => {
    const firstAvailableLogin = currentAccounts.find((account) => account.mt5_id)?.mt5_id ?? "";

    setSelectedLivePositionsLogin((current) => {
      if (currentAccounts.some((account) => account.mt5_id === current)) {
        return current;
      }

      return firstAvailableLogin;
    });
  }, [currentAccounts]);

  const {
    data: livePositions = [],
    error: livePositionsError,
    isFetching: isRefreshingLivePositions,
    isLoading: isLoadingLivePositions,
    refetch: refetchLivePositions,
  } = useQuery({
    queryKey: ["dashboardLivePositions", token, selectedLivePositionsLogin],
    queryFn: async () => {
      const response = await mt5SdkApi.getPositions(selectedLivePositionsLogin, token);
      return mapPositionRows(response.items ?? []);
    },
    enabled: isUser && Boolean(token) && Boolean(selectedLivePositionsLogin),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const livePositionsErrorMessage =
    livePositionsError instanceof Error
      ? livePositionsError.message
      : livePositionsError
        ? "Failed to load live positions"
        : null;

  const handleResetPasswordDialogChange = (open: boolean) => {
    if (!open) {
      setResetPasswordAccount(null);
    }
  };

  const handleDepositDialogChange = (open: boolean) => {
    if (!open) {
      setDepositAccount(null);
      setSelectedDepositAmount("");
      setIsSubmittingDeposit(false);
    }
  };

  const handleDemoDeposit = useCallback(async () => {
    if (!token || !depositAccount) {
      toast.error("Authentication required");
      return;
    }

    const amount = Number.parseFloat(selectedDepositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Select a deposit amount");
      return;
    }

    try {
      setIsSubmittingDeposit(true);
      const response = await userMT5AccountsApi.demoDeposit(
        {
          account_ref: depositAccount.account_id,
          amount,
        },
        token
      );

      const responseData = response.data as UserMT5DemoDepositData | undefined;

      await refreshClientDashboardData();

      setDepositAccount(null);
      setSelectedDepositAmount("");
      const depositedAmount = responseData?.amount ?? amount;
      toast.success(
        response.message
          ? `${response.message} (${formatCurrency(depositedAmount, "USD")})`
          : `Deposited ${formatCurrency(depositedAmount, "USD")} successfully into ${depositAccount.account_id}.`
      );
    } catch (error) {
      console.error("Demo MT5 deposit failed:", error);
      toast.error(
        getFriendlyErrorMessage(error, {
          audience: "client",
          resource: "demo MT5 deposit",
          action: "create",
        })
      );
    } finally {
      setIsSubmittingDeposit(false);
    }
  }, [depositAccount, refreshClientDashboardData, selectedDepositAmount, token]);
  
  // Dashboard widgets - must be at top level to follow Rules of Hooks
  const dashboardWidgets = useMemo((): DashboardWidget[] => {
    if (!isUser || !dashboardData) {
      return [];
    }

    const ibWallet = hasIbWalletData ? ibWalletData : null;

    const widgets: DashboardWidget[] = [
      // Total Deposits Widget
      {
        id: 'total-deposits',
        title: 'Total Deposits',
        component: (
          <Link href="/funds/my_deposit" aria-label="View deposits" className="block cursor-pointer rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-full">
          <div className="border border-border/50 rounded-3xl bg-card shadow-sm transition-all duration-200 hover:shadow-md h-full">
            <div className="pt-6 pb-6 px-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    Total Deposits
                  </div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {formatCurrency(
                      dashboardData?.deposits?.total ?? 0,
                      depositsCurrency
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/70 border border-border/50">
                  <TrendingUp className="h-6 w-6 text-foreground" />
                </div>
              </div>
              <div className="pt-3 border-t border-border/50 mt-auto">
                <p className="text-xs text-muted-foreground">All time deposits</p>
              </div>
            </div>
          </div>
          </Link>
        ),
        defaultLayout: { x: 0, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
      },
      // Total Withdrawals Widget
      {
        id: 'total-withdrawals',
        title: 'Total Withdrawals',
        component: (
          <Link href="/funds/withdraw" aria-label="View withdrawals" className="block cursor-pointer rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-full">
          <div className="border border-border/50 rounded-3xl bg-card shadow-sm transition-all duration-200 hover:shadow-md h-full">
            <div className="pt-6 pb-6 px-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    Total Withdrawals
                  </div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {formatCurrency(
                      dashboardData?.withdrawals?.total ?? 0,
                      withdrawalsCurrency
                    )}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/70 border border-border/50">
                  <TrendingDown className="h-6 w-6 text-foreground" />
                </div>
              </div>
              <div className="pt-3 border-t border-border/50 mt-auto">
                <p className="text-xs text-muted-foreground">All time withdrawals</p>
              </div>
            </div>
          </div>
          </Link>
        ),
        defaultLayout: { x: 4, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
      },
      // Trading Accounts Widget
      {
        id: 'trading-accounts',
        title: 'Trading Accounts',
        component: (
          <Link href="/my_accounts/accounts-overview" aria-label="View trading accounts" className="block cursor-pointer rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-full">
          <div className="border border-border/50 rounded-3xl bg-card shadow-sm transition-all duration-200 hover:shadow-md h-full">
            <div className="pt-6 pb-6 px-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    Trading Accounts
                  </div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">
                    {overallAccounts?.total_accounts ?? dashboardData?.account_types?.total_accounts ?? 0}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-muted/70 border border-border/50">
                  <Building2 className="h-6 w-6 text-foreground" />
                </div>
              </div>
              <div className="pt-3 border-t border-border/50 mt-auto">
                <p className="text-xs text-muted-foreground">Active MT5 accounts</p>
              </div>
            </div>
          </div>
          </Link>
        ),
        defaultLayout: { x: 8, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
      },
      // Wallet Balance Widget
      {
        id: 'wallet-balance',
        title: 'Wallet Balance',
        component: (
          <div onClick={() => router.push('/my-wallet/wallet-overview')} className="border border-border/50 rounded-3xl bg-card shadow-sm h-full cursor-pointer relative overflow-hidden">
            {isBullTheme && <div className="bull-theme-overlay bull-theme-wallet-overlay" />}
            <div className="relative z-10 pb-3 px-6 pt-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="uppercase tracking-wider text-xs font-bold text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5" />
                  Wallet Balance
                </p>
                <div className="p-2 rounded-lg bg-muted/70 border border-border/50">
                  <Shield className="h-4 w-4 text-foreground" />
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl font-extrabold leading-tight">
                  {formatAmount(dashboardData?.wallet?.balance)}
                </span>
                <span className="text-lg font-bold text-muted-foreground">
                  USD
                </span>
              </div>
              <div className="mt-auto pt-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-foreground text-sm font-semibold mb-1">Your Safe Wallet</p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Securely manage balances across deposits and transfers.
                    </p>
                  </div>
                  <Link href="/funds/internal-transfer" className="inline-block mt-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-4 text-foreground border-border/50"
                    >
                      <ArrowLeftRight className="h-4 w-4 mr-2" />
                      Transfer Funds
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ),
        defaultLayout: { x: 0, y: 3, w: 4, h: 5, minW: 3, minH: 4 },
      },
      // Partner Wallet Widget (only show if IB wallet data exists)
      ...(ibWallet ? [{
        id: 'partner-wallet',
        title: 'Partner Wallet',
        component: (
          <Link href="/ib-dashboard/wallet" aria-label="View IB Wallet" className="block cursor-pointer rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-full">
          <div className="relative overflow-hidden border-2 border-blue-500/30 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent rounded-3xl group h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="relative z-10 pt-6 pb-6 px-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Partner Wallet
                  </div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                      {formatCurrency(
                        ibWallet.wallet_balance.amount,
                        ibWallet.wallet_balance.currency
                      )}
                    </p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="pt-3 border-t border-blue-500/20 mt-auto space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Client Wallet:</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(
                        ibWallet.client_wallet.amount,
                        ibWallet.client_wallet.currency
                      )}
                    </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total Earned:</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(
                        ibWallet.earning_summary.total_earned,
                        ibWallet.earning_summary.currency
                      )}
                    </span>
                </div>
              </div>
            </div>
          </div>
          </Link>
        ),
        defaultLayout: { x: 4, y: 3, w: 4, h: 5, minW: 3, minH: 4 },
      }] : []),
      // Profile Status Widget
      {
        id: 'profile-status',
        title: 'Profile Status',
        component: (
          <div onClick={() => router.push('/profile/view_profile')} className="rounded-3xl h-full relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-background to-muted/30 group cursor-pointer">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <div className="flex flex-row items-center justify-between pb-3 pt-5 px-5 relative z-10 border-b bg-gradient-to-r from-transparent to-primary/5">
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
            </div>
            <div className="px-5 pb-5 pt-4 relative z-10 h-full">
                  {profileTimeline.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <FileText className="h-10 w-10 text-muted-foreground/30 mb-2" />
                      <p className="text-xs text-muted-foreground">No profile status information</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {profileTimeline.slice(0, 3).map((activity) => (
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
                    <Link href="/profile/view_profile" className="block mt-4" onClick={(e) => e.stopPropagation()}>
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
            </div>
          </div>
        ),
        defaultLayout: { x: hasIbWalletData ? 8 : 4, y: 3, w: 4, h: 5, minW: 3, minH: 4 },
      },
      // Deposits Chart Widget
      {
        id: 'deposits-chart',
        title: 'Deposits Chart',
        component: isDepositsStatisticsLoading ? (
          <Card className="relative flex w-full max-w-full flex-col gap-6 overflow-hidden rounded-2xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-muted/20 shadow-lg md:p-6 h-full">
                <CardHeader className="relative flex flex-col items-start gap-4.5 space-y-0 p-0 md:flex-row md:items-center md:justify-between md:gap-0">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                </CardHeader>
                <CardContent className="relative flex flex-col gap-4 p-0">
                  <div className="flex w-full gap-1 rounded-lg border border-border/50 bg-muted/30 p-1">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 flex-1" />
                  </div>
                  <Skeleton className="h-32 w-full rounded-lg" />
                  <Skeleton className="h-[225px] w-full rounded-lg" />
                </CardContent>
              </Card>
        ) : (
              <DashboardTrendChart
                title="Deposits"
                subtitle={
                  depositsStatistics.length
                    ? `${depositsCurrency} Deposits (Last ${depositStatisticsPeriod} days)`
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
                selectedPeriod={depositStatisticsPeriod === 7 ? "7d" : "1m"}
                onPeriodChange={(period) => setDepositStatisticsPeriod(period === "7d" ? 7 : 30)}
              />
        ),
        defaultLayout: { x: 0, y: 8, w: 6, h: 6, minW: 4, minH: 4 },
      },
      // Withdrawals Chart Widget
      {
        id: 'withdrawals-chart',
        title: 'Withdrawals Chart',
        component: isWithdrawalsStatisticsLoading ? (
          <Card className="relative flex w-full max-w-full flex-col gap-6 overflow-hidden rounded-2xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-muted/20 shadow-lg md:p-6 h-full">
            <CardHeader className="relative flex flex-col items-start gap-4.5 space-y-0 p-0 md:flex-row md:items-center md:justify-between md:gap-0">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-5 w-24" />
              </div>
            </CardHeader>
            <CardContent className="relative flex flex-col gap-4 p-0">
              <div className="flex w-full gap-1 rounded-lg border border-border/50 bg-muted/30 p-1">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
              </div>
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-[225px] w-full rounded-lg" />
            </CardContent>
          </Card>
        ) : (
              <DashboardTrendChart
                title="Withdrawals"
                subtitle={
                  withdrawalsStatistics.length
                    ? `${withdrawalsCurrency} Withdrawals (Last ${withdrawalStatisticsPeriod} days)`
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
                selectedPeriod={withdrawalStatisticsPeriod === 7 ? "7d" : "1m"}
                onPeriodChange={(period) => setWithdrawalStatisticsPeriod(period === "7d" ? 7 : 30)}
              />
        ),
        defaultLayout: { x: 6, y: 8, w: 6, h: 6, minW: 4, minH: 4 },
      },
    ];

    // Add Deposit Funds Card if wallet is empty
    if (!dashboardData?.wallet?.balance || dashboardData.wallet.balance === 0) {
      widgets.push({
        id: 'deposit-funds',
        title: 'Deposit Funds',
        component: (
          <div onClick={() => router.push('/funds/deposit')} className="border border-dashed border-border/50 rounded-3xl bg-card h-full cursor-pointer">
            <div className="pt-6 pb-6 h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted/70">
                <Wallet className="h-8 w-8 text-foreground" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-foreground">Wallet Empty</h3>
                <p className="text-sm text-muted-foreground">
                  Deposit funds to start your trading journey
                </p>
              </div>
              <Link href="/funds/deposit" className="w-full mt-2" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" className="w-full border border-border/50 text-foreground bg-muted/50 hover:bg-muted transition-all duration-200">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Deposit Funds
                </Button>
              </Link>
            </div>
          </div>
        ),
        defaultLayout: { x: 8, y: 3, w: 4, h: 5, minW: 4, minH: 4 },
      });
    }

    return widgets;
  }, [
    isUser,
    dashboardData,
    depositsCurrency,
    withdrawalsCurrency,
    overallAccounts,
    walletCurrency,
    profileTimeline,
    depositsStatistics,
    withdrawalsStatistics,
    depositStatisticsPeriod,
    withdrawalStatisticsPeriod,
    isDepositsStatisticsLoading,
    isWithdrawalsStatisticsLoading,
    ibWalletData,
    isBullTheme,
  ]);
  
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
          {/* Header Section */}
          <div className="mb-8 ib-portal-hero rounded-[28px] border px-6 py-6 sm:px-7">
            {isBullTheme && <div className="bull-theme-overlay bull-theme-welcome-overlay" />}
            <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <div className="ib-portal-kicker inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Client Portal
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.15rem]">
                    {(() => {
                      const h = new Date().getHours();
                      const greeting = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
                      const firstName = user?.name?.split(" ")[0];
                      return firstName ? `${greeting}, ${firstName}` : greeting;
                    })()}
                  </h1>
                  <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
                    Welcome back! Here&apos;s what&apos;s happening with your account today.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {canCustomizeDashboard ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 p-1">
                    <Button
                      variant={isCustomDashboard === 'normal' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleDashboardModeChange('normal')}
                      className="gap-2"
                    >
                      <Grid3x3 className="h-4 w-4" />
                      <span className="hidden sm:inline">Normal</span>
                    </Button>
                    <Button
                      variant={isCustomDashboard === 'custom' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleDashboardModeChange('custom')}
                      className="gap-2"
                    >
                      <LayoutGrid className="h-4 w-4" />
                      <span className="hidden sm:inline">Custom</span>
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {isDashboardLoading ? (
          <ClientDashboardSkeleton />
        ) : dashboardError ? (
          <ApiErrorState
            error={dashboardError}
            audience="client"
            resource="dashboard"
            action="load"
            variant="panel"
          />
        ) : (
        <div className="space-y-6">
          {/* Normal Dashboard View */}
          {isCustomDashboard === 'normal' ? (
            <>
              {/* Key Metrics Summary Row */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                {/* Total Deposits Card */}
                <Link href="/funds/my_deposit" aria-label="View deposits" className="block cursor-pointer rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Card className="relative overflow-hidden border rounded-[28px] shadow-sm hover:shadow-lg backdrop-blur-sm transition-all duration-300 group ib-portal-surface ib-portal-surface-primary">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/8 to-blue-500/8 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity" />
                  <CardContent className="relative z-10 pt-6 pb-6 px-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          Total Deposits
                        </div>
                        <p className="text-2xl font-bold text-foreground tabular-nums">
                          {formatCurrency(
                            dashboardData?.deposits?.total ?? 0,
                            depositsCurrency
                          )}
                        </p>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                        <TrendingUp className="h-5 w-5 text-foreground" />
                      </div>
                    </div>
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">All time deposits</p>
                    </div>
                  </CardContent>
                </Card>
                </Link>
                
                {/* Total Withdrawals Card */}
                <Link href="/funds/withdraw" aria-label="View withdrawals" className="block cursor-pointer rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Card className="relative overflow-hidden border rounded-[28px] shadow-sm hover:shadow-lg backdrop-blur-sm transition-all duration-300 group ib-portal-surface ib-portal-surface-amber">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/8 to-orange-500/8 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity" />
                  <CardContent className="relative z-10 pt-6 pb-6 px-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Total Withdrawals
                        </div>
                        <p className="text-2xl font-bold text-foreground tabular-nums">
                          {formatCurrency(
                            dashboardData?.withdrawals?.total ?? 0,
                            withdrawalsCurrency
                          )}
                        </p>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                        <TrendingDown className="h-5 w-5 text-foreground" />
                      </div>
                    </div>
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">All time withdrawals</p>
                    </div>
                  </CardContent>
                </Card>
                </Link>

                {/* Trading Accounts Card */}
                <Link href="/my_accounts/accounts-overview" aria-label="View trading accounts" className="block cursor-pointer rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Card className="relative overflow-hidden border rounded-[28px] shadow-sm hover:shadow-lg backdrop-blur-sm transition-all duration-300 group ib-portal-surface ib-portal-surface-emerald">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/8 to-purple-500/8 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity" />
                  <CardContent className="relative z-10 pt-6 pb-6 px-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                          Trading Accounts
                        </div>
                        <p className="text-2xl font-bold text-foreground tabular-nums">
                          {overallAccounts?.total_accounts ?? dashboardData?.account_types?.total_accounts ?? 0}
                        </p>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
                        <Building2 className="h-5 w-5 text-foreground" />
                      </div>
                    </div>
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">Active MT5 accounts</p>
                    </div>
                  </CardContent>
                </Card>
                </Link>
              </div>

              {/* News & Promotions Carousel Row */}
              {/* {dashboardNewsPromotionItems.length > 0 && (
                <section className="rounded-3xl border border-border/60 bg-card/80 p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                      News & Promotions
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <NewsPromotionCarousel
                      items={dashboardNewsPromotionItems}
                      type="mixed"
                      viewAllHref="/user-news"
                    />
                  </div>
                </section>
              )} */}

              {/* Top Cards Row - Enhanced grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Wallet Balance Card - Enhanced */}
                <Card 
                  ref={walletCardRef}
                  onClick={() => router.push('/my-wallet/wallet-overview')} 
                  className={`sm:col-span-1 lg:col-span-1 relative overflow-hidden border-none shadow-2xl rounded-3xl hover:shadow-3xl hover:scale-[1.02] transition-all duration-500 group cursor-pointer ${effectiveTheme ? 'text-foreground bg-card' : 'text-primary-foreground bg-gradient-to-br from-primary via-secondary to-accent'}`}
                >
                  {effectiveTheme ? (
                    <div className="bull-theme-overlay bull-theme-wallet-overlay" />
                  ) : (
                    <>
                      <div className="absolute inset-0 opacity-60">
                        <div className="absolute -left-20 -top-20 w-60 h-60 bg-primary-foreground/20 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute right-10 top-10 w-40 h-40 bg-primary-foreground/15 rounded-full blur-3xl" />
                        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-accent/20 rounded-full blur-3xl" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                    </>
                  )}
                  <CardHeader className="relative z-10 pb-3 px-6 pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className={`uppercase tracking-wider text-xs font-bold flex items-center gap-2 ${effectiveTheme ? 'text-muted-foreground' : 'text-primary-foreground/80'}`}>
                        <Wallet className="h-3.5 w-3.5" />
                        Wallet Balance
                      </p>
                      <div className={`p-1.5 rounded-lg backdrop-blur-sm border ${effectiveTheme ? 'bg-muted/70 border-border/50' : 'bg-primary-foreground/10 border-primary-foreground/20'}`}>
                        <Shield className={`h-4 w-4 ${effectiveTheme ? 'text-foreground' : 'text-primary-foreground'}`} />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className={`text-4xl font-extrabold leading-tight ${effectiveTheme ? '' : 'drop-shadow-lg'}`}>
                        {formatAmount(dashboardData?.wallet?.balance)}
                      </span>
                      <span className={`text-lg font-bold ${effectiveTheme ? 'text-muted-foreground' : 'text-primary-foreground/80'}`}>
                        USD
                      </span>
                    </div>
                  </CardHeader> 
                  <CardContent className="relative z-10 pt-4 pb-6 px-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className={`text-sm font-semibold mb-1 ${effectiveTheme ? 'text-foreground' : 'text-primary-foreground'}`}>Your Safe Wallet</p>
                          <p className={`text-xs leading-relaxed ${effectiveTheme ? 'text-muted-foreground' : 'text-primary-foreground/80'}`}>
                            Securely manage balances across deposits and transfers.
                          </p>
                        </div>
                        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm border ${effectiveTheme ? 'text-muted-foreground bg-muted/70 border-border/50' : 'text-primary-foreground/90 bg-primary-foreground/10 border-primary-foreground/20'}`}>
                          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                          <span className="font-medium">Instant transfers available</span>
                        </div>
<Link href="/funds/internal-transfer" className="inline-block mt-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant={effectiveTheme ? 'outline' : 'ghost'}
                            size="sm"
                            className={`h-9 px-4 text-xs font-bold backdrop-blur-sm transition-all duration-300 hover:scale-105 ${effectiveTheme ? 'text-foreground border-border/50 hover:bg-muted/70' : 'text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/20 border border-primary-foreground/30'}`}
                          >
                            <ArrowLeftRight className="h-4 w-4 mr-2" />
                            Transfer Funds
                          </Button>
                        </Link>
                      </div>
                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <div className={`p-4 rounded-2xl backdrop-blur-md shadow-lg group-hover:scale-110 transition-transform duration-300 ${effectiveTheme ? 'border border-border/50 bg-muted/70' : 'border-2 border-primary-foreground/30 bg-primary-foreground/10'}`}>
                          <Lock className={`h-8 w-8 ${effectiveTheme ? 'text-foreground' : 'text-primary-foreground'}`} />
                        </div>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider ${effectiveTheme ? 'text-muted-foreground' : 'text-primary-foreground/90'}`}>Protected</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Partner Wallet Card - Enhanced */}
                {hasIbWalletData && ibWalletData && (
                  <Link href="/ib-dashboard/wallet" aria-label="View IB Wallet" className="sm:col-span-1 lg:col-span-1 block cursor-pointer rounded-[28px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-full">
                  <Card className="relative overflow-hidden border rounded-[28px] shadow-sm hover:shadow-lg backdrop-blur-sm transition-all duration-300 group ib-portal-surface ib-portal-surface-primary h-full">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/8 to-indigo-500/8 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity" />
                    <CardHeader className="relative z-10 pb-3 px-6 pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="uppercase tracking-wider text-xs font-semibold text-muted-foreground flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          Partner Wallet
                        </div>
                        <div className="p-1.5 rounded-lg backdrop-blur-sm border bg-muted/70 border-border/50">
                          <Shield className="h-4 w-4 text-foreground" />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-4xl font-extrabold leading-tight">
                          {formatAmount(ibWalletData.wallet_balance.amount)}
                        </span>
                        <span className="text-lg font-bold text-muted-foreground">
                          {ibWalletData.wallet_balance.currency}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10 pt-4 pb-6 px-6 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div>
                            <p className="text-foreground text-sm font-semibold mb-1">Partner Wallet</p>
                            <p className="text-muted-foreground text-xs leading-relaxed">
                              Your Partner earnings and balance.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm border text-muted-foreground bg-muted/70 border-border/50">
                            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                            <span className="font-medium">Partner Commission Tracking</span>
                          </div>
                          <div className="space-y-2 pt-2 border-t border-border/50">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Client Wallet:</span>
                              <span className="font-semibold text-foreground">
                                {formatCurrency(
                                  ibWalletData.client_wallet.amount,
                                  ibWalletData.client_wallet.currency
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Total Earned:</span>
                              <span className="font-semibold text-foreground">
                                {formatCurrency(
                                  ibWalletData.earning_summary.total_earned,
                                  ibWalletData.earning_summary.currency
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          <div className="p-4 rounded-2xl backdrop-blur-md shadow-lg group-hover:scale-110 transition-transform duration-300 border border-border/50 bg-muted/70">
                            <Wallet className="h-8 w-8" />
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Partner</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </Link>
                )}

                {/* Deposit Funds Card */}
                {(!dashboardData?.wallet?.balance || dashboardData.wallet.balance === 0) && (
                  <Card onClick={() => router.push('/funds/deposit')} className="sm:col-span-1 lg:col-span-1 relative overflow-hidden border rounded-[28px] shadow-sm hover:shadow-lg backdrop-blur-sm transition-all duration-300 group ib-portal-surface ib-portal-surface-primary cursor-pointer">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/8 to-purple-500/8 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity" />
                    <CardContent className="pt-6 pb-6 px-6 relative z-10">
                      <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="relative w-20 h-20 flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full border border-dashed border-border/60" style={{ animation: 'spin 10s linear infinite' }} />
                          <div className="flex h-full w-full items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm group-hover:scale-105 transition-transform duration-300">
                            <Wallet className="h-7 w-7 text-foreground" />
                          </div>
                          <div className="absolute -bottom-1 -right-1">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm">
                              <PlusCircle className="h-3.5 w-3.5 text-foreground" />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold text-foreground">Wallet Empty</h3>
                          <p className="text-xs text-muted-foreground">
                            Deposit funds to start your trading journey
                          </p>
                        </div>
                        <div className="pt-1 border-t border-border/50 w-full">
                          <Link href="/funds/deposit" className="w-full block mt-3" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" className="w-full">
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Deposit Funds
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Profile Status Card - Enhanced */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <Card onClick={() => router.push('/profile/view_profile')} className="rounded-[28px] h-full relative overflow-hidden border shadow-sm hover:shadow-lg backdrop-blur-sm transition-all duration-300 group ib-portal-surface cursor-pointer">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/8 to-purple-500/8 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity" />
                    <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5 relative z-10 border-b border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm">
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
<Link href="/profile/view_profile" className="block mt-4" onClick={(e) => e.stopPropagation()}>
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
                {isDepositsStatisticsLoading ? (
                  <Card className="relative flex w-full max-w-full flex-col gap-6 overflow-hidden rounded-2xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-muted/20 shadow-lg md:p-6">
                    <CardHeader className="relative flex flex-col items-start gap-4.5 space-y-0 p-0 md:flex-row md:items-center md:justify-between md:gap-0">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative flex flex-col gap-4 p-0">
                      <div className="flex w-full gap-1 rounded-lg border border-border/50 bg-muted/30 p-1">
                        <Skeleton className="h-9 flex-1" />
                        <Skeleton className="h-9 flex-1" />
                      </div>
                      <Skeleton className="h-32 w-full rounded-lg" />
                      <Skeleton className="h-[225px] w-full rounded-lg" />
                      <div className="flex gap-1">
                        <Skeleton className="h-9 flex-1" />
                        <Skeleton className="h-9 flex-1" />
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <DashboardTrendChart
                    title="Deposits"
                    subtitle={
                      depositsStatistics.length
                        ? `${depositsCurrency} Deposits (Last ${depositStatisticsPeriod} days)`
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
                    lineColor="var(--primary)"
                    primaryColor="var(--primary)"
                    emptyStateLabel="No deposit data available"
                    formatValue={(value) => formatCurrency(value, depositsCurrency)}
                    selectedPeriod={depositStatisticsPeriod === 7 ? "7d" : "1m"}
                    onPeriodChange={(period) => setDepositStatisticsPeriod(period === "7d" ? 7 : 30)}
                  />
                )}

                {isWithdrawalsStatisticsLoading ? (
                  <Card className="relative flex w-full max-w-full flex-col gap-6 overflow-hidden rounded-2xl border-2 border-border/50 bg-gradient-to-br from-card via-card to-muted/20 shadow-lg md:p-6">
                    <CardHeader className="relative flex flex-col items-start gap-4.5 space-y-0 p-0 md:flex-row md:items-center md:justify-between md:gap-0">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative flex flex-col gap-4 p-0">
                      <div className="flex w-full gap-1 rounded-lg border border-border/50 bg-muted/30 p-1">
                        <Skeleton className="h-9 flex-1" />
                        <Skeleton className="h-9 flex-1" />
                      </div>
                      <Skeleton className="h-32 w-full rounded-lg" />
                      <Skeleton className="h-[225px] w-full rounded-lg" />
                      <div className="flex gap-1">
                        <Skeleton className="h-9 flex-1" />
                        <Skeleton className="h-9 flex-1" />
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <DashboardTrendChart
                    title="Withdrawals"
                    subtitle={
                      withdrawalsStatistics.length
                        ? `${withdrawalsCurrency} Withdrawals (Last ${withdrawalStatisticsPeriod} days)`
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
                    lineColor="var(--primary)"
                    primaryColor="var(--primary)"
                    emptyStateLabel="No withdrawal data available"
                    formatValue={(value) => formatCurrency(value, withdrawalsCurrency)}
                    selectedPeriod={withdrawalStatisticsPeriod === 7 ? "7d" : "1m"}
                    onPeriodChange={(period) => setWithdrawalStatisticsPeriod(period === "7d" ? 7 : 30)}
                  />
                )}
              </div>
            </>
          ) : (
            /* Custom Dashboard View with Drag and Drop */
            dashboardWidgets.length > 0 && (
              <DashboardGrid
                widgets={dashboardWidgets}
                storageKey={`${dashboardArea}_dashboard`}
                presetLayout={dashboardPreset?.layout}
                presetHiddenWidgets={dashboardPreset?.hiddenWidgets}
                editable={canCustomizeDashboard}
                cols={12}
                rowHeight={100}
              />
            )
          )}
          
                         {currentAccounts.length > 0 ? (
                  <LivePositionsTable
                    title="Live Positions"
                    description={
                      selectedLivePositionsAccount
                        ? `Currently open MT5 positions for ${selectedLivePositionsAccount.account_id} (${selectedLivePositionsAccount.mt5_id ?? "N/A"})`
                        : "Currently open MT5 positions for the selected account"
                    }
                    error={livePositionsErrorMessage}
                    isLoading={isLoadingLivePositions}
                    rows={livePositions}
                    emptyDescription={
                      selectedLivePositionsAccount
                        ? `${selectedLivePositionsAccount.account_id} does not have any live positions right now.`
                        : "This MT5 account does not have any live positions right now."
                    }
                    headerActions={
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Select
                          value={selectedLivePositionsLogin}
                          onValueChange={setSelectedLivePositionsLogin}
                        >
                          <SelectTrigger className="w-full min-w-0 sm:w-[320px]">
                            <SelectValue placeholder="Select MT5 account" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentAccounts
                              .filter((account) => Boolean(account.mt5_id))
                              .map((account) => (
                                <SelectItem key={account.id} value={account.mt5_id ?? ""}>
                                  {`${account.account_id} - ${account.mt5_id}`}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            void refetchLivePositions();
                          }}
                          disabled={!selectedLivePositionsLogin || isRefreshingLivePositions}
                        >
                          <RefreshCw className={`mr-2 h-4 w-4${isRefreshingLivePositions ? " animate-spin" : ""}`} />
                          Refresh
                        </Button>
                      </div>
                    }
                  />
                ) : null}
          {/* Trading Accounts Grid */}
          <div className="space-y-6">
            {tradingSummaryError ? (
              <ApiErrorState
                error={tradingSummaryError}
                audience="client"
                resource="trading accounts"
                action="load"
                variant="panel"
                onRetry={() => {
                  void authApi.getTradingAccountsSummary(token!).then((res) => {
                    if (res.success && res.data) {
                      setTradingSummary(res.data);
                      setTradingSummaryError(null);
                    }
                  });
                }}
              />
            ) : hasAnyMt5Accounts ? (
              <>
                {/* Platform Tabs */}
                <Card className="border-0 bg-card/70 shadow-xl backdrop-blur-sm">
                  <CardContent className="px-4 py-4">
                    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full">
                      <TabsList className="grid h-auto w-full grid-cols-2 rounded-lg bg-muted/50 p-1">
                        <TabsTrigger
                          value="mt5-live"
                          className="rounded-md px-2 py-2 text-sm transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <div className="flex items-center gap-1.5">
                            <Activity className="h-4 w-4" />
                            <span className="hidden text-xs sm:inline">MT5 Live</span>
                          </div>
                        </TabsTrigger>
                        <TabsTrigger
                          value="mt5-demo"
                          className="rounded-md px-2 py-2 text-sm transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                        >
                          <div className="flex items-center gap-1.5">
                            <Target className="h-4 w-4" />
                            <span className="hidden text-xs sm:inline">MT5 Demo</span>
                          </div>
                        </TabsTrigger>
                        {/* MT4 dashboard tabs intentionally hidden for now.
                            Restore mt4-live and mt4-demo triggers here when MT4 UI is re-enabled. */}
                      </TabsList>
                    </Tabs>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{getTabTitle()}</h2>
                    <p className="text-muted-foreground">
                      {currentAccounts.length} account{currentAccounts.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
                  {currentAccounts.map((account) => {
                    const isDemo = account.account_mode?.toLowerCase().includes('demo');
                    const menuActions = [
                      {
                        label: 'Reset Password',
                        icon: Key,
                        onSelect: () => setResetPasswordAccount(account),
                      },
                      {
                        label: 'Copy MT5 Login',
                        icon: Copy,
                        onSelect: () => copyToClipboard(account.mt5_id ?? 'N/A', 'MT5 login'),
                      },
                      {
                        label: 'Copy Account ID',
                        icon: Copy,
                        onSelect: () => copyToClipboard(account.account_id, 'Account ID'),
                      },
                    ];

                    return (
                      <ClientMt5AccountCard
                        key={account.id}
                        title={account.accountType?.account_type_name || 'Trading Account'}
                        status="active"
                        mode={account.account_mode}
                        currency={account.accountType?.currency || 'USD'}
                        accountId={account.account_id}
                        mt5Login={account.mt5_id}
                        balance={account.balance}
                        balanceCurrency={account.accountType?.currency || 'USD'}
                        accountTypeName={account.accountType?.account_type_name}
                        leverage={account.leverage}
                        spread={account.accountType?.spread_from ?? 'N/A'}
                        server={accountServersById[account.id] ?? account.server ?? null}
                        depositHref={
                          isDemo
                            ? undefined
                            : `/funds/internal-transfer?tab=wallet-to-mt5&accountId=${encodeURIComponent(account.account_id)}`
                        }
                        onDeposit={isDemo ? () => openDashboardDepositDialog(account) : undefined}
                        menuActions={menuActions}
                      />
                    );
                  })}

                  <Card className="group h-full border border-dashed border-primary/35 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg">
                    <CardContent className="flex h-full flex-col p-5 sm:p-6">
                      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                        <PlusCircle className="h-6 w-6" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-bold text-foreground">{createAccountTitle}</h3>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {currentAccounts.length === 0
                            ? `No ${getTabTitle().toLowerCase()} yet. ${createAccountDescription}`
                            : createAccountDescription}
                        </p>
                      </div>
                      <Button
                        asChild
                        className="mt-auto h-11 justify-between rounded-xl bg-primary/95 px-4 text-primary-foreground shadow-sm hover:bg-primary"
                      >
                        <Link href={createAccountHref}>
                          Open {activeTab === "mt5-demo" ? "Demo" : "Live"} Account
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>

 
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">Open Your First MT5 Account</h2>
                  <p className="max-w-2xl text-muted-foreground">
                    You don&apos;t have any MT5 accounts yet. Choose an account type below and create a live or demo login directly from the dashboard.
                  </p>
                </div>

                {accountTypesError ? (
                  <ApiErrorState
                    error={accountTypesError}
                    audience="client"
                    resource="account types"
                    action="load"
                    variant="inline"
                    onRetry={() => {
                      void refetchAccountTypes();
                    }}
                  />
                ) : isAccountTypesLoading ? (
                  <ClientCardGridSkeleton />
                ) : activeAccountTypes.length > 0 ? (
                  <AccountTypeCardGrid accountTypes={activeAccountTypes} />
                ) : (
                  <Card className="border-2 border-dashed border-border">
                    <CardContent className="py-12 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <Settings className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="mb-2 text-xl font-semibold text-foreground">No Account Types Available</h3>
                      <p className="mx-auto max-w-md text-muted-foreground">
                        There are no MT5 account types available right now.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
          <ClientMt5PasswordResetDialog
            open={Boolean(resetPasswordAccount)}
            onOpenChange={handleResetPasswordDialogChange}
            accountId={resetPasswordAccount?.id ?? null}
            accountLabel={resetPasswordAccount?.account_id ?? null}
            token={token}
          />
          <Dialog open={Boolean(depositAccount)} onOpenChange={handleDepositDialogChange}>
            <DialogContent className="overflow-hidden border border-border/70 bg-card/95 p-0 shadow-xl sm:max-w-xl">
              <DialogHeader className="border-b border-border/60 px-6 py-5">
                <DialogTitle>Deposit Funds</DialogTitle>
                <DialogDescription>
                  {depositAccount
                    ? `Initiate deposit into ${depositAccount.account_id}`
                    : "Select a demo MT5 account and deposit amount."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 px-6 py-6">
                <div className="mx-auto flex w-full max-w-sm flex-col items-center justify-center space-y-2 text-center">
                  <div className="text-sm font-medium text-foreground">Deposit Amount</div>
                  <Select value={selectedDepositAmount} onValueChange={setSelectedDepositAmount}>
                    <SelectTrigger className="h-12 rounded-2xl border-border/70 bg-background/80 px-4">
                      <SelectValue placeholder="Choose deposit amount" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEMO_DEPOSIT_OPTIONS.map((amount) => (
                        <SelectItem key={amount} value={String(amount)}>
                          {`USD ${amount.toLocaleString("en-US")}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="gap-3 border-t border-border/60 px-6 py-5 sm:justify-center">
                <Button variant="outline" className="min-w-36 rounded-xl" onClick={() => handleDepositDialogChange(false)}>
                  Close
                </Button>
                <Button
                  className="min-w-36 rounded-xl"
                  onClick={handleDemoDeposit}
                  disabled={isSubmittingDeposit || !selectedDepositAmount}
                >
                  {isSubmittingDeposit ? "Depositing..." : "Deposit Now"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
          )}
        </div>
      ) : (
        <>
          {isDashboardLoading ? (
            <AdminDashboardSkeleton />
          ) : dashboardError ? (
            <ApiErrorState
              error={dashboardError}
              audience="admin"
              resource="dashboard"
              action="load"
              variant="panel"
            />
          ) : isManager ? (
            <ManagerDashboardView managerDashboardData={managerDashboardData} userName={user?.name} />
          ) : (
            <AdminDashboardView adminDashboardData={adminDashboardData} userName={user?.name} />
          )}
        </>
      )}
      
      {/* Profile Completion Dialog - Only for users */}
      {isUser && (
        <ProfileCompletionDialog
          open={showProfileDialog}
          onOpenChange={(open) => {
            setShowProfileDialog(open);
            if (open === false) {
              // Only show MT5 dialog if user has no MT5 accounts
              const hasMt5Accounts = Boolean(dashboardData?.mt5_users && dashboardData.mt5_users.length > 0);
              const hasSeenMt5Dialog = sessionStorage.getItem('mt5_dialog_shown');
              if (!hasMt5Accounts && !hasSeenMt5Dialog) {
                setShowMt5Dialog(true);
                sessionStorage.setItem('mt5_dialog_shown', 'true');
              }
            }
          }}
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

      {/* MT5 Account Creation Dialog */}
      {isUser && (
        <Mt5AccountCreationDialog
          open={showMt5Dialog}
          onOpenChange={setShowMt5Dialog}
        />
      )}

      {/* News Dialog */}
      {isUser && recentNews.length > 0 && (
        <NewsDialog
          open={showNewsDialog}
          onOpenChange={setShowNewsDialog}
          newsItems={recentNews}
        />
      )}

      {/* Promotion Dialog */}
      {isUser && recentPromotions.length > 0 && (
        <PromotionDialog
          open={showPromotionDialog}
          onOpenChange={setShowPromotionDialog}
          promotions={recentPromotions}
        />
      )}
    </ProtectedRoute>
  )
}
