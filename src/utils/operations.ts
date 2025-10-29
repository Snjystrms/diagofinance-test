// API Operations Utility Functions
// This file contains reusable API calling functions for the CRM application

import { ApiResponse, PendingUser } from '@/lib/api'

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.4:4000'

// Generic API call function with error handling
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

// User Management Operations
export const userOperations = {
  // Fetch pending users
  fetchPendingUsers: async (token: string): Promise<ApiResponse<{
    pendingUsers: PendingUser[] 
  }>> => {
    return apiCall('/admin/registration-fees/pending-fees', {
      method: 'GET',
    }, token)
  },

  // Approve user
  approveUser: async (userId: number, token: string): Promise<ApiResponse> => {
    return apiCall(`/admin/users/approve/${userId}`, {
      method: 'POST',
    }, token)
  },

  // Reject user
  rejectUser: async (userId: number, token: string): Promise<ApiResponse> => {
    return apiCall(`/reject-user/${userId}`, {
      method: 'POST',
    }, token)
  },

  // Get user profile
  getUserProfile: async (token: string): Promise<ApiResponse> => {
    return apiCall('/user/profile', {
      method: 'GET',
    }, token)
  },

  // Update user profile
  updateUserProfile: async (data: any, token: string): Promise<ApiResponse> => {
    return apiCall('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token)
  },

  // Get all users
  getAllUsers: async (token: string, params?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.search) queryParams.append('search', params.search)
    
    const endpoint = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiCall(endpoint, {
      method: 'GET',
    }, token)
  },

  // Submit registration fee transaction hash
  submitRegistrationFee: async (transactionHash: string, token: string): Promise<ApiResponse> => {
    return apiCall('/user/registration-fees/submit-fee', {
      method: 'POST',
      body: JSON.stringify({
        transaction_hash: transactionHash
      }),
    }, token)
  }
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

// Dashboard Operations
export const dashboardOperations = {
  // Get dashboard stats
  getDashboardStats: async (token: string): Promise<ApiResponse> => {
    return apiCall('/dashboard/stats', {
      method: 'GET',
    }, token)
  },

  // Get recent activities
  getRecentActivities: async (token: string, limit: number = 10): Promise<ApiResponse> => {
    return apiCall(`/dashboard/activities?limit=${limit}`, {
      method: 'GET',
    }, token)
  },

  // Get user analytics
  getUserAnalytics: async (token: string, period: string = 'month'): Promise<ApiResponse> => {
    return apiCall(`/dashboard/analytics?period=${period}`, {
      method: 'GET',
    }, token)
  }
}

// Transaction Operations
export const transactionOperations = {
  // Submit USDT transaction
  submitUsdtTransaction: async (transactionData: any, token: string): Promise<ApiResponse> => {
    return apiCall('/usdt-registration/submit-transaction', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    }, token)
  },

  // Verify transaction
  verifyTransaction: async (verificationData: any, token: string): Promise<ApiResponse> => {
    return apiCall('/verify-transaction', {
      method: 'POST',
      body: JSON.stringify(verificationData),
    }, token)
  },

  // Verify email with transaction hash
  verifyEmailWithTransaction: async (
    emailToken: string, 
    securityCode: string, 
    transactionHash: string
  ): Promise<ApiResponse> => {
    return apiCall(`/user/verify-email/${emailToken}`, {
      method: 'POST',
      body: JSON.stringify({
        securityCode,     // 6-digit OTP
        transactionHash,   // hash
      }),
    })
  },

  // Get transaction history
  getTransactionHistory: async (token: string, params?: { page?: number; limit?: number; type?: string }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.type) queryParams.append('type', params.type)
    
    const endpoint = `/transactions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiCall(endpoint, {
      method: 'GET',
    }, token)
  }
}

// Team and Referral Operations
export const teamOperations = {
  // Get team members
  getTeamMembers: async (token: string, params?: { page?: number; limit?: number; level?: number }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.level) queryParams.append('level', params.level.toString())
    
    const endpoint = `/team/members${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiCall(endpoint, {
      method: 'GET',
    }, token)
  },

  // Get referral statistics
  getReferralStats: async (token: string): Promise<ApiResponse> => {
    return apiCall('/team/referral-stats', {
      method: 'GET',
    }, token)
  },

  // Get level-wise business
  getLevelWiseBusiness: async (token: string): Promise<ApiResponse> => {
    return apiCall('/team/level-wise-business', {
      method: 'GET',
    }, token)
  }
}

// Income and Reward Operations
export const incomeOperations = {
  // Get daily allegiance income
  getDailyAllegianceIncome: async (token: string, params?: { date?: string; page?: number; limit?: number }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.date) queryParams.append('date', params.date)
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    
    const endpoint = `/income/daily-allegiance${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiCall(endpoint, {
      method: 'GET',
    }, token)
  },

  // Get KCR income history
  getKcrIncomeHistory: async (token: string, params?: { page?: number; limit?: number }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    
    const endpoint = `/income/kcr-history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiCall(endpoint, {
      method: 'GET',
    }, token)
  },

  // Get royalty income
  getRoyaltyIncome: async (token: string, params?: { page?: number; limit?: number }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    
    const endpoint = `/income/royalty${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiCall(endpoint, {
      method: 'GET',
    }, token)
  }
}

// Wallet Operations
export const walletOperations = {
  // Get wallet balance
  getWalletBalance: async (token: string): Promise<ApiResponse> => {
    return apiCall('/wallet/balance', {
      method: 'GET',
    }, token)
  },

  // Get wallet statement
  getWalletStatement: async (token: string, params?: { page?: number; limit?: number; type?: string }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.type) queryParams.append('type', params.type)
    
    const endpoint = `/wallet/statement${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiCall(endpoint, {
      method: 'GET',
    }, token)
  },

  // Request withdrawal
  requestWithdrawal: async (withdrawalData: any, token: string): Promise<ApiResponse> => {
    return apiCall('/wallet/withdrawal-request', {
      method: 'POST',
      body: JSON.stringify(withdrawalData),
    }, token)
  },

  // Get withdrawal history
  getWithdrawalHistory: async (token: string, params?: { page?: number; limit?: number; status?: string }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.status) queryParams.append('status', params.status)
    
    const endpoint = `/wallet/withdrawal-history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiCall(endpoint, {
      method: 'GET',
    }, token)
  }
}

// Support Operations
export const supportOperations = {
  // Raise ticket
  raiseTicket: async (ticketData: any, token: string): Promise<ApiResponse> => {
    return apiCall('/support/raise-ticket', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    }, token)
  },

  // Get ticket history
  getTicketHistory: async (token: string, params?: { page?: number; limit?: number; status?: string }): Promise<ApiResponse> => {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.status) queryParams.append('status', params.status)
    
    const endpoint = `/support/ticket-history${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiCall(endpoint, {
      method: 'GET',
    }, token)
  },

  // Update ticket
  updateTicket: async (ticketId: number, updateData: any, token: string): Promise<ApiResponse> => {
    return apiCall(`/support/ticket/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    }, token)
  }
}

// Utility Functions
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

// Export all operations as a single object for easy importing
export const apiOperations = {
  user: userOperations,
  auth: authOperations,
  dashboard: dashboardOperations,
  transaction: transactionOperations,
  team: teamOperations,
  income: incomeOperations,
  wallet: walletOperations,
  support: supportOperations,
  utils: utilityFunctions
}

// Default export for backward compatibility
export default apiOperations 