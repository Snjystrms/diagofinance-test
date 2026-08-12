'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  Hash,
  Loader2,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PasswordInput } from '@/components/password-input';
import { useAuth } from '@/contexts/auth-context';
import { userMT5AccountsApi, type AccountType, type UserMT5AccountCreateData } from '@/lib/api';
import { getFriendlyErrorMessage } from '@/lib/friendly-errors';

const LEVERAGE_CHOICES = [
  { value: 50, label: '1:50' },
  { value: 100, label: '1:100' },
  { value: 200, label: '1:200' },
  { value: 500, label: '1:500' },
  { value: 1000, label: '1:1000' },
  { value: 2000, label: '1:2000' },
] as const;

const DEMO_BALANCE_CHOICES = [1000, 2500, 5000, 10000, 100000] as const;

const accountCreationSchema = z.object({
  balance: z.string().optional(),
  leverage: z.string().min(1, 'Leverage is required'),
  mainPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/\d/, 'Password must contain number')
    .regex(/[!@#$%^&*]/, 'Password must contain special character'),
  investorPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/\d/, 'Password must contain number')
    .regex(/[!@#$%^&*]/, 'Password must contain special character'),
});

type AccountCreationFormData = z.infer<typeof accountCreationSchema>;

type AccountCreationDialogProps = {
  accountType: AccountType;
  mode: 'live' | 'demo';
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const getMaximumLeverageValue = (accountType: AccountType) => {
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

const isCentAccountType = (accountType: AccountType) => {
  return [accountType.name, accountType.groups?.live?.name, accountType.groups?.demo?.name].some((name) => {
    const normalizedName = name?.trim().toUpperCase();
    return normalizedName === 'CENT' || normalizedName === 'DEMO CENT';
  });
};

export function AccountCreationDialog({
  accountType,
  mode,
  open,
  onOpenChange,
}: AccountCreationDialogProps) {
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [mt5RequestData, setMt5RequestData] = useState<UserMT5AccountCreateData | null>(null);

  const form = useForm<AccountCreationFormData>({
    resolver: zodResolver(accountCreationSchema),
    defaultValues: {
      balance: mode === 'demo' ? '10000' : '',
      leverage: '100',
      mainPassword: '',
      investorPassword: '',
    },
  });

  const maxLeverage = getMaximumLeverageValue(accountType);
  let leverageOptions: Array<{ value: number; label: string }> = maxLeverage
    ? LEVERAGE_CHOICES.filter((option) => option.value <= maxLeverage)
    : [...LEVERAGE_CHOICES];

  if (leverageOptions.length > 0 && maxLeverage && !leverageOptions.some(o => o.value === maxLeverage)) {
    leverageOptions = [...leverageOptions, { value: maxLeverage, label: `1:${maxLeverage}` }];
  }

  const demoBalanceCurrency = isCentAccountType(accountType) ? 'USC' : 'USD';

  const mainPassword = form.watch('mainPassword') || '';
  const investorPassword = form.watch('investorPassword') || '';
  const activePassword = investorPassword.length > mainPassword.length ? investorPassword : mainPassword;
  const pwLen = activePassword.length >= 8;
  const pwUpper = /[A-Z]/.test(activePassword);
  const pwLower = /[a-z]/.test(activePassword);
  const pwNum = /\d/.test(activePassword);
  const pwSpecial = /[!@#$%^&*]/.test(activePassword);

  const onSubmit = async (data: AccountCreationFormData) => {
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    setIsSubmitting(true);
    try {
      const leverage = Number.parseInt(data.leverage, 10);
      if (maxLeverage && leverage > maxLeverage) {
        toast.error(`Please choose leverage up to 1:${maxLeverage} for this account type.`);
        return;
      }

      const demoBalance =
        mode === 'demo' ? Number.parseFloat(data.balance || '') : undefined;

      if (mode === 'demo' && (!Number.isFinite(demoBalance) || (demoBalance ?? 0) <= 0)) {
        form.setError('balance', {
          type: 'manual',
          message: 'Enter a valid demo balance greater than 0.',
        });
        return;
      }

      const response = await userMT5AccountsApi.create(
        {
          account_type_id: accountType.id,
          mode,
          ...(mode === 'demo' ? { balance: demoBalance } : {}),
          leverage,
          extra_fields: {},
          main_password: data.mainPassword,
          confirm_password: data.mainPassword,
          investor_password: data.investorPassword,
        },
        token
      );

      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to create MT5 account');
      }

      setMt5RequestData(response.data);
      setIsSuccessDialogOpen(true);
      onOpenChange(false);
      form.reset({
        balance: mode === 'demo' ? '10000' : '',
        leverage: '100',
        mainPassword: '',
        investorPassword: '',
      });
      toast.success(response.message || 'MT5 account created successfully!');
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error(
        getFriendlyErrorMessage(error, {
          audience: 'client',
          resource: 'MT5 account',
          action: 'create',
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Account Creation Form Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Create {mode === 'live' ? 'Live' : 'Demo'} Account
            </DialogTitle>
            <DialogDescription>
              Configure your {accountType.name} account settings
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Leverage Field */}
              <FormField
                control={form.control}
                name="leverage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Leverage</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Choose leverage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {leverageOptions.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Demo Balance Field */}
              {mode === 'demo' && (
                <FormField
                  control={form.control}
                  name="balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">
                        Initial Demo Balance ({demoBalanceCurrency})
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="Choose balance" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEMO_BALANCE_CHOICES.map((amount) => (
                            <SelectItem key={amount} value={String(amount)}>
                              {amount.toLocaleString('en-US')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Main Password Field */}
              <FormField
                control={form.control}
                name="mainPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Main Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="Enter main password"
                        inputClassName="h-12 rounded-xl"
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

              {/* Investor Password Field */}
              <FormField
                control={form.control}
                name="investorPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Investor Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="Enter investor password"
                        inputClassName="h-12 rounded-xl"
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Use this read-only password for viewing access only.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password Requirements */}
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Lock className="h-4 w-4" />
                  Password Requirements
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className={`flex items-center gap-2 text-xs ${pwLen ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`h-2 w-2 rounded-full ${pwLen ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    8+ characters
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${pwUpper ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`h-2 w-2 rounded-full ${pwUpper ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    Uppercase letter
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${pwLower ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`h-2 w-2 rounded-full ${pwLower ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    Lowercase letter
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${pwNum ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`h-2 w-2 rounded-full ${pwNum ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    Number
                  </div>
                  <div className={`flex items-center gap-2 text-xs ${pwSpecial ? 'text-primary' : 'text-muted-foreground'}`}>
                    <div className={`h-2 w-2 rounded-full ${pwSpecial ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    Special character
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="h-12 w-full rounded-xl cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create {mode === 'live' ? 'Live' : 'Demo'} Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">
                  Account Created Successfully!
                </DialogTitle>
                <DialogDescription className="mt-2 text-base">
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-muted-foreground">MT5 Login</span>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate font-mono text-sm font-semibold">
                          {mt5RequestData.login}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(String(mt5RequestData.login));
                            toast.success('MT5 login copied!');
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="min-w-0 rounded-xl border border-border bg-muted/20 p-4">
                    <span className="text-sm font-medium text-muted-foreground">Account Holder</span>
                    <div className="mt-1 text-sm font-semibold">{mt5RequestData.name}</div>
                  </div>
                  <div className="min-w-0 rounded-xl border border-border bg-muted/20 p-4">
                    <span className="text-sm font-medium text-muted-foreground">Server</span>
                    <div className="mt-1 break-words text-sm font-semibold">{mt5RequestData.server}</div>
                  </div>
                  <div className="min-w-0 rounded-xl border border-border bg-muted/20 p-4">
                    <span className="text-sm font-medium text-muted-foreground">Leverage</span>
                    <div className="mt-1 text-sm font-semibold">1:{mt5RequestData.leverage}</div>
                  </div>
                  <div className="min-w-0 rounded-xl border border-border bg-muted/20 p-4">
                    <span className="text-sm font-medium text-muted-foreground">Account Mode</span>
                    <div className="mt-1 text-sm font-semibold">{mt5RequestData.account_mode}</div>
                  </div>
                  <div className="min-w-0 rounded-xl border border-border bg-muted/20 p-4">
                    <span className="text-sm font-medium text-muted-foreground">Investor Password</span>
                    <div className="mt-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 flex-1 break-words font-mono text-sm font-semibold">
                        {mt5RequestData.investor_password}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(mt5RequestData.investor_password);
                          toast.success('Investor password copied!');
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="min-w-0 rounded-xl border border-border bg-muted/20 p-4">
                    <span className="text-sm font-medium text-muted-foreground">Main Password</span>
                    <div className="mt-1 flex items-start justify-between gap-2">
                      <span className="min-w-0 flex-1 break-words font-mono text-sm font-semibold">
                        {mt5RequestData.main_password}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(mt5RequestData.main_password);
                          toast.success('Main password copied!');
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
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                    <span className="text-xs font-bold text-primary">i</span>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium">Next Steps</p>
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
              onClick={() => {
                setIsSuccessDialogOpen(false);
                setMt5RequestData(null);
              }}
              className="h-12 w-full rounded-xl sm:flex-1"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
