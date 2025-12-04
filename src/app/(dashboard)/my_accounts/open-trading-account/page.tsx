'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import Image from 'next/image';
import { 
  BarChart3, 
  ArrowRight, 
  Plus,
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { tradingAccountSchema, type TradingAccountFormData } from '@/lib/validations';
import { accountTypesApi, type AccountType, mt5RequestApi, type MT5RequestResponse } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

export default function OpenTradingAccountPage() {
  const { token } = useAuth();
  const [accountMode, setAccountMode] = useState<'live' | 'demo'>('live');
  const [selectedPlatform, setSelectedPlatform] = useState<'mt4' | 'mt5'>('mt5');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [isLoadingAccountTypes, setIsLoadingAccountTypes] = useState(true);
  const [accountTypesError, setAccountTypesError] = useState<string | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [mt5RequestData, setMt5RequestData] = useState<MT5RequestResponse | null>(null);

  const form = useForm<TradingAccountFormData>({
    resolver: zodResolver(tradingAccountSchema),
    defaultValues: {
      accountType: '',
      currency: '',
      leverage: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = form.watch('password') || '';
  const pwLen = password.length >= 8;
  const pwUpper = /[A-Z]/.test(password);
  const pwLower = /[a-z]/.test(password);
  const pwNum = /\d/.test(password);
  const pwSpecial = /[!@#$%^&*]/.test(password);

  // Fetch account types on component mount and when account mode changes
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
        // Reset form when mode changes
        form.resetField('accountType');
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
  }, [token, accountMode]);

  const onSubmit = async (data: TradingAccountFormData) => {
    if (!token) {
      console.error('Authentication required');
      return;
    }

    setIsSubmitting(true);
    try {
      // If it's a live MT5 account, call the MT5 request API
      if (accountMode === 'live' && selectedPlatform === 'mt5') {
        // Find the selected account type to get its ID
        const selectedAccountType = accountTypes.find(
          (at) => at.name === data.accountType
        );

        if (!selectedAccountType) {
          throw new Error('Account type not found');
        }

        // Parse leverage from "1:50" format to just the number (50)
        const leverageMatch = data.leverage.match(/^1:(\d+)$/);
        if (!leverageMatch) {
          throw new Error('Invalid leverage format');
        }
        const leverageTemp = parseInt(leverageMatch[1], 10);

        // Prepare the request data
        const mt5RequestData = {
          account_type_id: selectedAccountType.id,
          leverage_temp: leverageTemp,
          currency: data.currency,
          swap_free: false, // Default to false, can be made configurable if needed
          password: data.password,
          confirm_password: data.confirmPassword,
        };

        // Call the API
        const response = await mt5RequestApi.create(mt5RequestData, token);

        if (response.success && response.data) {
          // Store the request data and show success dialog
          setMt5RequestData({
            request_id: response.data.request_id,
            status: response.data.status,
            created_at: response.data.created_at,
          });
          setIsSuccessDialogOpen(true);
          // Reset form on success
          form.reset();
          toast.success(response.message || 'MT5 account request created successfully!');
        } else {
          throw new Error(response.message || 'Failed to create MT5 account request');
        }
      } else {
        // TODO: Implement API calls for other account types (MT4, Demo, etc.)
        console.log('Form data:', {
          ...data,
          accountMode,
          platform: selectedPlatform,
        });
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
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
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5 rounded-2xl blur-3xl -z-10" />
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 rounded-2xl blur opacity-75"></div>
                <div className="relative flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg">
                  <BarChart3 className="h-8 w-8" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
                  Open Trading Account
                </h1>
                <p className="text-lg text-muted-foreground">
                  Create Live and Demo trading accounts in simple steps
                </p>
              </div>
            </div>
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
                    className={`cursor-pointer transition-all duration-300 border-2 ${
                      selectedPlatform === 'mt4'
                        ? 'border-primary bg-gradient-to-br from-primary/10 via-purple-500/5 to-transparent shadow-lg scale-105'
                        : 'border-border bg-muted/30 hover:border-primary/30'
                    }`}
                    onClick={() => setSelectedPlatform('mt4')}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`relative flex items-center justify-center w-20 h-20 rounded-2xl transition-all duration-300 ${
                            selectedPlatform === 'mt4' 
                              ? 'bg-gradient-to-r from-primary to-purple-600 shadow-lg' 
                              : 'bg-muted'
                          }`}>
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
                            {selectedPlatform === 'mt4' && (
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full border-2 border-background flex items-center justify-center z-10">
                                <CheckCircle className="h-4 w-4 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-foreground">MetaTrader 4</h3>
                            <p className="text-sm text-muted-foreground">
                              Industry standard with advanced tools
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                Popular
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Stable
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {selectedPlatform === 'mt4' && (
                          <ArrowRight className="h-5 w-5 text-primary" />
                        )}
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
                Configure your trading account settings
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

                  {/* Currency */}
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-foreground">
                          Currency
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-full h-12 border-2 border-border focus:border-primary rounded-xl">
                              <SelectValue placeholder="Choose Currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="USD" className="rounded-lg">🇺🇸 USD</SelectItem>
                            <SelectItem value="EUR" className="rounded-lg">🇪🇺 EUR</SelectItem>
                            <SelectItem value="GBP" className="rounded-lg">🇬🇧 GBP</SelectItem>
                            <SelectItem value="JPY" className="rounded-lg">🇯🇵 JPY</SelectItem>
                          </SelectContent>
                        </Select>
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
                            <SelectItem value="1:50" className="rounded-lg">1:50 (Conservative)</SelectItem>
                            <SelectItem value="1:100" className="rounded-lg">1:100 (Standard)</SelectItem>
                            <SelectItem value="1:200" className="rounded-lg">1:200 (Aggressive)</SelectItem>
                            <SelectItem value="1:500" className="rounded-lg">1:500 (Professional)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-foreground">
                          Trading Password
                        </FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="Enter trading password"
                            inputClassName="h-12 border-2 border-border focus:border-primary rounded-xl"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Confirm Password */}
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-foreground">
                          Confirm Password
                        </FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="Confirm trading password"
                            inputClassName="h-12 border-2 border-border focus:border-primary rounded-xl"
                            {...field}
                          />
                        </FormControl>
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
                        Open {accountMode === 'live' ? 'Live' : 'Demo'} Account
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
        <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-card/95 backdrop-blur-sm rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-foreground">
                  Account Request Created!
                </DialogTitle>
                <DialogDescription className="text-base mt-2">
                  Your MT5 account request has been submitted and is pending approval.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {mt5RequestData && (
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-primary/5 via-purple-500/5 to-transparent rounded-xl border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Request ID</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-semibold text-foreground">{mt5RequestData.request_id}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-primary/10"
                          onClick={() => {
                            navigator.clipboard.writeText(mt5RequestData.request_id);
                            toast.success('Request ID copied to clipboard!');
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-primary/5 via-purple-500/5 to-transparent rounded-xl border border-primary/20">
                    <span className="text-sm font-medium text-muted-foreground">Status</span>
                    <div className="mt-1">
                      <Badge className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                        mt5RequestData.status === 'pending' 
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : mt5RequestData.status === 'approved'
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {mt5RequestData.status.charAt(0).toUpperCase() + mt5RequestData.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border">
                    <span className="text-sm font-medium text-muted-foreground">Created</span>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {new Date(mt5RequestData.created_at).toLocaleDateString()}
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
                      Your account request is being reviewed. You&apos;ll receive a notification once approved and ready to use.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              onClick={() => {
                setIsSuccessDialogOpen(false);
                setMt5RequestData(null);
              }}
              className="w-full h-12 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-primary-foreground rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
