'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { MainLayout } from '@/components/main-layout'
import { AppDataTable } from '@/components/app-data-table'
import { useAuth } from '@/contexts/auth-context'
import { getUserDepositRequests, type DepositRequestItem } from '@/utils/operations'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Image as ImageIcon,
  DollarSign,
  Hash,
  Calendar,
  FileText
} from 'lucide-react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQueryState, parseAsInteger } from 'nuqs'

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
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

  const statusConfig = variants[status.toLowerCase()] || variants.pending

  return (
    <Badge 
      variant={statusConfig.variant}
      className={`${statusConfig.className} flex items-center gap-1 w-fit`}
    >
      {statusConfig.icon}
      <span className="capitalize">{status}</span>
    </Badge>
  )
}

// Payment proof preview dialog
const PaymentProofDialog = ({ paymentProofUrl }: { paymentProofUrl: string | null }) => {
  if (!paymentProofUrl) {
    return (
      <span className="text-muted-foreground text-sm">No proof uploaded</span>
    )
  }

  const imageUrl = paymentProofUrl.startsWith('http') 
    ? paymentProofUrl 
    : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.29:3000'}${paymentProofUrl}`

  return (
    <Dialog>
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
        <div className="flex justify-center items-center p-4">
          <img
            src={imageUrl}
            alt="Payment proof"
            className="max-w-full max-h-[70vh] object-contain rounded-lg border"
          />
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

  const explorerUrl = `https://bscscan.com/tx/${hash}`

  return (
    <div className="flex items-center gap-2">
      <code className="text-xs font-mono bg-muted px-2 py-1 rounded max-w-[200px] truncate">
        {hash}
      </code>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={() => window.open(explorerUrl, '_blank')}
        title="View on BSCScan"
      >
        <ExternalLink className="h-3 w-3" />
      </Button>
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

// Define columns
const columns: ColumnDef<DepositRequestItem>[] = [
  {
    id: 'id',
    accessorKey: 'id',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.original.id}</div>
    ),
  },
  {
    id: 'amount',
    accessorKey: 'amount',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Amount" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-semibold">
        <DollarSign className="h-4 w-4 text-green-600" />
        <span>{parseFloat(row.original.amount).toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 8 
        })} USDT</span>
      </div>
    ),
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
    id: 'transaction_hash',
    accessorKey: 'transaction_hash',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Transaction Hash" />
    ),
    cell: ({ row }) => <TransactionHashCell hash={row.original.transaction_hash} />,
  },
  {
    id: 'payment_proof_url',
    accessorKey: 'payment_proof_url',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment Proof" />
    ),
    cell: ({ row }) => (
      <PaymentProofDialog paymentProofUrl={row.original.payment_proof_url} />
    ),
  },
  {
    id: 'admin_notes',
    accessorKey: 'admin_notes',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Admin Notes" />
    ),
    cell: ({ row }) => <AdminNotesCell notes={row.original.admin_notes} />,
  },
  {
    id: 'created_at',
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-sm">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>
          {format(new Date(row.original.created_at), 'MMM dd, yyyy HH:mm')}
        </span>
      </div>
    ),
  },
  {
    id: 'updated_at',
    accessorKey: 'updated_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Updated At" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-sm">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>
          {format(new Date(row.original.updated_at), 'MMM dd, yyyy HH:mm')}
        </span>
      </div>
    ),
  },
]

export default function MyDepositPage() {
  const { token } = useAuth()
  const [depositRequests, setDepositRequests] = useState<DepositRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [perPage, setPerPage] = useQueryState('perPage', parseAsInteger.withDefault(10))
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchDepositRequests = async (currentPage: number, currentLimit: number) => {
    if (!token) {
      setError('Authentication required')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await getUserDepositRequests(currentPage, currentLimit, token)
      
      if (response.success && response.data) {
        setDepositRequests(response.data.requests || [])
        // If pagination info is available, use it; otherwise calculate
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages)
          setTotal(response.data.pagination.total)
        } else {
          // Fallback: assume more pages if we got a full page
          setTotalPages(response.data.requests.length === currentLimit ? currentPage + 1 : currentPage)
          setTotal(response.data.requests.length)
        }
      } else {
        setError('Failed to fetch deposit requests')
      }
    } catch (err) {
      console.error('Error fetching deposit requests:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch deposit requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (page && perPage) {
      fetchDepositRequests(page, perPage)
    }
  }, [page, perPage, token])

  // Recalculate pageCount based on total
  const pageCount = useMemo(() => {
    if (totalPages > 0) return totalPages
    if (total > 0 && perPage) return Math.ceil(total / perPage)
    return 1
  }, [totalPages, total, perPage])

  if (loading && depositRequests.length === 0) {
    return (
      <MainLayout>
        <div className="container mx-auto py-10">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Clock className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading deposit requests...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error && depositRequests.length === 0) {
    return (
      <MainLayout>
        <div className="container mx-auto py-10">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{error}</p>
              <Button 
                onClick={() => {
                  if (page && perPage) {
                    fetchDepositRequests(page, perPage)
                  }
                }} 
                className="mt-4"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Deposit Requests</h1>
              <p className="text-muted-foreground mt-2">
                View and track the status of your USDT deposit requests
              </p>
            </div>
          </div>

          {depositRequests.length === 0 && !loading ? (
            <Card>
              <CardContent className="py-10">
                <div className="text-center">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Deposit Requests</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't submitted any deposit requests yet.
                  </p>
                  <Button onClick={() => window.location.href = '/funds/deposit'}>
                    Make a Deposit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <AppDataTable
              data={depositRequests}
              columns={columns}
              pageCount={pageCount}
            />
          )}

          {error && depositRequests.length > 0 && (
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

