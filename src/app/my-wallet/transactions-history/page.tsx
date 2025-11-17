'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { MainLayout } from '@/components/main-layout'
import { useAuth } from '@/contexts/auth-context'
import { walletApi, type Transaction, type TransactionsData } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function TransactionsHistoryPage() {
  const { token } = useAuth()
  const [transactionsData, setTransactionsData] = useState<TransactionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  
  // Filter state
  const [transactionType, setTransactionType] = useState<string>('all')
  const [walletType, setWalletType] = useState<string>('all')

  const fetchTransactions = useCallback(async () => {
    if (!token) {
      setError('Authentication required')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const params: {
        page?: number
        per_page?: number
        transaction_type?: string
        wallet_type?: string
      } = {
        page: currentPage,
        per_page: perPage,
      }

      if (transactionType !== 'all') {
        params.transaction_type = transactionType
      }
      if (walletType !== 'all') {
        params.wallet_type = walletType
      }

      const response = await walletApi.getTransactions(token, params)
      
      if (response.success && response.data) {
        setTransactionsData(response.data)
      } else {
        setError(response.message || 'Failed to fetch transactions')
      }
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
    } finally {
      setLoading(false)
    }
  }, [token, currentPage, perPage, transactionType, walletType])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const getTransactionIcon = (direction: string) => {
    if (direction === 'credit') {
      return <ArrowDownRight className="h-4 w-4 text-green-600" />
    } else if (direction === 'debit') {
      return <ArrowUpRight className="h-4 w-4 text-red-600" />
    }
    return <Clock className="h-4 w-4 text-muted-foreground" />
  }

  const getTransactionColor = (direction: string) => {
    if (direction === 'credit') {
      return 'text-green-600 dark:text-green-400'
    } else if (direction === 'debit') {
      return 'text-red-600 dark:text-red-400'
    }
    return 'text-muted-foreground'
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'rejected':
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const formatAmount = (amount: number | string, currency: string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return `${numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    })} ${currency}`
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleFilterChange = () => {
    setCurrentPage(1) // Reset to first page when filters change
  }

  const pagination = transactionsData?.pagination
  const totalPages = pagination?.total_pages || pagination?.last_page || 1
  const currentPageNum = pagination?.current_page || currentPage

  if (loading && !transactionsData) {
    return (
      <MainLayout>
        <div className="container mx-auto py-10">
          <div className="space-y-6">
            <div>
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-5 w-96" />
            </div>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-10">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
              <p className="text-muted-foreground mt-2">
                View all your wallet transactions
              </p>
            </div>
            <Button 
              onClick={fetchTransactions} 
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction-type">Transaction Type</Label>
                  <Select
                    value={transactionType}
                    onValueChange={(value) => {
                      setTransactionType(value)
                      handleFilterChange()
                    }}
                  >
                    <SelectTrigger id="transaction-type">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="withdrawal">Withdrawal</SelectItem>
                      <SelectItem value="internal transfer">Internal Transfer</SelectItem>
                      <SelectItem value="transfer_in">Transfer In</SelectItem>
                      <SelectItem value="transfer_out">Transfer Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wallet-type">Wallet Type</Label>
                  <Select
                    value={walletType}
                    onValueChange={(value) => {
                      setWalletType(value)
                      handleFilterChange()
                    }}
                  >
                    <SelectTrigger id="wallet-type">
                      <SelectValue placeholder="All wallets" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Wallets</SelectItem>
                      <SelectItem value="main">Main</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                      <SelectItem value="commission">Commission</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="per-page">Items Per Page</Label>
                  <Select
                    value={String(perPage)}
                    onValueChange={(value) => {
                      setPerPage(Number(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger id="per-page">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transactions List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Transactions
              </CardTitle>
              <CardDescription>
                {pagination?.total ? `Total: ${pagination.total} transactions` : 'Your transaction history'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && !transactionsData && (
                <div className="text-center py-10">
                  <p className="text-destructive mb-4">{error}</p>
                  <Button onClick={fetchTransactions} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              )}

              {transactionsData && transactionsData.transactions.length > 0 ? (
                <>
                  <div className="space-y-4">
                    {transactionsData.transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                            {getTransactionIcon(transaction.direction)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-semibold capitalize">
                                {transaction.type.replace(/_/g, ' ')}
                              </p>
                              <Badge variant={getStatusBadgeVariant(transaction.status)} className="text-xs">
                                {transaction.status_label}
                              </Badge>
                              {transaction.payment_method && (
                                <Badge variant="outline" className="text-xs">
                                  {transaction.payment_method}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {transaction.description}
                            </p>
                            {transaction.reference && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Ref: {transaction.reference}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm:ss')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className={`font-bold text-lg ${getTransactionColor(transaction.direction)}`}>
                            {transaction.direction === 'credit' ? '+' : '-'}
                            {formatAmount(transaction.amount, transaction.currency)}
                          </p>
                          {transaction.from_account && (
                            <p className="text-xs text-muted-foreground mt-1">
                              From: {transaction.from_account}
                            </p>
                          )}
                          {transaction.to_account && (
                            <p className="text-xs text-muted-foreground mt-1">
                              To: {transaction.to_account}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Showing page {currentPageNum} of {totalPages} 
                        {pagination?.total && ` (${pagination.total} total transactions)`}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPageNum - 1)}
                          disabled={currentPageNum <= 1 || loading}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number
                            if (totalPages <= 5) {
                              pageNum = i + 1
                            } else if (currentPageNum <= 3) {
                              pageNum = i + 1
                            } else if (currentPageNum >= totalPages - 2) {
                              pageNum = totalPages - 4 + i
                            } else {
                              pageNum = currentPageNum - 2 + i
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPageNum === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                disabled={loading}
                                className="w-10"
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPageNum + 1)}
                          disabled={currentPageNum >= totalPages || loading}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
                  <p className="text-muted-foreground">
                    {transactionType !== 'all' || walletType !== 'all'
                      ? 'Try adjusting your filters to see more results.'
                      : "You haven't made any transactions yet."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {error && transactionsData && (
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


