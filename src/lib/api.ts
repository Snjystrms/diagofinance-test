// API base URL - replace with your actual backend URL
const API_BASE_URL = process.env.APIBASEURL || 'http://192.168.1.13:3000';

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
  first_name: string;
  last_name: string;
  country_code: string;
  email: string;
  country: string;
  mobile: string;
  password: string;
  confirm_password: string;
  referral_code?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
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

export interface TwoFactorStatusResponse {
  user_id: number;
  email: string;
  google_2FA_status: boolean;
  google_2FA_key: string | null;
}

export interface TwoFactorSetupResponse {
  user_id: number;
  secret: string;
  qrCode: string;
  otpauthUrl: string;
  testToken: string;
  instructions: string[];
}

export interface TwoFactorVerifyRequest {
  user_id: number;
  token: string;
}

export interface TwoFactorDisableResponse {
  user_id: number;
  email: string;
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
export interface KycUploadResponse {
  status: number;
  message: string;
  model?: string;
  verification_status?: string;
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
    return apiCall('/user/forget-password', {
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

  // Logout user
  logout: async (token: string): Promise<ApiResponse> => {
    return apiCall('/user/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // 2FA Status
  getTwoFactorStatus: async (userId: number, token: string): Promise<ApiResponse<TwoFactorStatusResponse>> => {
    return apiCall<TwoFactorStatusResponse>(`/user/2fa/status/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // 2FA Setup
  setupTwoFactor: async (userId: number, token: string): Promise<ApiResponse<TwoFactorSetupResponse>> => {
    return apiCall<TwoFactorSetupResponse>(`/user/2fa/setup/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // 2FA Verify and Enable
  verifyAndEnableTwoFactor: async (data: TwoFactorVerifyRequest, token: string): Promise<ApiResponse> => {
    return apiCall('/user/2fa/verify-and-enable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  // 2FA Disable
  disableTwoFactor: async (userId: number, token: string): Promise<ApiResponse<TwoFactorDisableResponse>> => {
    return apiCall<TwoFactorDisableResponse>(`/user/2fa/disable/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
 uploadProfileDocuments: async (
    formData: FormData,
    token: string
  ): Promise<KycUploadResponse> => {
    const res = await fetch(`${API_BASE_URL}/user/profile/document`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // no Content-Type here – browser sets multipart boundary
      } as any,
      body: formData,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `Upload failed (${res.status})`);
    return json as KycUploadResponse;
  },
};