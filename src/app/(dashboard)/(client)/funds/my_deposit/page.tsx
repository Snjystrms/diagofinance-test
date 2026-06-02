'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppDataTable } from '@/components/app-data-table'
import { ApiErrorState } from '@/components/errors/api-error-state'
import { ClientTablePageSkeleton } from '@/components/loading/client-page-skeletons'
import { useAuth } from '@/contexts/auth-context'
import { getUserDepositRequests, type DepositRequestItem } from '@/utils/operations'
import { binanceDepositApi, coinsbuyDepositApi, type DepositListItem, type BinanceDepositStatusResponse, type CoinsBuyDepositStatusResponse, type DepositListResponse } from '@/lib/api'
import { getFriendlyErrorMessage } from '@/lib/friendly-errors'
import { CLIENT_WALLET_REFRESH_EVENT } from '@/lib/client-events'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import toast from 'react-hot-toast'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { SerialNumberCell } from '@/components/data-table/serial-number-cell'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Image as ImageIcon,
  DollarSign,
  Hash,
  Calendar,
  FileText,
  Eye
} from 'lucide-react'
import { formatDateTimeInIST } from '@/lib/formatters'
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
  const authCtx = useAuth?.()
  const token = authCtx?.token || (typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : '')

  const [open, setOpen] = useState(false)
  const [blobUrl, setBlobUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

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

// Deposit status cell with eye icon - handles both Binance Pay and Coinsbuy
const DepositStatusCell = ({ deposit, token }: { deposit: DepositListItem; token: string | null }) => {
  const [binanceStatusData, setBinanceStatusData] = useState<BinanceDepositStatusResponse['data'] | null>(null);
  const [coinsbuyStatusData, setCoinsbuyStatusData] = useState<CoinsBuyDepositStatusResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const paymentMethodId = deposit.payment_method_id || deposit.paymentMethod?.id;
  const isBinancePay = paymentMethodId === 1;
  const isCoinsbuy = paymentMethodId === 3;

  const fetchStatus = async () => {
    if (!token) {
      toast.error('Please sign in again to continue.');
      return;
    }
    
    setLoading(true);
    try {
      if (isBinancePay && deposit.merchant_trade_no) {
        const response = await binanceDepositApi.getStatus(deposit.merchant_trade_no, token);
        console.log('Binance status response (full):', JSON.stringify(response, null, 2));
        
        if (response.success) {
          let statusData: BinanceDepositStatusResponse['data'] | null = null;
          
          if (response.data) {
            if (typeof response.data === 'object' && 'data' in response.data) {
              const statusResponse = response.data as BinanceDepositStatusResponse;
              statusData = statusResponse.data;
            } else if (typeof response.data === 'object' && 'deposit_uuid' in response.data && 'merchant_trade_no' in response.data) {
              statusData = response.data as BinanceDepositStatusResponse['data'];
            }
          }
          
          if (statusData) {
            console.log('Status data extracted:', statusData);
            setBinanceStatusData(statusData);
          } else {
            console.error('Could not extract status data. Response structure:', response);
            toast.error('Status data not available');
          }
        } else {
          toast.error(getFriendlyErrorMessage(response.message || 'Unable to fetch status', {
            audience: 'client',
            resource: 'deposit status',
            action: 'load',
          }));
        }
      } else if (isCoinsbuy && deposit.coinsbuy_deposit_id) {
        const response = await coinsbuyDepositApi.getStatus(deposit.coinsbuy_deposit_id, token);
        console.log('Coinsbuy status response (full):', JSON.stringify(response, null, 2));
        
        if (response.success) {
          let statusData: CoinsBuyDepositStatusResponse['data'] | null = null;
          
          if (response.data) {
            if (typeof response.data === 'object' && 'data' in response.data) {
              const statusResponse = response.data as CoinsBuyDepositStatusResponse;
              statusData = statusResponse.data;
            } else if (typeof response.data === 'object' && 'deposit_uuid' in response.data && 'coinsbuy_deposit_id' in response.data) {
              statusData = response.data as CoinsBuyDepositStatusResponse['data'];
            }
          }
          
          if (statusData) {
            console.log('Coinsbuy status data extracted:', statusData);
            setCoinsbuyStatusData(statusData);
          } else {
            console.error('Could not extract status data. Response structure:', response);
            toast.error('Status data not available');
          }
        } else {
          toast.error(getFriendlyErrorMessage(response.message || 'Unable to fetch status', {
            audience: 'client',
            resource: 'deposit status',
            action: 'load',
          }));
        }
      } else {
        toast.error('Required information not available for this deposit type');
      }
    } catch (error) {
      console.error('Error fetching deposit status:', error);
      toast.error(getFriendlyErrorMessage(error, {
        audience: 'client',
        resource: 'deposit status',
        action: 'load',
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !binanceStatusData && !coinsbuyStatusData) {
      fetchStatus();
    }
  };

  // Check if we have the required identifier for the payment method
  const hasRequiredIdentifier = (isBinancePay && deposit.merchant_trade_no) || (isCoinsbuy && deposit.coinsbuy_deposit_id);
  
  if (!hasRequiredIdentifier) {
    return (
      <Button variant="ghost" size="sm" className="h-8" disabled title="Status information not available yet">
        <Eye className="h-4 w-4 mr-2 opacity-50" />
        <span className="text-xs text-muted-foreground">N/A</span>
      </Button>
    );
  }

  const getStatusBadge = (status: number, additionalStatus?: string | number) => {
    if (status === 1) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Approved</Badge>;
    } else if (status === 2) {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Rejected</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">Pending</Badge>;
  };

  const getCoinsbuyStatusText = (status: number) => {
    const statusMap: Record<number, string> = {
      0: 'Pending',
      1: 'Processing',
      2: 'Confirmed',
      3: 'Failed',
    };
    return statusMap[status] || `Status ${status}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8">
          <Eye className="h-4 w-4 mr-2" />
          View Status
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Deposit Status</DialogTitle>
          <DialogDescription>
            Current status of your {isBinancePay ? 'Binance Pay' : isCoinsbuy ? 'Coinsbuy' : 'deposit'}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : binanceStatusData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Deposit Status</Label>
                <div className="mt-1">
                  {getStatusBadge(binanceStatusData.deposit_status, binanceStatusData.binance_status)}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Binance Status</Label>
                <div className="mt-1 font-medium">{binanceStatusData.binance_status}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Amount</Label>
                <div className="mt-1 font-medium">{binanceStatusData.amount} {binanceStatusData.currency}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Merchant Trade No</Label>
                <div className="mt-1 font-mono text-sm">{binanceStatusData.merchant_trade_no}</div>
              </div>
              {binanceStatusData.transaction_id && (
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Transaction ID</Label>
                  <div className="mt-1 font-mono text-sm break-all">{binanceStatusData.transaction_id}</div>
                </div>
              )}
              {binanceStatusData.transaction_time && (
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Transaction Time</Label>
                  <div className="mt-1 text-sm">
                    {formatDateTimeInIST(binanceStatusData.transaction_time)}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : coinsbuyStatusData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Deposit Status</Label>
                <div className="mt-1">
                  {getStatusBadge(coinsbuyStatusData.deposit_status, coinsbuyStatusData.coinsbuy_status)}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Coinsbuy Status</Label>
                <div className="mt-1 font-medium">{getCoinsbuyStatusText(coinsbuyStatusData.coinsbuy_status)}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Coinsbuy Deposit ID</Label>
                <div className="mt-1 font-mono text-sm">{coinsbuyStatusData.coinsbuy_deposit_id}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tracking ID</Label>
                <div className="mt-1 font-mono text-sm">{coinsbuyStatusData.tracking_id}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Confirmations Needed</Label>
                <div className="mt-1 font-medium">{coinsbuyStatusData.confirmations_needed}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            No status data available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// Define columns for local deposits
const localColumns: ColumnDef<DepositRequestItem>[] = [
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
          {formatDateTimeInIST(row.original.created_at)}
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
          {formatDateTimeInIST(row.original.updated_at)}
        </span>
      </div>
    ),
  },
]

// Define columns for Binance deposits
const binanceColumns: ColumnDef<DepositListItem>[] = [
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
    cell: ({ row }) => {
      const statusMap: Record<number, string> = { 0: 'pending', 1: 'approved', 2: 'rejected' };
      return <StatusBadge status={statusMap[row.original.status] || 'pending'} />;
    },
  },
  {
    id: 'paymentMethod',
    accessorKey: 'paymentMethod.type',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment Method" />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.paymentMethod?.type || 'N/A'}</Badge>
    ),
  },
  {
    id: 'user_comment',
    accessorKey: 'user_comment',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="User Comment" />
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.original.user_comment || '-'}</span>
    ),
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
          {formatDateTimeInIST(row.original.created_at)}
        </span>
      </div>
    ),
  },
  {
    id: 'status_action',
    header: 'Actions',
    cell: ({ row }) => (
      <DepositStatusCell 
        deposit={row.original} 
        token={null} // Will be passed from parent via column mapping
      />
    ),
  },
];

export default function MyDepositPage() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState<"On-Chain" | "crypto">("On-Chain")
  const [error] = useState<unknown | null>(null)
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [perPage, setPerPage] = useQueryState('perPage', parseAsInteger.withDefault(10))

  const { data: localDepositsData, isLoading: localLoading, refetch: refetchLocalDeposits, error: localDepositsError } = useQuery({
    queryKey: ['myDeposits', 'local', token, page, perPage],
    queryFn: () => getUserDepositRequests(page, perPage, token!),
    enabled: Boolean(token) && activeTab === 'On-Chain',
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  })

  const { data: cryptoDepositsData, isLoading: cryptoLoading, refetch: refetchCryptoDeposits, error: cryptoDepositsError } = useQuery({
    queryKey: ['myDeposits', 'crypto', token, page, perPage],
    queryFn: () => binanceDepositApi.getList(page, perPage, token!),
    enabled: Boolean(token) && activeTab === 'crypto',
    staleTime: 30 * 1000,
    placeholderData: (prev) => prev,
  })

  const loading = activeTab === 'On-Chain' ? localLoading : cryptoLoading

  const depositRequests: DepositRequestItem[] = localDepositsData?.data?.requests ?? []
  const localTotalPages = localDepositsData?.data?.pagination?.totalPages ?? 1
  const localTotal = localDepositsData?.data?.pagination?.total ?? depositRequests.length

  const cryptoRaw = cryptoDepositsData?.data as unknown
  let binanceDeposits: DepositListItem[] = []
  let cryptoTotalPages = 1
  let cryptoTotal = 0
  if (cryptoRaw) {
    const lr = cryptoRaw as { data?: DepositListItem[]; pagination?: { last_page?: number; current_page?: number; total?: number } }
    if (Array.isArray(lr)) {
      binanceDeposits = lr as DepositListItem[]
    } else if (Array.isArray(lr.data)) {
      binanceDeposits = lr.data
      if (lr.pagination) {
        cryptoTotalPages = lr.pagination.last_page ?? lr.pagination.current_page ?? 1
        cryptoTotal = lr.pagination.total ?? binanceDeposits.length
      }
    }
  }
  const totalPages = activeTab === 'On-Chain' ? localTotalPages : cryptoTotalPages
  const total = activeTab === 'On-Chain' ? localTotal : cryptoTotal
  const activeError = error ?? (activeTab === 'On-Chain' ? localDepositsError : cryptoDepositsError)



  // Recalculate pageCount based on total
  const pageCount = useMemo(() => {
    if (totalPages > 0) return totalPages
    if (total > 0 && perPage) return Math.ceil(total / perPage)
    return 1
  }, [totalPages, total, perPage])

  useEffect(() => {
    const handleWalletRefresh = () => {
      void refetchLocalDeposits()
      void refetchCryptoDeposits()
    }

    window.addEventListener(CLIENT_WALLET_REFRESH_EVENT, handleWalletRefresh)
    return () => {
      window.removeEventListener(CLIENT_WALLET_REFRESH_EVENT, handleWalletRefresh)
    }
  }, [refetchCryptoDeposits, refetchLocalDeposits])

  if (loading && depositRequests.length === 0 && binanceDeposits.length === 0) {
    return (
      <ClientTablePageSkeleton columnCount={8} rowCount={8} />
    )
  }

  if (activeError && depositRequests.length === 0 && binanceDeposits.length === 0) {
    return (
      
        <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
          <ApiErrorState
            error={activeError}
            audience="client"
            resource="deposit requests"
            action="load"
            variant="panel"
            onRetry={() => {
              if (activeTab === "On-Chain") {
                void refetchLocalDeposits()
                return
              }

              void refetchCryptoDeposits()
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
                View and track the status of your USDT deposit requests
              </p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "On-Chain" | "crypto")} className="space-y-6">
            <TabsList>
              <TabsTrigger value="On-Chain">On-Chain</TabsTrigger>
              <TabsTrigger value="crypto">Crypto currency</TabsTrigger>
            </TabsList>

            <TabsContent value="On-Chain" className="space-y-6">
              {depositRequests.length === 0 && !loading ? (
                <Card>
                  <CardContent className="py-10">
                    <div className="text-center">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Deposit Requests</h3>
                      <p className="text-muted-foreground mb-4">
                        You haven&apos;t submitted any deposit requests yet.
                      </p>
                      <Button onClick={() => window.location.href = '/funds/deposit'}>
                        Make a Deposit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <AppDataTable<DepositRequestItem>
                  data={depositRequests}
                  columns={localColumns}
                  pageCount={pageCount}
                />
              )}

              {activeError && depositRequests.length > 0 && (
                <ApiErrorState
                  error={activeError}
                  audience="client"
                  resource="deposit requests"
                  action="load"
                  variant="inline"
                  onRetry={() => {
                    void refetchLocalDeposits()
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="crypto" className="space-y-6">
              {binanceDeposits.length === 0 && !loading ? (
                <Card>
                  <CardContent className="py-10">
                    <div className="text-center">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Crypto Currency Deposits</h3>
                      <p className="text-muted-foreground mb-4">
                        You haven&apos;t made any Crypto Currency deposits yet.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <AppDataTable<DepositListItem>
                  data={binanceDeposits}
                  columns={binanceColumns.map(col => {
                    if (col.id === 'status_action') {
                      return {
                        ...col,
                        cell: ({ row }) => {
                          return (
                            <DepositStatusCell 
                              deposit={row.original} 
                              token={token}
                            />
                          );
                        },
                      };
                    }
                    return col;
                  })}
                  pageCount={pageCount}
                />
              )}

              {activeError && binanceDeposits.length > 0 && (
                <ApiErrorState
                  error={activeError}
                  audience="client"
                  resource="crypto deposits"
                  action="load"
                  variant="inline"
                  onRetry={() => {
                    void refetchCryptoDeposits()
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    
  )
}



