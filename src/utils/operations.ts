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
