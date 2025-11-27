'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Settings, 
  ArrowRight,
  Loader2,
  AlertCircle,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  BarChart3,
  Wallet,
  TrendingUp,
  Shield,
  Zap,
  MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { mt5AccountsApi, type MT5Account } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

// Helper function to get status badge
const getStatusBadge = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower === 'live' || statusLower === 'active') {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-0">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Active
      </Badge>
    );
  }
  if (statusLower === 'pending' || statusLower === 'inactive') {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-0">
        <Clock className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-0">
      <XCircle className="h-3 w-3 mr-1" />
      {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
    </Badge>
  );
};

// Helper function to get platform icon and color
const getPlatformConfig = (platform: string, isDemo: boolean) => {
  const platformLower = platform.toLowerCase();
  const isMT5 = platformLower === 'mt5';
  
  return {
    icon: isMT5 ? '5' : '4',
    gradient: isDemo 
      ? 'from-blue-500 to-cyan-500' 
      : isMT5 
        ? 'from-green-500 to-emerald-500' 
        : 'from-purple-500 to-indigo-500',
    bgGradient: isDemo
      ? 'from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20'
      : isMT5
        ? 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20'
        : 'from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20',
    borderColor: isDemo
      ? 'border-blue-200 dark:border-blue-800'
      : isMT5
        ? 'border-green-200 dark:border-green-800'
        : 'border-purple-200 dark:border-purple-800'
  };
};

// Group accounts by platform and type
const groupAccounts = (accounts: MT5Account[]) => {
  const groups = {
    mt4Live: [] as MT5Account[],
    mt4Demo: [] as MT5Account[],
    mt5Live: [] as MT5Account[],
    mt5Demo: [] as MT5Account[],
  };

  accounts.forEach(account => {
    const isDemo = account.account_type?.toLowerCase().includes('demo') || 
                   account.account_id?.toString().includes('demo') ||
                   account.status?.toLowerCase().includes('demo');
    const isMT5 = account.platform?.toLowerCase() === 'mt5';

    if (isMT5) {
      if (isDemo) {
        groups.mt5Demo.push(account);
      } else {
        groups.mt5Live.push(account);
      }
    } else {
      if (isDemo) {
        groups.mt4Demo.push(account);
      } else {
        groups.mt4Live.push(account);
      }
    }
  });

  return groups;
};

export default function ManageAccountsPage() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('mt5-live');

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!token) {
        setError('Authentication required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await mt5AccountsApi.getAll(token);
        if (response.success && response.data) {
          setAccounts(response.data);
        } else {
          setError('Failed to load accounts');
        }
      } catch (error) {
        console.error('Error fetching MT5 accounts:', error);
        setError(error instanceof Error ? error.message : 'Failed to load accounts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccounts();
  }, [token]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text.toString());
    toast.success(`${label} copied to clipboard!`);
  };

  const accountGroups = groupAccounts(accounts);

  const AccountCard = ({ account }: { account: MT5Account }) => {
    const isDemo = account.account_type?.toLowerCase().includes('demo') || 
                   account.account_id?.toString().includes('demo');
    const platformConfig = getPlatformConfig(account.platform || 'mt5', isDemo);

    return (
      <Card className={`border-2 ${platformConfig.borderColor} bg-gradient-to-br ${platformConfig.bgGradient} backdrop-blur-sm hover:shadow-lg transition-all duration-300`}>
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${platformConfig.gradient} text-white font-bold text-lg shadow-lg`}>
                {platformConfig.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">
                    {account.account_type || 'Trading Account'}
                  </h3>
                  {getStatusBadge(account.status || 'active')}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {isDemo ? 'DEMO' : 'LIVE'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {account.currency || 'USD'}
                  </span>
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Trading Analytics
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Wallet className="h-4 w-4 mr-2" />
                  Deposit Funds
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Account ID */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Account ID
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-sm bg-black/5 dark:bg-white/5 rounded-lg px-3 py-2">
                {account.account_id}
              </code>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => copyToClipboard(account.account_id, 'Account ID')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Account Metrics */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Leverage</span>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-orange-500" />
                <span className="font-semibold text-sm">{account.leverage || '1:100'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Platform</span>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-blue-500" />
                <span className="font-semibold text-sm">{account.platform || 'MT5'}</span>
              </div>
            </div>
          </div>

          {/* Financial Metrics */}
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white/50 dark:bg-black/20 rounded-lg">
              <span className="text-sm font-medium">Balance</span>
              <span className="font-bold text-green-600">
                {account.available_balance || 'USD 0.00'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-white/30 dark:bg-black/10 rounded">
                <div className="text-xs text-muted-foreground">Equity</div>
                <div className="font-semibold text-sm">{account.equity || 'USD 0.00'}</div>
              </div>
              <div className="text-center p-2 bg-white/30 dark:bg-black/10 rounded">
                <div className="text-xs text-muted-foreground">Free Margin</div>
                <div className="font-semibold text-sm">{account.free_margin || 'USD 0.00'}</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <Button size="sm" className="flex-1 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black text-white">
              <BarChart3 className="h-4 w-4 mr-1" />
              Trade
            </Button>
            <Button size="sm" variant="outline" className="flex-1">
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const getCurrentAccounts = () => {
    switch (activeTab) {
      case 'mt4-live':
        return accountGroups.mt4Live;
      case 'mt4-demo':
        return accountGroups.mt4Demo;
      case 'mt5-live':
        return accountGroups.mt5Live;
      case 'mt5-demo':
        return accountGroups.mt5Demo;
      default:
        return accountGroups.mt5Live;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'mt4-live':
        return 'MT4 Live Accounts';
      case 'mt4-demo':
        return 'MT4 Demo Accounts';
      case 'mt5-live':
        return 'MT5 Live Accounts';
      case 'mt5-demo':
        return 'MT5 Demo Accounts';
      default:
        return 'MT5 Live Accounts';
    }
  };

  const currentAccounts = getCurrentAccounts();

  return (
    <ProtectedRoute>
      <div className="min-h-full w-full p-4 lg:p-6 xl:p-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-blue-950/20 dark:to-indigo-950/10">
        {/* Background Decorative Elements */}
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-full blur-3xl"></div>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                    Dashboard
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/my_accounts" className="text-muted-foreground hover:text-foreground transition-colors">
                    My Accounts
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-foreground font-semibold">
                  Manage Accounts
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-75"></div>
                <div className="relative flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
                  <Settings className="h-8 w-8" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
                  Manage Accounts
                </h1>
                <p className="text-lg text-muted-foreground">
                  View and manage all your trading accounts
                </p>
              </div>
            </div>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200" asChild>
              <Link href="/my_accounts/open-trading-account">
                Open New Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Platform Tabs */}
        <Card className="border-0 shadow-xl bg-card/70 backdrop-blur-sm mb-8">
          <CardContent className="px-4 py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full bg-muted/50 p-1 rounded-lg grid grid-cols-4 h-auto">
                <TabsTrigger 
                  value="mt5-live" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white rounded-md transition-all duration-200 py-2 px-2 text-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-green-100 text-green-800 rounded text-xs font-bold flex items-center justify-center">
                      5
                    </div>
                    <span className="hidden sm:inline text-xs">MT5 Live</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="mt5-demo" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-md transition-all duration-200 py-2 px-2 text-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-blue-100 text-blue-800 rounded text-xs font-bold flex items-center justify-center">
                      5
                    </div>
                    <span className="hidden sm:inline text-xs">MT5 Demo</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="mt4-live" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white rounded-md transition-all duration-200 py-2 px-2 text-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-purple-100 text-purple-800 rounded text-xs font-bold flex items-center justify-center">
                      4
                    </div>
                    <span className="hidden sm:inline text-xs">MT4 Live</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="mt4-demo" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white rounded-md transition-all duration-200 py-2 px-2 text-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-blue-100 text-blue-800 rounded text-xs font-bold flex items-center justify-center">
                      4
                    </div>
                    <span className="hidden sm:inline text-xs">MT4 Demo</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-destructive/50 bg-destructive/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                <span className="text-destructive">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card className="border-0 shadow-xl bg-card/70 backdrop-blur-sm">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        )}

        {/* Accounts Grid */}
        {!isLoading && !error && (
          <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{getTabTitle()}</h2>
                <p className="text-muted-foreground">
                  {currentAccounts.length} account{currentAccounts.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>

            {/* Accounts Grid */}
            {currentAccounts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentAccounts.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-gray-300 dark:border-gray-600">
                <CardContent className="text-center py-12">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Settings className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No {getTabTitle()} Found</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    You don&apos;t have any {getTabTitle().toLowerCase()} yet. Create a new account to get started.
                  </p>
                  <Button size="lg" asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                    <Link href="/my_accounts/open-trading-account">
                      Open {getTabTitle()}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty State (when no accounts at all) */}
        {!isLoading && !error && accounts.length === 0 && (
          <Card className="border-0 shadow-xl bg-card/70 backdrop-blur-sm text-center">
            <CardContent className="py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Trading Accounts</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                You don&apos;t have any trading accounts yet. Create your first account to start trading.
              </p>
              <Button size="lg" asChild className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                <Link href="/my_accounts/open-trading-account">
                  Open Trading Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}