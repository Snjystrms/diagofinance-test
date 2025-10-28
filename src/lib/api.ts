// API base URL - replace with your actual backend URL
const API_BASE_URL = process.env.APIBASEURL || 'http://192.168.1.4:4000';

// Debug: Log the API base URL being used
console.log('API_BASE_URL:', API_BASE_URL);

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  status?: string;
  requires_usdt_transaction?: boolean;
  data?: T;
  error?: string;
}

export interface RegisterRequest {
  sponsor_id: string;
  name: string;
  username: string;
  email: string;
  mobile: string;
  country: string;
  password: string;
  transaction_password: string;
  confirm_password: string;
  confirm_transaction_password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyOtpRequest {
  otp: string;
  email: string;
}

export interface ResendOtpRequest {
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirm_password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    type: 'admin' | 'user';
    mobile?: string;
    status?: boolean;
    requires_registration_fee?: boolean;
    is_account_active?: boolean;
    sponsor_id?: string;
    role?: string;
  };
}

export interface PendingUser {
  id: number;
  name: string;
  email: string;
  username: string;
  mobile: string;
  country: string;
  sponsor_id: string;
  status: string;
  email_verified: number;
  payment_verified: number;
  created_at: string;
}

// Generic API function
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong');
    }
    
    return data;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Network error');
  }
}

// Authentication API functions
export const authApi = {
  // Register user
  register: async (data: RegisterRequest): Promise<ApiResponse> => {
    return apiCall('/user/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Verify OTP
  verifyOtp: async (data: VerifyOtpRequest): Promise<ApiResponse> => {
    return apiCall('/user/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Login user
  login: async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    return apiCall<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Resend OTP
  resendOtp: async (data: ResendOtpRequest): Promise<ApiResponse> => {
    return apiCall('/user/resend-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Forgot password
  forgotPassword: async (data: ForgotPasswordRequest): Promise<ApiResponse> => {
    return apiCall('/user/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Reset password
  resetPassword: async (data: ResetPasswordRequest): Promise<ApiResponse> => {
    return apiCall('/user/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
}; 