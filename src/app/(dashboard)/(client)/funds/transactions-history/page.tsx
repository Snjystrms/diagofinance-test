'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { walletApi, type Transaction, type TransactionsData } from '@/lib/api'
import { ApiErrorState } from '@/components/errors/api-error-state'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Filter,
  CheckCircle,
  XCircle,
  Calendar,
  ExternalLink,
  Plus
} from 'lucide-react'
import { formatApiDateTimeAsIST, formatDateTimeInIST } from '@/lib/formatters'
import { format, parse } from "date-fns";
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AppDataTable } from '@/components/app-data-table'
import { SerialNumberCell } from '@/components/data-table/serial-number-cell'
import { type ColumnDef } from '@tanstack/react-table'
import { parseAsInteger } from 'nuqs'
import { useQueryState } from 'nuqs'
import { useRouter } from 'next/navigation'

const formatDateTime = (value?: string | null): string => {
  if (!value) return "-";
  try {
    return formatApiDateTimeAsIST(value);
  } catch {
    return String(value);
  }
};

export default function TransactionsHistoryPage() {
  const { token } = useAuth()
  const router = useRouter()
  const [transactionsData, setTransactionsData] = useState<TransactionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown | null>(null)
  
  // Use URL query params for pagination (synced with data table)
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [perPage, setPerPage] = useQueryState('perPage', parseAsInteger.withDefault(20))
  
  // Filter state
  const [transactionType, setTransactionType] = useState<string>('all')
  const [status, setStatus] = useState<string>('all')
  const [period, setPeriod] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // Date state for DateRangePicker
  const [startDateObj, setStartDateObj] = useState<Date | undefined>(undefined);
  const [endDateObj, setEndDateObj] = useState<Date | undefined>(undefined);

  // Sync date objects with string dates
  useEffect(() => {
    if (startDate) {
      const parsed = parse(startDate, "yyyy-MM-dd", new Date());
      if (!isNaN(parsed.getTime())) setStartDateObj(parsed);
    } else {
      setStartDateObj(undefined);
    }
  }, [startDate]);

  useEffect(() => {
    if (endDate) {
      const parsed = parse(endDate, "yyyy-MM-dd", new Date());
      if (!isNaN(parsed.getTime())) setEndDateObj(parsed);
    } else {
      setEndDateObj(undefined);
    }
  }, [endDate]);

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
        status?: string
        start_date?: string
        end_date?: string
        period?: string
      } = {
        page: page,
        per_page: perPage,
      }

      if (transactionType !== 'all') {
        params.transaction_type = transactionType
      }
      if (status !== 'all') {
        params.status = status
      }
      if (period !== 'all') {
        params.period = period
      }
      if (startDate) {
        params.start_date = startDate
      }
      if (endDate) {
        params.end_date = endDate
      }

      const response = await walletApi.getTransactions(token, params)
      
      if (response.success && response.data) {
        setTransactionsData(response.data)
      } else {
        setError(response.message || 'Unable to load transactions')
      }
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [token, page, perPage, transactionType, status, period, startDate, endDate])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    switch (statusLower) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-800 flex items-center gap-1.5 w-fit px-2.5 py-1">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Approved</span>
          </Badge>
        )
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800 flex items-center gap-1.5 w-fit px-2.5 py-1">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Pending</span>
          </Badge>
        )
      case 'rejected':
      case 'failed':
      case 'declined':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-800 flex items-center gap-1.5 w-fit px-2.5 py-1">
            <XCircle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium capitalize">{status}</span>
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1.5 w-fit px-2.5 py-1">
            <span className="text-xs font-medium capitalize">{status}</span>
          </Badge>
        )
    }
  }

  const formatAmount = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return `${numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    })}`
  }

  const handleFilterChange = () => {
    setPage(1)
  }

  const handleResetFilters = () => {
    setTransactionType('all')
    setStatus('all')
    setPeriod('all')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const hasActiveFilters = transactionType !== 'all' || status !== 'all' || period !== 'all' || startDate || endDate

  const pagination = transactionsData?.pagination
  const totalPages = pagination?.total_pages || pagination?.last_page || 1

  // Define columns for the data table
  const columns: ColumnDef<Transaction>[] = useMemo(
    () => [
      {
        id: "sr_no",
        header: "Sr. No.",
        cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
        enableSorting: false,
      },
      {
        id: 'type',
        header: 'Type',
        accessorKey: 'type',
        cell: ({ row }) => {
          const transaction = row.original
          return (
            <div className="flex items-center gap-2">
              <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                {transaction.direction === 'credit' ? (
                  <ArrowDownRight className="h-4 w-4 text-green-600" />
                ) : transaction.direction === 'debit' ? (
                  <ArrowUpRight className="h-4 w-4 text-red-600" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <span className="font-semibold capitalize">
                {transaction.type.replace(/_/g, ' ')}
              </span>
            </div>
          )
        },
      },
       {
        id: 'amount',
        header: 'Amount (USD)',
        accessorKey: 'amount',
        meta: { mobileHidden: true },
        cell: ({ row }) => {
          const transaction = row.original
         return transaction.amount ? (
           <div className="text-sm">
              <span className="text-foreground font-semibold">
                {formatAmount(transaction.amount.toFixed(2))}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          const transaction = row.original
          return getStatusBadge(transaction.status)
        },
      },
      {
        id: 'payment_method',
        header: 'Payment Method',
        accessorKey: 'payment_method',
        meta: { mobileHidden: true },
        cell: ({ row }) => {
          const transaction = row.original
          return transaction.payment_method ? (
            <Badge variant="outline" className="text-xs">
              {transaction.payment_method}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        },
      },
      {
        id: 'reference',
        header: 'Reference',
        accessorKey: 'reference',
        meta: { mobileHidden: true },
        cell: ({ row }) => {
          const transaction = row.original
          if (!transaction.reference) {
            return <span className="text-muted-foreground text-sm">—</span>
          }
          return (
            <code className="text-xs font-mono text-foreground truncate">
              {transaction.reference}
            </code>
          )
        },
      },
      {
        id: 'description',
        header: 'Description',
        accessorKey: 'description',
        meta: { mobileHidden: true },
        cell: ({ row }) => {
          const transaction = row.original
          return (
            <div className="max-w-md">
              <p className="text-sm text-foreground truncate">
                {transaction.description}
              </p>
            </div>
          )
        },
      },
      // {
      //   id: 'deposited_by',
      //   header: 'Processed By',
      //   accessorKey: 'deposited_by',
      //   meta: { mobileHidden: true },
      //   cell: ({ row }) => {
      //     const transaction = row.original
      //     return transaction.deposited_by ? (
      //       <span className="text-sm font-medium text-foreground">
      //         {transaction.deposited_by}
      //       </span>
      //     ) : (
      //       <span className="text-muted-foreground text-sm">—</span>
      //     )
      //   },
      // },
      {
        id: 'created_at',
        header: 'Created At',
        accessorKey: 'created_at',
        cell: ({ row }) => {
          const transaction = row.original
          return (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">
                {formatDateTime(transaction.created_at)}
              </span>
            </div>
          )
        },
      },
    ],
    []
  )

  if (loading && !transactionsData) {
    return (
      
        <div className="px-4 py-10 md:px-6 lg:px-8">
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
      
    )
  }

  return (
    
      <div className="px-4 py-10 md:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="mb-1 flex items-center gap-2 text-3xl font-semibold text-foreground">
                <Clock className="h-6 w-6 text-primary" />
                Transaction History
              </h1>
              <p className="text-base text-muted-foreground max-w-2xl">
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
<Card className="border-border/50">
  {/* Combined Header and Content into a single container for perfect horizontal alignment */}
 {/* // AFTER */}
<CardContent className="py-3 flex flex-col gap-3">

  {/* Row 1: Icon + Title */}
  <div className="flex items-center gap-2">
    <div className="p-1.5 bg-primary/10 rounded-lg">
      <Filter className="h-4 w-4 text-primary" />
    </div>
    <span className="text-base font-semibold text-card-foreground">Filters</span>
  </div>

  {/* Row 2: All filters — wraps naturally */}
  <div className="flex flex-wrap gap-x-4 gap-y-3 items-end">

    {/* Transaction Type */}
    <div className="flex items-center gap-2">
      <Label htmlFor="transaction-type" className="text-sm font-medium whitespace-nowrap">
        Transaction Type
      </Label>
      <Select value={transactionType} onValueChange={(value) => { setTransactionType(value); handleFilterChange() }}>
        <SelectTrigger id="transaction-type" className="h-9 w-40">
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

    {/* Status */}
    <div className="flex items-center gap-2">
      <Label htmlFor="status-filter" className="text-sm font-medium whitespace-nowrap">
        Status
      </Label>
      <Select value={status} onValueChange={(value) => { setStatus(value); handleFilterChange() }}>
        <SelectTrigger id="status-filter" className="h-9 w-36">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
          <SelectItem value="declined">Declined</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Period */}
    <div className="flex items-center gap-2">
      <Label htmlFor="period-filter" className="text-sm font-medium whitespace-nowrap">
        Period
      </Label>
      <Select value={period} onValueChange={(value) => {
        setPeriod(value)
        if (value !== 'all') { setStartDate(''); setEndDate('') }
        handleFilterChange()
      }}>
        <SelectTrigger id="period-filter" className="h-9 w-36">
          <SelectValue placeholder="All time" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Time</SelectItem>
          <SelectItem value="last7days">Last 7 Days</SelectItem>
          <SelectItem value="last15days">Last 15 Days</SelectItem>
          <SelectItem value="lastmonth">Last Month</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Date Range */}
    <DateRangePicker
      fromDate={startDateObj}
      toDate={endDateObj}
      fromLabel="From"
      toLabel="To"
      onFromDateChange={(date) => {
        setStartDateObj(date);
        setStartDate(date ? format(date, "yyyy-MM-dd") : "");
        if (date) setPeriod('all');
        handleFilterChange();
      }}
      onToDateChange={(date) => {
        setEndDateObj(date);
        setEndDate(date ? format(date, "yyyy-MM-dd") : "");
        if (date) setPeriod('all');
        handleFilterChange();
      }}
    />

    {/* Reset */}
    {hasActiveFilters && (
      <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-9 px-3 text-muted-foreground hover:text-foreground">
        <XCircle className="h-4 w-4 mr-1.5" />
        Reset
      </Button>
    )}

  </div>
</CardContent>
</Card>
          {/* Transactions Table */}
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
              {error && !transactionsData ? (
                <ApiErrorState
                  error={error}
                  audience="client"
                  resource="transactions"
                  action="load"
                  variant="empty"
                  onRetry={fetchTransactions}
                />
              ) : null}

              {transactionsData && transactionsData.transactions.length > 0 ? (
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                  <AppDataTable<Transaction>
                    data={transactionsData.transactions}
                    columns={columns}
                    pageCount={totalPages}
                    getRowId={(row) => String(row.id)}
                  />
                </div>
              ) : !loading ? (
                <div className="text-center py-10">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
                  <p className="text-muted-foreground mb-6">
                    {hasActiveFilters
                      ? 'Try adjusting your filters to see more results.'
                      : "You haven't made any transactions yet."}
                  </p>
                  {!hasActiveFilters && (
                    <Button
                      onClick={() => router.push('/funds/deposit')}
                      variant="outline"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Make Your First Deposit
                    </Button>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {error && transactionsData ? (
            <ApiErrorState
              error={error}
              audience="client"
              resource="transactions"
              action="load"
              variant="inline"
              onRetry={fetchTransactions}
            />
          ) : null}
        </div>
      </div>
    
  )
}





