// C:\Users\DELL\Desktop\crminhouse\src\lib\api.ts

// API base URL is configured via .env only
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");

// Debug: Log the API base URL being used
console.log("API_BASE_URL:", API_BASE_URL);

// ---------- Shared Types ----------
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  status?: string;
  requires_usdt_transaction?: boolean;
  requires_2fa?: boolean;
  data?: T;
  error?: string;
}

export class ApiRequestError extends Error {
  status: number;
  statusText: string;
  endpoint: string;
  payload: unknown;

  constructor({
    message,
    status,
    statusText,
    endpoint,
    payload,
  }: {
    message: string;
    status: number;
    statusText: string;
    endpoint: string;
    payload: unknown;
  }) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.statusText = statusText;
    this.endpoint = endpoint;
    this.payload = payload;
  }
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
    summary: Array<Record<string, unknown>>;
  };
  mt5_users?: Array<{
    id: number;
    uuid: string;
    name: string;
    email: string;
    mt5_id: string | null;
    account_id: string;
  }>;
  latest_news?: Array<Record<string, unknown>>;
  rate_configurations?: Array<Record<string, unknown>>;
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
  uuid?: string;
  first_name?: string;
  last_name?: string;
  mobile: string;
  country: string;
  country_code?: string;
  sponsor_id: string;
  referral_code?: string;
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

export type AdminUserUpdateBody = Partial<AdminUserCreateBody>;

export type AdminUserDetailApiData =
  | PendingUser
  | {
      user?: PendingUser;
      data?: PendingUser;
    }
  | {
      data?: {
        user?: PendingUser;
        data?: PendingUser;
      };
    };

export interface KycUploadResponse {
  status: number;
  message: string;
  model?: string;
  verification_status?: string;
}

export interface KycDocumentStatus {
  file: string | null;
  url?: string | null;
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
  file_rejection_comment: Record<string, unknown>;
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
  permissions: Record<string, unknown> | Array<Record<string, unknown>>;
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

export interface AdminGroupItem {
  id: number;
  name: string;
  mt5_group_name?: string;
  status?: number | boolean;
}

export interface AdminGroupCreateBody {
  name: string;
  mt5_group_name: string;
  status: number;
}

export interface AdminGroupUpdateBody extends AdminGroupCreateBody {
  id: number;
}

export interface AdminGroupDeleteBody {
  id: number;
}

// --- helper: turn object to x-www-form-urlencoded ---
const toFormBody = (obj: Record<string, unknown>) => {
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
      pagination?: PaginationMeta;
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

export const adminGroupsApi = {
  list: (token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch groups");
    }

    return apiCall<AdminGroupItem[]>(`/admin/groups`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  create: (body: AdminGroupCreateBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to create a group");
    }

    return apiCall<AdminGroupItem>(`/admin/groups`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  },

  update: (body: AdminGroupUpdateBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to update a group");
    }

    return apiCall<AdminGroupItem>(`/admin/groups`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  },

  delete: (body: AdminGroupDeleteBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to delete a group");
    }

    return apiCall(`/admin/groups`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  },
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
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sanitizedBody),
    });
  },

  detail: (id: number | string, token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch admin user detail");
    }

    if (id === undefined || id === null || `${id}` === "") {
      throw new Error("A valid user identifier is required to fetch admin user detail");
    }

    return apiCall<AdminUserDetailApiData>(`/admin/user-management/crud/users/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  update: (id: number | string, body: AdminUserUpdateBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to update admin user");
    }

    if (id === undefined || id === null || `${id}` === "") {
      throw new Error("A valid user identifier is required to update admin user");
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

    return apiCall(`/admin/user-management/crud/users/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sanitizedBody),
    });
  },

  delete: (id: number | string, token: string) => {
    if (!token) {
      throw new Error("Token is required to delete admin user");
    }

    if (id === undefined || id === null || `${id}` === "") {
      throw new Error("A valid user identifier is required to delete admin user");
    }

    return apiCall(`/admin/user-management/crud/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

// ---------- Admin News APIs ----------
export interface NewsCreateBody {
  title: string;
  description: string;
  short_description: string;
  image?: File | string; // File for upload or string URL
  status: string | number; // "1" for active, "0" for inactive
}

export interface NewsItem {
  id: number | string;
  title: string;
  description: string;
  short_description: string;
  image?: string;
  status: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface NewsCreateResponse {
  success: boolean;
  message: string;
  data?: {
    news?: NewsItem;
  };
}

export const adminNewsApi = {
  create: (body: NewsCreateBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to create news");
    }

    // If image is a File, use FormData; otherwise use JSON
    if (body.image instanceof File) {
      const formData = new FormData();
      formData.append("title", body.title);
      formData.append("description", body.description);
      formData.append("short_description", body.short_description);
      formData.append("image", body.image);
      formData.append("status", String(body.status));

      return apiCall<NewsCreateResponse>(`/admin/news/create`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    } else {
      // JSON request with image URL
      return apiCall<NewsCreateResponse>(`/admin/news/create`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: body.title,
          description: body.description,
          short_description: body.short_description,
          image: body.image || "",
          status: String(body.status),
        }),
      });
    }
  },
};

// ---------- Generic helper ----------
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

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

  // Check if body is FormData - don't set Content-Type for FormData (browser will set it with boundary)
  const isFormData = restOptions.body instanceof FormData;
  
  // Build headers - exclude Content-Type for FormData
  const finalHeaders: Record<string, string> = { ...normalizedHeaders };
  if (!isFormData) {
    finalHeaders["Content-Type"] = "application/json";
  } else {
    // Remove Content-Type if it was in normalizedHeaders
    const { "Content-Type": _, ...headersWithoutContentType } = finalHeaders;
    Object.assign(finalHeaders, headersWithoutContentType);
  }
  
  const config: RequestInit = {
    ...restOptions,
    headers: finalHeaders,
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
    throw new ApiRequestError({
      message: json?.message || json?.error || `HTTP ${res.status}`,
      status: res.status,
      statusText: res.statusText,
      endpoint,
      payload: json,
    });
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
      headers: { Authorization: `Bearer ${token}` } as Record<string, string>,
      body: formData,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `Upload failed (${res.status})`);
    return json as KycUploadResponse;
  },
  getProfileDocumentsStatus: async (token: string): Promise<KycStatusResponse> => {
    const res = await fetch(`${API_BASE_URL}/user/profile/document`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` } as Record<string, string>,
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

  getWalletStatistics: (token: string, type: "deposits" | "withdrawals", period: number = 30) =>
    apiCall<{
      type: string;
      period: string;
      days: number;
      statistics: Array<{
        day: string;
        date: string;
        amount: number;
      }>;
    }>(`/user/dashboard/wallet-statistics?type=${type}&period=${period}`, {
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
      items: Array<Record<string, unknown>>;
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
    apiCall<{ managers: ManagerItem[]; pagination?: PaginationMeta }>(`/admin/manager/list`, {
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

// ---------- Binance Pay Deposit Types ----------
export interface BinanceDepositCreateRequest {
  amount: number;
  user_comment?: string;
}

export interface BinanceDepositCreateResponse {
  success: boolean;
  message: string;
  test_mode?: boolean;
  data: {
    deposit_uuid: string;
    merchant_trade_no: string;
    prepay_id: string;
    qr_code_link: string;
    qr_content: string;
    checkout_url: string;
    deeplink: string;
    universal_url: string;
    amount: number;
    currency: string;
  };
}

export interface DepositListItem {
  id: number;
  uuid: string;
  amount: string;
  status: number; // 0: pending, 1: approved, 2: rejected
  file: string | null;
  user_comment: string | null;
  admin_comment: string | null;
  created_at: string;
  payment_method_id: number;
  merchant_trade_no?: string | null;
  coinsbuy_deposit_id?: string | null;
  paymentMethod: {
    id: number;
    type: string;
  };
}

export interface DepositListResponse {
  success: boolean;
  data: DepositListItem[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export interface BinanceDepositStatusResponse {
  success: boolean;
  message: string;
  data: {
    deposit_uuid: string;
    merchant_trade_no: string;
    deposit_status: number;
    binance_status: string;
    transaction_id: string | null;
    amount: number;
    currency: string;
    transaction_time: number;
  };
}

// ---------- Binance Pay Deposit APIs ----------
export const binanceDepositApi = {
  create: (data: BinanceDepositCreateRequest, token: string) =>
    apiCall<BinanceDepositCreateResponse>(`/user/deposit/binance/create`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  getList: (page: number = 1, perPage: number = 10, token: string, paymentMethodId?: number) => {
    const qs = new URLSearchParams();
    qs.set("per_page", String(perPage));
    qs.set("page", String(page));
    if (paymentMethodId !== undefined && paymentMethodId !== null) {
      qs.set("payment_method_id", String(paymentMethodId));
    }
    return apiCall<DepositListResponse>(`/user/deposit/list?${qs.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getStatus: (merchantTradeNo: string, token: string) =>
    apiCall<BinanceDepositStatusResponse>(`/user/deposit/binance/status/${merchantTradeNo}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ---------- CoinsBuy Deposit Types ----------
export interface CoinsBuyDepositCreateRequest {
  amount: number;
}

export interface CoinsBuyDepositCreateResponse {
  success: boolean;
  message: string;
  data: {
    deposit_uuid: string;
    coinsbuy_deposit_id: string;
    tracking_id: string;
    wallet_id: string;
    amount: number;
    label: string;
    confirmations_needed: number;
    status: number;
    payment_page_redirect_url: string;
    callback_url: string;
  };
}

export interface CoinsBuyWebhookRequest {
  data: {
    type: string;
    id: string;
  };
}

export interface CoinsBuyWebhookResponse {
  success: boolean;
  message: string;
}

export interface CoinsBuyDepositStatusResponse {
  success: boolean;
  message: string;
  data: {
    deposit_uuid: string;
    coinsbuy_deposit_id: string;
    deposit_status: number;
    coinsbuy_status: number;
    confirmations_needed: number;
    tracking_id: string;
  };
}

// ---------- CoinsBuy Deposit APIs ----------
export const coinsbuyDepositApi = {
  create: (data: CoinsBuyDepositCreateRequest, token: string) =>
    apiCall<CoinsBuyDepositCreateResponse>(`/user/deposit/coinsbuy/create`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  triggerWebhook: (data: CoinsBuyWebhookRequest, token: string) =>
    apiCall<CoinsBuyWebhookResponse>(`/webhook/coinsbuy`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  getStatus: (coinsbuyDepositId: string, token: string) =>
    apiCall<CoinsBuyDepositStatusResponse>(`/user/deposit/coinsbuy/status/${coinsbuyDepositId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

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
  leverage_type?: string;
  leverage_value?: number | string;
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

// ---------- User MT5 Account Types ----------
export interface UserMT5AccountCreateRequest {
  account_type_id: number;
  extra_fields: Record<string, unknown>;
  group_id: number;
  investor_password: string;
  leverage: number;
  main_password: string;
}

export interface UserMT5AccountCreateData {
  login: number | string;
  name: string;
  group: string;
  leverage: number | string;
  main_password: string;
  investor_password: string;
}

export interface UserMT5AccountListItem {
  id: number;
  name: string;
  email: string;
  mt5_id: string;
  account_id: string;
}

export interface UserMT5AccountDetail {
  id: number;
  uuid: string;
  name: string;
  email: string;
  manager_id: number | string | null;
  mobile: string;
  account_id: string;
  mt5_id: string;
  user_id: number;
  group_id: number;
  account_type_id: number;
  leverage: number;
  self_wallet: number;
  status: number | string;
  account_mode: string;
  created_at: string;
  updated_at: string;
  mt5_group_name: string;
  first_name: string;
  last_name: string;
  sponsor_id: string | number | null;
  minimum_deposit: number;
  spread_from: string;
  maximum_leverage: string;
  leverage_type: string;
  leverage_value: number;
  stop_out_level: number;
  hedge_margin: number;
  swap_free_option: number;
  base_currency: string;
  User?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    mobile: string;
    sponsor_id: string | number | null;
  };
  group?: {
    id: number;
    name: string;
    mt5_group_name: string;
    minimum_deposit: number;
  };
  Manager?: unknown;
  accountType?: {
    id: number;
    name: string;
    spread_from: string;
    maximum_leverage: string;
    leverage_type: string;
    leverage_value: number;
    stop_out_level: number;
    hedge_margin: number;
    swap_free_option: number;
    base_currency: string;
  };
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

// ---------- User MT5 Account APIs ----------
export const userMT5AccountsApi = {
  create: (data: UserMT5AccountCreateRequest, token: string) =>
    apiCall<UserMT5AccountCreateData>(`/user/mt5-account`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  list: (token: string) =>
    apiCall<{ mt5_accounts: UserMT5AccountListItem[] }>(`/user/mt5-account`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  getById: (id: string | number, token: string) =>
    apiCall<{ mt5_account: UserMT5AccountDetail }>(`/user/mt5-account/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ---------- MT5 SDK Trading APIs ----------
export interface Mt5SdkPosition {
  Action?: number;
  Login: number;
  Position: number;
  ExpertPositionID?: number;
  Symbol: string;
  PriceCurrent?: number;
  PriceOpen?: number;
  PriceSL?: number;
  PriceTP?: number;
  Profit?: number;
  Volume?: number;
  VolumeExt?: number;
  TimeCreate?: number;
  TimeCreateMsc?: number;
  TimeUpdate?: number;
  TimeUpdateMsc?: number;
  ContractSize?: number;
  Comment?: string;
  [key: string]: unknown;
}

export interface Mt5SdkPositionsResponse {
  login: number;
  count: number;
  items: Mt5SdkPosition[];
}

export type Mt5SdkTradeRecordType = "deal" | "order" | string;

export interface Mt5SdkTradeRecord {
  record_type: Mt5SdkTradeRecordType;
  Login: number;
  Symbol?: string;
  Action?: number;
  Type?: number;
  Entry?: number;
  Deal?: number;
  Order?: number;
  PositionID?: number;
  Price?: number;
  PriceCurrent?: number;
  PricePosition?: number;
  PriceSL?: number;
  PriceTP?: number;
  Profit?: number;
  ProfitRaw?: number;
  Commission?: number;
  Fee?: number;
  Storage?: number;
  Volume?: number;
  VolumeClosed?: number;
  VolumeExt?: number;
  VolumeInitial?: number;
  VolumeCurrent?: number;
  Time?: number;
  TimeMsc?: number;
  TimeDone?: number;
  TimeDoneMsc?: number;
  TimeSetup?: number;
  TimeSetupMsc?: number;
  State?: number;
  Comment?: string;
  [key: string]: unknown;
}

export interface Mt5SdkTradeHistoryResponse {
  login: number;
  from_dt?: string;
  to_dt?: string;
  count: number;
  items: Mt5SdkTradeRecord[];
}

export interface Mt5SdkTradeHistoryParams {
  login: string | number;
  from_dt?: string;
  to_dt?: string;
}

const unwrapDirectOrEnvelope = <T,>(response: ApiResponse<T> | T): T => {
  if (response && typeof response === "object" && "data" in response && !("items" in response)) {
    const data = (response as ApiResponse<T>).data;
    if (data !== undefined) {
      return data;
    }
  }

  return response as T;
};

const authHeaders = (token?: string | null) =>
  token ? { Authorization: `Bearer ${token}` } : undefined;

export const mt5SdkApi = {
  getPositions: async (login: string | number, token?: string | null) => {
    if (login === undefined || login === null || `${login}`.trim() === "") {
      throw new Error("MT5 login is required to fetch open positions");
    }

    const response = await apiCall<Mt5SdkPositionsResponse>(
      `/mt5sdk/accounts/${encodeURIComponent(String(login))}/positions`,
      {
        method: "GET",
        headers: authHeaders(token),
      }
    );

    return unwrapDirectOrEnvelope<Mt5SdkPositionsResponse>(response);
  },

  getTradeHistory: async ({ login, from_dt, to_dt }: Mt5SdkTradeHistoryParams, token?: string | null) => {
    if (login === undefined || login === null || `${login}`.trim() === "") {
      throw new Error("MT5 login is required to fetch trade history");
    }

    const qs = new URLSearchParams();
    qs.set("login", String(login));
    if (from_dt) qs.set("from_dt", from_dt);
    if (to_dt) qs.set("to_dt", to_dt);

    const response = await apiCall<Mt5SdkTradeHistoryResponse>(
      `/mt5sdk/history/trades?${qs.toString()}`,
      {
        method: "GET",
        headers: authHeaders(token),
      }
    );

    return unwrapDirectOrEnvelope<Mt5SdkTradeHistoryResponse>(response);
  },
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

export interface IbWalletBalance {
  amount: number;
  currency: string;
}

export interface IbWalletEarningSummary {
  total_earned: number;
  total_internal_transfers: number;
  currency: string;
}

export interface IbWalletTransaction {
  id?: number;
  type?: string;
  amount?: number;
  currency?: string;
  description?: string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface IbWalletTransactions {
  data: IbWalletTransaction[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface IbWalletData {
  wallet_balance: IbWalletBalance;
  client_wallet: IbWalletBalance;
  earning_summary: IbWalletEarningSummary;
  transactions: IbWalletTransactions;
}

export interface IbWalletResponse {
  success: boolean;
  message: string;
  data: IbWalletData;
}

export interface IbSubIb {
  client_id: string;
  client_name: string;
  level: number;
  lots_traded: number;
  pending_rebates: number;
  earned_rebates: number;
  registration_date: string;
}

export interface IbSubIbsData {
  sub_ibs: IbSubIb[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface IbSubIbsResponse {
  success: boolean;
  message: string;
  data: IbSubIbsData;
}

export interface IbClient {
  client_id: string;
  client_name: string;
  lots_traded: number;
  pending_rebates: number;
  earned_rebates: number;
  registration_date: string;
}

export interface IbClientsData {
  clients: IbClient[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface IbClientsResponse {
  success: boolean;
  message: string;
  data: IbClientsData;
}

export interface IbRebate {
  client_id: string;
  client_name: string;
  lots_traded: number;
  pending_rebates: number;
  earned_rebates: number;
  registration_date: string;
}

export interface IbRebatesData {
  rebates: IbRebate[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface IbRebatesResponse {
  success: boolean;
  message: string;
  data: IbRebatesData;
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
  getIbWallet: (token: string) =>
    apiCall<IbWalletData>(`/user/ib-wallet`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
  getSubIbs: (token: string, params?: { page?: number; limit?: number; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.search) queryParams.append("search", params.search);
    const queryString = queryParams.toString();
    const url = `/user/ib-client-summary/sub-ibs${queryString ? `?${queryString}` : ""}`;
    return apiCall<IbSubIbsResponse>(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  getClients: (token: string, params?: { page?: number; limit?: number; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.search) queryParams.append("search", params.search);
    const queryString = queryParams.toString();
    const url = `/user/ib-client-summary/clients${queryString ? `?${queryString}` : ""}`;
    return apiCall<IbClientsResponse>(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  getRebates: (token: string, params?: { page?: number; limit?: number; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.search) queryParams.append("search", params.search);
    const queryString = queryParams.toString();
    const url = `/user/ib-client-summary/rebates${queryString ? `?${queryString}` : ""}`;
    return apiCall<IbRebatesResponse>(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
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
  [key: string]: unknown;
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
  [key: string]: unknown;
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

// ---------- Admin IB Users APIs ----------
export interface AdminIbUser {
  id?: number | string;
  uuid?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile?: string;
  phone?: string;
  sponsor_id?: string;
  ib_name?: string;
  partner_id?: string;
  referral_link?: string;
  status?: number | string;
  is_ib_user?: boolean | number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface AdminIbUsersListData {
  items?: AdminIbUser[];
  users?: AdminIbUser[];
  data?:
    | AdminIbUser[]
    | {
        items?: AdminIbUser[];
        data?: AdminIbUser[];
        users?: AdminIbUser[];
        pagination?: PaginationMeta;
        total?: number;
      };
  pagination?: PaginationMeta;
  meta?: {
    pagination?: PaginationMeta;
  };
  total?: number;
  [key: string]: unknown;
}

export type AdminIbUsersListParams = {
  token: string;
  page?: number;
  per_page?: number;
  search?: string;
};

export const adminIbUsersApi = {
  list: ({ token, page = 1, per_page = 10, search }: AdminIbUsersListParams) => {
    if (!token) {
      throw new Error("Token is required to fetch IB users");
    }

    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("per_page", String(per_page));

    if (typeof search === "string" && search.trim()) {
      qs.set("search", search.trim());
    }

    const endpoint = `/admin/ib-management/ib-users${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<AdminIbUsersListData>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

// ---------- Admin IB User Commissions APIs ----------
export interface UserCommission {
  id: number;
  mt5_user_id: number;
  mt5_account_id: string;
  mt5_user_name: string;
  account_type_id: number;
  level: string;
  rate_ib: number;
  rate_sub_ib_1: number;
  rate_sub_ib_2: number;
  rate_sub_ib_3: number;
  rate_sub_ib_4: number;
  rate_sub_ib_5: number;
  status: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCommissionResponse {
  success: boolean;
  data: {
    user: {
      id: number;
      name: string;
      email: string;
    };
    commissions: UserCommission[];
  };
}

export type UserCommissionUpdateBody = {
  commissions: Array<{
    id?: number;
    mt5_user_id: number;
    mt5_account_id: string;
    account_type_id: number;
    level: string;
    rate_ib: number;
    rate_sub_ib_1: number;
    rate_sub_ib_2: number;
    rate_sub_ib_3: number;
    rate_sub_ib_4: number;
    rate_sub_ib_5: number;
    status: boolean;
  }>;
};

export const adminIbUserCommissionsApi = {
  getUserCommissions: (userId: string | number, token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch user commissions");
    }

    if (userId === null || userId === undefined || `${userId}`.trim() === "") {
      throw new Error("User ID is required to fetch commissions");
    }

    const endpoint = `/admin/ib-management/user-commissions/${userId}`;

    return apiCall<UserCommissionResponse>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  updateUserCommissions: (userId: string | number, body: UserCommissionUpdateBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to update user commissions");
    }

    if (userId === null || userId === undefined || `${userId}`.trim() === "") {
      throw new Error("User ID is required to update commissions");
    }

    const endpoint = `/admin/ib-management/user-commissions/${userId}`;

    return apiCall<UserCommissionResponse>(endpoint, {
      method: "PUT",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  },

  patchUserCommission: (userId: string | number, commission: UserCommission, token: string) => {
    if (!token) {
      throw new Error("Token is required to update user commission");
    }

    if (userId === null || userId === undefined || `${userId}`.trim() === "") {
      throw new Error("User ID is required to update commission");
    }

    const endpoint = `/admin/ib-management/user-commissions/${userId}`;

    // Format commission data for the API
    const commissionData = {
      id: commission.id,
      mt5_user_id: commission.mt5_user_id,
      mt5_account_id: commission.mt5_account_id,
      account_type_id: commission.account_type_id,
      level: commission.level,
      rate_ib: commission.rate_ib,
      rate_sub_ib_1: commission.rate_sub_ib_1,
      rate_sub_ib_2: commission.rate_sub_ib_2,
      rate_sub_ib_3: commission.rate_sub_ib_3,
      rate_sub_ib_4: commission.rate_sub_ib_4,
      rate_sub_ib_5: commission.rate_sub_ib_5,
      status: commission.status,
    };

    return apiCall<UserCommissionResponse>(endpoint, {
      method: "PATCH",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        commissions: [commissionData],
      }),
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
export interface AdminMT5AccountUser {
  id?: number | string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile?: string;
  sponsor_id?: string | number | null;
}

export interface AdminMT5AccountGroup {
  id?: number | string;
  name?: string;
  mt5_group_name?: string;
  minimum_deposit?: number | string;
}

export interface AdminMT5AccountType {
  id?: number | string;
  name?: string;
  spread_from?: string;
  maximum_leverage?: string;
  leverage_type?: string;
  leverage_value?: number | string;
  stop_out_level?: number | string;
  hedge_margin?: number | string;
  swap_free_option?: number | string;
  base_currency?: string;
}

export interface AdminMT5AccountManager {
  id?: number | string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface AdminMT5Account {
  id?: number | string;
  uuid?: string;
  mt5_id?: string | number;
  account_id?: string | number;
  user_id?: number | string;
  group_id?: number | string;
  manager_id?: number | string;
  account_type_id?: number | string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile?: string;
  sponsor_id?: string | number | null;
  account_type?: string;
  status?: number | string;
  account_mode?: "demo" | "live" | string;
  balance?: string | number;
  equity?: string | number;
  margin?: string | number;
  free_margin?: string | number;
  leverage?: string | number;
  self_wallet?: string | number;
  currency?: string;
  mt5_group_name?: string;
  minimum_deposit?: string | number;
  spread_from?: string;
  maximum_leverage?: string;
  leverage_type?: string;
  leverage_value?: string | number;
  stop_out_level?: string | number;
  hedge_margin?: string | number;
  swap_free_option?: string | number;
  base_currency?: string;
  created_at?: string;
  updated_at?: string;
  user?: AdminMT5AccountUser;
  User?: AdminMT5AccountUser;
  group?: AdminMT5AccountGroup;
  manager?: AdminMT5AccountManager | null;
  Manager?: AdminMT5AccountManager | null;
  accountType?: AdminMT5AccountType;
  [key: string]: unknown;
}

export interface AdminMT5AccountsListParams {
  token: string;
  page?: number;
  limit?: number;
  search?: string;
  status?: string | number;
  account_mode?: "demo" | "live" | string;
  user_id?: string | number;
  group_id?: string | number;
  manager_id?: string | number;
}

export interface UpdateMT5AccountRequest {
  name?: string;
  group_id?: number;
  investor_password?: string;
  leverage?: number;
  password?: string;
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
  [key: string]: unknown;
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
    account_mode,
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

    if (account_mode !== undefined && account_mode !== null && `${account_mode}` !== "") {
      qs.set("account_mode", String(account_mode));
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

    return apiCall<{
      data?: AdminMT5Account | { mt5_account?: AdminMT5Account; account?: AdminMT5Account };
      account?: AdminMT5Account;
      mt5_account?: AdminMT5Account;
    }>(
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
    return apiCall<unknown>(`/user/withdrawals?page=${page}&limit=${limit}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => {
      // Handle different response structures
      let withdrawals: WithdrawalItem[] = [];
      let pagination: { page: number; limit: number; total: number; totalPages: number } | undefined = undefined;

      if (response.success && response.data) {
        const data = response.data as Record<string, unknown>;
        // Case 1: Data is an object with withdrawals array
        if (Array.isArray(data.withdrawals)) {
          withdrawals = data.withdrawals as WithdrawalItem[];
          pagination = data.pagination as typeof pagination;
        }
        // Case 2: Data is directly an array
        else if (Array.isArray(response.data)) {
          withdrawals = response.data as WithdrawalItem[];
        }
        // Case 3: Data is an object, check if it has a withdrawals property
        else if (data.withdrawals) {
          withdrawals = Array.isArray(data.withdrawals)
            ? (data.withdrawals as WithdrawalItem[])
            : [];
          pagination = data.pagination as typeof pagination;
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

// ---------- Admin Notification Types ----------
export interface AdminNotificationItem {
  id: number;
  uuid: string;
  message: string;
  status: number; // 0: unread, 1: read
  created_at: string;
  updated_at: string;
}

export interface AdminNotificationsResponse {
  success: boolean;
  data: {
    notifications: AdminNotificationItem[];
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
  };
}

export interface AdminMarkAllReadResponse {
  success: boolean;
  message: string;
  data?: {
    updated_count: number;
  };
}

export interface AdminUnreadCountResponse {
  success: boolean;
  data: {
    unread_count: number;
  };
}

// ---------- Admin Notification APIs ----------
export const adminNotificationApi = {
  getNotifications: (
    token: string,
    params?: {
      page?: number;
      limit?: number;
      status?: "all" | "unread" | "read";
      search?: string;
    }
  ) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.status) qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);

    return apiCall<AdminNotificationsResponse["data"]>(
      `/admin/notifications${qs.toString() ? `?${qs.toString()}` : ""}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },

  getUnreadCount: (token: string) =>
    apiCall<AdminUnreadCountResponse["data"]>(`/admin/notifications/unread-count`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  markAsRead: (notificationId: number, token: string) =>
    apiCall(`/admin/notifications/${notificationId}/read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    }),

  markAllAsRead: (token: string) =>
    apiCall<AdminMarkAllReadResponse["data"]>(`/admin/notifications/mark-all-read`, {
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

// ---------- Admin Deposit Report APIs ----------
export interface DepositReportItem {
  id: number | string;
  name: string;
  email: string;
  name_email: string;
  mt5_id?: string;
  amount: number | string;
  payment_method: string;
  payment_method_id: number | string;
  note?: string;
  comment?: string;
  deposit_proof?: string | null;
  deposit_proof_file?: string | null;
  status: number; // 0=pending, 1=approved, 2=rejected
  status_text: string;
  date: string;
  created_at: string;
  marketing_name?: string | null;
  approved_rejected_by?: string | null;
  transaction_hash?: string | null;
  merchant_trade_no?: string | null;
  coinsbuy_deposit_id?: string | null;
}

export interface DepositReportListParams {
  token: string;
  status?: number | string; // 0=pending, 1=approved, 2=rejected
  payment_method_id?: number | string | "all";
  from_date?: string; // YYYY-MM-DD
  to_date?: string; // YYYY-MM-DD
  page?: number;
  per_page?: number;
  sort_column?: string;
  sort_order?: "ASC" | "DESC";
  search?: string;
}

export interface DepositReportListPayload {
  success: boolean;
  message: string;
  data: DepositReportItem[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
  filters: {
    status?: string | null;
    payment_method_id?: string | null;
    from_date?: string | null;
    to_date?: string | null;
    search?: string | null;
  };
}

export const adminDepositReportApi = {
  list: (params: DepositReportListParams) => {
    const { token, ...queryParams } = params;
    if (!token) {
      throw new Error("Token is required to fetch deposit report");
    }

    const qs = new URLSearchParams();
    if (queryParams.page) qs.set("page", String(queryParams.page));
    if (queryParams.per_page) qs.set("per_page", String(queryParams.per_page));
    if (queryParams.status !== undefined && queryParams.status !== null) {
      qs.set("status", String(queryParams.status));
    }
    if (queryParams.payment_method_id && queryParams.payment_method_id !== "all") {
      qs.set("payment_method_id", String(queryParams.payment_method_id));
    } else if (queryParams.payment_method_id === "all") {
      qs.set("payment_method_id", "all");
    }
    if (queryParams.from_date) qs.set("from_date", queryParams.from_date);
    if (queryParams.to_date) qs.set("to_date", queryParams.to_date);
    if (queryParams.sort_column) qs.set("sort_column", queryParams.sort_column);
    if (queryParams.sort_order) qs.set("sort_order", queryParams.sort_order);
    if (queryParams.search) qs.set("search", queryParams.search);

    const endpoint = `/admin/reports/deposit-report${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<DepositReportListPayload>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

// ---------- Admin Withdrawal Report APIs ----------
export interface WithdrawalReportItem {
  id: number | string;
  name?: string;
  email?: string;
  name_email?: string;
  mt5_id?: string;
  amount: number | string;
  payment_method?: string;
  payment_method_id?: number | string;
  wallet_address?: string | null;
  chain_id?: string | null;
  transaction_hash?: string | null;
  status: number | string; // 0=pending, 1=approved, 2=rejected or "pending" | "approved" | "rejected"
  status_text?: string;
  date?: string;
  created_at: string;
  updated_at?: string;
  remarks?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface WithdrawalReportListParams {
  token: string;
  status?: number | string | "pending" | "approved" | "rejected"; // 0=pending, 1=approved, 2=rejected
  payment_method_id?: number | string | "all";
  from_date?: string; // YYYY-MM-DD
  to_date?: string; // YYYY-MM-DD
  page?: number;
  per_page?: number;
  sort_column?: string;
  sort_order?: "ASC" | "DESC";
  search?: string;
}

export interface WithdrawalReportListPayload {
  success: boolean;
  message: string;
  data: WithdrawalReportItem[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
  filters?: {
    status?: string | null;
    payment_method_id?: string | null;
    from_date?: string | null;
    to_date?: string | null;
    search?: string | null;
  };
}

export const adminWithdrawalReportApi = {
  list: (params: WithdrawalReportListParams) => {
    const { token, ...queryParams } = params;
    if (!token) {
      throw new Error("Token is required to fetch withdrawal report");
    }

    const qs = new URLSearchParams();
    if (queryParams.page) qs.set("page", String(queryParams.page));
    if (queryParams.per_page) qs.set("per_page", String(queryParams.per_page));
    if (queryParams.status !== undefined && queryParams.status !== null) {
      qs.set("status", String(queryParams.status));
    }
    if (queryParams.payment_method_id && queryParams.payment_method_id !== "all") {
      qs.set("payment_method_id", String(queryParams.payment_method_id));
    } else if (queryParams.payment_method_id === "all") {
      qs.set("payment_method_id", "all");
    }
    if (queryParams.from_date) qs.set("from_date", queryParams.from_date);
    if (queryParams.to_date) qs.set("to_date", queryParams.to_date);
    if (queryParams.sort_column) qs.set("sort_column", queryParams.sort_column);
    if (queryParams.sort_order) qs.set("sort_order", queryParams.sort_order);
    if (queryParams.search) qs.set("search", queryParams.search);

    const endpoint = `/admin/reports/withdrawal-report${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<WithdrawalReportListPayload>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

// ---------- Admin IB Withdrawal Report APIs ----------
export interface IbWithdrawalReportItem {
  id: number | string;
  name?: string;
  email?: string;
  name_email?: string;
  ib_name?: string;
  partner_id?: string;
  amount: number | string;
  payment_method?: string;
  payment_method_id?: number | string;
  wallet_address?: string | null;
  chain_id?: string | null;
  transaction_hash?: string | null;
  status: number | string; // 0=pending, 1=approved, 2=rejected or "pending" | "approved" | "rejected"
  status_text?: string;
  date?: string;
  created_at: string;
  updated_at?: string;
  remarks?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface IbWithdrawalReportListParams {
  token: string;
  from_date?: string; // YYYY-MM-DD
  to_date?: string; // YYYY-MM-DD
  page?: number;
  per_page?: number;
}

export interface IbWithdrawalReportListPayload {
  success: boolean;
  message: string;
  data: IbWithdrawalReportItem[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
  filters?: {
    from_date?: string | null;
    to_date?: string | null;
  };
}

export const adminIbWithdrawalReportApi = {
  list: (params: IbWithdrawalReportListParams) => {
    const { token, ...queryParams } = params;
    if (!token) {
      throw new Error("Token is required to fetch IB withdrawal report");
    }

    const qs = new URLSearchParams();
    if (queryParams.page) qs.set("page", String(queryParams.page));
    if (queryParams.per_page) qs.set("per_page", String(queryParams.per_page));
    if (queryParams.from_date) qs.set("from_date", queryParams.from_date);
    if (queryParams.to_date) qs.set("to_date", queryParams.to_date);

    const endpoint = `/admin/reports/ib-withdrawal-report${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<IbWithdrawalReportListPayload>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

// ---------- Admin Internal Transfer Report APIs ----------
export interface InternalTransferReportItem {
  id: number | string;
  user_id?: number | string;
  from_account?: string | null;
  to_account?: string | null;
  from_wallet_type?: string | null;
  to_wallet_type?: string | null;
  from_mt5_account_id?: string | null;
  to_mt5_account_id?: string | null;
  amount: number | string;
  remarks?: string | null;
  comment?: string | null;
  transfer_type?: string | null;
  transfer_mode?: string | null;
  status?: number | string;
  status_text?: string;
  created_at: string;
  updated_at?: string;
  user?: {
    id?: number | string;
    name?: string;
    email?: string;
  };
}

export interface InternalTransferReportListParams {
  token: string;
  search?: string; // Searches in amount, comments
  page?: number;
  per_page?: number;
}

export interface InternalTransferReportListPayload {
  success: boolean;
  message: string;
  data: InternalTransferReportItem[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
  filters?: {
    search?: string | null;
  };
}

export const adminInternalTransferReportApi = {
  list: (params: InternalTransferReportListParams) => {
    const { token, ...queryParams } = params;
    if (!token) {
      throw new Error("Token is required to fetch internal transfer report");
    }

    const qs = new URLSearchParams();
    if (queryParams.page) qs.set("page", String(queryParams.page));
    if (queryParams.per_page) qs.set("per_page", String(queryParams.per_page));
    if (queryParams.search && queryParams.search.trim()) {
      qs.set("search", queryParams.search.trim());
    }

    const endpoint = `/admin/reports/internal-transfer-report${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<InternalTransferReportListPayload>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

// ---------- Admin Login Activity Report APIs ----------
export interface LoginActivityReportItem {
  id: number | string;
  user_id?: number | string;
  email?: string;
  name?: string;
  ip_address?: string;
  browser?: string;
  device?: string;
  platform?: string;
  user_agent?: string;
  location?: string;
  country?: string;
  city?: string;
  status?: string | number;
  login_at?: string;
  created_at: string;
  user?: {
    id?: number | string;
    name?: string;
    email?: string;
  };
}

export interface LoginActivityReportListParams {
  token: string;
  search?: string; // Searches in IP address
  page?: number;
  per_page?: number;
}

export interface LoginActivityReportListPayload {
  success: boolean;
  message: string;
  data: LoginActivityReportItem[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
  filters?: {
    search?: string | null;
  };
}

export const adminLoginActivityReportApi = {
  list: (params: LoginActivityReportListParams) => {
    const { token, ...queryParams } = params;
    if (!token) {
      throw new Error("Token is required to fetch login activity report");
    }

    const qs = new URLSearchParams();
    if (queryParams.page) qs.set("page", String(queryParams.page));
    if (queryParams.per_page) qs.set("per_page", String(queryParams.per_page));
    if (queryParams.search && queryParams.search.trim()) {
      qs.set("search", queryParams.search.trim());
    }

    const endpoint = `/admin/reports/login-activity-report${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<LoginActivityReportListPayload>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

// ---------- Admin Dashboard APIs ----------
export interface AdminDashboardKpis {
  total_clients: number;
  total_ib: number;
  pending_clients: number;
  approved_deposit: number;
  pending_deposit: number;
  pending_withdraw: number;
  pending_ib_withdraw: number;
  active_traders: number;
  ftd_users: number;
  non_ftd_users: number;
  pending_ib_request: number;
  pending_bank_details_request: number;
}

export interface AdminDashboardTransactionGraphData {
  date: string;
  deposit: number;
  withdraw: number;
  ib_withdraw: number;
}

export interface AdminDashboardTransactionGraph {
  start_date: string;
  end_date: string;
  data: AdminDashboardTransactionGraphData[];
}

export interface AdminDashboardSummaryMetrics {
  daily: {
    deposit: number;
    withdraw: number;
    ib_withdraw: number;
  };
  weekly: {
    deposit: number;
    withdraw: number;
    ib_withdraw: number;
  };
  monthly: {
    deposit: number;
    withdraw: number;
    ib_withdraw: number;
  };
  total: {
    deposit: number;
    withdraw: number;
    ib_withdraw: number;
  };
}

export interface AdminDashboardData {
  kpis: AdminDashboardKpis;
  transaction_graph: AdminDashboardTransactionGraph;
  summary_metrics: AdminDashboardSummaryMetrics;
}

export interface AdminDashboardResponse {
  success: boolean;
  message: string;
  data: AdminDashboardData;
}

export interface AdminDashboardParams {
  token: string;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
}

export const adminDashboardApi = {
  getDashboard: (params: AdminDashboardParams) => {
    const { token, start_date, end_date } = params;
    if (!token) {
      throw new Error("Token is required to fetch admin dashboard");
    }

    const qs = new URLSearchParams();
    if (start_date) qs.set("start_date", start_date);
    if (end_date) qs.set("end_date", end_date);

    const endpoint = `/admin/dashboard${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<AdminDashboardData>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
