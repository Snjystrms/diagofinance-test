'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppDataTable } from '@/components/app-data-table'
import { ApiErrorState } from '@/components/errors/api-error-state'
import { ClientTablePageSkeleton } from '@/components/loading/client-page-skeletons'
import { useAuth } from '@/contexts/auth-context'
import { getUserDepositRequests } from '@/utils/operations'
import { type DepositListItem } from '@/lib/api'
import { CLIENT_WALLET_REFRESH_EVENT } from '@/lib/client-events'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiSearchBar } from '@/components/ui/api-search-bar'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { SerialNumberCell } from '@/components/data-table/serial-number-cell'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Image as ImageIcon,
  DollarSign,
  Calendar as CalendarIcon,
  FileText,
  Search,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDateTimeInIST } from '@/lib/formatters'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { useQueryState, parseAsInteger, parseAsString } from 'nuqs'

// Status badge component
const StatusBadge = ({ status }: { status: number }) => {
  const statusMap: Record<number, string> = { 0: 'pending', 1: 'approved', 2: 'rejected' }
  const statusText = statusMap[status] || 'pending'

  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string, icon: React.ReactNode }> = {
    pending: {
      variant: 'secondary',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800',
      icon: <Clock className="h-3 w-3 mr-1" />
    },
    approved: {
      variant: 'default',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-800',
      icon: <CheckCircle className="h-3 w-3 mr-1" />
    },
    rejected: {
      variant: 'destructive',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-800',
      icon: <XCircle className="h-3 w-3 mr-1" />
    },
  }

  const statusConfig = variants[statusText] || variants.pending

  return (
    <Badge
      variant={statusConfig.variant}
      className={`${statusConfig.className} flex items-center gap-1 w-fit`}
    >
      {statusConfig.icon}
      <span className="capitalize">{statusText}</span>
    </Badge>
  )
}

// Payment proof preview dialog
const PaymentProofDialog = ({ paymentProofUrl }: { paymentProofUrl: string | null }) => {
  const authCtx = useAuth?.()
  const token = authCtx?.token || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : '')

  const [open, setOpen] = React.useState(false)
  const [blobUrl, setBlobUrl] = React.useState<string>('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(false)

  useEffect(() => {
    if (!open || !paymentProofUrl || !token) {
      setBlobUrl('')
      setError(false)
      return
    }

    const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '')
    const fullUrl = paymentProofUrl.startsWith('http')
      ? paymentProofUrl
      : apiBaseUrl
        ? `${apiBaseUrl}${paymentProofUrl.startsWith('/') ? '' : '/'}${paymentProofUrl}`
        : paymentProofUrl

    let cancelled = false
    setLoading(true)
    setError(false)

    fetch(fullUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.blob()
      })
      .then((blob) => {
        if (cancelled) return
        setBlobUrl(URL.createObjectURL(blob))
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
        setBlobUrl('')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, paymentProofUrl, token])

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [blobUrl])

  if (!paymentProofUrl) {
    return (
      <span className="text-muted-foreground text-sm">No proof uploaded</span>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8">
          <ImageIcon className="h-4 w-4 mr-2" />
          View Proof
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Payment Proof</DialogTitle>
          <DialogDescription>
            Screenshot or image of the transaction
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center items-center p-4 min-h-[200px]">
          {loading && !blobUrl && (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          )}
          {error && (
            <span className="text-sm text-muted-foreground">
              Unable to load payment proof.
            </span>
          )}
          {blobUrl && (
            <img
              src={blobUrl}
              alt="Payment proof"
              className="max-w-full max-h-[70vh] object-contain rounded-lg border"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Transaction hash cell with explorer link
const TransactionHashCell = ({ hash }: { hash: string | null }) => {
  if (!hash) {
    return <span className="text-muted-foreground text-sm">No hash provided</span>
  }

  const txExplorerBaseUrl = (process.env.NEXT_PUBLIC_TX_EXPLORER_BASE_URL || '').replace(/\/+$/, '')
  const explorerUrl = txExplorerBaseUrl ? `${txExplorerBaseUrl}/tx/${hash}` : null

  return (
    <div className="flex items-center gap-2">
      <code className="text-xs font-mono bg-muted px-2 py-1 rounded max-w-[200px] truncate">
        {hash}
      </code>
      {explorerUrl ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => window.open(explorerUrl, '_blank')}
          title="View transaction explorer"
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
      ) : null}
    </div>
  )
}

// Admin notes cell with dialog
const AdminNotesCell = ({ notes }: { notes: string | null }) => {
  if (!notes) {
    return <span className="text-muted-foreground text-sm">-</span>
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8">
          <FileText className="h-4 w-4 mr-2" />
          View Notes
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Admin Notes</DialogTitle>
          <DialogDescription>
            Notes from the administrator regarding this deposit request
          </DialogDescription>
        </DialogHeader>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm whitespace-pre-wrap">{notes}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Define unified columns for all deposits
const columns: ColumnDef<DepositListItem>[] = [
  {
    id: "sr_no",
    header: "Sr. No.",
    cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
    enableSorting: false,
  },
  {
    id: 'amount',
    accessorKey: 'amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => {
      const pmType = row.original.paymentMethod?.type
      const currencyLabel = pmType === 'usdt_transfer' ? 'USDT' : 'USD'
      return (
        <div className="flex items-center gap-2 font-semibold">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span>{row.original.amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} {currencyLabel}</span>
        </div>
      )
    },
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    id: 'paymentMethod',
    accessorKey: 'paymentMethod',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment Method" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.paymentMethod?.name || row.original.paymentMethod?.type || 'N/A'}</Badge>
    ),
  },
  {
    id: 'source',
    accessorKey: 'source',
    meta: { mobileHidden: true },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Source" />
    ),
    cell: ({ row }) => (
      <span className="text-sm capitalize">{row.original.source?.replace(/_/g, ' ') || '-'}</span>
    ),
  },
  {
    id: 'transaction_hash',
    accessorKey: 'transaction_hash',
    meta: { mobileHidden: true },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Transaction Hash" />
    ),
    cell: ({ row }) => <TransactionHashCell hash={row.original.transaction_hash} />,
  },
  {
    id: 'file',
    accessorKey: 'file',
    meta: { mobileHidden: true },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment Proof" />
    ),
    cell: ({ row }) => (
      <PaymentProofDialog paymentProofUrl={row.original.file} />
    ),
  },
  {
    id: 'admin_comment',
    accessorKey: 'admin_comment',
    meta: { mobileHidden: true },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Admin Notes" />
    ),
    cell: ({ row }) => <AdminNotesCell notes={row.original.admin_comment} />,
  },
  {
    id: 'created_at',
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-sm">
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        <span>
          {formatDateTimeInIST(row.original.created_at)}
        </span>
      </div>
    ),
  },
]

export default function MyDepositPage() {
  const { token } = useAuth()
   const router = useRouter()
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [perPage, setPerPage] = useQueryState('perPage', parseAsInteger.withDefault(10))

  // Filters
  const [searchQuery, setSearchQuery] = useQueryState('search', parseAsString)
  const [searchInput, setSearchInput] = useState(searchQuery || '')

  const [statusFilter, setStatusFilter] = useQueryState(
    'status',
    parseAsString
  )
  const [sourceFilter, setSourceFilter] = useQueryState(
    'source',
    parseAsString
  )
  const [paymentCategoryFilter, setPaymentCategoryFilter] = useQueryState(
    'payment_category',
    parseAsString
  )
  const [paymentMethodIdFilter, setPaymentMethodIdFilter] = useQueryState(
    'payment_method_id',
    parseAsString
  )

  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateFromStr, setDateFromStr] = useQueryState('date_from', parseAsString)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)
  const [dateToStr, setDateToStr] = useQueryState('date_to', parseAsString)

  // Sync date state with query params
  useEffect(() => {
    if (dateFromStr) {
      const parsed = new Date(dateFromStr)
      if (!isNaN(parsed.getTime())) {
        setDateFrom(parsed)
      }
    }
  }, [dateFromStr])

  useEffect(() => {
    if (dateToStr) {
      const parsed = new Date(dateToStr)
      if (!isNaN(parsed.getTime())) {
        setDateTo(parsed)
      }
    }
  }, [dateToStr])

  // Update query params when dates change
  useEffect(() => {
    if (dateFrom) {
      setDateFromStr(format(dateFrom, 'yyyy-MM-dd'))
    } else {
      setDateFromStr(null)
    }
  }, [dateFrom, setDateFromStr])

  useEffect(() => {
    if (dateTo) {
      setDateToStr(format(dateTo, 'yyyy-MM-dd'))
    } else {
      setDateToStr(null)
    }
  }, [dateTo, setDateToStr])

  // Sync search input with query param
  useEffect(() => {
    setSearchInput(searchQuery || '')
  }, [searchQuery])

  const { data: depositsData, isLoading, refetch, error } = useQuery({
    queryKey: [
      'myDeposits',
      token,
      page,
      perPage,
      searchQuery,
      statusFilter,
      sourceFilter,
      paymentCategoryFilter,
      paymentMethodIdFilter,
      dateFromStr,
      dateToStr,
    ],
    queryFn: () =>
      getUserDepositRequests(page, perPage, token!, {
        search: searchQuery || undefined,
        status:
          statusFilter && statusFilter !== 'all'
            ? Number(statusFilter)
            : null,
        source: sourceFilter && sourceFilter !== 'all' ? sourceFilter : null,
        payment_category:
          paymentCategoryFilter && paymentCategoryFilter !== 'all'
            ? paymentCategoryFilter
            : null,
        payment_method_id:
          paymentMethodIdFilter && paymentMethodIdFilter !== 'all'
            ? Number(paymentMethodIdFilter)
            : null,
        date_from: dateFromStr || null,
        date_to: dateToStr || null,
      }),
    enabled: Boolean(token),
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  })

  const deposits: DepositListItem[] = depositsData?.data ?? []
  const totalPages = depositsData?.pagination?.last_page ?? 1
  const total = depositsData?.pagination?.total ?? deposits.length

  const pageCount = totalPages > 0 ? totalPages : (total > 0 && perPage ? Math.ceil(total / perPage) : 1)

  useEffect(() => {
    const handleWalletRefresh = () => {
      void refetch()
    }

    window.addEventListener(CLIENT_WALLET_REFRESH_EVENT, handleWalletRefresh)
    return () => {
      window.removeEventListener(CLIENT_WALLET_REFRESH_EVENT, handleWalletRefresh)
    }
  }, [refetch])

  const handleResetFilters = () => {
    setSearchQuery(null)
    setSearchInput('')
    setStatusFilter(null)
    setSourceFilter(null)
    setPaymentCategoryFilter(null)
    setPaymentMethodIdFilter(null)
    setDateFrom(undefined)
    setDateTo(undefined)
    setPage(1)
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchQuery) count++
    if (statusFilter) count++
    if (sourceFilter) count++
    if (paymentCategoryFilter) count++
    if (paymentMethodIdFilter) count++
    if (dateFromStr) count++
    if (dateToStr) count++
    return count
  }, [
    searchQuery,
    statusFilter,
    sourceFilter,
    paymentCategoryFilter,
    paymentMethodIdFilter,
    dateFromStr,
    dateToStr,
  ])

  if (isLoading && deposits.length === 0) {
    return (
      <ClientTablePageSkeleton columnCount={8} rowCount={8} />
    )
  }

  if (error && deposits.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          error={error}
          audience="client"
          resource="deposit requests"
          action="load"
          variant="panel"
          onRetry={() => {
            void refetch()
          }}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="mb-1 flex items-center gap-2 text-3xl font-semibold text-foreground">
              <DollarSign className="h-6 w-6 text-primary" />
              My Deposit Requests
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl">
              View and track the status of all your deposit requests
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-lg border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Search className="h-4 w-4" />
              Filters
            </h2>
            {activeFilterCount > 0 ? (
              <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                <X className="h-4 w-4 mr-1" />
                Reset
              </Button>
            ) : null}
          </div>

          <div className="mb-4">
            <ApiSearchBar
              value={searchInput}
              onChange={(value) => setSearchInput(value)}
              onSearch={(value) => {
                setPage(1)
                setSearchQuery(value.trim() || null)
              }}
              placeholder="Search by amount, comment, or transaction hash"
              minimumLength={3}
              delay={300}
              className="max-w-sm"
            />
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 w-full">
            <div className="space-y-1.5">
              <Label htmlFor="status-filter" className="text-xs font-medium text-muted-foreground">Status</Label>
              <Select
                value={statusFilter || undefined}
                onValueChange={(value) => {
                  setStatusFilter(value === 'all' ? null : value)
                  setPage(1)
                }}
              >
                <SelectTrigger id="status-filter" className="h-9 w-full">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="0">Pending</SelectItem>
                  <SelectItem value="1">Approved</SelectItem>
                  <SelectItem value="2">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="source-filter" className="text-xs font-medium text-muted-foreground">Source</Label>
              <Select
                value={sourceFilter || undefined}
                onValueChange={(value) => {
                  setSourceFilter(value === 'all' ? null : value)
                  setPage(1)
                }}
              >
                <SelectTrigger id="source-filter" className="h-9 w-full">
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="bank_deposit">Bank Deposit</SelectItem>
                  <SelectItem value="usdt_deposit">USDT Deposit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment-category-filter" className="text-xs font-medium text-muted-foreground">Payment Category</Label>
              <Select
                value={paymentCategoryFilter || undefined}
                onValueChange={(value) => {
                  setPaymentCategoryFilter(value === 'all' ? null : value)
                  setPage(1)
                }}
              >
                <SelectTrigger id="payment-category-filter" className="h-9 w-full">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="usd">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full h-9 justify-start text-left font-normal',
                      !dateFrom && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dateFrom ? format(dateFrom, 'MMM dd, yyyy') : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => {
                      setDateFrom(date)
                      setPage(1)
                    }}
                    initialFocus
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full h-9 justify-start text-left font-normal',
                      !dateTo && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dateTo ? format(dateTo, 'MMM dd, yyyy') : <span>Select date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => {
                      setDateTo(date)
                      setPage(1)
                    }}
                    initialFocus
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {deposits.length === 0 && !isLoading ? (
          <Card>
            <CardContent className="py-10">
              <div className="text-center">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Deposit Requests</h3>
                <p className="text-muted-foreground mb-4">
                  You haven&apos;t submitted any deposit requests yet.
                </p>
                <Button onClick={() => router.push('/funds/deposit')}>
                  Make a Deposit
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <AppDataTable<DepositListItem>
            data={deposits}
            columns={columns}
            pageCount={pageCount}
          />
        )}

        {error && deposits.length > 0 && (
          <ApiErrorState
            error={error}
            audience="client"
            resource="deposit requests"
            action="load"
            variant="inline"
            onRetry={() => {
              void refetch()
            }}
          />
        )}
      </div>
    </div>
  )
}
