// API Operations for Personal Information
import { ApiResponse, DepositListResponse, handle401Redirect } from '@/lib/api'
import { formatInIST } from '@/lib/date-time'

// Base API configuration (from .env only)
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '')

// Generic API call function
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured')
  }

  const url = `${API_BASE_URL}${endpoint}`
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)
    
    if (handle401Redirect(response, !!token)) {
      return new Promise<T>(() => {})
    }
    
    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`)
    }
    
    return data
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error)
    throw new Error(error instanceof Error ? error.message : 'Network error')
  }
}

// Authentication Operations
export const authOperations = {
  // Login user
  login: async (credentials: { email: string; password: string }): Promise<ApiResponse> => {
    return apiCall<ApiResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  // Register user
  register: async (userData: Record<string, unknown>): Promise<ApiResponse> => {
    return apiCall<ApiResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  // Verify OTP
  verifyOtp: async (otpData: { otp: string; email: string }): Promise<ApiResponse> => {
    return apiCall<ApiResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(otpData),
    })
  },

  // Resend OTP
  resendOtp: async (email: string): Promise<ApiResponse> => {
    return apiCall<ApiResponse>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<ApiResponse> => {
    return apiCall<ApiResponse>('/auth/forget-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  // Reset password
  resetPassword: async (resetData: { token: string; password: string; confirm_password: string }): Promise<ApiResponse> => {
    return apiCall<ApiResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(resetData),
    })
  },

  // Logout
  logout: async (token: string): Promise<ApiResponse> => {
    return apiCall<ApiResponse>('/auth/logout', {
      method: 'POST',
    }, token)
  }
}

// USDT Deposit Types
export interface USDTDepositRequest {
  amount: string
  transaction_hash?: string
  payment_proof?: File
  comment?: string
}

export interface USDTDepositResponse {
  success: boolean
  message: string
  data: {
    amount: number
    transaction_hash: string | null
    has_payment_proof: boolean
    status: string
    submitted_at: string
  }
}

// USDT Deposit Operations
export async function submitUSDTDeposit(
  data: USDTDepositRequest,
  token?: string
): Promise<USDTDepositResponse> {
  const url = `${API_BASE_URL}/user/usdt-deposit/submit`
  
  // Create FormData for file upload
  const formData = new FormData()
  formData.append('amount', data.amount)
  
  if (data.transaction_hash) {
    formData.append('transaction_hash', data.transaction_hash)
  }
  
  if (data.payment_proof) {
    formData.append('payment_proof', data.payment_proof)
  }

  if (data.comment) {
    formData.append('comment', data.comment)
  }

  const config: RequestInit = {
    method: 'POST',
    body: formData,
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
      // Don't set Content-Type header - browser will set it with boundary for FormData
    },
  }

  try {
    const response = await fetch(url, config)
    
    if (handle401Redirect(response, !!token)) {
      return new Promise<never>(() => {})
    }
    
    const responseData = await response.json()
    
    if (!response.ok) {
      throw new Error(responseData.message || `HTTP ${response.status}: ${response.statusText}`)
    }
    
    return responseData
  } catch (error) {
    console.error('API Error (/user/usdt-deposit/submit):', error)
    throw new Error(error instanceof Error ? error.message : 'Network error')
  }
}

// USDT Deposit Request Status Types
export interface DepositRequestItem {
  id: number
  user_id: number
  transaction_hash: string | null
  payment_proof_url: string | null
  amount: string
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  approved_by: number | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface DepositRequestsResponse {
  success: boolean
  data: {
    requests: DepositRequestItem[]
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

interface DepositRequestsApiResponse {
  requests: DepositRequestItem[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Get user deposit requests
export async function getUserDepositRequests(
  page: number = 1,
  perPage: number = 10,
  token?: string,
  options?: {
    search?: string;
    payment_method_id?: number | null;
    status?: number | null;
    source?: string | null;
    payment_category?: string | null;
    date_from?: string | null;
    date_to?: string | null;
    sort_column?: string;
    sort_order?: string;
  }
): Promise<DepositListResponse> {
  const qs = new URLSearchParams()
  qs.set('page', String(page))
  qs.set('per_page', String(perPage))
  qs.set('sort_column', options?.sort_column || 'created_at')
  qs.set('sort_order', options?.sort_order || 'DESC')
  if (options?.search) qs.set('search', options.search)
  if (options?.payment_method_id !== undefined && options?.payment_method_id !== null) {
    qs.set('payment_method_id', String(options.payment_method_id))
  }
  if (options?.status !== undefined && options?.status !== null) {
    qs.set('status', String(options.status))
  }
  if (options?.source) qs.set('source', options.source)
  if (options?.payment_category) qs.set('payment_category', options.payment_category)
  if (options?.date_from) qs.set('date_from', options.date_from)
  if (options?.date_to) qs.set('date_to', options.date_to)

  return apiCall<DepositListResponse>(
    `/user/deposit/list?${qs.toString()}`,
    {
      method: 'GET',
    },
    token
  )
}

// Withdrawal Types
export interface WithdrawalRequest {
  amount: string
  wallet_address: string
  chain_id: string
}

export interface WithdrawalItem {
  id: number
  user_id: number
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed'
  wallet_address: string
  chain_id: string
  transaction_hash: string | null
  created_at: string
  updated_at?: string
}

export interface WithdrawalResponse {
  success: boolean
  message: string
  data: WithdrawalItem
}

export interface WithdrawalsResponse {
  success: boolean
  data: {
    withdrawals: WithdrawalItem[]
    pagination?: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

export const utilityFunctions = {
  // Format date
  formatDate: (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
    
    return formatInIST(dateString, options || defaultOptions)
  },

  // Format currency
  formatCurrency: (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  },

  // Format name to title case (first letter uppercase, rest lowercase)
  // e.g., "JITENDRA PATLE" -> "Jitendra Patle", "jOHN DOE" -> "John Doe"
  formatName: (name: string | undefined | null): string => {
    if (!name) return ''
    return name
      .split(' ')
      .map(word => {
        if (!word) return ''
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      })
      .join(' ')
  },

  // Generate random ID
  generateRandomId: (length: number = 8): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  },

  // Debounce function
  debounce: <T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  },

  // Throttle function
  throttle: <T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }
}

interface WithdrawalsApiResponse {
  withdrawals: WithdrawalItem[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Create withdrawal request
export async function createWithdrawalRequest(
  data: WithdrawalRequest,
  token?: string
): Promise<WithdrawalResponse> {
  return apiCall<WithdrawalResponse>('/user/withdrawals', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token)
}

// Get user withdrawal requests
export async function getUserWithdrawals(
  page: number = 1,
  limit: number = 10,
  token?: string
): Promise<WithdrawalsResponse> {
  try {
    const response = await apiCall<WithdrawalsResponse>(
      `/user/withdrawals?page=${page}&limit=${limit}`,
      {
        method: 'GET',
      },
      token
    )
    
    // Handle different response structures
    let withdrawals: WithdrawalItem[] = []
    let pagination = undefined

    if (response.success && response.data) {
      const data = response.data as unknown as { withdrawals?: WithdrawalItem[]; pagination?: unknown } | WithdrawalItem[];
      // Case 1: Data is an object with withdrawals array
      if (typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.withdrawals)) {
        withdrawals = data.withdrawals
        pagination = data.pagination
      }
      // Case 2: Data is directly an array
      else if (Array.isArray(data)) {
        withdrawals = data
      }
      // Case 3: Data is an object, check if it has a withdrawals property
      else if (typeof data === 'object' && !Array.isArray(data) && data.withdrawals) {
        withdrawals = Array.isArray(data.withdrawals) ? data.withdrawals : []
        pagination = data.pagination
      }
    } else if (!response.success) {
      console.error('API returned unsuccessful response:', response)
      throw new Error('Failed to fetch withdrawals')
    }
    
    // Ensure we return the correct structure
    return {
      success: response.success || true,
      data: {
        withdrawals: withdrawals,
        pagination: pagination,
      },
    } as WithdrawalsResponse
  } catch (error) {
    console.error('Error in getUserWithdrawals:', error)
    throw error
  }
}

// User Operations
export const userOperations = {
  submitRegistrationFee: async (transactionHash: string, token: string): Promise<ApiResponse> => {
    return apiCall<ApiResponse>('/user/registration-fee', {
      method: 'POST',
      body: JSON.stringify({ transaction_hash: transactionHash }),
    }, token)
  }
}

// Transaction Operations
export const transactionOperations = {
  verifyEmailWithTransaction: async (
    token: string,
    hashcode: string,
    txHash: string
  ): Promise<ApiResponse> => {
    return apiCall<ApiResponse>('/user/verify-email-transaction', {
      method: 'POST',
      body: JSON.stringify({
        hashcode,
        transaction_hash: txHash,
      }),
    }, token)
  }
}
