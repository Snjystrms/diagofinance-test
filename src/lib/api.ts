// C:\Users\DELL\Desktop\crminhouse\src\lib\api.ts

// API base URL - replace with your actual backend URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://192.168.1.47:3000";

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
    id: string | number;
    name: string;
    email: string;
    type: "admin" | "user" | "subadmin" | "manager";
    mobile?: string;
    status?: boolean;
    requires_usdt_transaction?: boolean;
    requires_registration_fee?: boolean;
    is_account_active?: boolean;
    sponsor_id?: string;
    role?: string;
    permissions?: Permission[];
  };
  permissions?: GroupedPermissions[];
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

/** ---------- Permissions types ---------- */
export interface Permission {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

/** Grouped permissions response (new shape) */
export type GroupedPermissions = {
  category: string;
  permissions: {
    id: number;
    name: string;
    category?: string;
    created_at?: string;
    updated_at?: string;
  }[];
  count?: number;
};

/** ---------- Managers types ---------- */
export interface ManagerItem {
  id: number;
  uuid: string;
  name: string;
  email: string;
  mobile: string;
  status: boolean;
  total_client?: number;
  created_at?: string;
  updated_at?: string;
  permissions: { id: number; name: string }[];
}

export type ManagerCreateBody = {
  name: string;
  email: string;
  mobile: string;
  password: string;
  // optional pre-assignment on create; if not supported by API leave empty
  permissions?: number[];
};

export type ManagerUpdateBody = {
  name?: string;
  email?: string;
  mobile?: string;
  status?: boolean;
  password?: string;
  permissions: number[]; // MUST always be present
};

// ---------- Admin Account Types APIs ----------
export type AccountTypeUpsertBody = {
  name: string;
  spread_from: string;
  maximum_leverage: string; // display string e.g., "Up to 1:2000 (dynamic)"
  leverage_type: "fixed" | "dynamic" | string;
  leverage_value: number;
  stop_out_level: number;
  hedge_margin: number;
  swap_free_option: boolean;
  base_currency: string; // "$, €, £, ¥"
  status: boolean;
};

export interface AccountTypeItem {
  id: number | string;
  name: string;
  spread_from: string;
  maximum_leverage: string;
  leverage_type: "fixed" | "dynamic" | string;
  leverage_value: number;
  stop_out_level: string | number | null;
  hedge_margin: string | number | null;
  swap_free_option: boolean;
  base_currency: string;
  status: boolean;
  created_at?: string;
  updated_at?: string;
}

// --- helper: turn object to x-www-form-urlencoded ---
const toFormBody = (obj: Record<string, any>) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    p.set(k, v === null || v === undefined ? "" : String(v));
  });
  return p.toString();
};

export const adminAccountTypesApi = {
  list: ({
    token,
    status,
    search,
  }: {
    token: string;
    status?: "true" | "false";
    search?: string;
  }) => {
    const qs = new URLSearchParams();
    if (typeof status !== "undefined") qs.set("status", status);
    if (search && search.trim()) qs.set("search", search.trim());
    const endpoint = `/admin/account-types/list${qs.toString() ? `?${qs.toString()}` : ""}`;
    return apiCall<{
      accountTypes: AccountTypeItem[];
      pagination?: any;
    }>(endpoint, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
  },

  // Send x-www-form-urlencoded like Postman
  create: (body: AccountTypeUpsertBody, token: string) =>
    apiCall<AccountTypeItem>(`/admin/account-types/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: toFormBody(body),
    }),

  update: (id: string | number, body: AccountTypeUpsertBody, token: string) =>
    apiCall<AccountTypeItem>(`/admin/account-types/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }),

  toggleStatus: (id: number | string, token: string) =>
    apiCall<AccountTypeItem>(`/admin/account-types/${id}/toggle-status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      // ⛔ no body here — server decides active/deactivated
    }),

  delete: (id: string | number, token: string) =>
    apiCall(`/admin/account-types/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ---------- Generic helper ----------
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const { headers: optionHeaders, ...restOptions } = options;

  const normalizedHeaders = (() => {
    if (!optionHeaders) return {};
    if (optionHeaders instanceof Headers) {
      return Object.fromEntries(optionHeaders.entries());
    }
    if (Array.isArray(optionHeaders)) {
      return Object.fromEntries(optionHeaders);
    }
    return optionHeaders;
  })();

  const config: RequestInit = {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      ...normalizedHeaders,
    },
  };

  if (
    process.env.NODE_ENV !== "production" &&
    typeof config.body === "string" &&
    endpoint.startsWith("/user/internal-transfer/")
  ) {
    try {
      console.log("apiCall payload:", endpoint, JSON.parse(config.body));
    } catch (error) {
      console.log("apiCall payload (raw):", endpoint, config.body);
    }
  }

  const res = await fetch(url, config);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json && json.success === false)) {
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

// ---------- Managers APIs ----------

// Partial fix for C:\Users\DELL\Desktop\crminhouse\src\lib\api.ts
// Replace the encodeManagerUpdate function and the adminManagersApi section

/** helper: encode update body as x-www-form-urlencoded with permissions[] and status as 1/0 */
const encodeManagerUpdate = (body: ManagerUpdateBody) => {
  const p = new URLSearchParams();
  if (typeof body.name !== "undefined") p.set("name", body.name ?? "");
  if (typeof body.email !== "undefined") p.set("email", body.email ?? "");
  if (typeof body.mobile !== "undefined") p.set("mobile", body.mobile ?? "");
  
  // ✅ CRITICAL FIX: Convert boolean to 1/0 for status
  if (typeof body.status !== "undefined") {
    p.set("status", body.status ? "1" : "0");
  }

  if (typeof body.password === "string" && body.password.trim()) {
    p.set("password", body.password.trim());
  }
  
  const ids = Array.isArray(body.permissions) ? body.permissions : [];
  ids.forEach((id) => p.append("permissions[]", String(id)));
  return p.toString();
};

export const adminManagersApi = {
  list: (token: string) =>
    apiCall<{ managers: ManagerItem[]; pagination?: any }>(`/admin/manager/list`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  // ✅ Create manager — form-encoded, no permissions
  create: (body: ManagerCreateBody, token: string) =>
    apiCall<{ manager: ManagerItem }>(`/admin/manager/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        name: body.name ?? "",
        email: body.email ?? "",
        mobile: body.mobile ?? "",
        password: body.password ?? "",
      }).toString(),
    }),

  // ✅ PATCH status — form-encoded + 1/0
  patchStatus: (id: number | string, status: boolean, token: string) =>
    apiCall<{ manager: ManagerItem }>(`/admin/manager/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({ status: status ? "1" : "0" }).toString(),
    }),

  // ✅ UPDATE manager — form-encoded + permissions[] + status as 1/0
  update: (id: number | string, body: ManagerUpdateBody, token: string) =>
    apiCall<{ manager: ManagerItem }>(`/admin/manager/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: encodeManagerUpdate(body),
    }),

  delete: (id: number | string, token: string) =>
    apiCall(`/admin/manager/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ---------- Permissions APIs ----------
export const permissionsApi = {
  // server now returns: { success, message, data: { permissions: GroupedPermissions[], total } }
  listAll: (token: string) =>
    apiCall<{ permissions: GroupedPermissions[]; total?: number }>(`/permissions/permissions`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// Common helper for KYC file URLs; adjust the path prefix if backend differs.
export const kycFileUrl = (fileName?: string | null) =>
  fileName ? `${API_BASE_URL}/uploads/${encodeURIComponent(fileName)}` : "";

// ---------- Admin USDT Deposit Types ----------
export interface AdminUSDTDepositRequest {
  id: number;
  user_id: number;
  transaction_hash: string | null;
  payment_proof_url: string | null;
  amount: string;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

export interface AdminUSDTDepositListResponse {
  requests: AdminUSDTDepositRequest[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUSDTDepositVerifyRequest {
  request_id: number;
  action: "approve" | "reject";
  admin_notes?: string;
}

export interface AdminUSDTDepositVerifyResponse {
  id: number;
  status: "approved" | "rejected";
  admin_notes: string | null;
  approved_by: string;
  approved_at: string;
}

// ---------- Admin USDT Deposit APIs ----------
export const adminUSDTDepositApi = {
  /** List all USDT deposit requests with pagination */
  listAll: (page: number = 1, limit: number = 10, token: string) =>
    apiCall<AdminUSDTDepositListResponse>(
      `/admin/usdt-deposit/all?page=${page}&limit=${limit}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    ),

  /** Verify (approve/reject) a USDT deposit request */
  verify: (data: AdminUSDTDepositVerifyRequest, token: string) =>
    apiCall<AdminUSDTDepositVerifyResponse>(
      `/admin/usdt-deposit/verify`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    ),
};

// Helper for deposit payment proof URLs
export const depositProofUrl = (fileName?: string | null) =>
  fileName ? `${API_BASE_URL}${fileName}` : "";

// ---------- Account Types ----------
export interface AccountType {
  id: number;
  name: string;
  spread_from: string;
  maximum_leverage: string;
  base_currency: string;
}

export interface AccountTypesResponse {
  success: boolean;
  message: string;
  data: AccountType[];
}

// ---------- Account Types APIs ----------
export const accountTypesApi = {
  /** Get all active account types */
  getActive: (token: string) =>
    apiCall<AccountType[]>(`/admin/account-types/active`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ---------- MT5 Request Types ----------
export interface MT5RequestCreateRequest {
  account_type_id: number;
  leverage_temp: number;
  currency: string;
  swap_free: boolean;
  password: string;
  confirm_password: string;
}

export interface MT5RequestResponse {
  request_id: string;
  status: string;
  created_at: string;
}

// ---------- Admin MT5 Request Types ----------
export interface MT5Request {
  uuid: string;
  status: number; // 0 = pending, 1 = approved, 2 = rejected
  account_mode: string;
  leverage: string;
  currency: string;
  swap_free: boolean;
  created_at: string;
  User: {
    first_name: string;
    last_name: string;
    email: string;
    mobile: string;
    userDetail: {
      country?: string;
      city?: string;
    };
  };
}

export interface AdminMT5RequestListResponse {
  requests: MT5Request[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_requests: number;
    per_page: number;
  };
}

export interface AdminMT5RequestProcessRequest {
  id: string;
  status: number; // 1 = approve, 2 = reject
  rejection_reason?: string;
}

// ---------- MT5 Request APIs ----------
export const mt5RequestApi = {
  /** Create a new MT5 account request */
  create: (data: MT5RequestCreateRequest, token: string) =>
    apiCall<MT5RequestResponse>(`/user/mt5-request`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

// ---------- Admin MT5 Request APIs ----------
export const adminMT5RequestApi = {
  /** Get pending MT5 requests with pagination */
  getPending: (page: number = 1, perPage: number = 10, token: string) =>
    apiCall<AdminMT5RequestListResponse>(
      `/admin/mt5-requests/pending?page=${page}&per_page=${perPage}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    ),

  /** Process (approve/reject) an MT5 request */
  process: (data: AdminMT5RequestProcessRequest, token: string) =>
    apiCall(`/admin/mt5-request/process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

// ---------- MT5 Account Types ----------
export interface MT5Account {
  id: number;
  account_type: string;
  account_id: string;
  available_balance: string;
  platform: string;
  status: string;
  free_margin: string;
  equity: string;
  leverage: string;
  currency: string;
}

export interface MT5AccountsResponse {
  success: boolean;
  message?: string;
  data: MT5Account[];
}

// ---------- MT5 Accounts APIs ----------
export const mt5AccountsApi = {
  /** Get all MT5 accounts for the authenticated user */
  getAll: (token: string) =>
    apiCall<MT5Account[]>(`/user/internal-transfer/mt5-accounts`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ---------- Internal Transfer APIs ----------
export interface Mt5ToMt5TransferRequest {
  from_mt5_account_id: string;
  to_mt5_account_id: string;
  amount: number;
  remarks?: string;
}

export interface WalletToWalletTransferRequest {
  from_wallet_type: string;
  to_wallet_type: string;
  amount: number;
  remarks?: string;
}

export interface WalletToMt5TransferRequest {
  from_wallet_type: string;
  to_mt5_account_id: string;
  amount: number;
  remarks?: string;
}

export interface Mt5ToWalletTransferRequest {
  from_mt5_account_id: string;
  to_wallet_type: string;
  amount: number;
  remarks?: string;
}

export const internalTransferApi = {
  mt5ToMt5: (data: Mt5ToMt5TransferRequest, token: string) =>
    apiCall(`/user/internal-transfer/mt5-to-mt5`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  userWalletToUserWallet: (data: WalletToWalletTransferRequest, token: string) =>
    apiCall(`/user/internal-transfer/user-to-user`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  userWalletToMt5: (data: WalletToMt5TransferRequest, token: string) =>
    apiCall(`/user/internal-transfer/user-to-mt5`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  mt5ToUserWallet: (data: Mt5ToWalletTransferRequest, token: string) =>
    apiCall(`/user/internal-transfer/mt5-to-user`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),
};