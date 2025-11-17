'use client'

import React, { useState, useEffect } from 'react'
import { MainLayout } from '@/components/main-layout'
import { useAuth } from '@/contexts/auth-context'
import { walletApi, type WalletSummaryData } from '@/lib/api'
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
  Minus
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'

export default function WalletOverviewPage() {
  const { token } = useAuth()
  const router = useRouter()
  const [walletData, setWalletData] = useState<WalletSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

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
        setError(response.message || 'Failed to fetch wallet summary')
      }
    } catch (err) {
      console.error('Error fetching wallet summary:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch wallet summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWalletSummary()
  }, [token])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedAddress(text)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  const getTransactionIcon = (type: string) => {
    if (type.includes('deposit') || type.includes('transfer_in')) {
      return <ArrowDownRight className="h-4 w-4 text-green-600" />
    } else if (type.includes('withdraw') || type.includes('transfer_out')) {
      return <ArrowUpRight className="h-4 w-4 text-red-600" />
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />
  }

  const getTransactionColor = (type: string) => {
    if (type.includes('deposit') || type.includes('transfer_in')) {
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
      maximumFractionDigits: 8
    })
  }

  if (loading && !walletData) {
    return (
      <MainLayout>
        <div className="container mx-auto py-10">
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
      </MainLayout>
    )
  }

  if (error && !walletData) {
    return (
      <MainLayout>
        <div className="container mx-auto py-10">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={fetchWalletSummary}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  const wallets = walletData ? Object.values(walletData.wallets) : []
  const mainWallet = wallets.find(w => w.is_primary) || wallets[0]

  return (
    <MainLayout>
      <div className="container mx-auto py-10">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Wallet Overview</h1>
              <p className="text-muted-foreground mt-2">
                View your wallet balance and recent transactions
              </p>
            </div>
            <Button 
              onClick={fetchWalletSummary} 
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Total Balance Card with Actions */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-primary" />
                  Total Balance
                </CardTitle>
                <CardDescription>Your combined wallet balance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-primary">
                  {walletData ? `$${formatAmount(walletData.total_balance)}` : '$0.00'}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {mainWallet?.currency || 'USDT'}
                </p>
              </CardContent>
              
            </Card>

            {/* Deposit and Withdrawal Actions */}
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Manage your funds</CardDescription>
              </CardHeader>
              <CardContent>
              <div className="text-sm text-muted-foreground mt-2">
                Address: {mainWallet?.address || 'N/A'}
              </div>
            </CardContent>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => router.push('/funds/deposit')}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Deposit
                </Button>
                <Button
                  onClick={() => router.push('/funds/withdraw')}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  size="lg"
                  variant="destructive"
                >
                  <Minus className="h-5 w-5 mr-2" />
                  Withdraw
                </Button>
              </CardContent>
             
            </Card>
          </div>

          {/* Wallet Details */}
       

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>
                Your latest wallet activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {walletData && walletData.recent_transactions.length > 0 ? (
                <div className="space-y-4">
                  {walletData.recent_transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 bg-muted rounded-lg">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold capitalize">
                              {transaction.type.replace(/_/g, ' ')}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {transaction.wallet_type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-lg ${getTransactionColor(transaction.type)}`}>
                          {transaction.type.includes('deposit') || transaction.type.includes('transfer_in') 
                            ? '+' 
                            : '-'}
                          ${formatAmount(transaction.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {mainWallet?.currency || 'USDT'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Transactions</h3>
                  <p className="text-muted-foreground">
                    You haven't made any transactions yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {error && walletData && (
            <Card className="border-yellow-500">
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                  <Clock className="h-4 w-4" />
                  <p className="text-sm">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  )
}

