'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { MainLayout } from '@/components/main-layout'
import { AppDataTable } from '@/components/app-data-table'
import { useAuth } from '@/contexts/auth-context'
import { getUserDepositRequests, type DepositRequestItem } from '@/utils/operations'
import { binanceDepositApi, type DepositListItem, type BinanceDepositStatusResponse, type DepositListResponse } from '@/lib/api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import toast from 'react-hot-toast'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
  FileText,
  Eye
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
    : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://graybulls.com'}${paymentProofUrl}`

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

// Binance deposit status cell with eye icon
const BinanceStatusCell = ({ merchantTradeNo, token }: { merchantTradeNo?: string; token: string | null }) => {
  const [statusData, setStatusData] = useState<BinanceDepositStatusResponse['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchStatus = async () => {
    if (!merchantTradeNo || !token) {
      toast.error('Merchant trade number or authentication token is missing');
      return;
    }
    
    setLoading(true);
    try {
      const response = await binanceDepositApi.getStatus(merchantTradeNo, token);
      console.log('Binance status response (full):', JSON.stringify(response, null, 2));
      
      if (response.success) {
        // apiCall returns ApiResponse<BinanceDepositStatusResponse>
        // So response.data is BinanceDepositStatusResponse
        // BinanceDepositStatusResponse has structure: { success, message, data: { ...status info... } }
        // So we need to access response.data.data to get the actual status data
        
        let statusData: BinanceDepositStatusResponse['data'] | null = null;
        
        if (response.data) {
          // Check if response.data has the nested structure (BinanceDepositStatusResponse)
          if (typeof response.data === 'object' && 'data' in response.data) {
            const statusResponse = response.data as BinanceDepositStatusResponse;
            statusData = statusResponse.data;
          } 
          // Check if response.data is directly the status data (fallback)
          else if (typeof response.data === 'object' && 'deposit_uuid' in response.data && 'merchant_trade_no' in response.data) {
            statusData = response.data as BinanceDepositStatusResponse['data'];
          }
        }
        
        if (statusData) {
          console.log('Status data extracted:', statusData);
          setStatusData(statusData);
        } else {
          console.error('Could not extract status data. Response structure:', response);
          toast.error('Status data not available');
        }
      } else {
        toast.error(response.message || 'Failed to fetch status');
      }
    } catch (error) {
      console.error('Error fetching Binance status:', error);
      toast.error('Failed to fetch deposit status');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !statusData && merchantTradeNo) {
      fetchStatus();
    }
  };

  // Show eye icon even if merchant_trade_no is not available yet
  // The button will be disabled or show a message when clicked
  if (!merchantTradeNo) {
    return (
      <Button variant="ghost" size="sm" className="h-8" disabled title="Merchant trade number not available yet">
        <Eye className="h-4 w-4 mr-2 opacity-50" />
        <span className="text-xs text-muted-foreground">N/A</span>
      </Button>
    );
  }

  const getStatusBadge = (status: number, binanceStatus: string) => {
    if (status === 1) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Approved</Badge>;
    } else if (status === 2) {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Rejected</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">Pending</Badge>;
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
            Current status of your Binance Pay deposit
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : statusData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Deposit Status</Label>
                <div className="mt-1">
                  {getStatusBadge(statusData.deposit_status, statusData.binance_status)}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Binance Status</Label>
                <div className="mt-1 font-medium">{statusData.binance_status}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Amount</Label>
                <div className="mt-1 font-medium">{statusData.amount} {statusData.currency}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Merchant Trade No</Label>
                <div className="mt-1 font-mono text-sm">{statusData.merchant_trade_no}</div>
              </div>
              {statusData.transaction_id && (
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Transaction ID</Label>
                  <div className="mt-1 font-mono text-sm break-all">{statusData.transaction_id}</div>
                </div>
              )}
              {statusData.transaction_time && (
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Transaction Time</Label>
                  <div className="mt-1 text-sm">
                    {new Date(statusData.transaction_time).toLocaleString()}
                  </div>
                </div>
              )}
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

// Define columns for Binance deposits
const binanceColumns: ColumnDef<DepositListItem>[] = [
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
          {format(new Date(row.original.created_at), 'MMM dd, yyyy HH:mm')}
        </span>
      </div>
    ),
  },
  {
    id: 'status_action',
    header: 'Actions',
    cell: ({ row }) => (
      <BinanceStatusCell 
        merchantTradeNo={row.original.merchant_trade_no} 
        token={null} // Will be passed from parent via column mapping
      />
    ),
  },
];

export default function MyDepositPage() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState<"local" | "crypto">("local")
  const [depositRequests, setDepositRequests] = useState<DepositRequestItem[]>([])
  const [binanceDeposits, setBinanceDeposits] = useState<DepositListItem[]>([])
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

  const fetchBinanceDeposits = async (currentPage: number, currentLimit: number) => {
    if (!token) {
      setError('Authentication required')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await binanceDepositApi.getList(currentPage, currentLimit, token)
      
      console.log('Binance deposits response:', response)
      
      if (response.success && response.data) {
        // apiCall returns ApiResponse<T>, so response.data is DepositListResponse
        // DepositListResponse has { success: boolean, data: DepositListItem[], pagination: {...} }
        const listResponse = response.data as DepositListResponse;
        
        // Handle both possible structures:
        // 1. response.data is DepositListResponse with nested data
        // 2. response.data is directly the array (if apiCall unwraps it)
        let deposits: DepositListItem[] = [];
        let pagination: DepositListResponse['pagination'] | undefined;
        
        if (Array.isArray(listResponse)) {
          // If response.data is directly an array
          deposits = listResponse;
        } else if (Array.isArray(listResponse.data)) {
          // If response.data is DepositListResponse with nested data
          deposits = listResponse.data;
          pagination = listResponse.pagination;
        } else if (Array.isArray((listResponse as unknown as { data?: DepositListItem[] })?.data)) {
          // Fallback: try to access data property
          deposits = (listResponse as unknown as { data: DepositListItem[] }).data;
          pagination = (listResponse as unknown as { pagination?: DepositListResponse['pagination'] }).pagination;
        }
        
        console.log('Binance deposits array:', deposits)
        console.log('Pagination:', pagination)
        
        setBinanceDeposits(deposits)
        
        if (pagination) {
          setTotalPages(pagination.last_page || pagination.current_page)
          setTotal(pagination.total)
        } else {
          setTotalPages(1)
          setTotal(deposits.length)
        }
      } else {
        setError('Failed to fetch Binance deposits')
      }
    } catch (err) {
      console.error('Error fetching Binance deposits:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch Binance deposits')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (page && perPage) {
      if (activeTab === 'local') {
        fetchDepositRequests(page, perPage)
      } else {
        fetchBinanceDeposits(page, perPage)
      }
    }
  }, [page, perPage, token, activeTab])

  // Recalculate pageCount based on total
  const pageCount = useMemo(() => {
    if (totalPages > 0) return totalPages
    if (total > 0 && perPage) return Math.ceil(total / perPage)
    return 1
  }, [totalPages, total, perPage])

  if (loading && depositRequests.length === 0 && binanceDeposits.length === 0) {
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

  if (error && depositRequests.length === 0 && binanceDeposits.length === 0) {
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

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "local" | "crypto")} className="space-y-6">
            <TabsList>
              <TabsTrigger value="local">Local</TabsTrigger>
              <TabsTrigger value="crypto">Crypto currency</TabsTrigger>
            </TabsList>

            <TabsContent value="local" className="space-y-6">
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
            </TabsContent>

            <TabsContent value="crypto" className="space-y-6">
              {binanceDeposits.length === 0 && !loading ? (
                <Card>
                  <CardContent className="py-10">
                    <div className="text-center">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Binance Deposits</h3>
                      <p className="text-muted-foreground mb-4">
                        You haven&apos;t made any Binance Pay deposits yet.
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
                          // merchant_trade_no will be available in the response soon
                          // For now, it might be undefined, so we handle that gracefully
                          const merchantTradeNo = row.original.merchant_trade_no;
                          return (
                            <BinanceStatusCell 
                              merchantTradeNo={merchantTradeNo} 
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

              {error && binanceDeposits.length > 0 && (
                <Card className="border-yellow-500">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                      <Clock className="h-4 w-4" />
                      <p className="text-sm">{error}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  )
}

