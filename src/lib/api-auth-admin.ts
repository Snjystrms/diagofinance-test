import { API_BASE_URL, type ApiResponse, PaginationMeta, apiCall, toFormBody } from "./api-core";

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

export interface AdminUserProfileDetails {
  id?: number;
  user_id?: number;
  manager_id?: number | null;
  uuid?: string;
  gender?: string | null;
  address?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  dob?: string | null;
  pin_code?: string | null;
  passport_id_number?: string | null;
  tax_number?: string | null;
  other_id_number?: string | null;
  nationality?: string | null;
  employment_status?: string | null;
  client_type?: string | null;
  politically_exposed?: number | boolean | null;
  annual_income?: string | null;
  source_of_income?: string | null;
  estimated_net_worth?: string | null;
  purpose_of_opening_account?: string | null;
  estimated_annual_amount?: string | null;
  pin?: string | null;
  device_json?: string | null;
  ip_address?: string | null;
  referral_code?: string | null;
  last_login_at?: string | null;
  sign_up_from?: number | string | null;
  status?: number | string | boolean | null;
  self_wallet?: number | string | null;
  ib_wallet?: number | string | null;
  ib_name?: string | null;
  is_ib_user?: number | boolean | null;
  promote_is_ib_user?: number | boolean | null;
  referral_receive_status?: number | boolean | null;
  poi_front_file?: string | null;
  poa_front_file?: string | null;
  poa_back_file?: string | null;
  other_file?: string | null;
  poi_front_file_status?: number | string | null;
  poa_front_file_status?: number | string | null;
  poa_back_file_status?: number | string | null;
  other_file_status?: number | string | null;
  file_rejection_comment?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
}

export interface AdminUserDetailsData {
  totalPendingDeposit?: number;
  totalPendingWithdraw?: number;
  totalRejectedDeposit?: number;
  totalRejectedWithdraw?: number;
  uuid?: string;
  name?: string;
  email?: string;
  mt5Users?: Array<Record<string, unknown>>;
  userDetails?: AdminUserProfileDetails | null;
  hasUserDetails?: boolean;
}

export type AdminUserDetailsApiData =
  | AdminUserDetailsData
  | {
      data?: AdminUserDetailsData;
    };

export interface AdminUserMt5AccountItem {
  id: number;
  account_id: string;
  mt5_id?: string | null;
  group_name?: string | null;
  investor_password?: string | null;
  main_password?: string | null;
  date?: string | null;
  [key: string]: unknown;
}

export interface AdminUserMt5TabDetailsData {
  totalDeposit?: number;
  totalWithdraw?: number;
  totalMt5Account?: number;
  mt5Accounts?: AdminUserMt5AccountItem[];
}

export type AdminUserMt5TabDetailsApiData =
  | AdminUserMt5TabDetailsData
  | {
      data?: AdminUserMt5TabDetailsData;
    };

export interface AdminPaginatedCollection<T> {
  data: T[];
  current_page?: number;
  per_page?: number;
  total?: number;
  last_page?: number;
  from?: number;
  to?: number;
}

export type AdminPaginatedApiData<T> =
  | AdminPaginatedCollection<T>
  | {
      data?: AdminPaginatedCollection<T> | T[];
    }
  | T[];

export interface AdminUserTransactionUser {
  name?: string;
  email?: string;
  mobile?: string;
  uuid?: string;
}

export interface AdminUserTransactionItem {
  id: number;
  amount?: number | string;
  created_at?: string;
  status?: number | string;
  admin_comment?: string | null;
  user_comment?: string | null;
  transaction_hash?: string | null;
  payment_method?: string | null;
  mt5_id?: string | null;
  note?: string | null;
  comment?: string | null;
  user?: AdminUserTransactionUser;
  [key: string]: unknown;
}

export interface AdminUserBankDetailUser {
  id?: number;
  name?: string;
  email?: string;
  mobile?: string;
  uuid?: string;
}

export interface AdminUserBankDetailItem {
  id: number;
  uuid?: string;
  user_id?: number;
  account_holder_name?: string | null;
  account_number?: string | null;
  iban_number?: string | null;
  swift_ifsc_code?: string | null;
  bank_name?: string | null;
  address?: string | null;
  country?: string | null;
  user?: AdminUserBankDetailUser;
  [key: string]: unknown;
}

export interface AdminUserActivityLogItem {
  ip_address?: string | null;
  created_at?: string | null;
  browser_name?: string | null;
  browser_version?: string | null;
  device_name?: string | null;
  os_name?: string | null;
  status?: number | string | null;
  [key: string]: unknown;
}

export interface AdminUserWalletHistoryItem {
  id: number;
  payment_type?: string | null;
  amount?: number | string;
  mode?: number | string | null;
  remark?: string | null;
  status?: number | string | null;
  created_at?: string | null;
  wallet_type?: string | null;
  balance_before?: number | string | null;
  balance_after?: number | string | null;
  [key: string]: unknown;
}

export interface AdminUserReferralItem {
  id?: number | string;
  uuid?: string;
  name?: string;
  email?: string;
  mobile?: string;
  referral_code?: string;
  created_at?: string;
  [key: string]: unknown;
}

export type AdminUserWalletHistoryResponse = ApiResponse<AdminUserWalletHistoryItem[]> & {
  pagination?: PaginationMeta;
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
  country_code: number | string;
  location: string;
  google_2FA_status: boolean | number;
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

export interface UserBasicProfileUpdateRequest {
  first_name: string;
  last_name: string;
  mobile: string;
  country_code: string;
}

export interface UserPersonalInformationUpdateRequest {
  dob: string;
  address: string;
  passport_id_number: string;
  pin_code: string;
  nationality: string;
  employment_status: string;
  tax_number: string;
  other_id_number?: string;
  client_type: string;
  country: string;
  state: string;
  city: string;
}

export interface UserLegalInformationUpdateRequest {
  politically_exposed: boolean;
  annual_income: number;
  source_of_income: string;
  estimated_net_worth: number;
  purpose_of_opening_account: string;
  estimated_annual_amount: number;
}

export type UserProfileUpdateRequest =
  UserBasicProfileUpdateRequest &
  UserPersonalInformationUpdateRequest &
  UserLegalInformationUpdateRequest;

export type UserProfileUpdatePayload = Partial<UserProfileUpdateRequest>;

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

export interface UserBankDetailsPayload {
  account_holder_name: string;
  account_number: string;
  iban_number: string;
  swift_ifsc_code: string;
  bank_name: string;
  address: string;
  country: string;
}

export interface UserBankDetailsData extends UserBankDetailsPayload {
  id: number;
  uuid: string;
  user_id: number;
}

export interface AdminBankDetailsUser {
  id: number;
  name: string;
  email: string;
  mobile: string;
  uuid: string;
}

export interface AdminBankDetailItem extends UserBankDetailsPayload {
  id: number;
  uuid: string;
  user_id: number;
  user?: AdminBankDetailsUser;
}

export interface AdminBankDetailsListData {
  count: number;
  rows: AdminBankDetailItem[];
}

export interface AdminBankDetailCreateBody extends UserBankDetailsPayload {
  user_uuid: string;
}

export type AdminBankDetailUpdateBody = UserBankDetailsPayload;

export interface BrokerBankDetailPayload {
  account_holder_name: string;
  account_number: string;
  address: string;
  bank_name: string;
  country: string;
  iban_number: string;
  swift_ifsc_code: string;
  is_active: boolean;
}

export interface BrokerBankDetailItem
  extends Omit<BrokerBankDetailPayload, "is_active"> {
  id: number;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminBrokerBankDetailsListData {
  count: number;
  rows: BrokerBankDetailItem[];
}

export interface AdminBonusLedgerMt5User {
  id: number;
  account_id: string;
  name: string;
  self_wallet?: number | null;
}

export interface AdminBonusLedgerUser {
  id: number;
  email: string;
}

export interface AdminBonusLedgerItem {
  id: number;
  mt5_user_id: number;
  user_id: number;
  amount: number;
  equity: number;
  type: "IN" | "OUT" | string;
  comment: string | null;
  admin_id: number | null;
  created_at: string;
  updated_at: string;
  mt5User?: AdminBonusLedgerMt5User | null;
  user?: AdminBonusLedgerUser | null;
}

export interface AdminBonusListPagination {
  current_page: number;
  total_pages: number;
  total_records: number;
  per_page: number;
}

export interface AdminBonusListData {
  bonuses: AdminBonusLedgerItem[];
  pagination: AdminBonusListPagination;
}

export interface AdminBonusMt5UserOption {
  id: number;
  account_id: string;
  name: string;
  email: string;
  current_balance: number;
}

export interface AdminBonusMutateBody {
  amount: number;
  comment?: string;
  mt5_id: string;
}

export interface AdminBonusMutationResult {
  bonus_id: number;
  mt5_account_id: string;
  amount: number;
  previous_equity: number;
  new_equity: number;
  wallet_id: number;
  wallet_balance_before: number;
  wallet_balance_after: number;
  comment: string | null;
}

export interface Permission {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

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
  permissions: number[];
};

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

const ensureAdminUserToken = (token: string, action: string) => {
  if (!token) {
    throw new Error(`Token is required to ${action}`);
  }
};

const ensureAdminUserIdentifier = (value: number | string | undefined | null, action: string) => {
  if (value === undefined || value === null || `${value}` === "") {
    throw new Error(`A valid user identifier is required to ${action}`);
  }
};

const ensureAdminUserUuid = (uuid: string | undefined | null, action: string) => {
  if (!uuid || !uuid.trim()) {
    throw new Error(`A valid user uuid is required to ${action}`);
  }
};

const buildPaginatedQuery = (page = 1, limit = 10) => {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  return qs.toString();
};

export const adminUsersApi = {
  list: ({ token, page = 1, limit = 10, search, status, isApproved }: AdminUsersListParams) => {
    ensureAdminUserToken(token, "fetch admin users");

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
    ensureAdminUserToken(token, "create admin user");

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
    ensureAdminUserToken(token, "fetch admin user detail");
    ensureAdminUserIdentifier(id, "fetch admin user detail");

    return apiCall<AdminUserDetailApiData>(`/admin/user-management/crud/users/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  update: (id: number | string, body: AdminUserUpdateBody, token: string) => {
    ensureAdminUserToken(token, "update admin user");
    ensureAdminUserIdentifier(id, "update admin user");

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
    ensureAdminUserToken(token, "delete admin user");
    ensureAdminUserIdentifier(id, "delete admin user");

    return apiCall(`/admin/user-management/crud/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  detailByUuid: (uuid: string, token: string) => {
    ensureAdminUserToken(token, "fetch admin user profile");
    ensureAdminUserUuid(uuid, "fetch admin user profile");

    return apiCall<AdminUserDetailsApiData>(`/admin/user-management/users/user-details/${uuid}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  mt5TabDetails: (uuid: string, token: string) => {
    ensureAdminUserToken(token, "fetch admin user MT5 details");
    ensureAdminUserUuid(uuid, "fetch admin user MT5 details");

    return apiCall<AdminUserMt5TabDetailsApiData>(`/admin/user-management/users/${uuid}/mt5-tab-details`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  deposits: (uuid: string, token: string, page = 1, limit = 10) => {
    ensureAdminUserToken(token, "fetch admin user deposits");
    ensureAdminUserUuid(uuid, "fetch admin user deposits");

    return apiCall<AdminPaginatedApiData<AdminUserTransactionItem>>(
      `/admin/user-management/users/${uuid}/deposit?${buildPaginatedQuery(page, limit)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },

  withdrawals: (uuid: string, token: string, page = 1, limit = 10) => {
    ensureAdminUserToken(token, "fetch admin user withdrawals");
    ensureAdminUserUuid(uuid, "fetch admin user withdrawals");

    return apiCall<AdminPaginatedApiData<AdminUserTransactionItem>>(
      `/admin/user-management/users/${uuid}/withdraw?${buildPaginatedQuery(page, limit)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },

  bankDetails: (uuid: string, token: string, page = 1, limit = 10) => {
    ensureAdminUserToken(token, "fetch admin user bank details");
    ensureAdminUserUuid(uuid, "fetch admin user bank details");

    return apiCall<AdminPaginatedApiData<AdminUserBankDetailItem>>(
      `/admin/user-management/users/${uuid}/bank-details/list?${buildPaginatedQuery(page, limit)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },

  activityLog: (uuid: string, token: string, page = 1, limit = 10) => {
    ensureAdminUserToken(token, "fetch admin user activity log");
    ensureAdminUserUuid(uuid, "fetch admin user activity log");

    return apiCall<AdminPaginatedApiData<AdminUserActivityLogItem>>(
      `/admin/user-management/users/${uuid}/active-log?${buildPaginatedQuery(page, limit)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },

  walletHistory: async (uuid: string, token: string, page = 1, limit = 10): Promise<AdminUserWalletHistoryResponse> => {
    ensureAdminUserToken(token, "fetch admin user wallet history");
    ensureAdminUserUuid(uuid, "fetch admin user wallet history");

    const response = await apiCall<AdminUserWalletHistoryItem[]>(
      `/admin/user-management/users/${uuid}/wallet-history?${buildPaginatedQuery(page, limit)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return response as AdminUserWalletHistoryResponse;
  },

  referralBy: (uuid: string, token: string, page = 1, limit = 10) => {
    ensureAdminUserToken(token, "fetch admin user referral details");
    ensureAdminUserUuid(uuid, "fetch admin user referral details");

    return apiCall<AdminPaginatedApiData<AdminUserReferralItem>>(
      `/admin/user-management/users/${uuid}/referral-by?${buildPaginatedQuery(page, limit)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  },
};

export interface NewsCreateBody {
  title: string;
  description: string;
  short_description: string;
  image?: File | string;
  status: string | number;
  type?: "news" | "promotion";
}

export interface NewsUpdateBody {
  title?: string;
  description?: string;
  short_description?: string;
  image?: File | string;
  status?: string | number;
  type?: "news" | "promotion";
}

export interface NewsItem {
  id: number | string;
  title: string;
  description: string;
  short_description: string;
  image?: string;
  image_url?: string;
  status: number | string;
  type?: "news" | "promotion";
  created_at?: string;
  updated_at?: string;
}

export interface NewsPagination {
  current_page: number;
  total_pages: number;
  total_news: number;
  per_page: number;
  showing_from: number;
  showing_to: number;
}

export interface NewsListData {
  news: NewsItem[];
  pagination: NewsPagination;
}

export interface NewsCreateResponse {
  success: boolean;
  message: string;
  data?: {
    news?: NewsItem;
  };
}

export const adminNewsApi = {
  list: (params: { token: string; page?: number; per_page?: number; type?: "news" | "promotion" | "all" }) => {
    const { token, page = 1, per_page = 10, type } = params;
    const query = new URLSearchParams({ page: String(page), per_page: String(per_page) });
    if (type && type !== "all") query.set("type", type);
    return apiCall<NewsListData>(`/admin/news/list?${query.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  get: (id: string | number, token: string) =>
    apiCall<{ success: boolean; message: string; data?: NewsItem }>(`/admin/news/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  create: (body: NewsCreateBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to create news");
    }

    if (body.image instanceof File) {
      const formData = new FormData();
      formData.append("title", body.title);
      formData.append("description", body.description);
      formData.append("short_description", body.short_description);
      formData.append("image", body.image);
      formData.append("status", String(body.status));
      if (body.type) formData.append("type", body.type);

      return apiCall<NewsCreateResponse>(`/admin/news/create`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    }

    return apiCall<NewsCreateResponse>(`/admin/news/create`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: body.title,
        description: body.description,
        short_description: body.short_description,
        image: body.image || "",
        status: String(body.status),
        type: body.type || "news",
      }),
    });
  },

  update: (id: string | number, body: NewsUpdateBody, token: string) => {
    if (body.image instanceof File) {
      const formData = new FormData();
      if (body.title !== undefined) formData.append("title", body.title);
      if (body.description !== undefined) formData.append("description", body.description);
      if (body.short_description !== undefined) formData.append("short_description", body.short_description);
      formData.append("image", body.image);
      if (body.status !== undefined) formData.append("status", String(body.status));
      if (body.type) formData.append("type", body.type);

      return apiCall<NewsCreateResponse>(`/admin/news/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    }

    return apiCall<NewsCreateResponse>(`/admin/news/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.short_description !== undefined && { short_description: body.short_description }),
        ...(body.image !== undefined && { image: body.image }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.type !== undefined && { type: body.type }),
      }),
    });
  },

  delete: (id: string | number, token: string) =>
    apiCall<{ success: boolean; message: string }>(`/admin/news/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  toggleStatus: (id: string | number, status: 0 | 1, token: string) =>
    apiCall<{ success: boolean; message: string }>(`/admin/news/${id}/toggle-status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
};

export interface UserNewsListResponse {
  data: NewsItem[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

export const userNewsApi = {
  list: (params: { token: string; page?: number; per_page?: number }) => {
    const { token, page = 1, per_page = 100 } = params;
    const query = new URLSearchParams({ page: String(page), per_page: String(per_page) });
    return apiCall<UserNewsListResponse>(`/user/news/list?${query.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  get: (id: string | number, token: string) =>
    apiCall<NewsItem>(`/user/news/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

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
    apiCall("/auth/logout", {
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
    const response = await fetch(`${API_BASE_URL}/user/profile/document`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` } as Record<string, string>,
      body: formData,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json?.message || `Upload failed (${response.status})`);
    return json as KycUploadResponse;
  },

  getProfileDocumentsStatus: async (token: string): Promise<KycStatusResponse> => {
    const response = await fetch(`${API_BASE_URL}/user/profile/document`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` } as Record<string, string>,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json?.message || `Fetch failed (${response.status})`);
    return json as KycStatusResponse;
  },

  getProfileView: (token: string) =>
    apiCall<ProfileViewResponse>(`/user/profile/view`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  updateProfile: (data: UserProfileUpdatePayload, token: string) =>
    apiCall<ProfileViewResponse>(`/user/profile/update`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  getBankDetails: (token: string) =>
    apiCall<UserBankDetailsData>(`/user/bank-details`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  createBankDetails: (data: UserBankDetailsPayload, token: string) =>
    apiCall<UserBankDetailsData>(`/user/bank-details`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  updateBankDetails: (data: UserBankDetailsPayload, token: string) =>
    apiCall<UserBankDetailsData>(`/user/bank-details`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
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

export const adminBankDetailsApi = {
  list: (token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch bank details");
    }

    return apiCall<AdminBankDetailsListData>(`/admin/bank-details`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  create: (body: AdminBankDetailCreateBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to create bank details");
    }

    return apiCall<AdminBankDetailItem>(`/admin/bank-details`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  },

  getByUuid: (uuid: string, token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch bank detail");
    }

    if (!uuid.trim()) {
      throw new Error("Bank detail UUID is required");
    }

    return apiCall<AdminBankDetailItem>(`/admin/bank-details/${uuid}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  update: (uuid: string, body: AdminBankDetailUpdateBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to update bank detail");
    }

    if (!uuid.trim()) {
      throw new Error("Bank detail UUID is required");
    }

    return apiCall<AdminBankDetailItem>(`/admin/bank-details/${uuid}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  },

  delete: (uuid: string, token: string) => {
    if (!token) {
      throw new Error("Token is required to delete bank detail");
    }

    if (!uuid.trim()) {
      throw new Error("Bank detail UUID is required");
    }

    return apiCall(`/admin/bank-details/${uuid}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export const userBrokerBankDetailsApi = {
  list: (token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch broker bank details");
    }

    return apiCall<BrokerBankDetailItem[]>(`/user/broker-bank-details`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export const adminBrokerBankDetailsApi = {
  list: (token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch broker bank details");
    }

    return apiCall<AdminBrokerBankDetailsListData>(`/admin/broker-bank-details`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  create: (body: BrokerBankDetailPayload, token: string) => {
    if (!token) {
      throw new Error("Token is required to create broker bank details");
    }

    return apiCall<BrokerBankDetailItem>(`/admin/broker-bank-details`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  },

  getById: (id: number | string, token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch broker bank detail");
    }

    const detailId = String(id).trim();
    if (!detailId) {
      throw new Error("Broker bank detail ID is required");
    }

    return apiCall<BrokerBankDetailItem>(`/admin/broker-bank-details/${detailId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  update: (id: number | string, body: BrokerBankDetailPayload, token: string) => {
    if (!token) {
      throw new Error("Token is required to update broker bank detail");
    }

    const detailId = String(id).trim();
    if (!detailId) {
      throw new Error("Broker bank detail ID is required");
    }

    return apiCall<BrokerBankDetailItem>(`/admin/broker-bank-details/${detailId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  },

  delete: (id: number | string, token: string) => {
    if (!token) {
      throw new Error("Token is required to delete broker bank detail");
    }

    const detailId = String(id).trim();
    if (!detailId) {
      throw new Error("Broker bank detail ID is required");
    }

    return apiCall(`/admin/broker-bank-details/${detailId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export const adminBonusApi = {
  list: (
    {
      page,
      per_page,
    }: {
      page?: number;
      per_page?: number;
    },
    token: string
  ) => {
    if (!token) {
      throw new Error("Token is required to fetch bonus list");
    }

    const qs = new URLSearchParams();
    if (page) qs.set("page", String(page));
    if (per_page) qs.set("per_page", String(per_page));

    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    return apiCall<AdminBonusListData>(`/admin/bonus/list${suffix}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  listMt5Users: (token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch MT5 users");
    }

    return apiCall<AdminBonusMt5UserOption[]>(`/admin/bonus/mt5-users`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  give: (body: AdminBonusMutateBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to give bonus");
    }

    return apiCall<AdminBonusMutationResult>(`/admin/bonus/give`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  },

  remove: (body: AdminBonusMutateBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to remove bonus");
    }

    return apiCall<AdminBonusMutationResult>(`/admin/bonus/remove`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  },
};

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
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: body.name ?? "",
        email: body.email ?? "",
        mobile: body.mobile ?? "",
        password: body.password ?? "",
        permissions: Array.isArray(body.permissions) ? body.permissions : [],
      }),
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
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        password: typeof body.password === "string" ? body.password.trim() : undefined,
        permissions: Array.isArray(body.permissions) ? body.permissions : [],
      }),
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
    if (status && status.trim()) qs.set("status", status.trim());
    if (search && search.trim()) qs.set("search", search.trim());

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

export const permissionsApi = {
  listAll: (token: string) =>
    apiCall<{ permissions: GroupedPermissions[]; total?: number }>(`/permissions/permissions`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const kycFileUrl = (fileName?: string | null) =>
  fileName ? `${API_BASE_URL}/uploads/${encodeURIComponent(fileName)}` : "";

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
  status: number;
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
  data?:
    | AdminWithdrawalRequest[]
    | {
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

/* ─── User bank deposit ──────────────────────────────────────────────────── */

export interface BankDepositRequest {
  amount: number;
  transaction_id: string;
}

export interface BankDepositSubmitData {
  id: number;
  transaction_id: string;
  payment_proof_url: string | null;
  amount: number;
  status: string;
  created_at: string;
}

export interface BankDepositRecord {
  id: number;
  user_id: number;
  amount: number;
  transaction_id: string;
  payment_proof_url: string | null;
  status: string;
  admin_notes: string | null;
  approved_by: string | null;
  approved_by_manager_id: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  walletTransaction?: {
    id: number;
    amount: number;
    balance_before: number;
    balance_after: number;
    created_at: string;
  };
}

export interface BankDepositListData {
  requests: BankDepositRecord[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_records: number;
    limit: number;
  };
}

export const bankDepositApi = {
  submit: (data: BankDepositRequest, token: string) =>
    apiCall<{ success: boolean; message: string; data: BankDepositSubmitData }>(
      `/user/bank-deposit/submit`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    ),

  listRequests: (token: string, page = 1, limit = 10) =>
    apiCall<{ success: boolean; data: BankDepositListData }>(
      `/user/bank-deposit/user-requests?page=${page}&limit=${limit}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),

  getRequest: (id: number | string, token: string) =>
    apiCall<{ success: boolean; data: BankDepositRecord }>(
      `/user/bank-deposit/user-requests/${id}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};

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
