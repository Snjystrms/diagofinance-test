'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { 
  BarChart3, 
  ArrowRight, 
  Loader2,
  CheckCircle2,
  Copy,
  Shield,
  Zap,
  TrendingUp,
  Lock,
  CheckCircle,
  Star,
  Hash
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ApiErrorState } from '@/components/errors/api-error-state';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PasswordInput } from '@/components/password-input';
import { Badge } from '@/components/ui/badge';
import { tradingAccountSchema, type TradingAccountFormData } from '@/lib/validations';
import {
  accountTypesApi,
  type AccountType,
  userMT5AccountsApi,
  type UserMT5AccountCreateData,
} from '@/lib/api';
import { getFriendlyErrorMessage } from '@/lib/friendly-errors';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

const DEFAULT_GROUP_ID = 1;

const LEVERAGE_CHOICES = [
  { value: 50, label: '1:50 - Lower exposure' },
  { value: 100, label: '1:100 - Standard' },
  { value: 200, label: '1:200 - Flexible' },
  { value: 500, label: '1:500 - Higher flexibility' },
  { value: 1000, label: '1:1000 - Very high flexibility' },
  { value: 2000, label: '1:2000 - Maximum available' },
] as const;
const DEMO_BALANCE_CHOICES = [1000, 2500, 5000, 10000, 100000] as const;

const getMaximumLeverageValue = (accountType?: AccountType) => {
  if (!accountType) {
    return null;
  }

  const ratioMatch = accountType.maximum_leverage?.match(/1\s*:\s*(\d+)/i);
  if (ratioMatch) {
    return Number.parseInt(ratioMatch[1], 10);
  }

  const configuredValue = Number(accountType.leverage_value);
  if (Number.isFinite(configuredValue) && configuredValue > 0) {
    return configuredValue;
  }

  const fallbackMatch = accountType.maximum_leverage?.match(/(\d{2,5})/);
  return fallbackMatch ? Number.parseInt(fallbackMatch[1], 10) : null;
};

export default function OpenTradingAccountPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const [accountMode, setAccountMode] = useState<'live' | 'demo'>('live');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [isLoadingAccountTypes, setIsLoadingAccountTypes] = useState(true);
  const [accountTypesError, setAccountTypesError] = useState<unknown | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [mt5RequestData, setMt5RequestData] = useState<UserMT5AccountCreateData | null>(null);

  const form = useForm<TradingAccountFormData>({
    resolver: zodResolver(tradingAccountSchema),
    defaultValues: {
      accountType: '',
      balance: '10000',
      leverage: '100',
      mainPassword: '',
      investorPassword: '',
    },
  });

  const selectedAccountTypeName = form.watch('accountType');
  const selectedAccountType = useMemo(
    () => accountTypes.find((accountType) => accountType.name === selectedAccountTypeName),
    [accountTypes, selectedAccountTypeName]
  );
  const leverageOptions = useMemo(() => {
    const maxLeverage = getMaximumLeverageValue(selectedAccountType);
    if (!maxLeverage) {
      return LEVERAGE_CHOICES;
    }

    const options = LEVERAGE_CHOICES.filter((option) => option.value <= maxLeverage);
    if (options.some((option) => option.value === maxLeverage)) {
      return options;
    }

    return [
      ...options,
      { value: maxLeverage, label: `1:${maxLeverage} - Maximum available` },
    ];
  }, [selectedAccountType]);

  const mainPassword = form.watch('mainPassword') || '';
  const investorPassword = form.watch('investorPassword') || '';
  const activePassword = investorPassword.length > mainPassword.length ? investorPassword : mainPassword;
  const pwLen = activePassword.length >= 8;
  const pwUpper = /[A-Z]/.test(activePassword);
  const pwLower = /[a-z]/.test(activePassword);
  const pwNum = /\d/.test(activePassword);
  const pwSpecial = /[!@#$%^&*]/.test(activePassword);

  useEffect(() => {
    const requestedMode = searchParams.get('mode');
    if (requestedMode === 'demo' || requestedMode === 'live') {
      setAccountMode(requestedMode);
      form.setValue('balance', requestedMode === 'demo' ? '10000' : '', {
        shouldDirty: false,
        shouldValidate: false,
      });
    }

    const requestedType = searchParams.get('type');
    if (requestedType) {
      form.setValue('accountType', requestedType, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [form, searchParams]);

  useEffect(() => {
    form.setValue('balance', accountMode === 'demo' ? form.getValues('balance') || '10000' : '', {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [accountMode, form]);

  const fetchAccountTypes = useCallback(async () => {
    if (!token) {
      setAccountTypesError('Authentication required');
      setIsLoadingAccountTypes(false);
      return;
    }

    try {
      setIsLoadingAccountTypes(true);
      setAccountTypesError(null);
      const response = await accountTypesApi.getActive(token);
      if (response.success && response.data) {
        setAccountTypes(response.data);
      } else {
        setAccountTypesError('Unable to load account types');
      }
    } catch (error) {
      console.error('Error fetching account types:', error);
      setAccountTypesError(error);
    } finally {
      setIsLoadingAccountTypes(false);
    }
  }, [token]);

  // Fetch account types for the MT5 account opening flow.
  useEffect(() => {
    fetchAccountTypes();
  }, [fetchAccountTypes]);

  useEffect(() => {
    if (!selectedAccountType || leverageOptions.length === 0) {
      return;
    }

    const currentLeverage = form.getValues('leverage');
    const isCurrentAvailable = leverageOptions.some(
      (option) => String(option.value) === currentLeverage
    );

    if (!isCurrentAvailable) {
      const preferredOption =
        leverageOptions.find((option) => option.value === 100) ?? leverageOptions[0];

      form.setValue('leverage', String(preferredOption.value), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [form, leverageOptions, selectedAccountType]);

  const onSubmit = async (data: TradingAccountFormData) => {
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    // MT4 account opening is intentionally disabled for now.
    // Restore the previous platform gate here if MT4 account creation returns.

    setIsSubmitting(true);
    try {
      if (!selectedAccountType) {
        toast.error('Choose an account type before creating the account.');
        return;
      }

      const leverageMatch = data.leverage.match(/^(\d+)$/);
      if (!leverageMatch) {
        toast.error('Choose a valid leverage option.');
        return;
      }

      const leverage = Number.parseInt(leverageMatch[1], 10);
      const maxLeverage = getMaximumLeverageValue(selectedAccountType);
      if (maxLeverage && leverage > maxLeverage) {
        toast.error(`Please choose leverage up to 1:${maxLeverage} for this account type.`);
        return;
      }

      const demoBalance =
        accountMode === 'demo'
          ? Number.parseFloat(data.balance || '')
          : undefined;

      if (accountMode === 'demo' && (!Number.isFinite(demoBalance) || (demoBalance ?? 0) <= 0)) {
        form.setError('balance', {
          type: 'manual',
          message: 'Enter a valid demo balance greater than 0.',
        });
        return;
      }

      const response = await userMT5AccountsApi.create(
        {
          account_type_id: selectedAccountType.id,
          account_mode: accountMode,
          ...(accountMode === 'demo' ? { balance: demoBalance } : {}),
          extra_fields: {},
          group_id: DEFAULT_GROUP_ID,
          investor_password: data.investorPassword,
          leverage,
          main_password: data.mainPassword,
        },
        token
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to create MT5 account');
      }

      setMt5RequestData(response.data);
      setIsSuccessDialogOpen(true);
      form.reset({
        accountType: '',
        balance: accountMode === 'demo' ? '10000' : '',
        leverage: '100',
        mainPassword: '',
        investorPassword: '',
      });
      toast.success(response.message || 'MT5 account created successfully!');
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error(getFriendlyErrorMessage(error, {
        audience: 'client',
        resource: 'MT5 account',
        action: 'create',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-full w-full bg-background p-4 lg:p-6 xl:p-8">
        <div className="mb-8 space-y-3">
          <Badge
            variant="outline"
            className="rounded-full border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-primary"
          >
            MT5 Account Opening
          </Badge>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-foreground">Open Trading Account</h1>
            <p className="max-w-3xl text-base text-muted-foreground">
              Create a live or demo MT5 account with a shorter setup flow, preset leverage options, and fixed USD demo funding.
            </p>
          </div>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[360px,minmax(0,1fr)]">
          <div className="space-y-6 xl:sticky xl:top-6">
            <Card className="overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
              {/* <CardContent className="space-y-6 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <Badge className="rounded-full bg-primary/15 text-primary hover:bg-primary/15">
                      MetaTrader 5
                    </Badge>
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground">Open Your MT5 Trading Account</h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Choose the MT5 account setup that matches your trading goals. You can open a live account to start trading or create a demo account to practice with virtual funds.
                      </p>
                    </div>
                  </div>
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-primary/20 bg-background/80 shadow-sm">
                    <Image
                      src="/metatrader-5.svg"
                      alt="MetaTrader 5"
                      width={72}
                      height={72}
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Star className="h-4 w-4 text-primary" />
                    Why traders use this setup
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm text-foreground">Clear MT5-only onboarding without extra platform choices</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm text-foreground">Preset leverage and balance selections for faster setup</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm text-foreground">Dedicated investor and main passwords for better access control</span>
                    </div>
                  </div>
                </div>
              </CardContent> */}
            </Card>
          </div>

          <Card className="border border-border/60 bg-card shadow-sm">
            <CardHeader className="space-y-4 border-b border-border/60 pb-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl font-bold text-foreground">
                    Account Details
                  </CardTitle>
                  <CardDescription className="max-w-2xl text-sm leading-6">
                    Choose the account structure, leverage, starting demo balance, and passwords for your new MT5 account.
                  </CardDescription>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(['live', 'demo'] as const).map((mode) => {
                    const isActive = accountMode === mode;
                    const Icon = mode === 'live' ? TrendingUp : Shield;

                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setAccountMode(mode)}
                        className={cn(
                          'rounded-2xl border px-4 py-4 text-left transition-all duration-200',
                          isActive
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'border-border/70 bg-background/70 hover:border-primary/40 hover:bg-primary/5'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'flex h-10 w-10 items-center justify-center rounded-xl',
                              isActive ? 'bg-white/15' : 'bg-primary/10 text-primary'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">
                              {mode === 'live' ? 'Live Account' : 'Demo Account'}
                            </div>
                            <div
                              className={cn(
                                'mt-1 text-xs leading-5',
                                isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                              )}
                            >
                              {mode === 'live'
                                ? 'Open a funded MT5 account for real trading.'
                                : 'Start with a fixed USD practice balance.'}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4 md:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Platform</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">MetaTrader 5</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Mode</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {accountMode === 'live' ? 'Live account setup' : 'Demo account setup'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Demo funding</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {accountMode === 'demo' ? 'USD preset dropdown enabled' : 'Only used for demo accounts'}
                  </div>
                </div>
              </div>
              {/* MT4 platform selector intentionally removed from active UI.
                  Restore the previous MT4 selector section here when MT4 account opening returns. */}
            </CardHeader>

            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)]">
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="accountType"
                        render={({ field }) => {
                          return (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold text-foreground">
                                Account Type
                              </FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value}
                                disabled={isLoadingAccountTypes || !!accountTypesError}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-14 w-full rounded-2xl border-border/70 bg-background/80 px-4">
                                    <SelectValue placeholder={
                                      isLoadingAccountTypes 
                                        ? "Loading account types..." 
                                        : accountTypesError 
                                        ? "Account types unavailable"
                                        : "Choose account type"
                                    } />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingAccountTypes ? (
                                    <div className="flex items-center justify-center py-4">
                                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                  ) : accountTypesError ? (
                                    <div className="px-2 py-4 text-center text-sm text-destructive">
                                      Unable to load account types
                                    </div>
                                  ) : accountTypes.length === 0 ? (
                                    <div className="py-4 text-center text-sm text-muted-foreground">
                                      No account types available
                                    </div>
                                  ) : (
                                    accountTypes.map((accountType) => (
                                      <SelectItem key={accountType.id} value={accountType.name} className="rounded-lg">
                                        {accountType.name}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              {accountTypesError ? (
                                <ApiErrorState
                                  error={accountTypesError}
                                  audience="client"
                                  resource="account types"
                                  action="load"
                                  variant="inline"
                                  className="mt-2"
                                  onRetry={fetchAccountTypes}
                                />
                              ) : null}
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      <div className={cn('grid gap-6', accountMode === 'demo' ? 'md:grid-cols-2' : 'md:grid-cols-1')}>
                        <FormField
                          control={form.control}
                          name="leverage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-semibold text-foreground">
                                Leverage
                              </FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                disabled={!selectedAccountType}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-14 w-full rounded-2xl border-border/70 bg-background/80 px-4">
                                    <SelectValue placeholder={selectedAccountType ? 'Choose leverage' : 'Choose an account type first'} />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {leverageOptions.map((option) => (
                                    <SelectItem key={option.value} value={String(option.value)} className="rounded-lg">
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {accountMode === 'demo' ? (
                          <FormField
                            control={form.control}
                            name="balance"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-semibold text-foreground">
                                  Initial Demo Balance (USD)
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-14 w-full rounded-2xl border-border/70 bg-background/80 px-4">
                                      <SelectValue placeholder="Choose deposit amount" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {DEMO_BALANCE_CHOICES.map((amount) => (
                                      <SelectItem key={amount} value={String(amount)}>
                                        {`USD ${amount.toLocaleString('en-US')}`}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-muted/30 to-background p-5">
                      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Zap className="h-4 w-4 text-primary" />
                        Setup Preview
                      </div>
                      {selectedAccountType ? (
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Selected type</div>
                            <div className="mt-2 text-lg font-semibold text-foreground">{selectedAccountType.name}</div>
                          </div>
                          <div className="grid gap-3 grid-cols-3">
                            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Spread</div>
                              <div className="mt-2 text-sm font-semibold text-foreground">{selectedAccountType.spread_from}</div>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Max leverage</div>
                              <div className="mt-2 text-sm font-semibold text-foreground">{selectedAccountType.maximum_leverage}</div>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Base currency</div>
                              <div className="mt-2 text-sm font-semibold text-foreground">{selectedAccountType.base_currency}</div>
                            </div>
                          </div>
                          <div className="grid gap-3 grid-cols-2">
                            <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Account mode</div>
                              <div className="mt-2 text-sm font-semibold text-foreground">
                                {accountMode === 'live' ? 'Live trading' : 'Demo trading'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-border bg-background/70 p-5 text-sm leading-6 text-muted-foreground">
                          Choose an account type to preview spread, leverage, and base currency here before submission.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="mainPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-foreground">
                            Main Password
                          </FormLabel>
                          <FormControl>
                            <PasswordInput
                              placeholder="Enter main password"
                              inputClassName="h-14 rounded-2xl border-border/70 bg-background/80 px-4"
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Use this password to log in and trade from MT5.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="investorPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-foreground">
                            Investor Password
                          </FormLabel>
                          <FormControl>
                            <PasswordInput
                              placeholder="Enter investor password"
                              inputClassName="h-14 rounded-2xl border-border/70 bg-background/80 px-4"
                              {...field}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Use this read-only password when you only want account viewing access.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-muted/30 to-muted/10 p-5">
                    <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Lock className="h-4 w-4" />
                      Password Requirements
                    </p>
                    <p className="mb-4 text-xs text-muted-foreground">
                      Main password and investor password should both satisfy these rules.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <div className={`flex items-center gap-2 ${pwLen ? 'text-primary' : 'text-muted-foreground'}`}>
                        <div className={`h-2 w-2 rounded-full ${pwLen ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                        <span className="text-xs">8+ characters</span>
                      </div>
                      <div className={`flex items-center gap-2 ${pwUpper ? 'text-primary' : 'text-muted-foreground'}`}>
                        <div className={`h-2 w-2 rounded-full ${pwUpper ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                        <span className="text-xs">Uppercase letter</span>
                      </div>
                      <div className={`flex items-center gap-2 ${pwLower ? 'text-primary' : 'text-muted-foreground'}`}>
                        <div className={`h-2 w-2 rounded-full ${pwLower ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                        <span className="text-xs">Lowercase letter</span>
                      </div>
                      <div className={`flex items-center gap-2 ${pwNum ? 'text-primary' : 'text-muted-foreground'}`}>
                        <div className={`h-2 w-2 rounded-full ${pwNum ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                        <span className="text-xs">Number</span>
                      </div>
                      <div className={`flex items-center gap-2 ${pwSpecial ? 'text-primary' : 'text-muted-foreground'}`}>
                        <div className={`h-2 w-2 rounded-full ${pwSpecial ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                        <span className="text-xs">Special character</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="h-14 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Open MT5 {accountMode === 'live' ? 'Live' : 'Demo'} Account
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Manage Accounts Section */}
        <Card className="mt-8 border border-border/60 bg-card shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md">
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    Manage Your Trading Accounts
                  </h3>
                  <p className="text-muted-foreground">
                    View, monitor, and manage all your trading accounts in one place
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="border-2 border-primary/30 text-foreground hover:bg-primary/10 hover:border-primary/50 rounded-xl px-6 py-3 font-semibold transition-all duration-200"
                asChild
              >
                <Link href="/my_accounts/manage-accounts">
                  Manage Accounts
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Dialog */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl border border-border/60 bg-card/95 shadow-xl sm:max-w-lg">
          <DialogHeader>
              <div className="mb-4 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-foreground">
                  Account Created Successfully!
                </DialogTitle>
                <DialogDescription className="text-base mt-2">
                  Your MT5 account has been created successfully!
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {mt5RequestData && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-muted-foreground">MT5 Login</span>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-mono font-semibold text-foreground">
                          {mt5RequestData.login}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 hover:bg-primary/10"
                          onClick={() => {
                            navigator.clipboard.writeText(String(mt5RequestData.login));
                            toast.success('MT5 login copied to clipboard!');
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0 p-4 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border">
                    <span className="text-sm font-medium text-muted-foreground">Account Holder</span>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {mt5RequestData.name}
                    </div>
                  </div>
                  <div className="min-w-0 p-4 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border">
                    <span className="text-sm font-medium text-muted-foreground">Server</span>
                    <div className="mt-1 break-words text-sm font-semibold text-foreground">
                      {mt5RequestData.server}
                    </div>
                  </div>
                  <div className="min-w-0 p-4 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border">
                    <span className="text-sm font-medium text-muted-foreground">Leverage</span>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      1:{mt5RequestData.leverage}
                    </div>
                  </div>
                  <div className="min-w-0 p-4 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border">
                    <span className="text-sm font-medium text-muted-foreground">Investor Password</span>
                    <div className="mt-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 flex-1 break-words text-sm font-mono font-semibold text-foreground">
                        {mt5RequestData.investor_password}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 hover:bg-primary/10"
                        onClick={() => {
                          navigator.clipboard.writeText(mt5RequestData.investor_password);
                          toast.success('Investor password copied to clipboard!');
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="min-w-0 p-4 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border sm:col-span-2">
                    <span className="text-sm font-medium text-muted-foreground">Main Password</span>
                    <div className="mt-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 flex-1 break-words text-sm font-mono font-semibold text-foreground">
                        {mt5RequestData.main_password}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 hover:bg-primary/10"
                        onClick={() => {
                          navigator.clipboard.writeText(mt5RequestData.main_password);
                          toast.success('Main password copied to clipboard!');
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5 border border-primary/20">
                    <span className="text-primary text-xs font-bold">i</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Next Steps
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Your MT5 credentials are ready. You can review the account in Manage Accounts and use the copied credentials to log in.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              className="w-full sm:flex-1"
              asChild
            >
              <Link href="/my_accounts/manage-accounts">
                Manage Accounts
              </Link>
            </Button>
            <Button 
              onClick={() => {
                setIsSuccessDialogOpen(false);
                setMt5RequestData(null);
              }}
              className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md sm:flex-1"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
