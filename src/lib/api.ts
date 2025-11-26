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
  requires_2fa?: boolean;
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
  user_id?: number;
  admin_id?: string | number;
  manager_id?: string | number;
  email: string;
  google_2FA_status: boolean;
  google_2FA_key: string | null;
}

export interface TwoFactorSetupResponse {
  user_id?: number;
  admin_id?: string | number;
  manager_id?: string | number;
  secret: string;
  qrCode: string;
  otpauthUrl: string;
  testToken: string;
  instructions: string[];
}

export interface TwoFactorVerifyRequest {
  user_id?: number;
  admin_id?: string | number;
  token: string;
}

export interface TwoFactorDisableResponse {
  user_id?: number;
  admin_id?: string | number;
  manager_id?: string | number;
  email: string;
}

export interface LoginResponse {
  token?: string;
  requires_2fa?: boolean;
  user?: {
    id: string | number;
    name?: string;
    email: string;
    type?: "admin" | "user" | "subadmin" | "manager";
    mobile?: string;
    status?: boolean | number;
    requires_usdt_transaction?: boolean;
    requires_registration_fee?: boolean;
    is_account_active?: boolean;
    sponsor_id?: string;
    role?: string;
    is_ib_user?: boolean | number;
    permissions?: Permission[];
  };
  data?: {
    user_id?: string | number;
    admin_id?: string | number;
    manager_id?: string | number;
    type?: "admin" | "user" | "subadmin" | "manager";
    token?: string;
    user?: LoginResponse["user"];
    admin?: LoginResponse["user"];
    manager?: LoginResponse["user"];
  };
  permissions?: GroupedPermissions[];
}

export interface UserDashboardProfileChecklistItem {
  completed: boolean;
  label: string;
}

export interface UserDashboardProfileStatus {
  status: string;
  status_code?: number;
  is_verified?: boolean;
  checklist: Record<
    "personal_information" | "legal_information" | "documents_verification" | string,
    UserDashboardProfileChecklistItem | undefined
  >;
}

export interface UserDashboardData {
  user?: {
    id: number;
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    mobile?: string;
    account_id?: string;
    status?: number | boolean;
  };
  wallet?: {
    balance: number;
    currency: string;
  };
  deposits?: {
    total: number;
    currency: string;
  };
  withdrawals?: {
    total: number;
    currency: string;
  };
  profile_status?: UserDashboardProfileStatus;
  account_types?: {
    total_accounts: number;
    summary: any[];
  };
  mt5_users?: Array<{
    id: number;
    uuid: string;
    name: string;
    email: string;
    mt5_id: string | null;
    account_id: string;
  }>;
  latest_news?: any[];
  rate_configurations?: any[];
}

export interface TradingAccountSummaryItem {
  account_type_id: number;
  account_type_name: string;
  spread_from: string;
  maximum_leverage: string;
  base_currency: string;
  total_accounts: number;
  total_balance: number;
  currency: string;
  accounts: Array<{
    id: number;
    account_id: string;
    mt5_id: string | null;
    name: string;
    balance: number;
    leverage: number | string;
    account_mode: string;
  }>;
}

export interface TradingAccountsSummaryResponse {
  summary: TradingAccountSummaryItem[];
  overall: {
    total_account_types: number;
    total_accounts: number;
    total_balance: number;
    currency: string;
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

export type PaginationMeta = {
  page?: number;
  current_page?: number;
  per_page?: number;
  limit?: number;
  total?: number;
  total_pages?: number;
  last_page?: number;
};

export type AdminUsersListApiData = {
  users?: PendingUser[];
  items?: PendingUser[];
  data?:
    | PendingUser[]
    | {
        users?: PendingUser[];
        items?: PendingUser[];
        data?: PendingUser[];
        transactions?: PendingUser[];
        pagination?: PaginationMeta;
      };
  pagination?: PaginationMeta;
  meta?: {
    pagination?: PaginationMeta;
  };
  total?: number;
};

export type AdminUsersListParams = {
  token: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string | number;
  isApproved?: string | number;
};

export type AdminUserCreateBody = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  mobile?: string;
  country?: string;
  country_code?: string;
  referral_code?: string;
};

export interface KycUploadResponse {
  status: number;
  message: string;
  model?: string;
  verification_status?: string;
}

export interface KycDocumentStatus {
  file: string | null;
  uploaded: boolean;
  status: "pending" | "approved" | "rejected" | string;
  status_code: number;
  approved: boolean;
  rejection_comment: string;
}

export interface KycStatusResponse {
  success: boolean;
  data: {
    kyc: {
      approved: boolean;
      status: string;
      status_code: number;
      documents_submitted: boolean;
      documents_approved: boolean;
    };
    documents: {
      poi_front_file?: KycDocumentStatus;
      poi_back_file?: KycDocumentStatus;
      poa_front_file?: KycDocumentStatus;
      poa_back_file?: KycDocumentStatus;
      other_file?: KycDocumentStatus;
      [key: string]: KycDocumentStatus | undefined;
    };
  };
}

export interface ProfileViewUser {
  id: number;
  uuid: string;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  account_id: string;
  mobile: string;
  country_code: number;
  location: string;
  google_2FA_status: boolean;
  verification_status: string;
  verification_status_code: number;
}

export interface VerificationStatusItem {
  status: "completed" | "pending" | "rejected";
  message: string;
  submitted: boolean;
  approved?: boolean;
  rejected?: boolean;
}

export interface ProfileViewVerificationStatus {
  personal_information: VerificationStatusItem;
  legal_information: VerificationStatusItem;
  documents_verification: VerificationStatusItem;
}

export interface ProfileViewPersonalInformation {
  dob: string | null;
  address: string | null;
  passport_id_number: string | null;
  pin_code: string | null;
  nationality: string | null;
  employment_status: string | null;
  tax_number: string | null;
  other_id_number: string | null;
  client_type: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
}

export interface ProfileViewLegalInformation {
  politically_exposed: boolean;
  annual_income: number | null;
  source_of_income: string | null;
  estimated_net_worth: number | null;
  purpose_of_opening_account: string | null;
  estimated_annual_amount: number | null;
}

export interface ProfileViewKycDocuments {
  poi_front_file: string | null;
  poa_front_file: string | null;
  poa_back_file: string | null;
  other_file: string | null;
  poi_front_file_status: number;
  poa_front_file_status: number;
  poa_back_file_status: number;
  other_file_status: number;
  file_rejection_comment: Record<string, any>;
}

export interface LoginHistoryItem {
  date: string;
  time: string;
  ip_address: string;
  browser: string;
}

export interface ProfileViewResponse {
  user: ProfileViewUser;
  verification_status: ProfileViewVerificationStatus;
  personal_information: ProfileViewPersonalInformation;
  legal_information: ProfileViewLegalInformation;
  kyc_documents: ProfileViewKycDocuments;
  login_history: LoginHistoryItem[];
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
  /** 🔁 Can be flat or grouped; we flatten in page.tsx normalize() */
  permissions: any;
}

export type ManagerCreateBody = {
  name: string;
  email: string;
  mobile: string;
  password: string;
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
  maximum_leverage: string;
  leverage_type: "fixed" | "dynamic" | string;
  leverage_value: number;
  stop_out_level: number;
  hedge_margin: number;
  swap_free_option: boolean;
  base_currency: string;
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
    }),

  delete: (id: string | number, token: string) =>
    apiCall(`/admin/account-types/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ---------- Admin User Management APIs ----------
export const adminUsersApi = {
  list: ({ token, page = 1, limit = 10, search, status, isApproved }: AdminUsersListParams) => {
    if (!token) {
      throw new Error("Token is required to fetch admin users");
    }

    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));

    if (typeof search === "string" && search.trim()) {
      qs.set("search", search.trim());
    }

    if (status !== undefined && status !== null && `${status}` !== "") {
      qs.set("status", String(status));
    }

    if (isApproved !== undefined && isApproved !== null && `${isApproved}` !== "") {
      qs.set("is_approved", String(isApproved));
    }

    const endpoint = `/admin/user-management/crud/users${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<AdminUsersListApiData>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  create: (body: AdminUserCreateBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to create admin user");
    }

    const sanitizedBody = Object.entries(body).reduce<Record<string, string>>((acc, [key, value]) => {
      if (value === undefined || value === null) {
        return acc;
      }

      const stringValue = typeof value === "string" ? value.trim() : String(value);
      if (stringValue === "") {
        return acc;
      }

      acc[key] = stringValue;
      return acc;
    }, {});

    return apiCall(`/admin/user-management/crud/users`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(sanitizedBody),
    });
  },
};

// ---------- Generic helper ----------
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Debug logging for IB status endpoint
  if (endpoint.includes("ib-requests/status")) {
    console.log("[apiCall] IB Status endpoint detected:", endpoint);
    console.log("[apiCall] Full URL:", url);
    console.log("[apiCall] Method:", options.method || "GET");
    console.log("[apiCall] Headers:", options.headers);
  }

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
    } catch {
      console.log("apiCall payload (raw):", endpoint, config.body);
    }
  }

  // Debug logging for IB status endpoint
  if (endpoint.includes("ib-requests/status")) {
    console.log("[apiCall] Making fetch request to:", url);
    console.log("[apiCall] Config:", { method: config.method, headers: config.headers });
  }
  
  const res = await fetch(url, config);
  
  if (endpoint.includes("ib-requests/status")) {
    console.log("[apiCall] Response status:", res.status, res.statusText);
  }
  
  const json = await res.json().catch(() => ({}));
  
  if (endpoint.includes("ib-requests/status")) {
    console.log("[apiCall] Response JSON:", json);
  }
  
  if (!res.ok || (json && json.success === false)) {
    if (endpoint.includes("ib-requests/status")) {
      console.error("[apiCall] Request failed:", json?.message || `HTTP ${res.status}`);
    }
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

  verifyLogin2FA: (data: { user_id: string | number; verify_otp: string }) =>
    apiCall<LoginResponse>("/user/google-verify-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  uploadProfileDocuments: async (formData: FormData, token: string): Promise<KycUploadResponse> => {
    const res = await fetch(`${API_BASE_URL}/user/profile/document`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` } as any,
      body: formData,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `Upload failed (${res.status})`);
    return json as KycUploadResponse;
  },
  getProfileDocumentsStatus: async (token: string): Promise<KycStatusResponse> => {
    const res = await fetch(`${API_BASE_URL}/user/profile/document`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` } as any,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `Fetch failed (${res.status})`);
    return json as KycStatusResponse;
  },

  getProfileView: (token: string) =>
    apiCall<ProfileViewResponse>(`/user/profile/view`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  getUserDashboard: (token: string) =>
    apiCall<UserDashboardData>(`/user/dashboard`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  getTradingAccountsSummary: (token: string) =>
    apiCall<TradingAccountsSummaryResponse>(`/user/dashboard/trading-accounts-summary`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  getWalletStatistics: (token: string, type: "deposits" | "withdrawals") =>
    apiCall<{
      type: string;
      period: string;
      statistics: Array<{
        day: string;
        date: string;
        amount: number;
      }>;
    }>(`/user/dashboard/wallet-statistics?type=${type}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ---------- Admin 2FA APIs ----------
export const admin2FAApi = {
  getTwoFactorStatus: (adminId: string | number, token: string) =>
    apiCall<TwoFactorStatusResponse>(`/admin/2fa/status/${adminId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  setupTwoFactor: (adminId: string | number, token: string) =>
    apiCall<TwoFactorSetupResponse>(`/admin/2fa/setup/${adminId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),

  verifyAndEnableTwoFactor: (data: { admin_id: string | number; token: string }, token: string) =>
    apiCall("/admin/2fa/verify-and-enable", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  disableTwoFactor: (adminId: string | number, token: string) =>
    apiCall<TwoFactorDisableResponse>(`/admin/2fa/disable/${adminId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  verifyLogin2FA: (data: { admin_id: string | number; verify_otp: string | number }) =>
    apiCall<LoginResponse>("/admin/google-verify-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

// ---------- Manager 2FA APIs ----------
export const manager2FAApi = {
  getTwoFactorStatus: (managerId: string | number, token: string) =>
    apiCall<TwoFactorStatusResponse>(`/manager/2fa/status/${managerId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  setupTwoFactor: (managerId: string | number, token: string) =>
    apiCall<TwoFactorSetupResponse>(`/manager/2fa/setup/${managerId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),

  verifyAndEnableTwoFactor: (data: { manager_id: string | number; token: string }, token: string) =>
    apiCall("/manager/2fa/verify-and-enable", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  disableTwoFactor: (managerId: string | number, token: string) =>
    apiCall<TwoFactorDisableResponse>(`/manager/2fa/disable/${managerId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  verifyLogin2FA: (data: { manager_id: string | number; verify_otp: string | number }) =>
    apiCall<LoginResponse>("/manager/google-verify-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

// ---------- Admin KYC APIs ----------
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
const encodeManagerUpdate = (body: ManagerUpdateBody) => {
  const p = new URLSearchParams();
  if (typeof body.name !== "undefined") p.set("name", body.name ?? "");
  if (typeof body.email !== "undefined") p.set("email", body.email ?? "");
  if (typeof body.mobile !== "undefined") p.set("mobile", body.mobile ?? "");
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

  detail: (id: number | string, token: string) =>
    apiCall<{ manager: ManagerItem }>(`/admin/manager/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  delete: (id: number | string, token: string) =>
    apiCall(`/admin/manager/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ---------- Admin Commission Plans APIs ----------
export interface CommissionPlanRule {
  id: number;
  plan_id: number;
  asset_group: string;
  asset_group_label: string;
  level: number;
  rate_ib: string;
  rate_sub_ib_1: string;
  rate_sub_ib_2: string;
  rate_sub_ib_3: string;
  rate_sub_ib_4: string;
  rate_sub_ib_5: string;
  account_type_filter?: string | null;
  symbol_filter?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface CommissionPlan {
  id: number;
  uuid: string;
  name: string;
  description?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
  rules?: CommissionPlanRule[];
}

export interface CommissionPlanPagination {
  total_records?: number;
  current_page?: number;
  per_page?: number;
  total_pages?: number;
}

export interface CommissionPlanListResponseData {
  plans: CommissionPlan[];
  pagination?: CommissionPlanPagination;
}

export type CommissionPlanRuleInput = {
  asset_group: string;
  asset_group_label?: string;
  level: number;
  rate_ib: number | string;
  rate_sub_ib_1?: number | string;
  rate_sub_ib_2?: number | string;
  rate_sub_ib_3?: number | string;
  rate_sub_ib_4?: number | string;
  rate_sub_ib_5?: number | string;
  account_type_filter?: string | null;
  symbol_filter?: string | null;
  status?: string;
};

export type CommissionPlanUpsertBody = {
  name: string;
  description?: string | null;
  status?: string;
  rules?: CommissionPlanRuleInput[];
};

export type CommissionPlanListParams = {
  token: string;
  page?: number;
  limit?: number;
  includeRules?: boolean;
  status?: string;
  search?: string;
};

export const adminCommissionPlansApi = {
  list: ({
    token,
    page = 1,
    limit = 20,
    includeRules = true,
    status,
    search,
  }: CommissionPlanListParams) => {
    if (!token) {
      throw new Error("Token is required to fetch commission plans");
    }

    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    qs.set("include_rules", includeRules ? "true" : "false");
    if (status && status.trim()) {
      qs.set("status", status.trim());
    }
    if (search && search.trim()) {
      qs.set("search", search.trim());
    }

    const endpoint = `/admin/commission/plans${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<CommissionPlanListResponseData>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  create: (body: CommissionPlanUpsertBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to create a commission plan");
    }

    return apiCall<CommissionPlan>(`/admin/commission/plans`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  },

  update: (planId: number | string, body: CommissionPlanUpsertBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to update a commission plan");
    }

    if (planId === undefined || planId === null || `${planId}` === "") {
      throw new Error("A valid plan identifier is required to update a commission plan");
    }

    return apiCall<CommissionPlan>(`/admin/commission/plans/${planId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  },

  delete: (planId: number | string, token: string) => {
    if (!token) {
      throw new Error("Token is required to delete a commission plan");
    }

    if (planId === undefined || planId === null || `${planId}` === "") {
      throw new Error("A valid plan identifier is required to delete a commission plan");
    }

    return apiCall(`/admin/commission/plans/${planId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

// ---------- Permissions APIs ----------
export const permissionsApi = {
  listAll: (token: string) =>
    apiCall<{ permissions: GroupedPermissions[]; total?: number }>(`/permissions/permissions`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

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
  listAll: (page: number = 1, limit: number = 10, token: string) =>
    apiCall<AdminUSDTDepositListResponse>(`/admin/usdt-deposit/all?page=${page}&limit=${limit}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  verify: (data: AdminUSDTDepositVerifyRequest, token: string) =>
    apiCall<AdminUSDTDepositVerifyResponse>(`/admin/usdt-deposit/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

export const depositProofUrl = (fileName?: string | null) =>
  fileName ? `${API_BASE_URL}${fileName}` : "";

// ---------- Admin Withdrawal Types ----------
export interface AdminWithdrawalRequest {
  id: number;
  user_id: number;
  amount: string;
  status: "pending" | "approved" | "rejected";
  remarks: string | null;
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

export interface AdminWithdrawalListResponse {
  success?: boolean;
  // data can be an array directly or an object with nested properties
  data?: AdminWithdrawalRequest[] | {
    withdrawals?: AdminWithdrawalRequest[];
    data?: AdminWithdrawalRequest[];
    requests?: AdminWithdrawalRequest[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages?: number;
      total_pages?: number;
    };
  };
  withdrawals?: AdminWithdrawalRequest[];
  requests?: AdminWithdrawalRequest[];
  // Pagination can be in meta or data.pagination
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages?: number;
    total_pages?: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    total_pages?: number;
  };
}

export interface AdminWithdrawalDecisionRequest {
  action: "approve" | "reject";
  remarks?: string;
}

export interface AdminWithdrawalDecisionResponse {
  id: number;
  status: "approved" | "rejected";
  remarks: string | null;
  approved_by: string;
  approved_at: string;
}

// ---------- Admin Withdrawal APIs ----------
export const adminWithdrawalApi = {
  listAll: (page: number = 1, limit: number = 10, token: string, status?: string) => {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    if (status && status !== "all") {
      qs.set("status", status);
    }
    return apiCall<AdminWithdrawalListResponse>(`/admin/withdrawals?${qs.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  decision: (id: string | number, data: AdminWithdrawalDecisionRequest, token: string) =>
    apiCall<AdminWithdrawalDecisionResponse>(`/admin/withdrawals/${id}/decision`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

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
  status: number;
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
  status: number;
  rejection_reason?: string;
}

// ---------- MT5 Request APIs ----------
export const mt5RequestApi = {
  create: (data: MT5RequestCreateRequest, token: string) =>
    apiCall<MT5RequestResponse>(`/user/mt5-request`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

// ---------- IB Partner Request APIs ----------
export interface CreateIbRequestBody {
  notes?: string;
}

export interface IbRequestStatus {
  id?: number;
  status?: number;
  admin_comment?: string | null;
  created_at?: string;
  created_at_ist?: string;
}

export interface IbRequestStatusResponse {
  ib_request: IbRequestStatus | null;
  is_ib_user?: number | boolean;
  promote_is_ib_user?: number | boolean;
  ib_name?: string | null;
  status_text?: string;
}

export interface IbDashboardUser {
  id: number;
  name: string;
  partner_id: string;
  email: string;
}

export interface IbDashboardWallet {
  balance: number;
  currency: string;
}

export interface IbDashboardRebatesGraph {
  date: string;
  rebates: number;
}

export interface IbDashboardRemainingTime {
  days: number;
  days_decimal: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

export interface IbDashboardPendingRebates {
  amount: number;
  currency: string;
  remaining_time: IbDashboardRemainingTime;
  cycle_start: string;
  cycle_end: string;
}

export interface IbDashboardEarningSummary {
  total_earned: number;
  total_internal_transfers: number;
  currency: string;
}

export interface IbDashboardPartnerInfo {
  ib_plan: string;
  partner_id: string;
  referral_link: string;
  ib_name: string;
}

export interface IbDashboardResponse {
  user: IbDashboardUser;
  partner_wallet: IbDashboardWallet;
  client_wallet: IbDashboardWallet;
  today_earning: IbDashboardWallet;
  rebates_graph: IbDashboardRebatesGraph[];
  pending_rebates: IbDashboardPendingRebates;
  earning_summary: IbDashboardEarningSummary;
  partner_info: IbDashboardPartnerInfo;
}

export interface IbInternalTransferRequest {
  amount: number;
  comment?: string;
}

export const ibRequestsApi = {
  overview: (token: string) =>
    apiCall<IbRequestStatusResponse>(`/user/ib-requests/status`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
  getStatus: (token: string) => {
    console.log("[API] ibRequestsApi.getStatus called with endpoint: /user/ib-requests/status");
    console.log("[API] Full URL will be:", `${API_BASE_URL}/user/ib-requests/status`);
    return apiCall<IbRequestStatusResponse>(`/user/ib-requests/status`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  create: (data: CreateIbRequestBody, token: string) =>
    apiCall(`/user/ib-requests`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  getDashboard: (token: string) =>
    apiCall<IbDashboardResponse>(`/user/ib-dashboard`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
  internalTransfer: (data: IbInternalTransferRequest, token: string) =>
    apiCall(`/user/ib-internal-transfer`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

// ---------- Admin IB Requests APIs ----------
export interface AdminIbRequest {
  id?: number | string;
  uuid?: string;
  status?: number;
  notes?: string | null;
  admin_comment?: string | null;
  ib_name?: string | null;
  created_at?: string;
  updated_at?: string;
  user?: {
    id?: number | string;
    first_name?: string | null;
    last_name?: string | null;
    name?: string | null;
    email?: string | null;
    mobile?: string | null;
    phone?: string | null;
    country?: string | null;
    city?: string | null;
  };
  User?: AdminIbRequest["user"];
  applicant?: AdminIbRequest["user"];
  [key: string]: any;
}

export interface AdminIbRequestListData {
  items?: AdminIbRequest[];
  requests?: AdminIbRequest[];
  data?:
    | AdminIbRequest[]
    | {
        items?: AdminIbRequest[];
        data?: AdminIbRequest[];
        requests?: AdminIbRequest[];
        pagination?: PaginationMeta;
        total?: number;
      };
  pagination?: PaginationMeta;
  meta?: {
    pagination?: PaginationMeta;
  };
  total?: number;
  [key: string]: any;
}

export interface AdminIbRequestUpdateBody {
  status: number;
  ib_name?: string;
  admin_comment?: string;
}

export type AdminIbRequestListParams = {
  token: string;
  status?: string | number;
  search?: string;
  page?: number;
  perPage?: number;
};

export const adminIbRequestsApi = {
  list: ({ token, status, search, page = 1, perPage = 20 }: AdminIbRequestListParams) => {
    if (!token) {
      throw new Error("Token is required to fetch IB requests");
    }

    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("per_page", String(perPage));

    if (status !== undefined && status !== null && `${status}`.trim() !== "") {
      qs.set("status", String(status));
    }

    if (typeof search === "string" && search.trim()) {
      qs.set("search", search.trim());
    }

    const endpoint = `/admin/ib-requests${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<AdminIbRequestListData>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  updateStatus: (id: string | number, body: AdminIbRequestUpdateBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to update IB request");
    }

    if (id === null || id === undefined || `${id}`.trim() === "") {
      throw new Error("IB request id is required");
    }

    return apiCall(`/admin/ib-requests/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  },
};

// ---------- Admin MT5 Request APIs ----------
export const adminMT5RequestApi = {
  getPending: (page: number = 1, perPage: number = 10, token: string) =>
    apiCall<AdminMT5RequestListResponse>(
      `/admin/mt5-requests/pending?page=${page}&per_page=${perPage}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    ),

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

// ---------- Admin MT5 Account Types ----------
export interface AdminMT5Account {
  id?: number | string;
  mt5_id?: string | number;
  account_id?: string | number;
  user_id?: number | string;
  group_id?: number | string;
  manager_id?: number | string;
  name?: string;
  email?: string;
  mobile?: string;
  account_type?: string;
  status?: number | string;
  balance?: string | number;
  equity?: string | number;
  margin?: string | number;
  free_margin?: string | number;
  leverage?: string | number;
  currency?: string;
  created_at?: string;
  updated_at?: string;
  user?: {
    id?: number | string;
    name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    mobile?: string;
  };
  [key: string]: any;
}

export interface AdminMT5AccountsListParams {
  token: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string | number;
  user_id?: string | number;
  group_id?: string | number;
  manager_id?: string | number;
}

export interface UpdateMT5AccountRequest {
  name?: string;
  email?: string;
  mobile?: string;
  leverage?: number;
  status?: number;
  self_wallet?: number | string;
  mt5_id?: string;
}

export interface CreateMT5AccountRequest {
  account_type_id: number;
  account_mode: "demo" | "live";
  leverage_temp: number;
  currency: string;
  swap_free: boolean;
  password: string;
  confirm_password: string;
  user_id: number;
}

export interface AdminMT5AccountsListResponse {
  data?: AdminMT5Account[] | {
    accounts?: AdminMT5Account[];
    items?: AdminMT5Account[];
    data?: AdminMT5Account[];
    mt5_accounts?: AdminMT5Account[];
    pagination?: PaginationMeta;
  };
  accounts?: AdminMT5Account[];
  items?: AdminMT5Account[];
  mt5_accounts?: AdminMT5Account[];
  pagination?: PaginationMeta;
  meta?: {
    pagination?: PaginationMeta;
  };
  total?: number;
  [key: string]: any;
}

// ---------- MT5 Accounts APIs ----------
export const mt5AccountsApi = {
  getAll: (token: string) =>
    apiCall<MT5Account[]>(`/user/internal-transfer/mt5-accounts`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ---------- Admin MT5 Accounts APIs ----------
export const adminMT5AccountsApi = {
  list: ({
    token,
    page = 1,
    limit = 10,
    search,
    status,
    user_id,
    group_id,
    manager_id,
  }: AdminMT5AccountsListParams) => {
    if (!token) {
      throw new Error("Token is required to fetch MT5 accounts");
    }

    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));

    if (search && search.trim()) {
      qs.set("search", search.trim());
    }

    if (status !== undefined && status !== null && `${status}` !== "") {
      qs.set("status", String(status));
    }

    if (user_id !== undefined && user_id !== null && `${user_id}` !== "") {
      qs.set("user_id", String(user_id));
    }

    if (group_id !== undefined && group_id !== null && `${group_id}` !== "") {
      qs.set("group_id", String(group_id));
    }

    if (manager_id !== undefined && manager_id !== null && `${manager_id}` !== "") {
      qs.set("manager_id", String(manager_id));
    }

    const endpoint = `/admin/mt5-accounts${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<AdminMT5AccountsListResponse>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getById: (id: string | number, token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch MT5 account");
    }

    return apiCall<{ data?: AdminMT5Account; account?: AdminMT5Account }>(
      `/admin/mt5-accounts/${id}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },

  update: (id: string | number, data: UpdateMT5AccountRequest, token: string) => {
    if (!token) {
      throw new Error("Token is required to update MT5 account");
    }

    return apiCall<{ data?: AdminMT5Account; account?: AdminMT5Account }>(
      `/admin/mt5-accounts/${id}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }
    );
  },

  delete: (id: string | number, token: string) => {
    if (!token) {
      throw new Error("Token is required to delete MT5 account");
    }

    return apiCall<{ success: boolean; message: string }>(
      `/admin/mt5-accounts/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },

  create: (data: CreateMT5AccountRequest, token: string) => {
    if (!token) {
      throw new Error("Token is required to create MT5 account");
    }

    return apiCall<{ data?: AdminMT5Account; account?: AdminMT5Account }>(
      `/admin/mt5-accounts`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      }
    );
  },
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

// Wallet Summary Types
export interface WalletSummaryWallet {
  id: number;
  address: string;
  balance: number;
  currency: string;
  status: string;
  is_primary: boolean;
}

export interface WalletSummaryTransaction {
  id: number;
  wallet_type: string;
  type: string;
  amount: string;
  description: string;
  created_at: string;
}

export interface WalletSummaryData {
  total_balance: number;
  wallets: {
    [key: string]: WalletSummaryWallet;
  };
  recent_transactions: WalletSummaryTransaction[];
}

export interface WalletSummaryResponse {
  success: boolean;
  message: string;
  data: WalletSummaryData;
}

// Transaction History Types
export interface Transaction {
  id: number;
  external_id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  status_label: string;
  reference: string | null;
  payment_method: string | null;
  description: string;
  direction: "credit" | "debit";
  transfer_mode: string | null;
  transfer_type: string | null;
  from_account: string | null;
  to_account: string | null;
  created_at: string;
  source_table: string;
}

export interface TransactionsData {
  transactions: Transaction[];
  pagination: PaginationMeta;
}

export interface TransactionsResponse {
  success: boolean;
  message: string;
  data: TransactionsData;
}

export const walletApi = {
  getSummary: (token: string) =>
    apiCall<WalletSummaryData>(`/user/wallet/summary`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
  getTransactions: (
    token: string,
    params?: {
      page?: number;
      per_page?: number;
      transaction_type?: string;
      wallet_type?: string;
      limit?: number;
    }
  ) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.per_page) queryParams.append("per_page", String(params.per_page));
    if (params?.transaction_type) queryParams.append("transaction_type", params.transaction_type);
    if (params?.wallet_type) queryParams.append("wallet_type", params.wallet_type);
    if (params?.limit) queryParams.append("limit", String(params.limit));

    const queryString = queryParams.toString();
    const url = `/user/transactions${queryString ? `?${queryString}` : ""}`;

    return apiCall<TransactionsData>(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

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

// ---------- Withdrawal Types ----------
export interface WithdrawalRequest {
  amount: string;
  wallet_address: string;
  chain_id: string;
}

export interface WithdrawalItem {
  id: number;
  user_id: number;
  amount: number;
  status: "pending" | "approved" | "rejected" | "processing" | "completed";
  wallet_address: string;
  chain_id: string;
  transaction_hash: string | null;
  created_at: string;
  updated_at?: string;
}

export interface WithdrawalResponse {
  success: boolean;
  message: string;
  data: WithdrawalItem;
}

export interface WithdrawalsResponse {
  success: boolean;
  data: {
    withdrawals: WithdrawalItem[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// ---------- Withdrawal APIs ----------
export const withdrawalApi = {
  create: (data: WithdrawalRequest, token: string) =>
    apiCall<WithdrawalItem>(`/user/withdrawals`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  getUserWithdrawals: (
    page: number = 1,
    limit: number = 10,
    token: string
  ): Promise<WithdrawalsResponse> => {
    return apiCall<any>(`/user/withdrawals?page=${page}&limit=${limit}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => {
      // Handle different response structures
      let withdrawals: WithdrawalItem[] = [];
      let pagination = undefined;

      if (response.success && response.data) {
        // Case 1: Data is an object with withdrawals array
        if (Array.isArray(response.data.withdrawals)) {
          withdrawals = response.data.withdrawals;
          pagination = response.data.pagination;
        }
        // Case 2: Data is directly an array
        else if (Array.isArray(response.data)) {
          withdrawals = response.data;
        }
        // Case 3: Data is an object, check if it has a withdrawals property
        else if (response.data.withdrawals) {
          withdrawals = Array.isArray(response.data.withdrawals)
            ? response.data.withdrawals
            : [];
          pagination = response.data.pagination;
        }
      } else if (!response.success) {
        console.error("API returned unsuccessful response:", response);
        throw new Error(response.message || "Failed to fetch withdrawals");
      }

      // Ensure we return the correct structure
      return {
        success: response.success || true,
        data: {
          withdrawals: withdrawals,
          pagination: pagination,
        },
      } as WithdrawalsResponse;
    });
  },
};

// ---------- Notification Types ----------
export interface NotificationItem {
  id: number;
  uuid: string;
  message: string;
  isRead: boolean;
  status: "read" | "unread";
  createdAt: string;
  updatedAt: string;
  timeAgo: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_more: boolean;
  };
  summary: {
    total: number;
    unread: number;
    read: number;
  };
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface MarkAllReadResponse {
  updated_count: number;
}

// ---------- Notification APIs ----------
export const notificationApi = {
  getNotifications: (token: string, page: number = 1, perPage: number = 20) =>
    apiCall<NotificationsResponse>(`/user/notifications?page=${page}&per_page=${perPage}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  getUnreadCount: (token: string) =>
    apiCall<UnreadCountResponse>(`/user/notifications/unread-count`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  markAllAsRead: (token: string) =>
    apiCall<MarkAllReadResponse>(`/user/notifications/mark-all-read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    }),

  deleteNotification: (id: number, token: string) =>
    apiCall(`/user/notifications/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  markAsUnread: (id: number, token: string) =>
    apiCall(`/user/notifications/${id}/unread`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ---------- Ticket Types ----------
export interface TicketItem {
  id: number;
  uuid: string;
  enquiry_type: number;
  title: string;
  description: string;
  reply_note: string | null;
  status: number;
  priority: number;
  created_at: string;
  enquiry_type_label?: string;
}

export interface TicketListResponse {
  success: boolean;
  data: TicketItem[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface CreateTicketRequest {
  title: string;
  enquiry_type: number;
  description: string;
  priority: number;
}

export interface CreateTicketResponse {
  success: boolean;
  message: string;
  model?: string;
  data: TicketItem;
}

// ---------- Ticket APIs ----------
export const ticketApi = {
  list: (token: string, page: number = 1, perPage: number = 10) =>
    apiCall<TicketListResponse>(`/user/ticket/list?page=${page}&per_page=${perPage}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  create: (data: CreateTicketRequest, token: string) =>
    apiCall<CreateTicketResponse>(`/user/ticket/store`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

// ---------- Admin Ticket Types ----------
export interface AdminTicketUser {
  id: number;
  uuid: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  sponsor_id?: string | null;
}

export interface AdminTicketResolver {
  id: string | number;
  name: string;
  email: string;
}

export interface AdminTicketItem {
  id: number;
  uuid: string;
  user_id: number;
  title: string;
  enquiry_type: number;
  description: string;
  reply_note: string | null;
  priority: number;
  status: number;
  resolved_by: string | number | null;
  resolved_at: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  enquiry_type_label?: string;
  user?: AdminTicketUser;
  resolver?: AdminTicketResolver | null;
}

export interface AdminTicketListPayload {
  tickets: AdminTicketItem[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface AdminTicketStatsPayload {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

export interface AdminTicketReplyRequest {
  reply_note: string;
  admin_notes?: string;
}

export interface AdminTicketCloseRequest {
  resolution_note: string;
  admin_notes?: string;
}

export const adminTicketApi = {
  list: (
    token: string,
    params: {
      page?: number;
      limit?: number;
      status?: string | number;
      search?: string;
      user_id?: string;
      enquiry_type?: string;
      priority?: string;
    } = {},
  ) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page ?? 1));
    qs.set("limit", String(params.limit ?? 10));
    if (params.status !== undefined && params.status !== null && params.status !== "all") {
      qs.set("status", String(params.status));
    }
    if (params.search) qs.set("search", params.search);
    if (params.user_id) qs.set("user_id", params.user_id);
    if (params.enquiry_type) qs.set("enquiry_type", params.enquiry_type);
    if (params.priority) qs.set("priority", params.priority);

    return apiCall<AdminTicketListPayload>(`/admin/tickets?${qs.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  stats: (token: string) =>
    apiCall<AdminTicketStatsPayload>(`/admin/tickets/statistics`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  reply: (ticketId: string | number, data: AdminTicketReplyRequest, token: string) =>
    apiCall(`/admin/tickets/${ticketId}/reply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  close: (ticketId: string | number, data: AdminTicketCloseRequest, token: string) =>
    apiCall(`/admin/tickets/${ticketId}/close`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};