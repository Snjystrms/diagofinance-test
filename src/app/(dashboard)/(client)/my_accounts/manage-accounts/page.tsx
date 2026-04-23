'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  Mail,
  MoreVertical,
  Settings,
  User,
  Wallet,
  XCircle,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ApiErrorState } from '@/components/errors/api-error-state';
import { ClientCardGridSkeleton } from '@/components/loading/client-page-skeletons';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  userMT5AccountsApi,
  type UserMT5AccountDetail,
  type UserMT5AccountListItem,
} from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { formatCurrency } from '@/lib/format';
import { formatDateTimeInIST } from '@/lib/formatters';

type ManagedMT5Account = UserMT5AccountListItem & {
  detail: UserMT5AccountDetail | null;
};

const formatDateTime = (value?: string) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return formatDateTimeInIST(value);
};

const getStatusBadge = (status: string | number | undefined) => {
  const normalizedStatus = String(status ?? '').toLowerCase();
  const isActive = status === 1 || normalizedStatus === '1' || normalizedStatus === 'live' || normalizedStatus === 'active';
  const isPending = status === 0 || normalizedStatus === '0' || normalizedStatus === 'pending' || normalizedStatus === 'inactive';

  if (isActive) {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-0">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Active
      </Badge>
    );
  }

  if (isPending) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-0">
        <Clock className="h-3 w-3 mr-1" />
        Pending
      </Badge>
    );
  }

  return (
    <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-0">
      <XCircle className="h-3 w-3 mr-1" />
      {normalizedStatus ? normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1) : 'Unknown'}
    </Badge>
  );
};

const groupAccounts = (accounts: ManagedMT5Account[]) => {
  const groups = {
    mt4Live: [] as ManagedMT5Account[],
    mt4Demo: [] as ManagedMT5Account[],
    mt5Live: [] as ManagedMT5Account[],
    mt5Demo: [] as ManagedMT5Account[],
  };

  accounts.forEach((account) => {
    const mode = account.detail?.account_mode?.toLowerCase();
    if (mode === 'demo') {
      groups.mt5Demo.push(account);
      return;
    }

    groups.mt5Live.push(account);
  });

  return groups;
};

const mt5AccountsRequests = new Map<string, Promise<ManagedMT5Account[]>>();
const mt5AccountDetailRequests = new Map<string, Promise<UserMT5AccountDetail | null>>();

const loadAccountDetail = (account: UserMT5AccountListItem, token: string) => {
  const requestKey = `${token}:${account.id}`;
  const existingRequest = mt5AccountDetailRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = userMT5AccountsApi
    .getById(account.id, token)
    .then((detailResponse) => detailResponse.data?.mt5_account ?? null)
    .catch((detailError) => {
      console.error(`Error fetching MT5 account detail for ${account.id}:`, detailError);
      return null;
    })
    .finally(() => {
      mt5AccountDetailRequests.delete(requestKey);
    });

  mt5AccountDetailRequests.set(requestKey, request);
  return request;
};

const loadManagedAccounts = (token: string) => {
  const existingRequest = mt5AccountsRequests.get(token);
  if (existingRequest) {
    return existingRequest;
  }

  const request = userMT5AccountsApi
    .list(token)
    .then(async (listResponse) => {
      const listItems = listResponse.data?.mt5_accounts ?? [];

      return Promise.all(
        listItems.map(async (account) => ({
          ...account,
          detail: await loadAccountDetail(account, token),
        }))
      );
    })
    .finally(() => {
      mt5AccountsRequests.delete(token);
    });

  mt5AccountsRequests.set(token, request);
  return request;
};

export default function ManageAccountsPage() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<ManagedMT5Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [activeTab, setActiveTab] = useState<'mt5-live' | 'mt5-demo' | 'mt4-live' | 'mt4-demo'>('mt5-live');
  const [selectedAccount, setSelectedAccount] = useState<ManagedMT5Account | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const fetchAccounts = useCallback(async () => {
    if (!token) {
      setError('Authentication required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const hydratedAccounts = await loadManagedAccounts(token);

      setAccounts(hydratedAccounts);
    } catch (fetchError) {
      console.error('Error fetching MT5 accounts:', fetchError);
      setError(fetchError);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const accountGroups = useMemo(() => groupAccounts(accounts), [accounts]);

  const currentAccounts = useMemo(() => {
    switch (activeTab) {
      case 'mt4-live':
        return accountGroups.mt4Live;
      case 'mt4-demo':
        return accountGroups.mt4Demo;
      case 'mt5-demo':
        return accountGroups.mt5Demo;
      case 'mt5-live':
      default:
        return accountGroups.mt5Live;
    }
  }, [accountGroups, activeTab]);

  const activeTabTitle = useMemo(() => {
    switch (activeTab) {
      case 'mt4-live':
        return 'MT4 Live Accounts';
      case 'mt4-demo':
        return 'MT4 Demo Accounts';
      case 'mt5-demo':
        return 'MT5 Demo Accounts';
      case 'mt5-live':
      default:
        return 'MT5 Live Accounts';
    }
  }, [activeTab]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const openDetails = (account: ManagedMT5Account) => {
    setSelectedAccount(account);
    setIsDetailsDialogOpen(true);
  };

  const isMT4Tab = activeTab.startsWith('mt4');

  const AccountCard = ({ account }: { account: ManagedMT5Account }) => {
    const detail = account.detail;
    const accountMode = detail?.account_mode?.toLowerCase() === 'demo' ? 'DEMO' : 'LIVE';
    const accountTypeName = detail?.accountType?.name ?? 'MT5 Account';
    const leverageValue = detail?.leverage ? `1:${detail.leverage}` : 'N/A';
    const groupName = detail?.group?.name ?? detail?.mt5_group_name ?? 'N/A';
    const balanceValue = formatCurrency(Number(account.balance ?? 0), detail?.base_currency ?? 'USD');

    return (
      <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-lg font-bold text-white shadow-lg">
                5
              </div>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold">{accountTypeName}</h3>
                  {getStatusBadge(detail?.status)}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {accountMode}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{groupName}</span>
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
                <DropdownMenuItem onClick={() => openDetails(account)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => copyToClipboard(account.mt5_id, 'MT5 login')}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy MT5 Login
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => copyToClipboard(account.account_id, 'Account ID')}>
                  <Wallet className="h-4 w-4 mr-2" />
                  Copy Account ID
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mb-4 space-y-3">
            <div className="rounded-lg bg-white/60 p-3 dark:bg-black/20">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Wallet className="h-3 w-3" />
                Account ID
              </div>
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-semibold">{account.account_id}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => copyToClipboard(account.account_id, 'Account ID')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-white/60 p-3 dark:bg-black/20">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <BarChart3 className="h-3 w-3" />
                MT5 Login
              </div>
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-semibold">{account.mt5_id}</code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => copyToClipboard(account.mt5_id, 'MT5 login')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white/40 p-3 dark:bg-black/10">
              <div className="mb-1 text-xs text-muted-foreground">Balance</div>
              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{balanceValue}</div>
            </div>
            <div className="rounded-lg bg-white/40 p-3 dark:bg-black/10">
              <div className="mb-1 text-xs text-muted-foreground">Leverage</div>
              <div className="flex items-center gap-1 text-sm font-semibold">
                <Zap className="h-3.5 w-3.5 text-orange-500" />
                {leverageValue}
              </div>
            </div>
            <div className="rounded-lg bg-white/40 p-3 dark:bg-black/10">
              <div className="mb-1 text-xs text-muted-foreground">Spread</div>
              <div className="text-sm font-semibold">{detail?.spread_from ?? 'N/A'}</div>
            </div>
            <div className="rounded-lg bg-white/40 p-3 dark:bg-black/10">
              <div className="mb-1 text-xs text-muted-foreground">Account Holder</div>
              <div className="text-sm font-semibold">{detail?.name ?? account.name}</div>
            </div>
            <div className="rounded-lg bg-white/40 p-3 dark:bg-black/10">
              <div className="mb-1 text-xs text-muted-foreground">Email</div>
              <div className="truncate text-sm font-semibold">{detail?.email ?? account.email}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white" onClick={() => openDetails(account)}>
              <Eye className="h-4 w-4 mr-1" />
              View Details
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => copyToClipboard(account.mt5_id, 'MT5 login')}>
              <Copy className="h-4 w-4 mr-1" />
              Copy Login
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const selectedAccountDetail = selectedAccount?.detail;

  return (
    <ProtectedRoute>
      <div className="min-h-full w-full p-4 lg:p-6 xl:p-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-blue-950/20 dark:to-indigo-950/10">
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 blur-3xl" />
        </div>

        <div className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-foreground mb-1">
                Manage Accounts
              </h1>
              <p className="text-base text-muted-foreground">
                Review your MT5 account logins, account IDs, leverage, group details, and account status.
              </p>
            </div>
            <Button className="bg-primary text-primary-foreground shadow-sm hover:shadow-md transition-all duration-200" asChild>
              <Link href="/my_accounts/open-trading-account">
                Open New Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Card className="border-0 shadow-xl bg-card/70 backdrop-blur-sm mb-8">
          <CardContent className="px-4 py-4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-4 rounded-lg bg-muted/50 p-1">
                <TabsTrigger
                  value="mt5-live"
                  className="rounded-md py-2 px-2 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white"
                >
                  MT5 Live
                </TabsTrigger>
                <TabsTrigger
                  value="mt5-demo"
                  className="rounded-md py-2 px-2 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white"
                >
                  MT5 Demo
                </TabsTrigger>
                <TabsTrigger
                  value="mt4-live"
                  className="rounded-md py-2 px-2 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
                >
                  MT4 Live
                </TabsTrigger>
                <TabsTrigger
                  value="mt4-demo"
                  className="rounded-md py-2 px-2 text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white"
                >
                  MT4 Demo
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {error ? (
          <ApiErrorState
            error={error}
            audience="client"
            resource="trading accounts"
            action="load"
            variant="inline"
            className="mb-6"
            onRetry={fetchAccounts}
          />
        ) : null}

        {isMT4Tab && !isLoading && !error && (
          <Card className="mb-6 border-dashed border-amber-300 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/20">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-1 text-sm font-semibold text-amber-900 dark:text-amber-200">
                  MT4 is coming soon
                </div>
                <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
                  MT4 account opening and management are not enabled yet. MT5 accounts are available now.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/my_accounts/open-trading-account">
                  Open MT5 Account
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 rounded-full" />
              <Skeleton className="h-4 w-36 rounded-full" />
            </div>
            <ClientCardGridSkeleton cardCount={6} />
          </div>
        )}

        {!isLoading && !error && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{activeTabTitle}</h2>
                <p className="text-muted-foreground">
                  {currentAccounts.length} account{currentAccounts.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>

            {currentAccounts.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {currentAccounts.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-2 border-gray-300 dark:border-gray-600">
                <CardContent className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Settings className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">
                    {isMT4Tab ? 'MT4 Accounts Coming Soon' : `No ${activeTabTitle}`}
                  </h3>
                  <p className="mx-auto mb-6 max-w-md text-muted-foreground">
                    {isMT4Tab
                      ? 'MT4 account management is not available yet. Use the MT5 flow to create and review active trading accounts.'
                      : `You don't have any ${activeTabTitle.toLowerCase()} yet. Open a new account to get started.`}
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
        )}

        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-h-[82vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedAccountDetail?.accountType?.name ?? 'MT5 Account Details'}
              </DialogTitle>
              <DialogDescription>
                Review the MT5 account credentials and metadata returned by the account management APIs.
              </DialogDescription>
            </DialogHeader>

            {selectedAccount ? (
              <div className="grid gap-3 py-1 md:grid-cols-2">
                <Card>
                  <CardHeader className="px-4 pb-2 pt-4">
                    <CardTitle className="text-base">Identity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 px-4 pb-4 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedAccountDetail?.name ?? selectedAccount.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="break-all">{selectedAccountDetail?.email ?? selectedAccount.email}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Mobile</span>
                      <span>{selectedAccountDetail?.mobile ?? 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Status</span>
                      <span>{getStatusBadge(selectedAccountDetail?.status)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Mode</span>
                      <span className="font-medium uppercase">{selectedAccountDetail?.account_mode ?? 'live'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="px-4 pb-2 pt-4">
                    <CardTitle className="text-base">Credentials</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 px-4 pb-4 text-sm">
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      <div className="mb-1 text-xs text-muted-foreground">Account ID</div>
                      <div className="flex items-center justify-between gap-2">
                        <code className="font-semibold">{selectedAccount.account_id}</code>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(selectedAccount.account_id, 'Account ID')}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      <div className="mb-1 text-xs text-muted-foreground">MT5 Login</div>
                      <div className="flex items-center justify-between gap-2">
                        <code className="font-semibold">{selectedAccount.mt5_id}</code>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(selectedAccount.mt5_id, 'MT5 login')}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Platform</span>
                      <span className="font-medium">MT5</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Group</span>
                      <span className="break-all text-right">{selectedAccountDetail?.group?.mt5_group_name ?? selectedAccountDetail?.mt5_group_name ?? 'N/A'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="px-4 pb-2 pt-4">
                    <CardTitle className="text-base">Trading Setup</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 px-4 pb-4 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Balance</span>
                      <span>{formatCurrency(Number(selectedAccount.balance ?? 0), selectedAccountDetail?.base_currency ?? 'USD')}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Account Type</span>
                      <span className="text-right">{selectedAccountDetail?.accountType?.name ?? 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Leverage</span>
                      <span>{selectedAccountDetail?.leverage ? `1:${selectedAccountDetail.leverage}` : 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Spread From</span>
                      <span>{selectedAccountDetail?.spread_from ?? 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Maximum Leverage</span>
                      <span className="text-right">{selectedAccountDetail?.maximum_leverage ?? 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Base Currency</span>
                      <span>{selectedAccountDetail?.base_currency ?? 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Minimum Deposit</span>
                      <span>{selectedAccountDetail?.minimum_deposit ?? 'N/A'}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="px-4 pb-2 pt-4">
                    <CardTitle className="text-base">Audit</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 px-4 pb-4 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Created</span>
                      <span className="text-right">{formatDateTime(selectedAccountDetail?.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Updated</span>
                      <span className="text-right">{formatDateTime(selectedAccountDetail?.updated_at)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Stop Out Level</span>
                      <span>{selectedAccountDetail?.stop_out_level ?? 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <span className="text-muted-foreground">Swap Free</span>
                      <span>{selectedAccountDetail?.swap_free_option ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="py-6 text-sm text-muted-foreground">
                No account details available.
              </div>
            )}

            <DialogFooter className="sm:justify-between">
              <Button variant="outline" asChild>
                <Link href="/my_accounts/open-trading-account">
                  Open Another Account
                </Link>
              </Button>
              <Button onClick={() => setIsDetailsDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
