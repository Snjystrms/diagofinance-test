'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  Copy,
  DollarSign,
  Key,
  Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ApiErrorState } from '@/components/errors/api-error-state';
import { ClientMt5AccountCard } from '@/components/accounts/client-mt5-account-card';
import { ClientMt5PasswordResetDialog } from '@/components/accounts/client-mt5-password-reset-dialog';
import { ClientCardGridSkeleton } from '@/components/loading/client-page-skeletons';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  userMT5AccountsApi,
  type UserMT5DemoDepositData,
  type UserMT5AccountDetail,
  type UserMT5AccountListItem,
} from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { formatCurrency } from '@/lib/format';
import { getFriendlyErrorMessage } from '@/lib/friendly-errors';

type ManagedMT5Account = UserMT5AccountListItem & {
  detail: UserMT5AccountDetail | null;
};

const groupAccounts = (accounts: ManagedMT5Account[]) => {
  const groups = {
    // MT4 account buckets are intentionally disabled for now.
    // mt4Live: [] as ManagedMT5Account[],
    // mt4Demo: [] as ManagedMT5Account[],
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
const DEMO_DEPOSIT_OPTIONS = [1000, 2500, 5000, 10000, 100000] as const;

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
  // MT4 tabs are intentionally hidden for now. Restore the original union when MT4 UI returns.
  // const [activeTab, setActiveTab] = useState<'mt5-live' | 'mt5-demo' | 'mt4-live' | 'mt4-demo'>('mt5-live');
  const [activeTab, setActiveTab] = useState<'mt5-live' | 'mt5-demo'>('mt5-live');
  const [resetPasswordAccount, setResetPasswordAccount] = useState<ManagedMT5Account | null>(null);
  const [depositAccount, setDepositAccount] = useState<ManagedMT5Account | null>(null);
  const [selectedDepositAmount, setSelectedDepositAmount] = useState('');
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

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
      case 'mt5-demo':
        return accountGroups.mt5Demo;
      case 'mt5-live':
      default:
        return accountGroups.mt5Live;
    }
  }, [accountGroups, activeTab]);

  const activeTabTitle = useMemo(() => {
    switch (activeTab) {
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

  const openDepositDialog = (account: ManagedMT5Account) => {
    setDepositAccount(account);
    setSelectedDepositAmount('');
  };

  const handleResetPasswordDialogChange = (open: boolean) => {
    if (!open) {
      setResetPasswordAccount(null);
    }
  };

  const handleDepositDialogChange = (open: boolean) => {
    if (!open) {
      setDepositAccount(null);
      setSelectedDepositAmount('');
      setIsSubmittingDeposit(false);
    }
  };

  const handleDemoDeposit = useCallback(async () => {
    if (!token || !depositAccount) {
      toast.error('Authentication required');
      return;
    }

    const amount = Number.parseFloat(selectedDepositAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Select a deposit amount');
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

      mt5AccountsRequests.delete(token);
      mt5AccountDetailRequests.clear();
      await fetchAccounts();

      setDepositAccount(null);
      setSelectedDepositAmount('');
      const depositedAmount = responseData?.amount ?? amount;
      toast.success(
        response.message
          ? `${response.message} (${formatCurrency(depositedAmount, 'USD')})`
          : `Deposited ${formatCurrency(depositedAmount, 'USD')} successfully into ${depositAccount.account_id}.`
      );
    } catch (error) {
      console.error('Demo MT5 deposit failed:', error);
      toast.error(
        getFriendlyErrorMessage(error, {
          audience: 'client',
          resource: 'demo MT5 deposit',
          action: 'create',
        })
      );
    } finally {
      setIsSubmittingDeposit(false);
    }
  }, [depositAccount, fetchAccounts, selectedDepositAmount, token]);

  const AccountCard = ({ account }: { account: ManagedMT5Account }) => {
    const detail = account.detail;
    const isDemoAccount = detail?.account_mode?.toLowerCase() === 'demo';
    const accountTypeName = detail?.accountType?.name ?? 'MT5 Account';
    const menuActions = [
      {
        label: 'Reset Password',
        icon: Key,
        onSelect: () => setResetPasswordAccount(account),
      },
      {
        label: 'Copy MT5 Login',
        icon: Copy,
        onSelect: () => copyToClipboard(account.mt5_id, 'MT5 login'),
      },
      {
        label: 'Copy Account ID',
        icon: Copy,
        onSelect: () => copyToClipboard(account.account_id, 'Account ID'),
      },
    ];

    return (
      <ClientMt5AccountCard
        title={accountTypeName}
        status={detail?.status}
        mode={detail?.account_mode}
        currency={detail?.base_currency ?? 'USD'}
        accountId={account.account_id}
        mt5Login={account.mt5_id}
        balance={Number(account.balance ?? 0)}
        balanceCurrency={detail?.base_currency ?? 'USD'}
        leverage={detail?.leverage}
        spread={detail?.spread_from ?? detail?.accountType?.spread_from ?? 'N/A'}
        depositHref={
          isDemoAccount
            ? undefined
            : `/funds/internal-transfer?tab=wallet-to-mt5&accountId=${encodeURIComponent(account.account_id)}`
        }
        onDeposit={isDemoAccount ? () => openDepositDialog(account) : undefined}
        menuActions={menuActions}
      />
    );
  };

  return (
    <ProtectedRoute>
      <div className="min-h-full w-full bg-background p-4 lg:p-6 xl:p-8">

        <div className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="mb-1 flex items-center gap-2 text-3xl font-semibold text-foreground">
                <Award className="h-6 w-6 text-primary" />
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

        <Card className="mb-8 border border-border/60 bg-card/80 shadow-sm">
          <CardContent className="px-4 py-4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-2 rounded-lg bg-muted/50 p-1">
                <TabsTrigger
                  value="mt5-live"
                  className="rounded-md py-2 px-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  MT5 Live
                </TabsTrigger>
                <TabsTrigger
                  value="mt5-demo"
                  className="rounded-md py-2 px-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  MT5 Demo
                </TabsTrigger>
                {/* MT4 tabs intentionally hidden for now.
                    Restore mt4-live and mt4-demo triggers here when MT4 UI is re-enabled. */}
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

        {/* MT4 coming-soon banner intentionally hidden for now.
            Restore the previous MT4 notice card here when MT4 UI is re-enabled. */}

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
                    {`No ${activeTabTitle}`}
                  </h3>
                  <p className="mx-auto mb-6 max-w-md text-muted-foreground">
                    {`You don't have any ${activeTabTitle.toLowerCase()} yet. Open a new account to get started.`}
                  </p>
                  <Button size="lg" asChild>
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
                  : 'Select a demo MT5 account and deposit amount.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 px-6 py-6">
              {/* <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Demo deposit</div>
                <div className="mt-2 text-sm text-foreground">
                  Deposit a preset USD amount into this MT5 demo account and refresh the balance instantly.
                </div>
              </div> */}
              <div className="mx-auto max-w-sm w-full space-y-2 flex flex-col items-center justify-center text-center">
                <div className="text-sm font-medium text-foreground">Deposit Amount</div>
                <Select value={selectedDepositAmount} onValueChange={setSelectedDepositAmount}>
                  <SelectTrigger className="h-12 rounded-2xl border-border/70 bg-background/80 px-4">
                    <SelectValue placeholder="Choose deposit amount" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMO_DEPOSIT_OPTIONS.map((amount) => (
                      <SelectItem key={amount} value={String(amount)}>
                        {`USD ${amount.toLocaleString('en-US')}`}
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
                {isSubmittingDeposit ? 'Depositing...' : 'Deposit Now'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
