// API base URL - replace with your actual backend URL
export const API_BASE_URL = process.env.APIBASEURL || "http://192.168.1.13:3000";

// Debug: Log the API base URL being used
console.log("API_BASE_URL:", API_BASE_URL);

// ---------- Shared Types ----------
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
    type: "admin" | "user";
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

// ---------- Generic helper ----------
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  };

  const res = await fetch(url, config);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(json?.message || `HTTP ${res.status}`);
  }
  return json;
}

// ---------- Auth APIs ----------
export const authApi = {
  register: (data: RegisterRequest) =>
    apiCall("/user/register", { method: "POST", body: JSON.stringify(data) }),

  verifyOtp: (data: VerifyOtpRequest) =>
    apiCall("/user/verify-otp", { method: "POST", body: JSON.stringify(data) }),

  login: (data: LoginRequest) =>
    apiCall<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  resendOtp: (data: ResendOtpRequest) =>
    apiCall("/user/resend-otp", { method: "POST", body: JSON.stringify(data) }),

  forgotPassword: (data: ForgotPasswordRequest) =>
    apiCall("/user/forget-password", { method: "POST", body: JSON.stringify(data) }),

  resetPassword: (data: ResetPasswordRequest) =>
    apiCall("/user/reset-password", { method: "POST", body: JSON.stringify(data) }),

  logout: (token: string) =>
    apiCall("/user/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),

  getTwoFactorStatus: (userId: number, token: string) =>
    apiCall<TwoFactorStatusResponse>(`/user/2fa/status/${userId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  setupTwoFactor: (userId: number, token: string) =>
    apiCall<TwoFactorSetupResponse>(`/user/2fa/setup/${userId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),

  verifyAndEnableTwoFactor: (data: TwoFactorVerifyRequest, token: string) =>
    apiCall("/user/2fa/verify-and-enable", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  disableTwoFactor: (userId: number, token: string) =>
    apiCall<TwoFactorDisableResponse>(`/user/2fa/disable/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  uploadProfileDocuments: async (formData: FormData, token: string): Promise<KycUploadResponse> => {
    const res = await fetch(`${API_BASE_URL}/user/profile/document`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` } as any, // let browser set multipart boundary
      body: formData,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `Upload failed (${res.status})`);
    return json as KycUploadResponse;
  },
};

// ---------- Admin KYC APIs ----------
/** List pending/attention KYC users (status can be "attention" | 0 | 1 | 2) */
export const adminKycApi = {
  listPending: (status: string | number, token: string) =>
    apiCall<{
      items: any[];
      pagination: { current_page: number; per_page: number; total: number; total_pages: number };
    }>(`/admin/user-management/users/kyc/pending?status=${encodeURIComponent(String(status))}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  getUserKyc: (userUuid: string, token: string) =>
    apiCall(`/admin/user-management/users/kyc/${encodeURIComponent(userUuid)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  /** Review KYC docs: pass { user_uuid, documents: { key: "approved" | "rejected" | "pending" | {status, comment} } } */
review: async (
  body: {
    user_uuid: string;
    documents: Record<
      string,
      | "approved"
      | "rejected"
      | "pending"
      | { status: "approved" | "rejected" | "pending"; comment?: string }
    >;
  },
  token: string
) => {
  if (!body.user_uuid) throw new Error("User UUID missing in review body");
  return apiCall(`/admin/user-management/users/kyc/review`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
},
};

// Common helper for KYC file URLs; adjust the path prefix if backend differs.
export const kycFileUrl = (fileName?: string | null) =>
  fileName ? `${API_BASE_URL}/uploads/${encodeURIComponent(fileName)}` : "";