'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import Image from 'next/image';
import { 
  BarChart3, 
  ArrowRight, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Shield,
  Zap,
  TrendingUp,
  Globe,
  Lock,
  CheckCircle,
  Star,
  Hash
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
import { tradingAccountSchema, type TradingAccountFormData } from '@/lib/validations';
import {
  accountTypesApi,
  type AccountType,
  userMT5AccountsApi,
  type UserMT5AccountCreateData,
} from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

const DEFAULT_GROUP_ID = 1;
const DEFAULT_INVESTOR_PASSWORD = 'OptionalInv@123';
const DEFAULT_EXTRA_FIELDS = '{}';

export default function OpenTradingAccountPage() {
  const { token } = useAuth();
  const [accountMode, setAccountMode] = useState<'live' | 'demo'>('live');
  const [selectedPlatform, setSelectedPlatform] = useState<'mt4' | 'mt5'>('mt5');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [isLoadingAccountTypes, setIsLoadingAccountTypes] = useState(true);
  const [accountTypesError, setAccountTypesError] = useState<string | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [mt5RequestData, setMt5RequestData] = useState<UserMT5AccountCreateData | null>(null);

  const form = useForm<TradingAccountFormData>({
    resolver: zodResolver(tradingAccountSchema),
    defaultValues: {
      accountType: '',
      groupId: String(DEFAULT_GROUP_ID),
      leverage: '100',
      mainPassword: '',
      investorPassword: DEFAULT_INVESTOR_PASSWORD,
      extraFields: DEFAULT_EXTRA_FIELDS,
    },
  });

  const mainPassword = form.watch('mainPassword') || '';
  const investorPassword = form.watch('investorPassword') || '';
  const activePassword = investorPassword.length > mainPassword.length ? investorPassword : mainPassword;
  const pwLen = activePassword.length >= 8;
  const pwUpper = /[A-Z]/.test(activePassword);
  const pwLower = /[a-z]/.test(activePassword);
  const pwNum = /\d/.test(activePassword);
  const pwSpecial = /[!@#$%^&*]/.test(activePassword);

  // Fetch account types for the MT5 account opening flow.
  useEffect(() => {
    const fetchAccountTypes = async () => {
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
          setAccountTypesError('Failed to load account types');
        }
      } catch (error) {
        console.error('Error fetching account types:', error);
        setAccountTypesError(error instanceof Error ? error.message : 'Failed to load account types');
      } finally {
        setIsLoadingAccountTypes(false);
      }
    };

    fetchAccountTypes();
  }, [token]);

  const onSubmit = async (data: TradingAccountFormData) => {
    if (!token) {
      toast.error('Authentication required');
      return;
    }

    if (selectedPlatform !== 'mt5') {
      toast.error('MT4 account opening is coming soon.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedAccountType = accountTypes.find((accountType) => accountType.name === data.accountType);

      if (!selectedAccountType) {
        throw new Error('Account type not found');
      }

      const leverageMatch = data.leverage.match(/^(\d+)$/);
      if (!leverageMatch) {
        throw new Error('Invalid leverage format');
      }

      const leverage = Number.parseInt(leverageMatch[1], 10);
      const extraFields = data.extraFields.trim() ? JSON.parse(data.extraFields) : {};
      const response = await userMT5AccountsApi.create(
        {
          account_type_id: selectedAccountType.id,
          extra_fields: extraFields,
          group_id: Number.parseInt(data.groupId, 10),
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
      form.reset();
      toast.success(response.message || 'MT5 account created successfully!');
    } catch (error) {
      console.error('Error creating account:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-full w-full p-4 lg:p-6 xl:p-8 bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header Section - Enhanced */}
        <div className="mb-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-foreground mb-1">
                Open Trading Account
              </h1>
              <p className="text-base text-muted-foreground max-w-2xl">
                Open a new MT5 trading account in a few steps. Both live and demo modes are available here, while MT4 remains unavailable.
              </p>
            </div>
          </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
          {/* Left Side: Account Type and Platform Selection */}
          <div className="space-y-6">
            {/* Account Type Tabs */}
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-background to-muted/30 group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <CardHeader className="relative z-10 pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  Account Type
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <Tabs value={accountMode} onValueChange={(value) => setAccountMode(value as 'live' | 'demo')}>
                  <TabsList className="w-full bg-muted/50 p-1 rounded-xl">
                    <TabsTrigger 
                      value="live" 
                      className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-purple-600 data-[state=active]:text-primary-foreground rounded-lg transition-all duration-200"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Live Account
                    </TabsTrigger>
                    <TabsTrigger 
                      value="demo" 
                      className="flex-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-purple-600 data-[state=active]:text-primary-foreground rounded-lg transition-all duration-200"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Demo Account
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <p className="mt-3 text-xs text-muted-foreground">
                  MT5 account creation is available for both live and demo selections. MT4 account opening is still coming soon.
                </p>
              </CardContent>
            </Card>

            {/* Platform Selection */}
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-background to-muted/30 group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <CardHeader className="relative z-10 pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  Trading Platform
                </CardTitle>
                <CardDescription>
                  Choose your preferred trading platform
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* MT4 Card */}
                  <Card
                    aria-disabled="true"
                    className="border-2 border-dashed border-border bg-muted/20 opacity-75"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-muted transition-all duration-300">
                            <div className="relative w-full h-full flex items-center justify-center p-2">
                              <Image
                                src="/metatrader-4.svg"
                                alt="MetaTrader 4"
                                width={80}
                                height={80}
                                className="object-contain w-full h-full"
                                priority
                              />
                            </div>
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-foreground">MetaTrader 4</h3>
                            <p className="text-sm text-muted-foreground">
                              Industry standard platform. Account opening is coming soon.
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                Coming Soon
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* MT5 Card */}
                  <Card
                    className={`cursor-pointer transition-all duration-300 border-2 ${
                      selectedPlatform === 'mt5'
                        ? 'border-primary bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent shadow-lg scale-105'
                        : 'border-border bg-muted/30 hover:border-primary/30'
                    }`}
                    onClick={() => setSelectedPlatform('mt5')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`relative flex items-center justify-center w-20 h-20 rounded-2xl transition-all duration-300 ${
                            selectedPlatform === 'mt5' 
                              ? 'bg-gradient-to-r from-primary to-purple-600 shadow-lg' 
                              : 'bg-muted'
                          }`}>
                            <div className="relative w-full h-full flex items-center justify-center p-2">
                              <Image
                                src="/metatrader-5.svg"
                                alt="MetaTrader 5"
                                width={80}
                                height={80}
                                className="object-contain w-full h-full"
                                priority
                              />
                            </div>
                            {selectedPlatform === 'mt5' && (
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full border-2 border-background flex items-center justify-center z-10">
                                <CheckCircle className="h-4 w-4 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-foreground">MetaTrader 5</h3>
                            <p className="text-sm text-muted-foreground">
                              Next-gen platform with more features
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                Advanced
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Multi-asset
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {selectedPlatform === 'mt5' && (
                          <ArrowRight className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Features Card */}
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <CardHeader className="relative z-10">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
                    <Star className="h-4 w-4 text-primary" />
                  </div>
                  Why Trade With Us?
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">Regulated & Secure Trading</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">24/7 Customer Support</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                      <CheckCircle className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">Fast Execution & Low Spreads</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Side: Account Details Form */}
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-background to-muted/30 group sticky top-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <CardHeader className="relative z-10 pb-4">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Account Details
              </CardTitle>
              <CardDescription>
                Configure the fields required by the MT5 account creation API
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-purple-500/5 to-transparent p-4 text-sm text-muted-foreground">
                    This form now maps directly to the MT5 request body: account type, group ID, leverage, main password, investor password, and extra fields.
                  </div>

                  {/* Account Type */}
                  <FormField
                    control={form.control}
                    name="accountType"
                    render={({ field }) => {
                      const selectedAccountType = accountTypes.find(
                        (at) => at.name === field.value
                      );
                      
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
                              <SelectTrigger className="w-full h-12 border-2 border-border focus:border-primary rounded-xl">
                                <SelectValue placeholder={
                                  isLoadingAccountTypes 
                                    ? "Loading account types..." 
                                    : accountTypesError 
                                    ? "Error loading account types"
                                    : "Choose Account Type"
                                } />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isLoadingAccountTypes ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                              ) : accountTypesError ? (
                                <div className="py-4 px-2 text-center text-sm text-destructive">
                                  {accountTypesError}
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
                          {accountTypesError && (
                            <div className="mt-2 flex items-center gap-2 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                              <AlertCircle className="h-4 w-4 flex-shrink-0" />
                              <span>{accountTypesError}</span>
                            </div>
                          )}
                          {selectedAccountType && (
                            <div className="mt-3 p-4 bg-gradient-to-br from-primary/5 via-purple-500/5 to-transparent rounded-xl border border-primary/20 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Spread:</span>
                                <Badge variant="secondary">
                                  {selectedAccountType.spread_from}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Max Leverage:</span>
                                <Badge variant="secondary">
                                  {selectedAccountType.maximum_leverage}
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-muted-foreground">Base Currency:</span>
                                <Badge variant="secondary">
                                  {selectedAccountType.base_currency}
                                </Badge>
                              </div>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  {/* Group ID */}
                  <FormField
                    control={form.control}
                    name="groupId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-foreground">
                          Group ID
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="Enter group ID"
                            className="h-12 border-2 border-border focus:border-primary rounded-xl"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Sent as `group_id` in the request body.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Leverage */}
                  <FormField
                    control={form.control}
                    name="leverage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-foreground">
                          Leverage
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full h-12 border-2 border-border focus:border-primary rounded-xl">
                              <SelectValue placeholder="Choose Leverage" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="50" className="rounded-lg">1:50 (Conservative)</SelectItem>
                            <SelectItem value="100" className="rounded-lg">1:100 (Standard)</SelectItem>
                            <SelectItem value="200" className="rounded-lg">1:200 (Aggressive)</SelectItem>
                            <SelectItem value="500" className="rounded-lg">1:500 (Professional)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Sent as the numeric `leverage` value, for example `100`.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Main Password */}
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
                            inputClassName="h-12 border-2 border-border focus:border-primary rounded-xl"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          This field maps to `main_password`.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Investor Password */}
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
                            inputClassName="h-12 border-2 border-border focus:border-primary rounded-xl"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          This field maps to `investor_password`.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Extra Fields */}
                  <FormField
                    control={form.control}
                    name="extraFields"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-foreground">
                          Extra Fields
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            rows={4}
                            placeholder="{}"
                            className="resize-none rounded-xl border-2 border-border focus:border-primary"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Provide a JSON object. Keep `{}` if no extra fields are required.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password Requirements */}
                  <div className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl p-4 border border-border">
                    <p className="font-semibold text-sm mb-3 flex items-center gap-2 text-foreground">
                      <Lock className="h-4 w-4" />
                      Password Requirements:
                    </p>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Main password and investor password should both satisfy these rules.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`flex items-center gap-2 ${pwLen ? 'text-primary' : 'text-muted-foreground'}`}>
                        <div className={`w-2 h-2 rounded-full ${pwLen ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                        <span>8+ characters</span>
                      </div>
                      <div className={`flex items-center gap-2 ${pwUpper ? 'text-primary' : 'text-muted-foreground'}`}>
                        <div className={`w-2 h-2 rounded-full ${pwUpper ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                        <span>Uppercase letter</span>
                      </div>
                      <div className={`flex items-center gap-2 ${pwLower ? 'text-primary' : 'text-muted-foreground'}`}>
                        <div className={`w-2 h-2 rounded-full ${pwLower ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                        <span>Lowercase letter</span>
                      </div>
                      <div className={`flex items-center gap-2 ${pwNum ? 'text-primary' : 'text-muted-foreground'}`}>
                        <div className={`w-2 h-2 rounded-full ${pwNum ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                        <span>Number</span>
                      </div>
                      <div className={`flex items-center gap-2 ${pwSpecial ? 'text-primary' : 'text-muted-foreground'}`}>
                        <div className={`w-2 h-2 rounded-full ${pwSpecial ? 'bg-primary' : 'bg-muted-foreground/30'}`}></div>
                        <span>Special character</span>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
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
        <Card className="mt-8 relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl opacity-50 group-hover:opacity-75 transition-opacity" />
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-primary to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="h-6 w-6 text-primary-foreground" />
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
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto border-0 shadow-2xl bg-card/95 backdrop-blur-sm rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
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
                <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-purple-500/5 to-transparent p-4">
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
                    <span className="text-sm font-medium text-muted-foreground">Group</span>
                    <div className="mt-1 break-words text-sm font-semibold text-foreground">
                      {mt5RequestData.group}
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
              
              <div className="p-4 bg-gradient-to-br from-primary/5 via-purple-500/5 to-transparent rounded-xl border border-primary/20">
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
              className="h-12 w-full sm:flex-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
