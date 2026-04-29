'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSearchParams } from 'next/navigation'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Repeat, Wallet, ArrowLeftRight } from 'lucide-react'

import { ApiErrorState } from '@/components/errors/api-error-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

import {
  internalTransferApi,
  mt5AccountsApi,
  walletApi,
  type MT5Account,
  type WalletSummaryData,
} from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { getFriendlyErrorMessage } from '@/lib/friendly-errors'
import { useAuth } from '@/contexts/auth-context'
import { notifyWalletRefresh } from '@/lib/client-events'

const amountFieldSchema = z
  .string()
  .min(1, 'Amount is required')
  .refine((value) => {
    const num = Number(value)
    return !Number.isNaN(num) && num > 0
  }, 'Amount must be a positive number')

const remarksSchema = z.string().optional()

const mt5ToMt5Schema = z
  .object({
    fromAccountId: z.string().min(1, 'Select an MT5 account'),
    toAccountId: z.string().min(1, 'Select an MT5 account'),
    amount: amountFieldSchema,
    remarks: remarksSchema,
  })
  .refine((values) => values.fromAccountId !== values.toAccountId, {
    message: 'From and To accounts must be different',
    path: ['toAccountId'],
  })

const walletToWalletSchema = z
  .object({
    fromWalletType: z.string().min(1, 'Select a source wallet'),
    toWalletType: z.string().min(1, 'Select a destination wallet'),
    amount: amountFieldSchema,
    remarks: remarksSchema,
  })
  .refine((values) => values.fromWalletType !== values.toWalletType, {
    message: 'From and To wallets must be different',
    path: ['toWalletType'],
  })

const walletToMt5Schema = z.object({
  fromWalletType: z.string().min(1, 'Select a wallet'),
  toAccountId: z.string().min(1, 'Select an MT5 account'),
  amount: amountFieldSchema,
  remarks: remarksSchema,
})

const mt5ToWalletSchema = z.object({
  fromAccountId: z.string().min(1, 'Select an MT5 account'),
  toWalletType: z.string().min(1, 'Select a wallet'),
  amount: amountFieldSchema,
  remarks: remarksSchema,
})

type Mt5ToMt5FormValues = z.infer<typeof mt5ToMt5Schema>
type WalletToWalletFormValues = z.infer<typeof walletToWalletSchema>
type WalletToMt5FormValues = z.infer<typeof walletToMt5Schema>
type Mt5ToWalletFormValues = z.infer<typeof mt5ToWalletSchema>

type WalletOption = {
  value: string
  label: string
  balance: number
  currency: string
  isPrimary: boolean
}

type TransferTab = 'wallet-to-wallet' | 'wallet-to-mt5' | 'mt5-to-wallet' | 'mt5-to-mt5'

function sanitizeComment(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function formatWalletLabel(walletKey: string) {
  return walletKey
    .split(/[_-\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function InternalTransferContent() {
  const { token, user } = useAuth()
  const searchParams = useSearchParams()
  const [mt5Accounts, setMt5Accounts] = useState<MT5Account[]>([])
  const [walletSummary, setWalletSummary] = useState<WalletSummaryData | null>(null)
  const [isLoadingResources, setIsLoadingResources] = useState(false)
  const [walletError, setWalletError] = useState<unknown | null>(null)
  const [accountsError, setAccountsError] = useState<unknown | null>(null)
  const [activeTab, setActiveTab] = useState<TransferTab>('wallet-to-wallet')

  const mt5ToMt5Form = useForm<Mt5ToMt5FormValues>({
    resolver: zodResolver(mt5ToMt5Schema),
    defaultValues: {
      fromAccountId: '',
      toAccountId: '',
      amount: '',
      remarks: '',
    },
  })

  const walletToWalletForm = useForm<WalletToWalletFormValues>({
    resolver: zodResolver(walletToWalletSchema),
    defaultValues: {
      fromWalletType: 'main',
      toWalletType: '',
      amount: '',
      remarks: '',
    },
  })

  const walletToMt5Form = useForm<WalletToMt5FormValues>({
    resolver: zodResolver(walletToMt5Schema),
    defaultValues: {
      fromWalletType: 'main',
      toAccountId: '',
      amount: '',
      remarks: '',
    },
  })

  const mt5ToWalletForm = useForm<Mt5ToWalletFormValues>({
    resolver: zodResolver(mt5ToWalletSchema),
    defaultValues: {
      fromAccountId: '',
      toWalletType: 'main',
      amount: '',
      remarks: '',
    },
  })

  const loadTransferResources = useCallback(async () => {
    if (!token) {
      return
    }

    setIsLoadingResources(true)
    setWalletError(null)
    setAccountsError(null)

    const [walletResult, accountsResult] = await Promise.allSettled([
      walletApi.getSummary(token),
      mt5AccountsApi.getAll(token),
    ])

    if (walletResult.status === 'fulfilled') {
      const response = walletResult.value
      if (response.success && response.data) {
        setWalletSummary(response.data)
      } else {
        setWalletSummary(null)
        setWalletError(response.message || 'Unable to load wallet summary')
      }
    } else {
      console.error('Failed to load wallet summary', walletResult.reason)
      setWalletSummary(null)
      setWalletError(walletResult.reason)
    }

    if (accountsResult.status === 'fulfilled') {
      const response = accountsResult.value
      if (response.success && response.data?.mt5_accounts) {
        setMt5Accounts(response.data.mt5_accounts)
      } else {
        setMt5Accounts([])
        setAccountsError('Unable to load MT5 accounts')
      }
    } else {
      console.error('Failed to load MT5 accounts', accountsResult.reason)
      setMt5Accounts([])
      setAccountsError(accountsResult.reason)
    }

    setIsLoadingResources(false)
  }, [token])

  useEffect(() => {
    void loadTransferResources()
  }, [loadTransferResources])

  const mt5AccountOptions = useMemo(() => mt5Accounts.map((account) => ({
      id: account.account_id,
      label: `${account.account_id} • ${formatCurrency(account.balance)}`,
    })), [mt5Accounts])

  const walletOptions = useMemo<WalletOption[]>(() => {
    if (!walletSummary?.wallets) {
      return []
    }

    return Object.entries(walletSummary.wallets).map(([walletKey, wallet]) => ({
      value: walletKey,
      label: formatWalletLabel(walletKey),
      balance: Number(wallet.balance ?? 0),
      currency: wallet.currency || 'USD',
      isPrimary: Boolean(wallet.is_primary),
    }))
  }, [walletSummary])

  const defaultWalletValue = useMemo(() => {
    if (walletOptions.length === 0) {
      return 'main'
    }

    return (
      walletOptions.find((wallet) => wallet.isPrimary)?.value ||
      walletOptions.find((wallet) => wallet.value.toLowerCase() === 'main')?.value ||
      walletOptions[0]?.value ||
      'main'
    )
  }, [walletOptions])

  const secondaryWalletValue = useMemo(
    () => walletOptions.find((wallet) => wallet.value !== defaultWalletValue)?.value || defaultWalletValue,
    [defaultWalletValue, walletOptions]
  )
  const requestedTab = searchParams.get('tab')
  const requestedAccountId = searchParams.get('accountId')

  useEffect(() => {
    if (!defaultWalletValue) {
      return
    }

    if (!walletToWalletForm.getValues('fromWalletType')) {
      walletToWalletForm.setValue('fromWalletType', defaultWalletValue)
    }
    if (!walletToWalletForm.getValues('toWalletType')) {
      walletToWalletForm.setValue('toWalletType', secondaryWalletValue)
    }
    if (!walletToMt5Form.getValues('fromWalletType')) {
      walletToMt5Form.setValue('fromWalletType', defaultWalletValue)
    }
    if (!mt5ToWalletForm.getValues('toWalletType')) {
      mt5ToWalletForm.setValue('toWalletType', defaultWalletValue)
    }
  }, [
    defaultWalletValue,
    mt5ToWalletForm,
    secondaryWalletValue,
    walletToMt5Form,
    walletToWalletForm,
  ])

  useEffect(() => {
    const validTabs: TransferTab[] = ['wallet-to-wallet', 'wallet-to-mt5', 'mt5-to-wallet', 'mt5-to-mt5']
    if (requestedTab && validTabs.includes(requestedTab as TransferTab)) {
      setActiveTab(requestedTab as TransferTab)
    }
  }, [requestedTab])

  useEffect(() => {
    if (!requestedAccountId || mt5Accounts.length === 0) {
      return
    }

    const matchedAccount = mt5Accounts.find((account) => account.account_id === requestedAccountId)
    if (!matchedAccount) {
      return
    }

    walletToMt5Form.setValue('toAccountId', matchedAccount.account_id, {
      shouldDirty: false,
      shouldValidate: true,
    })
  }, [mt5Accounts, requestedAccountId, walletToMt5Form])

  const mainWallet = useMemo(
    () => walletOptions.find((wallet) => wallet.value === defaultWalletValue) || walletOptions[0] || null,
    [defaultWalletValue, walletOptions]
  )

  const handleMt5ToMt5Submit = async (values: Mt5ToMt5FormValues) => {
    if (!token || !user?.id) {
      toast.error('Authentication required')
      return
    }

    try {
      const payload = {
        from_mt5_account_id: values.fromAccountId,
        to_mt5_account_id: values.toAccountId,
        amount: Number(values.amount),
        comment: sanitizeComment(values.remarks),
        from_mt5_user_id: String(user.id),
        to_mt5_user_id: String(user.id),
      }

      const response = await internalTransferApi.mt5ToMt5(payload, token)
      if (response.success) {
        toast.success(response.message || 'Transfer completed successfully')
        await loadTransferResources()
        notifyWalletRefresh()
        mt5ToMt5Form.reset({
          fromAccountId: values.fromAccountId,
          toAccountId: values.toAccountId,
          amount: '',
          remarks: '',
        })
      }
    } catch (error) {
      console.error('MT5 to MT5 transfer failed', error)
      toast.error(getFriendlyErrorMessage(error, {
        audience: 'client',
        resource: 'transfer',
        action: 'submit',
      }))
    }
  }

  const handleWalletToWalletSubmit = async (values: WalletToWalletFormValues) => {
    if (!token) {
      toast.error('Authentication required')
      return
    }

    try {
      const payload = {
        from_wallet_type: values.fromWalletType,
        to_wallet_type: values.toWalletType,
        amount: Number(values.amount),
        remarks: sanitizeComment(values.remarks),
      }

      const response = await internalTransferApi.userWalletToUserWallet(payload, token)
      if (response.success) {
        toast.success(response.message || 'Transfer completed successfully')
        await loadTransferResources()
        notifyWalletRefresh()
        walletToWalletForm.reset({
          fromWalletType: values.fromWalletType,
          toWalletType: values.toWalletType,
          amount: '',
          remarks: '',
        })
      }
    } catch (error) {
      console.error('Wallet to wallet transfer failed', error)
      toast.error(getFriendlyErrorMessage(error, {
        audience: 'client',
        resource: 'transfer',
        action: 'submit',
      }))
    }
  }

  const handleWalletToMt5Submit = async (values: WalletToMt5FormValues) => {
    if (!token) {
      toast.error('Authentication required')
      return
    }

    try {
      const payload = {
        account_ref: values.toAccountId,
        amount: Number(values.amount),
        comment: sanitizeComment(values.remarks),
      }

      const response = await internalTransferApi.userWalletToMt5(payload, token)
      if (response.success) {
        toast.success(response.message || 'Transfer completed successfully')
        await loadTransferResources()
        notifyWalletRefresh()
        walletToMt5Form.reset({
          fromWalletType: values.fromWalletType,
          toAccountId: values.toAccountId,
          amount: '',
          remarks: '',
        })
      }
    } catch (error) {
      console.error('Wallet to MT5 transfer failed', error)
      toast.error(getFriendlyErrorMessage(error, {
        audience: 'client',
        resource: 'transfer',
        action: 'submit',
      }))
    }
  }

  const handleMt5ToWalletSubmit = async (values: Mt5ToWalletFormValues) => {
    if (!token) {
      toast.error('Authentication required')
      return
    }

    try {
      const payload = {
        from_mt5_account_id: values.fromAccountId,
        to_wallet_type: values.toWalletType,
        amount: Number(values.amount),
        remarks: sanitizeComment(values.remarks),
      }

      const response = await internalTransferApi.mt5ToUserWallet(payload, token)
      if (response.success) {
        toast.success(response.message || 'Transfer completed successfully')
        await loadTransferResources()
        notifyWalletRefresh()
        mt5ToWalletForm.reset({
          fromAccountId: values.fromAccountId,
          toWalletType: values.toWalletType,
          amount: '',
          remarks: '',
        })
      }
    } catch (error) {
      console.error('MT5 to wallet transfer failed', error)
      toast.error(getFriendlyErrorMessage(error, {
        audience: 'client',
        resource: 'transfer',
        action: 'submit',
      }))
    }
  }

  const walletSelectPlaceholder = isLoadingResources ? 'Loading wallets...' : 'Select wallet'
  const mt5SelectPlaceholder = isLoadingResources ? 'Loading accounts...' : 'Select MT5 account'
  const canTransferBetweenWallets = walletOptions.length > 1

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div>
          <h1 className="mb-1 flex items-center gap-2 text-3xl font-semibold text-foreground">
            <ArrowLeftRight className="h-6 w-6 text-primary" />
            Internal Transfers
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            Move funds between your CRM wallets and linked MT5 trading accounts.
          </p>
        </div>
        {walletError ? (
          <ApiErrorState
            error={walletError}
            audience="client"
            resource="wallet summary"
            action="load"
            variant="inline"
          />
        ) : null}
        {accountsError ? (
          <ApiErrorState
            error={accountsError}
            audience="client"
            resource="MT5 accounts"
            action="load"
            variant="inline"
          />
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Wallet className="h-5 w-5" />
              CRM Wallet
            </CardTitle>
            <CardDescription>
              The primary CRM wallet is used by default for wallet to MT5 transfers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingResources ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Repeat className="h-4 w-4 animate-spin" />
                Loading wallet balances...
              </div>
            ) : mainWallet ? (
              <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{mainWallet.label}</div>
                    <div className="mt-1 text-muted-foreground">
                      Balance: {mainWallet.balance} {mainWallet.currency}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {mainWallet.isPrimary ? 'Primary' : 'Wallet'}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No CRM wallet data is available right now.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Wallet className="h-5 w-5" />
              Linked MT5 Accounts
            </CardTitle>
            <CardDescription>
              Choose from your linked MT5 accounts when moving funds to or between trading accounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingResources ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Repeat className="h-4 w-4 animate-spin" />
                Loading MT5 accounts...
              </div>
            ) : mt5Accounts.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {mt5Accounts.map((account) => (
                  <div
                    key={account.account_id}
                    className="rounded-lg border bg-muted/40 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{account.account_id}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          MT5 Login: {account.mt5_id}
                        </div>
                      </div>
                      <Badge variant="outline">
                        MT5
                      </Badge>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      Balance: {formatCurrency(account.balance)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No MT5 accounts found. Create an MT5 account before initiating transfers involving trading accounts.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TransferTab)} className="space-y-4">
        <TabsList className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="wallet-to-wallet">Wallet to Wallet</TabsTrigger>
          <TabsTrigger value="wallet-to-mt5">Wallet to MT5</TabsTrigger>
          <TabsTrigger value="mt5-to-wallet">MT5 to Wallet</TabsTrigger>
          <TabsTrigger value="mt5-to-mt5">MT5 to MT5</TabsTrigger>
        </TabsList>

        <TabsContent value="wallet-to-wallet">
          <Card>
            <CardHeader>
              <CardTitle>Transfer between wallets</CardTitle>
              <CardDescription>
                Move balances between the wallets available in your CRM account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...walletToWalletForm}>
                <form
                  onSubmit={walletToWalletForm.handleSubmit(handleWalletToWalletSubmit)}
                  className="space-y-6"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={walletToWalletForm.control}
                      name="fromWalletType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Wallet</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoadingResources || walletOptions.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={walletSelectPlaceholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {walletOptions.map((wallet) => (
                                <SelectItem key={wallet.value} value={wallet.value}>
                                  {wallet.label} ({wallet.balance} {wallet.currency})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={walletToWalletForm.control}
                      name="toWalletType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To Wallet</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoadingResources || walletOptions.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={walletSelectPlaceholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {walletOptions.map((wallet) => (
                                <SelectItem key={wallet.value} value={wallet.value}>
                                  {wallet.label} ({wallet.balance} {wallet.currency})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {!canTransferBetweenWallets ? (
                    <p className="text-sm text-muted-foreground">
                      A second CRM wallet is required before funds can be moved between wallets.
                    </p>
                  ) : null}

                  <FormField
                    control={walletToWalletForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" placeholder="Enter amount" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={walletToWalletForm.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks (optional)</FormLabel>
                        <FormControl>
                          <Textarea rows={3} placeholder="Add a note for this transfer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full md:w-auto"
                    disabled={walletToWalletForm.formState.isSubmitting || !canTransferBetweenWallets}
                  >
                    {walletToWalletForm.formState.isSubmitting ? 'Processing...' : 'Transfer Funds'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet-to-mt5">
          <Card>
            <CardHeader>
              <CardTitle>Transfer from wallet to MT5</CardTitle>
              <CardDescription>
                Deposit funds from your primary CRM wallet into one of your linked MT5 accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...walletToMt5Form}>
                <form
                  onSubmit={walletToMt5Form.handleSubmit(handleWalletToMt5Submit)}
                  className="space-y-6"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={walletToMt5Form.control}
                      name="fromWalletType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Wallet</FormLabel>
                          <Select value={field.value} disabled>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={walletSelectPlaceholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mainWallet ? (
                                <SelectItem value={mainWallet.value}>
                                  {mainWallet.label} ({mainWallet.balance} {mainWallet.currency})
                                </SelectItem>
                              ) : null}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={walletToMt5Form.control}
                      name="toAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>MT5 Account</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoadingResources || mt5Accounts.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={mt5SelectPlaceholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mt5AccountOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={walletToMt5Form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" placeholder="Enter amount" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={walletToMt5Form.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks (optional)</FormLabel>
                        <FormControl>
                          <Textarea rows={3} placeholder="Add a note for this transfer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full md:w-auto"
                    disabled={walletToMt5Form.formState.isSubmitting || !mainWallet}
                  >
                    {walletToMt5Form.formState.isSubmitting ? 'Processing...' : 'Transfer Funds'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mt5-to-wallet">
          <Card>
            <CardHeader>
              <CardTitle>Transfer from MT5 to wallet</CardTitle>
              <CardDescription>
                Withdraw balances from an MT5 account back into one of your CRM wallets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...mt5ToWalletForm}>
                <form
                  onSubmit={mt5ToWalletForm.handleSubmit(handleMt5ToWalletSubmit)}
                  className="space-y-6"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={mt5ToWalletForm.control}
                      name="fromAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>MT5 Account</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoadingResources || mt5Accounts.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={mt5SelectPlaceholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mt5AccountOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={mt5ToWalletForm.control}
                      name="toWalletType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To Wallet</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoadingResources || walletOptions.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={walletSelectPlaceholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {walletOptions.map((wallet) => (
                                <SelectItem key={wallet.value} value={wallet.value}>
                                  {wallet.label} ({wallet.balance} {wallet.currency})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={mt5ToWalletForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" placeholder="Enter amount" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={mt5ToWalletForm.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks (optional)</FormLabel>
                        <FormControl>
                          <Textarea rows={3} placeholder="Add a note for this transfer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full md:w-auto" disabled={mt5ToWalletForm.formState.isSubmitting}>
                    {mt5ToWalletForm.formState.isSubmitting ? 'Processing...' : 'Transfer Funds'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mt5-to-mt5">
          <Card>
            <CardHeader>
              <CardTitle>Transfer between MT5 accounts</CardTitle>
              <CardDescription>
                Move funds directly between your linked MT5 accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...mt5ToMt5Form}>
                <form
                  onSubmit={mt5ToMt5Form.handleSubmit(handleMt5ToMt5Submit)}
                  className="space-y-6"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={mt5ToMt5Form.control}
                      name="fromAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From MT5 Account</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoadingResources || mt5Accounts.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={mt5SelectPlaceholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mt5AccountOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={mt5ToMt5Form.control}
                      name="toAccountId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To MT5 Account</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isLoadingResources || mt5Accounts.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={mt5SelectPlaceholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mt5AccountOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={mt5ToMt5Form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" placeholder="Enter amount" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={mt5ToMt5Form.control}
                    name="remarks"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Remarks (optional)</FormLabel>
                        <FormControl>
                          <Textarea rows={3} placeholder="Add a note for this transfer" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full md:w-auto" disabled={mt5ToMt5Form.formState.isSubmitting}>
                    {mt5ToMt5Form.formState.isSubmitting ? 'Processing...' : 'Transfer Funds'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function InternalTransferPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
      <InternalTransferContent />
    </div>
  )
}

