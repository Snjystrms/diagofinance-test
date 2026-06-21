'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { walletApi, type WalletSummaryData } from '@/lib/api'
import { userBrokerCryptoWalletsApi, type BrokerCryptoWalletItem } from '@/lib/api-auth-admin'
import { CLIENT_WALLET_REFRESH_EVENT } from '@/lib/client-events'
import { ApiErrorState } from '@/components/errors/api-error-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Copy,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Plus,
  Minus,
  ArrowLeftRight,
  Sparkles,
  Shield
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDateTimeInIST } from '@/lib/formatters'
import { Skeleton } from '@/components/ui/skeleton'
import toast from 'react-hot-toast'

export default function WalletOverviewPage() {
  const { token } = useAuth()
  const router = useRouter()
  const [walletData, setWalletData] = useState<WalletSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown | null>(null)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [brokerCryptoWallet, setBrokerCryptoWallet] = useState<BrokerCryptoWalletItem | null>(null)

  const fetchWalletSummary = async () => {
    if (!token) {
      setError('Authentication required')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await walletApi.getSummary(token)
      
      if (response.success && response.data) {
        setWalletData(response.data)
      } else {
        setError(response.message || 'Unable to load wallet summary')
      }
    } catch (err) {
      console.error('Error fetching wallet summary:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWalletSummary()
  }, [token])

  useEffect(() => {
    if (!token) return
    userBrokerCryptoWalletsApi.list(token)
      .then(res => {
        const wallets = res.data ?? []
        setBrokerCryptoWallet(wallets[0] ?? null)
      })
      .catch(() => setBrokerCryptoWallet(null))
  }, [token])

  useEffect(() => {
    const handleWalletRefresh = () => {
      void fetchWalletSummary()
    }

    window.addEventListener(CLIENT_WALLET_REFRESH_EVENT, handleWalletRefresh)
    return () => {
      window.removeEventListener(CLIENT_WALLET_REFRESH_EVENT, handleWalletRefresh)
    }
  }, [token])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedAddress(text)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  const isCreditTransaction = (type: string) => {
    return type.includes('deposit') || type.includes('transfer_in') || type.includes('bonus')  || type.includes('bonus') || type.includes('credit')
  }

  const getTransactionIcon = (type: string) => {
    if (type.includes('bonus') || type.includes('credit')) {
      return <Sparkles className="h-4 w-4 text-emerald-600" />
    } else if (isCreditTransaction(type)) {
      return <ArrowDownRight className="h-4 w-4 text-green-600" />
    } else if (type.includes('withdraw') || type.includes('transfer_out')) {
      return <ArrowUpRight className="h-4 w-4 text-red-600" />
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />
  }

  const getTransactionColor = (type: string) => {
    if (type.includes('bonus') || type.includes('credit')) {
      return 'text-emerald-600 dark:text-emerald-400'
    } else if (isCreditTransaction(type)) {
      return 'text-green-600 dark:text-green-400'
    } else if (type.includes('withdraw') || type.includes('transfer_out')) {
      return 'text-red-600 dark:text-red-400'
    }
    return 'text-muted-foreground'
  }

  const formatAmount = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  if (loading && !walletData) {
    return (
      <div className="px-4 py-10 md:px-6 lg:px-8">
        <div className="space-y-6">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !walletData) {
    return (
      <div className="px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          error={error}
          audience="client"
          resource="wallet summary"
          action="load"
          variant="panel"
          onRetry={fetchWalletSummary}
        />
      </div>
    )
  }

  const wallets = walletData ? Object.values(walletData.wallets) : []
  const mainWallet = wallets.find(w => w.is_primary) || wallets[0]
  const mt5Wallets = walletData?.mt5_wallets ?? []

  return (
    <div className="px-4 py-10 md:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-2">
              <h1 className="mb-1 flex items-center gap-2 text-3xl font-semibold text-foreground">
                <Wallet className="h-6 w-6 text-primary" />
                Wallet Overview
              </h1>
              <p className="text-base text-muted-foreground max-w-2xl">
                Manage your funds and track your transaction history
              </p>
            </div>
            <Button 
              onClick={fetchWalletSummary} 
              variant="outline"
              disabled={loading}
              className="shadow-sm hover:shadow-md transition-shadow"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Total Balance Card + Quick Actions */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 items-stretch">
            {/* Total Balance Card with Actions */}
            <Card className="md:col-span-3 relative overflow-hidden border-none shadow-xl text-primary-foreground bg-gradient-to-br from-primary via-secondary to-accent rounded-3xl p-6 h-full">
              <div className="absolute inset-0 opacity-60">
                <div className="absolute -left-10 -top-16 w-52 h-52 bg-primary-foreground/10 rounded-full blur-3xl" />
                <div className="absolute right-6 top-12 w-40 h-40 bg-primary-foreground/10 rounded-full blur-3xl" />
              </div>
              <CardHeader className="relative z-10 pb-0 px-0">
                <p className="uppercase tracking-[0.2em] text-[11px] font-semibold text-primary-foreground/80">
                  Main Wallet Balance
                </p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-4xl font-black leading-tight">
                    {walletData ? formatAmount(mainWallet?.balance?.toFixed(2) ?? '0.00') : '-'}
                  </span>
                  <span className="text-base font-semibold text-primary-foreground/80">
                    USD
                  </span>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 pt-6 pb-4 px-0">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <p className="text-primary-foreground/75 text-sm leading-relaxed">
                      Securely store and manage balances across deposits, withdrawals, and transfers in one place.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-primary-foreground/70 mt-3">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Funds available for instant transfers</span>
                    </div>
                    <div className="mt-5">
                      <Button
                        variant="ghost"
                        onClick={() => router.push('/funds/internal-transfer')}
                        className="w-max px-0 text-primary-foreground/90 hover:text-primary-foreground flex items-center gap-1 text-sm font-semibold"
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                        <span>Transfer Funds</span>
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col items-center text-primary-foreground/80 gap-2 flex-shrink-0">
                    <div className="p-4 rounded-full border-2 border-primary-foreground/40 bg-primary-foreground/10 backdrop-blur-sm">
                      <Shield className="h-12 w-12 text-primary-foreground" />
                    </div>
                    <span className="text-sm">Protected Balance</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card className="md:col-span-2 shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-3xl h-full flex flex-col">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  Quick Actions
                </CardTitle>
                <CardDescription className="text-sm">
                  Manage your funds quickly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 flex-1 flex flex-col">
                <div className="p-3 bg-muted/50 rounded-lg border border-border/50 mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Broker Wallet Address
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-foreground/80 truncate flex-1">
                      {brokerCryptoWallet?.wallet_address || 'N/A'}
                    </code>
                    {brokerCryptoWallet?.wallet_address && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          copyToClipboard(brokerCryptoWallet.wallet_address)
                          toast.success('Address copied!')
                        }}
                      >
                        {copiedAddress === brokerCryptoWallet.wallet_address ? (
                          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                  {brokerCryptoWallet && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {brokerCryptoWallet.network}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {brokerCryptoWallet.currency}
                      </Badge>
                      {brokerCryptoWallet.is_active ? (
                        <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 mt-auto">
                  <Button
                    onClick={() => router.push('/funds/deposit')}
                    variant="outline"
                    className="w-full h-10 rounded-xl border-green-500/40 bg-green-50/60 hover:bg-green-100/80 flex items-center justify-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Deposit</span>
                  </Button>

                  <Button
                    onClick={() => router.push('/funds/withdraw')}
                    variant="outline"
                    className="w-full h-10 rounded-xl border-red-500/40 bg-red-50/60 hover:bg-red-100/80 flex items-center justify-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400"
                  >
                    <Minus className="h-4 w-4" />
                    <span>Withdraw</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {mt5Wallets.length > 0 ? (
            <Card className="shadow-lg">
              <CardHeader className="border-b bg-gradient-to-r from-muted/50 to-transparent">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  MT5 Wallet Accounts
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  Account-linked MT5 wallet balances and status. Wallet addresses are hidden.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {mt5Wallets.map((wallet) => (
                    <div
                      key={wallet.id}
                      className="rounded-2xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            MT5 User ID
                          </p>
                          <p className="text-2xl font-bold text-foreground">
                            {wallet.mt5_id}
                          </p>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {wallet.account_mode}
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Balance
                          </p>
                          <p className="mt-1 text-lg font-semibold text-foreground">
                            {wallet.currency === 'USC' ? '¢' : '$'} 
                            {formatAmount(wallet.currency === 'USC' ? wallet.balance * 100 : wallet.balance)}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="default" className="capitalize">
                            {wallet.status}
                          </Badge>
                          {wallet.is_primary ? (
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                              Primary
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Recent Transactions */}
          <Card className="shadow-lg overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-r from-muted/50 to-transparent">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                Recent Transactions
              </CardTitle>
              <CardDescription className="text-base mt-1">
                Your latest wallet activity and transaction history
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {walletData && walletData.recent_transactions.length > 0 ? (
                <div className="space-y-3">
                  {walletData.recent_transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-5 border-2 rounded-xl hover:border-primary/30 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-300 group cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className={`p-3 rounded-xl transition-all duration-300 flex-shrink-0 ${
                            transaction.type.includes('bonus')
                              ? 'bg-emerald-100 dark:bg-emerald-900/20 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/30'
                              : isCreditTransaction(transaction.type)
                              ? 'bg-green-100 dark:bg-green-900/20 group-hover:bg-green-200 dark:group-hover:bg-green-900/30'
                              : transaction.type.includes('withdraw') ||
                                transaction.type.includes('transfer_out')
                              ? 'bg-red-100 dark:bg-red-900/20 group-hover:bg-red-200 dark:group-hover:bg-red-900/30'
                              : 'bg-muted group-hover:bg-muted/80'
                          }`}
                        >
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 min-w-0">
                            <p className="font-semibold text-base capitalize truncate shrink-0 max-w-[40%]">
                              {transaction.type.replace(/_/g, ' ')}
                            </p>
                            <Badge
                              variant="outline" className="text-xs border-primary/20 bg-primary/5 shrink-0"
                            >
                              {transaction.wallet_type === 'ib' ? 'partner' : transaction.wallet_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate mb-1">
                            {transaction.description}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span className="truncate">
                              {formatDateTimeInIST(transaction.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p
                          className={`font-bold text-xl mb-1 overflow-hidden ${getTransactionColor(
                            transaction.type
                          )}`}
                        >
                          {isCreditTransaction(transaction.type)
                            ? '+'
                            : '-'}
                          ${formatAmount(transaction.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="inline-flex p-4 bg-muted rounded-full mb-4">
                    <Clock className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    No Transactions Yet
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Your transaction history will appear here once you start
                    making deposits or withdrawals.
                  </p>
                  <Button
                    onClick={() => router.push('/funds/deposit')}
                    variant="outline"
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Make Your First Deposit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {error && walletData ? (
            <ApiErrorState
              error={error}
              audience="client"
              resource="wallet summary"
              action="load"
              variant="inline"
              onRetry={fetchWalletSummary}
            />
          ) : null}
        </div>
      </div>
  )
}
