// API Operations for Personal Information
import { ApiResponse } from '@/lib/api'

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.13:3000'

// Personal Information Types
export interface PersonalInformation {
  dob: string | null
  address: string | null
  passport_id_number: string | null
  pin_code: string | null
  nationality: string | null
  employment_status: string | null
  tax_number: string | null
  other_id_number: string | null
  client_type: string
  country: string | number
  state: string | null
  city: string | null
}

export interface PersonalInformationResponse {
  success: boolean
  data: PersonalInformation
}

export interface UpdatePersonalInformationRequest {
  dob?: string
  address?: string
  passport_id_number?: string
  pin_code?: string
  nationality?: string
  employment_status?: string
  tax_number?: string
  other_id_number?: string
  client_type?: string
  country?: string
  state?: string
  city?: string
}

// Generic API call function
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<ApiResponse<T>> {
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

// Get personal information
export async function getPersonalInformation(token: string): Promise<ApiResponse<PersonalInformation>> {
  return apiCall<PersonalInformation>('/user/profile/personal-information', {
    method: 'GET',
  }, token)
}

// Update personal information
export async function updatePersonalInformation(
  data: UpdatePersonalInformationRequest,
  token: string
): Promise<ApiResponse<PersonalInformation>> {
  return apiCall<PersonalInformation>('/user/profile/personal-information', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token)
}

// Legal Information Types
export interface LegalInformation {
  politically_exposed: boolean
  annual_income: string
  source_of_income: string
  estimated_net_worth: string
  purpose_of_opening_account: string
  estimated_annual_amount: string
}

export interface LegalInformationResponse {
  success: boolean
  data: LegalInformation
}

export interface UpdateLegalInformationRequest {
  politically_exposed?: boolean
  annual_income?: number
  source_of_income?: string
  estimated_net_worth?: number
  purpose_of_opening_account?: string
  estimated_annual_amount?: number
}

// Get legal information
export async function getLegalInformation(token: string): Promise<ApiResponse<LegalInformation>> {
  return apiCall<LegalInformation>('/user/profile/legal-information', {
    method: 'GET',
  }, token)
}

// Update legal information
export async function updateLegalInformation(
  data: UpdateLegalInformationRequest,
  token: string
): Promise<ApiResponse<LegalInformation>> {
  return apiCall<LegalInformation>('/user/profile/legal-information', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token)
}

// Authentication Operations
export const authOperations = {
  // Login user
  login: async (credentials: { email: string; password: string }): Promise<ApiResponse> => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  // Register user
  register: async (userData: any): Promise<ApiResponse> => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  // Verify OTP
  verifyOtp: async (otpData: { otp: string; email: string }): Promise<ApiResponse> => {
    return apiCall('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(otpData),
    })
  },

  // Resend OTP
  resendOtp: async (email: string): Promise<ApiResponse> => {
    return apiCall('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<ApiResponse> => {
    return apiCall('/auth/forget-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  // Reset password
  resetPassword: async (resetData: { token: string; password: string; confirm_password: string }): Promise<ApiResponse> => {
    return apiCall('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(resetData),
    })
  },

  // Logout
  logout: async (token: string): Promise<ApiResponse> => {
    return apiCall('/auth/logout', {
      method: 'POST',
    }, token)
  }
}

// USDT Deposit Types
export interface USDTDepositRequest {
  amount: string
  transaction_hash?: string
  payment_proof?: File
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
  limit: number = 10,
  token?: string
): Promise<DepositRequestsResponse> {
  const response = await apiCall<DepositRequestsApiResponse>(
    `/user/usdt-deposit/user-requests?page=${page}&limit=${limit}`,
    {
      method: 'GET',
    },
    token
  )
  
  // Ensure we return the correct structure
  return {
    success: response.success,
    data: {
      requests: response.data?.requests || [],
      pagination: response.data?.pagination,
    },
  } as DepositRequestsResponse
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
    
    return new Date(dateString).toLocaleDateString('en-US', options || defaultOptions)
  },

  // Format currency
  formatCurrency: (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
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
  debounce: <T extends (...args: any[]) => any>(
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
  throttle: <T extends (...args: any[]) => any>(
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
  return apiCall<WithdrawalItem>('/user/withdrawals', {
    method: 'POST',
    body: JSON.stringify(data),
  }, token) as Promise<WithdrawalResponse>
}

// Get user withdrawal requests
export async function getUserWithdrawals(
  page: number = 1,
  limit: number = 10,
  token?: string
): Promise<WithdrawalsResponse> {
  try {
    const response = await apiCall<any>(
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
      // Case 1: Data is an object with withdrawals array
      if (Array.isArray(response.data.withdrawals)) {
        withdrawals = response.data.withdrawals
        pagination = response.data.pagination
      }
      // Case 2: Data is directly an array
      else if (Array.isArray(response.data)) {
        withdrawals = response.data
      }
      // Case 3: Data is an object, check if it has a withdrawals property
      else if (response.data.withdrawals) {
        withdrawals = Array.isArray(response.data.withdrawals) ? response.data.withdrawals : []
        pagination = response.data.pagination
      }
    } else if (!response.success) {
      console.error('API returned unsuccessful response:', response)
      throw new Error(response.message || 'Failed to fetch withdrawals')
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
