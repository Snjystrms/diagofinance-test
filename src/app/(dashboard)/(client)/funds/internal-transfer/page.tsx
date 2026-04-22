'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeftRight, Repeat, Wallet } from 'lucide-react'

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

import { internalTransferApi, mt5AccountsApi, type MT5Account } from '@/lib/api'
import { getFriendlyErrorMessage } from '@/lib/friendly-errors'
import { useAuth } from '@/contexts/auth-context'

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
    fromWalletType: z.string().min(1, 'Enter the source wallet'),
    toWalletType: z.string().min(1, 'Enter the destination wallet'),
    amount: amountFieldSchema,
    remarks: remarksSchema,
  })
  .refine(
    (values) => values.fromWalletType.trim().toLowerCase() !== values.toWalletType.trim().toLowerCase(),
    {
      message: 'Wallet types must be different',
      path: ['toWalletType'],
    }
  )

const walletToMt5Schema = z.object({
  fromWalletType: z.string().min(1, 'Enter the source wallet'),
  toAccountId: z.string().min(1, 'Select an MT5 account'),
  amount: amountFieldSchema,
  remarks: remarksSchema,
})

const mt5ToWalletSchema = z.object({
  fromAccountId: z.string().min(1, 'Select an MT5 account'),
  toWalletType: z.string().min(1, 'Enter the destination wallet'),
  amount: amountFieldSchema,
  remarks: remarksSchema,
})

type Mt5ToMt5FormValues = z.infer<typeof mt5ToMt5Schema>
type WalletToWalletFormValues = z.infer<typeof walletToWalletSchema>
type WalletToMt5FormValues = z.infer<typeof walletToMt5Schema>
type Mt5ToWalletFormValues = z.infer<typeof mt5ToWalletSchema>

const walletTypeHints = ['main', 'roi', 'bonus']

function sanitizeRemarks(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function InternalTransferContent() {
  const { token } = useAuth()
  const [mt5Accounts, setMt5Accounts] = useState<MT5Account[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [accountsError, setAccountsError] = useState<unknown | null>(null)

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
      fromWalletType: '',
      toWalletType: '',
      amount: '',
      remarks: '',
    },
  })

  const walletToMt5Form = useForm<WalletToMt5FormValues>({
    resolver: zodResolver(walletToMt5Schema),
    defaultValues: {
      fromWalletType: '',
      toAccountId: '',
      amount: '',
      remarks: '',
    },
  })

  const mt5ToWalletForm = useForm<Mt5ToWalletFormValues>({
    resolver: zodResolver(mt5ToWalletSchema),
    defaultValues: {
      fromAccountId: '',
      toWalletType: '',
      amount: '',
      remarks: '',
    },
  })

  useEffect(() => {
    if (!token) {
      return
    }

    const fetchAccounts = async () => {
      try {
        setIsLoadingAccounts(true)
        setAccountsError(null)
        const response = await mt5AccountsApi.getAll(token)
        if (response.success && response.data) {
          setMt5Accounts(response.data)
        } else {
          setAccountsError('Unable to load MT5 accounts')
        }
      } catch (error) {
        console.error('Failed to load MT5 accounts', error)
        setAccountsError(error)
      } finally {
        setIsLoadingAccounts(false)
      }
    }

    fetchAccounts()
  }, [token])

  const mt5AccountOptions = useMemo(() => mt5Accounts.map((account) => ({
      id: account.account_id,
      label: `${account.account_id} • ${account.account_type}`,
    })), [mt5Accounts])

  const handleMt5ToMt5Submit = async (values: Mt5ToMt5FormValues) => {
    if (!token) {
      toast.error('Authentication required')
      return
    }

    try {
      const payload = {
        from_mt5_account_id: values.fromAccountId,
        to_mt5_account_id: values.toAccountId,
        amount: Number(values.amount),
        remarks: sanitizeRemarks(values.remarks),
      }

      const response = await internalTransferApi.mt5ToMt5(payload, token)
      if (response.success) {
        toast.success(response.message || 'Transfer completed successfully')
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
        from_wallet_type: values.fromWalletType.trim(),
        to_wallet_type: values.toWalletType.trim(),
        amount: Number(values.amount),
        remarks: sanitizeRemarks(values.remarks),
      }

      const response = await internalTransferApi.userWalletToUserWallet(payload, token)
      if (response.success) {
        toast.success(response.message || 'Transfer completed successfully')
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
        from_wallet_type: values.fromWalletType.trim(),
        to_mt5_account_id: values.toAccountId,
        amount: Number(values.amount),
        remarks: sanitizeRemarks(values.remarks),
      }

      const response = await internalTransferApi.userWalletToMt5(payload, token)
      if (response.success) {
        toast.success(response.message || 'Transfer completed successfully')
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
        to_wallet_type: values.toWalletType.trim(),
        amount: Number(values.amount),
        remarks: sanitizeRemarks(values.remarks),
      }

      const response = await internalTransferApi.mt5ToUserWallet(payload, token)
      if (response.success) {
        toast.success(response.message || 'Transfer completed successfully')
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-1">
            Internal Transfers
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            Move funds between your wallets and MT5 trading accounts securely.
          </p>
        </div>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Wallet className="h-5 w-5" />
            Linked MT5 Accounts
          </CardTitle>
          <CardDescription>
            Selectable MT5 accounts are shown below. Balances reflect the latest data from the trading server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAccounts ? (
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
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{account.account_id}</span>
                    <Badge variant="outline" className="capitalize">
                      {account.account_type}
                    </Badge>
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    Balance: {account.available_balance}
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

      <Tabs defaultValue="wallet-to-wallet" className="space-y-4">
        <TabsList className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="wallet-to-wallet">Wallet ➜ Wallet</TabsTrigger>
          <TabsTrigger value="wallet-to-mt5">Wallet ➜ MT5</TabsTrigger>
          <TabsTrigger value="mt5-to-wallet">MT5 ➜ Wallet</TabsTrigger>
          <TabsTrigger value="mt5-to-mt5">MT5 ➜ MT5</TabsTrigger>
        </TabsList>

        <TabsContent value="wallet-to-wallet">
          <Card>
            <CardHeader>
              <CardTitle>Transfer between wallets</CardTitle>
              <CardDescription>
                Move balances between your internal wallets. Common wallets include{' '}
                {walletTypeHints.map((type, index) => (
                  <span key={type} className="font-medium">
                    {type.toUpperCase()}
                    {index < walletTypeHints.length - 1 ? ', ' : ''}
                  </span>
                ))}.
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
                          <FormControl>
                            <Input placeholder="e.g. main" {...field} />
                          </FormControl>
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
                          <FormControl>
                            <Input placeholder="e.g. roi" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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

                  <Button type="submit" className="w-full md:w-auto" disabled={walletToWalletForm.formState.isSubmitting}>
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
                Fund any of your MT5 accounts using your internal wallet balance.
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
                          <FormControl>
                            <Input placeholder="e.g. main" {...field} />
                          </FormControl>
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
                          <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingAccounts || mt5Accounts.length === 0}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={isLoadingAccounts ? 'Loading accounts...' : 'Select MT5 account'} />
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

                  <Button type="submit" className="w-full md:w-auto" disabled={walletToMt5Form.formState.isSubmitting}>
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
                Withdraw profits or balances from your MT5 account back to an internal wallet.
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
                          <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingAccounts || mt5Accounts.length === 0}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={isLoadingAccounts ? 'Loading accounts...' : 'Select MT5 account'} />
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
                          <FormControl>
                            <Input placeholder="e.g. main" {...field} />
                          </FormControl>
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
                          <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingAccounts || mt5Accounts.length === 0}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={isLoadingAccounts ? 'Loading accounts...' : 'Select MT5 account'} />
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
                          <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingAccounts || mt5Accounts.length === 0}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={isLoadingAccounts ? 'Loading accounts...' : 'Select MT5 account'} />
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

