'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { AppDataTable } from '@/components/app-data-table'
import { ApiErrorState } from '@/components/errors/api-error-state'
import { ListPageSkeleton } from '@/components/loading/page-loading-skeleton'
import { useAuth } from '@/contexts/auth-context'
import { withdrawalApi, type WithdrawalItem } from '@/lib/api'
import { getFriendlyErrorMessage } from '@/lib/friendly-errors'
import { CLIENT_WALLET_REFRESH_EVENT, notifyWalletRefresh } from '@/lib/client-events'
import { authApi, type UserBankDetailsData } from '@/lib/api-auth-admin'
import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header'
import { SerialNumberCell } from '@/components/data-table/serial-number-cell'
import {formatApiDateTimeAsIST} from '@/lib/formatters'
import { 
  Clock, 
  CheckCircle, 
  CheckCircle2,
  XCircle, 
  ExternalLink,
  DollarSign,
  Hash,
  Calendar,
  Wallet,
  Network,
  ArrowUpRight,
  RefreshCw,
  Plus,
  AlertCircle,
  Copy,
  Check,
  Eye,
  Landmark,
  Banknote,
  Coins,
  User,
  Info,
  TrendingDown,
} from 'lucide-react'
import { formatDateTimeInIST } from '@/lib/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useQueryState, parseAsInteger } from 'nuqs'
import { useRouter } from 'next/navigation'

const formatDateTime = (value?: string | null): string => {
  if (!value) return "-";
  try {
    return formatApiDateTimeAsIST(value);
  } catch {
    return String(value);
  }
};
// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string, icon: React.ReactNode }> = {
    pending: {
      variant: 'secondary',
      className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800',
      icon: <Clock className="h-3 w-3 mr-1" />
    },
    processing: {
      variant: 'secondary',
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-800',
      icon: <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
    },
    approved: {
      variant: 'default',
      className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-800',
      icon: <CheckCircle className="h-3 w-3 mr-1" />
    },
    completed: {
      variant: 'default',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
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

// Transaction hash cell with explorer link
const TransactionHashCell = ({ hash, chainId }: { hash: string | null, chainId: string }) => {
  if (!hash) {
    return <span className="text-muted-foreground text-sm">Pending</span>
  }

  // Determine explorer URL based on chain_id
  let explorerUrl = ''
  if (chainId === 'TRC20') {
    explorerUrl = `https://tronscan.org/#/transaction/${hash}`
  } else if (chainId === 'ERC20' || chainId === 'ETH') {
    explorerUrl = `https://etherscan.io/tx/${hash}`
  } else if (chainId === 'BEP20' || chainId === 'BSC') {
    explorerUrl = `https://bscscan.com/tx/${hash}`
  } else {
    explorerUrl = `https://bscscan.com/tx/${hash}` // Default to BSCScan
  }

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
        title={`View on ${chainId} Explorer`}
      >
        <ExternalLink className="h-3 w-3" />
      </Button>
    </div>
  )
}

// Wallet address cell
const WalletAddressCell = ({ address }: { address?: string | null }) => {
  const [copied, setCopied] = React.useState(false)

  if (!address) {
    return <span className="text-muted-foreground text-sm">N/A</span>
  }
  const truncatedAddress = `${address.slice(0, 8)}...${address.slice(-8)}`
  
  return (
    <div className="flex items-center gap-2">
      <Wallet className="h-4 w-4 text-muted-foreground" />
      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
        {truncatedAddress}
      </code>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0"
        onClick={() => {
          navigator.clipboard.writeText(address)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
        title="Copy full address"
      >
        {copied ? (
          <Check className="h-3 w-3 text-emerald-600" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  )
}

// Chain ID badge
const ChainBadge = ({ chainId }: { chainId?: string | null }) => {
  if (!chainId) {
    return (
      <Badge variant="outline" className="w-fit bg-muted text-muted-foreground">
        N/A
      </Badge>
    )
  }
  const chainColors: Record<string, string> = {
    TRC20: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-300 dark:border-orange-800',
    ERC20: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-800',
    BEP20: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800',
    BSC: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800',
    ETH: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-800',
  }

  const colorClass = chainColors[chainId] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 border-gray-300 dark:border-gray-800'

  return (
    <Badge 
      variant="outline"
      className={`${colorClass} flex items-center gap-1 w-fit`}
    >
      <Network className="h-3 w-3" />
      <span>{chainId}</span>
    </Badge>
  )
}

// Source badge (Main Wallet vs MT5)
const SourceBadge = ({ source, mt5Id }: { source: string | null; mt5Id: number | string | null }) => {
  const isMt5 = source === 'mt5'

  return (
    <Badge 
      variant="outline"
      className={`flex items-center gap-1 w-fit ${
        isMt5 
          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-300 dark:border-purple-800'
          : 'bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-400 border-sky-300 dark:border-sky-800'
      }`}
    >
      {isMt5 ? (
        <>
          <TrendingDown className="h-3 w-3" />
          <span>MT5 {mt5Id ? `#${mt5Id}` : ''}</span>
        </>
      ) : (
        <>
          <Wallet className="h-3 w-3" />
          <span>Main Wallet</span>
        </>
      )}
    </Badge>
  )
}

// Destination type badge
const DestinationTypeBadge = ({ paymentMethodType, paymentMethodName }: { paymentMethodType?: string | null; paymentMethodName?: string | null }) => {
  const name = paymentMethodName?.toLowerCase() || ''
  const type = paymentMethodType?.toLowerCase() || ''

  if (type === 'cash' || name.includes('cash')) {
    return (
      <Badge variant="outline" className="flex items-center gap-1 w-fit bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-800">
        <Banknote className="h-3 w-3" />
        <span>Cash</span>
      </Badge>
    )
  }
  if (name.includes('bank') || type === 'bank_transfer') {
    return (
      <Badge variant="outline" className="flex items-center gap-1 w-fit bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-800">
        <Landmark className="h-3 w-3" />
        <span>Bank</span>
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="flex items-center gap-1 w-fit bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-300 dark:border-orange-800">
      <Coins className="h-3 w-3" />
      <span>Crypto</span>
    </Badge>
  )
}

// Bank details cell for destination column
const BankDestinationCell = ({ 
  bankDetailId, 
  token 
}: { 
  bankDetailId?: number | null
  token: string | null
}) => {
  const [bankDetails, setBankDetails] = React.useState<UserBankDetailsData | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchBankDetails = async () => {
      if (!bankDetailId || !token) {
        setLoading(false)
        return
      }

      try {
        const response = await authApi.getBankDetails(token)
        
        // Handle response - check if data is directly an array or wrapped
        let bankList: UserBankDetailsData[] = []
        
        if (Array.isArray(response)) {
          bankList = response
        } else if (response.success && response.data) {
          if (Array.isArray(response.data)) {
            bankList = response.data
          }
        } else if (response.data && Array.isArray(response.data)) {
          bankList = response.data
        }
        
        const foundBank = bankList.find((bank: UserBankDetailsData) => bank.id === bankDetailId)
        
        if (foundBank) {
          setBankDetails(foundBank)
        }
      } catch (error) {
        console.error('Error fetching bank details:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchBankDetails()
  }, [bankDetailId, token])

  if (loading) {
    return <span className="text-muted-foreground text-sm">Loading...</span>
  }

  if (!bankDetails) {
    return <span className="text-muted-foreground text-sm">N/A</span>
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium text-sm">{bankDetails.account_holder_name}</span>
      <span className="text-xs text-muted-foreground">{bankDetails.bank_name}</span>
    </div>
  )
}

// Bank account info cell for account info column
const BankAccountInfoCell = ({ 
  bankDetailId, 
  token 
}: { 
  bankDetailId?: number | null
  token: string | null
}) => {
  const [bankDetails, setBankDetails] = React.useState<UserBankDetailsData | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchBankDetails = async () => {
      if (!bankDetailId || !token) {
        setLoading(false)
        return
      }

      try {
        const response = await authApi.getBankDetails(token)
        
        // Handle response - check if data is directly an array or wrapped
        let bankList: UserBankDetailsData[] = []
        
        if (Array.isArray(response)) {
          bankList = response
        } else if (response.success && response.data) {
          if (Array.isArray(response.data)) {
            bankList = response.data
          }
        } else if (response.data && Array.isArray(response.data)) {
          bankList = response.data
        }
        
        const foundBank = bankList.find((bank: UserBankDetailsData) => bank.id === bankDetailId)
        
        if (foundBank) {
          setBankDetails(foundBank)
        }
      } catch (error) {
        console.error('Error fetching bank details:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchBankDetails()
  }, [bankDetailId, token])

  if (loading) {
    return <span className="text-muted-foreground text-sm">Loading...</span>
  }

  if (!bankDetails) {
    return <span className="text-muted-foreground text-sm">N/A</span>
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-mono text-muted-foreground">
        {bankDetails.account_number}
      </div>
      {bankDetails.swift_ifsc_code && (
        <div className="text-xs text-muted-foreground">
          SWIFT/IFSC: {bankDetails.swift_ifsc_code}
        </div>
      )}
      {bankDetails.country && (
        <div className="text-xs text-muted-foreground">
          {bankDetails.country}
        </div>
      )}
    </div>
  )
}

// Define columns
const createColumns = (
  token: string | null,
  onView: (item: WithdrawalItem) => void,
): ColumnDef<WithdrawalItem>[] => [
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
      <DataTableColumnHeader column={column} title="Amount (USD)" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2 font-semibold">
        <DollarSign className="h-4 w-4 text-red-600" />
        <span>{row.original.amount.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 8 
        })}</span>
      </div>
    ), 
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: 'source',
    accessorKey: 'source',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Source" />
    ),
    cell: ({ row }) => (
      <SourceBadge source={row.original.source ?? 'wallet'} mt5Id={row.original.mt5_id ?? row.original.mt5_user_id} />
    ),
    enableColumnFilter: false,
    enableSorting: false,
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
    enableColumnFilter: false,
    enableSorting: false,
  },
   {
    id: 'payment_method_name',
    accessorKey: 'payment_method_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Payment Method" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-sm whitespace-nowrap">
        <Wallet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span>
          {row.original.payment_method_name || '-'}
        </span>
      </div>
    ),
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: 'destination_info',
    accessorKey: 'destination_info',
    meta: { mobileHidden: true },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Destination" />
    ),
    cell: ({ row }) => {
      const isBankTransfer = row.original.payment_method_name?.toLowerCase().includes('bank') || 
                             row.original.bank_detail_id
      const isCash = row.original.payment_method_type?.toLowerCase() === 'cash' ||
                     row.original.payment_method_name?.toLowerCase().includes('cash')
      const isMt5Source = row.original.source === 'mt5'

      if (isBankTransfer && row.original.bank_detail_id) {
        return <BankDestinationCell bankDetailId={row.original.bank_detail_id} token={token} />
      } else if (isCash) {
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-800 w-fit">
            <DollarSign className="h-3 w-3" />
            <span>Cash</span>
          </Badge>
        )
      } else if (isMt5Source && row.original.mt5_id) {
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-300 dark:border-purple-800 w-fit">
            <span>MT5 {row.original.mt5_id}</span>
          </Badge>
        )
      } else if (row.original.chain_id) {
        return <ChainBadge chainId={row.original.chain_id} />
      }
      return <span className="text-muted-foreground text-sm">N/A</span>
    },
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: 'account_info',
    accessorKey: 'account_info',
    meta: { mobileHidden: true },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Account Info" />
    ),
    cell: ({ row }) => {
      const isBankTransfer = row.original.payment_method_name?.toLowerCase().includes('bank') || 
                             row.original.bank_detail_id
      const isCash = row.original.payment_method_type?.toLowerCase() === 'cash' ||
                     row.original.payment_method_name?.toLowerCase().includes('cash')
      const isMt5Source = row.original.source === 'mt5'

      if (isBankTransfer && row.original.bank_detail_id) {
        return <BankAccountInfoCell bankDetailId={row.original.bank_detail_id} token={token} />
      } else if (isMt5Source && row.original.mt5_id) {
        return (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">MT5 Login:</span>
            <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
              {row.original.mt5_id}
            </code>
          </div>
        )
      } else if (!isBankTransfer && !isCash && row.original.wallet_address) {
        return <WalletAddressCell address={row.original.wallet_address} />
      }
      return <span className="text-muted-foreground text-sm">-</span>
    },
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: 'created_at',
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created At" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-sm whitespace-nowrap">
        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span>
          {formatDateTime(row.original.created_at)}
        </span>
      </div>
    ),
    enableColumnFilter: false,
    enableSorting: false,
  },
  {
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    enableColumnFilter: false,
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onView(row.original)}
        aria-label="View withdrawal details"
        title="View details"
      >
        <Eye className="h-4 w-4" />
      </Button>
    ),
  },
]

// Supported chain options
const CHAIN_OPTIONS = [
  { value: 'TRC20', label: 'TRC20 (Tron)' },
  { value: 'ERC20', label: 'ERC20 (Ethereum)' },
  { value: 'BEP20', label: 'BEP20 (BNB Smart Chain)' },
  { value: 'BSC', label: 'BSC (BNB Smart Chain)' },
  { value: 'ETH', label: 'ETH (Ethereum)' },
]

// Detail row component for the detail dialog
const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-foreground text-right break-all">{value}</span>
  </div>
)

export default function WithdrawPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown | null>(null)
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))
  const [perPage, setPerPage] = useQueryState('perPage', parseAsInteger.withDefault(10))
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  // Withdrawal request dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [withdrawalWallet, setWithdrawalWallet] = useState('')
  const [withdrawalChainId, setWithdrawalChainId] = useState('TRC20')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copiedWallet, setCopiedWallet] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalItem | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  const fetchWithdrawals = async (currentPage: number, currentLimit: number) => {
    if (!token) {
      setError('Authentication required')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await withdrawalApi.getUserWithdrawals(currentPage, currentLimit, token)
      
      if (response.success && response.data) {
        const withdrawalsList = response.data.withdrawals || []
        setWithdrawals(withdrawalsList)
        
        // If pagination info is available, use it; otherwise calculate
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages || 1)
          setTotal(response.data.pagination.total || withdrawalsList.length)
        } else {
          // Fallback: assume more pages if we got a full page
          setTotalPages(withdrawalsList.length === currentLimit ? currentPage + 1 : currentPage)
          setTotal(withdrawalsList.length)
        }
      } else {
        setError('Unable to load withdrawal requests')
        setWithdrawals([])
      }
    } catch (err) {
      console.error('Error fetching withdrawals:', err)
      setError(err)
      setWithdrawals([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (page && perPage) {
      fetchWithdrawals(page, perPage)
    }
  }, [page, perPage, token])

  useEffect(() => {
    const handleWalletRefresh = () => {
      if (page && perPage) {
        void fetchWithdrawals(page, perPage)
      }
    }

    window.addEventListener(CLIENT_WALLET_REFRESH_EVENT, handleWalletRefresh)
    return () => {
      window.removeEventListener(CLIENT_WALLET_REFRESH_EVENT, handleWalletRefresh)
    }
  }, [page, perPage, token])

  // Recalculate pageCount based on total
  const pageCount = useMemo(() => {
    if (totalPages > 0) return totalPages
    if (total > 0 && perPage) return Math.ceil(total / perPage)
    return 1
  }, [totalPages, total, perPage])

  // Create columns with token
  const columns = useMemo(
    () =>
      createColumns(token, (item) => {
        setSelectedWithdrawal(item)
        setIsDetailDialogOpen(true)
      }),
    [token],
  )

  // Validate wallet address - lenient validation
  const validateWalletAddress = (address: string, chain: string): boolean => {
    if (!address.trim()) return false
    
    const trimmedAddress = address.trim()
    
    if (chain === 'TRC20') {
      return trimmedAddress.startsWith('T') && trimmedAddress.length >= 25 && trimmedAddress.length <= 40
    }
    
    if (chain === 'ERC20' || chain === 'BEP20' || chain === 'BSC' || chain === 'ETH') {
      return trimmedAddress.startsWith('0x') && trimmedAddress.length >= 30 && trimmedAddress.length <= 50
    }
    
    // For other chains, just check minimum length
    return trimmedAddress.length >= 20
  }

  // Handle withdrawal request submission
  const handleWithdrawalSubmit = async () => {
    setSubmitError(null)
    setSubmitSuccess(false)

    // Validate amount
    if (!withdrawalAmount.trim()) {
      setSubmitError('Amount is required')
      return
    }

    const amountNum = parseFloat(withdrawalAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setSubmitError('Amount must be a valid positive number')
      return
    }

    const minimumAmount = 10.00
    if (amountNum < minimumAmount) {
      setSubmitError(`Minimum withdrawal amount is ${minimumAmount} USDT`)
      return
    }

    // Validate wallet address
    if (!withdrawalWallet.trim()) {
      setSubmitError('Wallet address is required')
      return
    }

    if (!validateWalletAddress(withdrawalWallet, withdrawalChainId)) {
      setSubmitError(`Invalid ${withdrawalChainId} wallet address format`)
      return
    }

    // Validate chain ID
    if (!withdrawalChainId) {
      setSubmitError('Please select a network')
      return
    }

    setIsSubmitting(true)

    try {
      if (!token) {
        throw new Error('Authentication required')
      }
      
      const response = await withdrawalApi.create(
        {
          amount: withdrawalAmount,
          wallet_address: withdrawalWallet.trim(),
          chain_id: withdrawalChainId,
        },
        token
      )

      if (!response.success) {
        throw new Error(response.message || 'Failed to create withdrawal request')
      }

      setSubmitSuccess(true)
      
      // Refresh withdrawals list
      if (page && perPage) {
        await fetchWithdrawals(page, perPage)
      }
      notifyWalletRefresh()

      // Reset form and close dialog after 2 seconds
      setTimeout(() => {
        setWithdrawalAmount('')
        setWithdrawalWallet('')
        setWithdrawalChainId('TRC20')
        setSubmitSuccess(false)
        setIsDialogOpen(false)
      }, 2000)

    } catch (err) {
      console.error('Error creating withdrawal request:', err)
      setSubmitError(getFriendlyErrorMessage(err, {
        audience: 'client',
        resource: 'withdrawal request',
        action: 'create',
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset dialog state when it opens/closes
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setWithdrawalAmount('')
      setWithdrawalWallet('')
      setWithdrawalChainId('TRC20')
      setSubmitError(null)
      setSubmitSuccess(false)
    }
  }

  if (loading && withdrawals.length === 0) {
    return (
      
        <ListPageSkeleton
          actionCount={1}
          columnCount={7}
          rowCount={8}
          filterPillCount={3}
        />
      
    )
  }

  if (error && withdrawals.length === 0) {
    return (
      
        <div className="px-4 py-10 md:px-6 lg:px-8">
          <ApiErrorState
            error={error}
            audience="client"
            resource="withdrawal requests"
            action="load"
            variant="panel"
            onRetry={() => {
              if (page && perPage) {
                fetchWithdrawals(page, perPage)
              }
            }}
          />
        </div>
      
    )
  }

  return (
    
      <div className="px-4 py-10 md:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="mb-1 flex items-center gap-2 text-3xl font-semibold text-foreground">
                <ArrowUpRight className="h-6 w-6 text-primary" />
                Withdrawal Status
              </h1>
              <p className="text-base text-muted-foreground">
                View and track the status of your withdrawal requests
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* <Button
                onClick={() => setIsDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Request a Withdrawal
              </Button> */}
              <Button
                variant="outline"
                onClick={() => {
                  if (page && perPage) {
                    fetchWithdrawals(page, perPage)
                  }
                }}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {withdrawals.length === 0 && !loading ? (
            <Card>
              <CardContent className="py-10">
                <div className="text-center">
                  <ArrowUpRight className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Withdrawal Requests</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven&apos;t submitted any withdrawal requests yet.
                  </p>
                  <Button onClick={() => router.push('/funds/withdrawal-request')}>
                    Request a Withdrawal
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <AppDataTable
              data={withdrawals}
              columns={columns}
              pageCount={pageCount}
            />
          )}

          {error && withdrawals.length > 0 ? (
            <ApiErrorState
              error={error}
              audience="client"
              resource="withdrawal requests"
              action="load"
              variant="inline"
              onRetry={() => {
                if (page && perPage) {
                  fetchWithdrawals(page, perPage)
                }
              }}
            />
          ) : null}
        </div>

        {/* Withdrawal Request Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-red-600" />
                Request a Withdrawal
              </DialogTitle>
              <DialogDescription>
                Enter your withdrawal details below. Please ensure all information is correct.
              </DialogDescription>
            </DialogHeader>

            {submitSuccess ? (
              <div className="py-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
                      Withdrawal Request Submitted!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your withdrawal request has been successfully submitted and is pending review.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {submitError && (
                  <ApiErrorState
                    message={submitError}
                    audience="client"
                    resource="withdrawal request"
                    action="submit"
                    variant="inline"
                  />
                )}

                <div className="space-y-2">
                  <Label htmlFor="amount">
                    Amount (USD) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      step="1"
                      min="1"
                      value={withdrawalAmount}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      onChange={(e) => setWithdrawalAmount(e.target.value)}
                      className="pl-10"
                      placeholder="10.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum withdrawal amount: 10.00 USD
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chain_id">
                    Network <span className="text-destructive">*</span>
                  </Label>
                  <Select value={withdrawalChainId} onValueChange={setWithdrawalChainId}>
                    <SelectTrigger id="chain_id">
                      <div className="flex items-center gap-2">
                        <Network className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select network" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {CHAIN_OPTIONS.map((chain) => (
                        <SelectItem key={chain.value} value={chain.value}>
                          {chain.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wallet_address">
                    Wallet Address <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    {/* <Wallet className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /> */}
                    <Input
                      id="wallet_address"
                      value={withdrawalWallet}
                      onChange={(e) => setWithdrawalWallet(e.target.value)}
                      className="pl-10 pr-10 font-mono text-sm"
                      placeholder={withdrawalChainId === 'TRC20' ? 'T...' : '0x...'}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      disabled={!withdrawalWallet.trim()}
                      onClick={() => {
                        navigator.clipboard.writeText(withdrawalWallet.trim())
                        setCopiedWallet(true)
                        setTimeout(() => setCopiedWallet(false), 2000)
                      }}
                      title="Copy wallet address"
                    >
                      {copiedWallet ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {withdrawalChainId === 'TRC20'
                      ? 'TRC20 addresses start with "T" and are 34 characters long'
                      : 'ERC20/BEP20 addresses start with "0x" and are 42 characters long'}
                  </p>
                </div>

                <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-warning-foreground">
                      <p className="font-medium mb-1">Important:</p>
                      <ul className="space-y-0.5 list-disc list-inside">
                        <li>Double-check your wallet address</li>
                        <li>Ensure the network matches your wallet</li>
                        <li>Requests may take 24-48 hours to process</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              {submitSuccess ? (
                <Button onClick={() => handleDialogOpenChange(false)} variant="outline">
                  Close
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleDialogOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleWithdrawalSubmit}
                    disabled={
                      isSubmitting ||
                      !withdrawalAmount.trim() ||
                      parseFloat(withdrawalAmount) < 10 ||
                      !withdrawalWallet.trim() ||
                      !validateWalletAddress(withdrawalWallet, withdrawalChainId) ||
                      !withdrawalChainId
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="h-4 w-4 mr-2" />
                        Submit Request
                      </>
                    )}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Withdrawal Details Dialog */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Withdrawal Details
              </DialogTitle>
              <DialogDescription>
                Request #{selectedWithdrawal?.id} • {selectedWithdrawal ? formatDateTime(selectedWithdrawal.created_at) : ''}
              </DialogDescription>
            </DialogHeader>

            {selectedWithdrawal && (
              <div className="space-y-5 py-2">
                {/* Source Section */}
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Withdrawal Source
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <SourceBadge source={selectedWithdrawal.source ?? 'wallet'} mt5Id={selectedWithdrawal.mt5_id ?? selectedWithdrawal.mt5_user_id} />
                    <span className="text-sm text-muted-foreground">
                      {selectedWithdrawal.source === 'mt5' 
                        ? `Funds withdrawn from MT5 account${selectedWithdrawal.mt5_id ? ` #${selectedWithdrawal.mt5_id}` : ''}`
                        : 'Funds withdrawn from the Main Wallet'}
                    </span>
                  </div>
                </div>

                {/* Destination Section */}
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Destination
                    </span>
                  </div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <DestinationTypeBadge 
                      paymentMethodType={selectedWithdrawal.payment_method_type}
                      paymentMethodName={selectedWithdrawal.payment_method_name}
                    />
                    <span className="text-sm text-muted-foreground">
                      {selectedWithdrawal.payment_method_name || 'N/A'}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {selectedWithdrawal.bank_detail_id ? (
                      <>
                        <DetailRow 
                          label="Bank Detail ID"
                          value={selectedWithdrawal.bank_detail_id}
                        />
                        <DetailRow 
                          label="Bank Account"
                          value={<BankAccountInfoCell bankDetailId={selectedWithdrawal.bank_detail_id} token={token} />}
                        />
                      </>
                    ) : null}
                    {selectedWithdrawal.wallet_address ? (
                      <DetailRow 
                        label="Wallet Address"
                        value={<WalletAddressCell address={selectedWithdrawal.wallet_address} />}
                      />
                    ) : null}
                    {selectedWithdrawal.chain_id ? (
                      <DetailRow 
                        label="Network"
                        value={<ChainBadge chainId={selectedWithdrawal.chain_id} />}
                      />
                    ) : null}
                    {selectedWithdrawal.payment_method_type === 'cash' || 
                     selectedWithdrawal.payment_method_name?.toLowerCase().includes('cash') ? (
                      <DetailRow 
                        label="Method"
                        value="Cash Pickup"
                      />
                    ) : null}
                  </div>
                </div>

                {/* Request Details Section */}
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Request Details
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    <DetailRow 
                      label="Amount"
                      value={`$${selectedWithdrawal.amount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 8,
                      })}`}
                    />
                    <DetailRow 
                      label="Payment Method ID"
                      value={selectedWithdrawal.payment_method_id ?? '-'}
                    />
                    <DetailRow 
                      label="Status"
                      value={<StatusBadge status={selectedWithdrawal.status} />}
                    />
                    <DetailRow 
                      label="Requested At"
                      value={formatDateTime(selectedWithdrawal.created_at)}
                    />
                    {selectedWithdrawal.updated_at ? (
                      <DetailRow 
                        label="Last Updated"
                        value={formatDateTime(selectedWithdrawal.updated_at)}
                      />
                    ) : null}
                    {selectedWithdrawal.transaction_hash ? (
                      <DetailRow 
                        label="Transaction Hash"
                        value={<TransactionHashCell hash={selectedWithdrawal.transaction_hash} chainId={selectedWithdrawal.chain_id || 'TRC20'} />}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    
  )
}


