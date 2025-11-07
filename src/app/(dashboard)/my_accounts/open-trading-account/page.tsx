'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { 
  BarChart3, 
  ArrowRight, 
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
      <div className="min-h-full w-full p-4 lg:p-6 xl:p-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/my_accounts">My Accounts</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Create Account</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Open Trading Account</h1>
              <p className="text-muted-foreground mt-1">
                Create Live and Demo trading accounts in simple steps
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-[1fr,1fr]">
          {/* Left Side: Account Type and Platform Selection */}
          <div className="space-y-6">
            {/* Account Type Tabs */}
            <div>
              <Tabs value={accountMode} onValueChange={(value) => setAccountMode(value as 'live' | 'demo')}>
                <TabsList className="w-full">
                  <TabsTrigger value="live" className="flex-1">
                    Open Live Account
                  </TabsTrigger>
                  <TabsTrigger value="demo" className="flex-1">
                    Open Demo Account
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Platform Selection */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Select your trading platform</h2>
              <div className="grid gap-4">
                {/* MT4 Card */}
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedPlatform === 'mt4'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'bg-muted/30'
                  }`}
                  onClick={() => setSelectedPlatform('mt4')}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                          selectedPlatform === 'mt4' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          <span className="text-lg font-bold">4</span>
                        </div>
                        <div>
                          <h3 className="font-semibold">MetaTrader 4</h3>
                          <p className="text-sm text-muted-foreground">
                            Start with the most popular and reliable
                          </p>
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
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedPlatform === 'mt5'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'bg-muted/30'
                  }`}
                  onClick={() => setSelectedPlatform('mt5')}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                          selectedPlatform === 'mt5' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          <span className="text-lg font-bold">5</span>
                        </div>
                        <div>
                          <h3 className="font-semibold">MetaTrader 5</h3>
                          <p className="text-sm text-muted-foreground">
                            Experience the advanced trading platform
                          </p>
                        </div>
                      </div>
                      {selectedPlatform === 'mt5' && (
                        <ArrowRight className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Right Side: Account Details Form */}
          <div>
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
                        <FormLabel>Choose Account Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={isLoadingAccountTypes || !!accountTypesError}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
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
                                <SelectItem key={accountType.id} value={accountType.name}>
                                  {accountType.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        {accountTypesError && (
                          <div className="mt-2 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>{accountTypesError}</span>
                          </div>
                        )}
                        {selectedAccountType && (
                          <div className="mt-3 p-4 bg-muted/50 rounded-md space-y-2">
                            <div className="text-sm">
                              <span className="font-medium">Spread: </span>
                              <span className="text-muted-foreground">{selectedAccountType.spread_from}</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Maximum Leverage: </span>
                              <span className="text-muted-foreground">{selectedAccountType.maximum_leverage}</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">Base Currency: </span>
                              <span className="text-muted-foreground">{selectedAccountType.base_currency}</span>
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
                      <FormLabel>Choose Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose Currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="JPY">JPY</SelectItem>
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
                      <FormLabel>Choose Leverage</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose Leverage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1:50">1:50</SelectItem>
                          <SelectItem value="1:100">1:100</SelectItem>
                          <SelectItem value="1:200">1:200</SelectItem>
                          <SelectItem value="1:500">1:500</SelectItem>
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="Enter password"
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
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="Confirm password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password Requirements */}
                <div className="text-sm text-muted-foreground space-y-1 p-4 bg-muted/50 rounded-md">
                  <p className="font-medium mb-2">Password Requirements:</p>
                  <ul className="space-y-1">
                    <li className={pwLen ? 'text-green-600' : ''}>
                      • At least 8 characters long
                    </li>
                    <li className={pwUpper ? 'text-green-600' : ''}>
                      • One uppercase letter [A-Z]
                    </li>
                    <li className={pwLower ? 'text-green-600' : ''}>
                      • One lowercase letter [a-z]
                    </li>
                    <li className={pwNum ? 'text-green-600' : ''}>
                      • Numbers [0-9]
                    </li>
                    <li className={pwSpecial ? 'text-green-600' : ''}>
                      • Special characters e.g. [!@#$%^&*]
                    </li>
                  </ul>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    'Creating Account...'
                  ) : (
                    <>
                      Open {accountMode === 'live' ? 'Live' : 'Demo'} Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>

        {/* Divider with Plus Icon */}
        <div className="flex items-center justify-center my-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t"></div>
            </div>
            <div className="relative flex justify-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground">
                <Plus className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Manage Accounts Section */}
        <div className="flex items-center justify-between p-6 bg-muted/30 rounded-lg">
          <div>
            <h3 className="text-lg font-semibold mb-1">
              Manage and view all trading accounts
            </h3>
            <p className="text-sm text-muted-foreground">
              Here you can view and manage all your trading accounts
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/my_accounts/manage-accounts">
              Manage Accounts
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <DialogTitle>Account Request Created Successfully!</DialogTitle>
                <DialogDescription className="mt-1">
                  Your MT5 account request has been submitted and is pending approval.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {mt5RequestData && (
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <span className="text-sm font-medium text-muted-foreground">Request ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{mt5RequestData.request_id}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        navigator.clipboard.writeText(mt5RequestData.request_id);
                        toast.success('Request ID copied to clipboard!');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <span className="text-sm font-medium text-muted-foreground">Status:</span>
                  <span className={`text-sm font-semibold px-2 py-1 rounded ${
                    mt5RequestData.status === 'pending' 
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                      : mt5RequestData.status === 'approved'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                  }`}>
                    {mt5RequestData.status.charAt(0).toUpperCase() + mt5RequestData.status.slice(1)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <span className="text-sm font-medium text-muted-foreground">Created At:</span>
                  <span className="text-sm">
                    {new Date(mt5RequestData.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-md border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Next Steps:</strong> Your account request is being reviewed by our team. 
                  You will receive a notification once your account is approved and ready to use.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              onClick={() => {
                setIsSuccessDialogOpen(false);
                setMt5RequestData(null);
              }}
              className="w-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}

