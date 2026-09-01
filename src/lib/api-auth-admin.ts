import {
  API_BASE_URL,
  type ApiResponse,
  PaginationMeta,
  apiCall,
  ApiRequestError,
  handle401Redirect,
} from "./api-core";

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

export interface AdminManagedTwoFactorSetupResponse {
  user_id?: number;
  manager_id?: string | number;
  email: string;
  secret: string;
  qrCode: string;
  otpauthUrl: string;
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
    total_client?: number;
    requires_usdt_transaction?: boolean;
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
    subadmin?: LoginResponse["user"];
    permissions?: GroupedPermissions[];
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
    | "personal_information"
    | "legal_information"
    | "documents_verification"
    | string,
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

export interface ManagementReportSummary {
  total_clients?: number | string | null;
  total_deposit?: number | string | null;
  total_withdraw?: number | string | null;
  net_deposit?: number | string | null;
  total_lots?: number | string | null;
  total_ib_commission?: number | string | null;
}

export interface ManagementReportCountryChartItem {
  country?: string | null;
  name?: string | null;
  label?: string | null;
  total_deposit?: number | string | null;
  deposit?: number | string | null;
  value?: number | string | null;
  amount?: number | string | null;
}

export interface ManagementReportRowItem {
  id?: number | string | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  country?: string | null;
  total_deposit?: number | string | null;
  total_withdraw?: number | string | null;
  deposit?: number | string | null;
  withdraw?: number | string | null;
  amount?: number | string | null;
  lots?: number | string | null;
  commission?: number | string | null;
  [key: string]: unknown;
}

export interface ManagementReportResponse {
  summary?: ManagementReportSummary;
  country_wise_deposit?: ManagementReportCountryChartItem[];
  chart_data?: ManagementReportCountryChartItem[];
  top_10_depositor?: ManagementReportRowItem[];
  top_10_withdrawals?: ManagementReportRowItem[];
  data?: {
    summary?: ManagementReportSummary;
    country_wise_deposit?: ManagementReportCountryChartItem[];
    chart_data?: ManagementReportCountryChartItem[];
    top_10_depositor?: ManagementReportRowItem[];
    top_10_withdrawals?: ManagementReportRowItem[];
  };
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
  ib_plan_id?: number | string | null;
  status: string;
  two_fa_enabled?: boolean | number | string;
  email_verified: number;
  payment_verified: number;
  created_at: string;
  approved_by: string;
  approved_at: string | number;
  sponsor_by: string | number | null;
  sponsor_by_email?: string | null;
  main_wallet_balance?: number | null;
  password?: string;
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
  sort_by?: string;
  sort_order?: string;
  date_from?: string;
  date_to?: string;
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
export type PromoteToIbBody = {
  client_id: number;
  ib_name: string;
  ib_plan_id?: number;
};

export type PromoteToIbResponseData = {
  client_id: number;
  client_name: string;
  email: string;
  ib_name: string;
  account_id: string;
  referral_link: string;
};

export type PromoteToIbResponse = {
  success: boolean;
  message: string;
  data: PromoteToIbResponseData;
};

export type TransferSponsorBody = {
  user_id: number;
  new_sponsor_user_id?: number;
};

export type TransferSponsorResponseData = {
  user_id: number;
  user_name: string;
  old_sponsor_by: string | null;
  new_sponsor_by: string | null;
  new_sponsor_ib_name: string | null;
  descendants_rebuilt: number;
};

export type TransferSponsorResponse = {
  success: boolean;
  message: string;
  data: TransferSponsorResponseData;
};

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
  account_type_id?: number | string | null;
  account_type_name?: string | null;
  account_mode?: string | null;
  investor_password?: string | null;
  main_password?: string | null;
  date?: string | null;
  balance?: string | number | null;
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
  payment_method?: {
    id: number;
    type: string;
    name: string;
  };
  mt5_id?: string | null;
  deposit_type?: string | null;
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
  status?: string | null;
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
  currency?: string | null;
  mode?: number | string | null;
  remark?: string | null;
  status?: number | string | null;
  created_at?: string | null;
  wallet_type?: string | null;
  balance_before?: number | string | null;
  balance_after?: number | string | null;
  [key: string]: unknown;
}

export interface AdminWalletBalanceItem {
  id: number;
  wallet_type: string;
  balance: number;
  currency: string;
  status: string;
  wallet_address: string;
  mt5_id?: string | null;
  mode: string;
}

export interface AdminUserWalletBalancesData {
  user_id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  wallets: AdminWalletBalanceItem[];
}

export type AdminUserWalletBalancesResponse =
  ApiResponse<AdminUserWalletBalancesData> & {
    pagination?: PaginationMeta;
  };

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

export type AdminUserWalletHistoryResponse = ApiResponse<
  AdminUserWalletHistoryItem[]
> & {
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

export type UserProfileUpdateRequest = UserBasicProfileUpdateRequest &
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
  passbook_photo?: string | File;
}

export interface UserBankDetailsData extends UserBankDetailsPayload {
  id: number;
  uuid?: string;
  user_id: number;
  passbook_photo_url?: string;
  status?: string;
  admin_notes?: string | null;
  verified_by?: number | string | null;
  verified_at?: string | null;
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
  passbook_photo_url?: string;
  status?: string;
  admin_notes?: string | null;
  verified_by?: number | string | null;
  verified_at?: string | null;
  user?: AdminBankDetailsUser;
}

export interface AdminBankDetailsListData {
  count: number;
  rows: AdminBankDetailItem[];
  pagination?: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    page_count?: number;
  };
}

export interface AdminBankDetailCreateBody extends UserBankDetailsPayload {
  user_uuid: string;
}

export type AdminBankDetailUpdateBody = UserBankDetailsPayload;

export type AdminBankDetailVerifyBody = {
  status: "approved" | "rejected" | "pending";
  admin_notes?: string;
};

export interface BrokerBankDetailPayload {
  account_holder_name: string;
  account_number: string;
  address: string;
  bank_name: string;
  country: string;
  iban_number: string;
  swift_ifsc_code: string;
  upi_qr_code_url: string;
  is_active: boolean;
}

export interface BrokerBankDetailItem extends Omit<
  BrokerBankDetailPayload,
  "is_active"
> {
  id: number;
  is_active: number | boolean;
  created_at: string;
  updated_at: string;
  upi_qr_code_url: string;
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
  mode: string;
  account_type_name?: string;
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
  two_fa_enabled?: boolean | number | string;
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

export type AccountTypeGroupUpsert = {
  mode: "live" | "demo";
  name: string;
  mt5_group_name: string;
};

export type AccountTypeUpsertBody = {
  name: string;
  groups: AccountTypeGroupUpsert[];
  maximum_leverage: string | number;
  minimum_deposit?: number;
  leverage_value: number;
  status: boolean;
};

export interface AccountTypeCommissionItem {
  id?: number | string;
  account_type_id?: number | string;
  is_default?: boolean;
  level: string;
  rate_ib: number | string | null;
  rate_sub_ib_1: number | string | null;
  rate_sub_ib_2: number | string | null;
  rate_sub_ib_3: number | string | null;
  rate_sub_ib_4: number | string | null;
  rate_sub_ib_5: number | string | null;
  status: boolean | number | string;
  created_at?: string;
  updated_at?: string;
}

export interface AccountTypeGroupItem {
  id: number;
  name: string;
  mode?: string;
  mt5_group_name: string;
  platform: string;
  status: number | boolean;
}

export interface AccountTypeItem {
  id: number | string;
  name: string;
  mode?: "live" | "demo" | string;
  spread_from?: string | number | null;
  maximum_leverage: string | number | null;
  minimum_deposit?: number | null;
  leverage_type?: "fixed" | "dynamic" | string;
  leverage_value: number | string | null;
  base_currency?: string;
  commission_pool?: number;
  status: boolean | number | string;
  group?: AccountTypeGroupItem;
  groups?: {
    live?: AccountTypeGroupItem;
    demo?: AccountTypeGroupItem;
  };
  created_at?: string;
  updated_at?: string;
}

export interface AccountTypeCreateResponseData {
  id: number;
  name: string;
  maximum_leverage: string;
  leverage_value: number;
  status: boolean;
  created_at: string;
  updated_at: string;
  groups: {
    live: AccountTypeGroupItem;
    demo: AccountTypeGroupItem;
  };
}

export interface AdminGroupItem {
  id: number;
  name: string;
  account_type_name?: string;
  mt5_group_name?: string;
  mode?: string;
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

export interface AdminGroupDeleteBody {
  id: number;
}

export const adminManagementReportApi = {
  list: ({
    token,
    country,
    from_date,
    to_date,
  }: {
    token: string;
    country?: string;
    from_date?: string;
    to_date?: string;
  }) => {
    const qs = new URLSearchParams();

    if (country && country.trim()) {
      qs.set("country", country.trim());
    }
    if (from_date && from_date.trim()) {
      qs.set("from_date", from_date.trim());
    }
    if (to_date && to_date.trim()) {
      qs.set("to_date", to_date.trim());
    }

    const endpoint = `/admin/management-report${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<ManagementReportResponse>(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
  },
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
    }>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  create: (body: AccountTypeUpsertBody, token: string) =>
    apiCall<{
      success?: boolean;
      message?: string;
      data?: AccountTypeCreateResponseData;
    }>(`/admin/account-types/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    }),

  update: (id: string | number, body: AccountTypeUpsertBody, token: string) =>
    apiCall<{ accountType?: AccountTypeItem } | AccountTypeItem>(
      `/admin/account-types/${id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      },
    ),

  getById: (id: string | number, token: string) =>
    apiCall<{ accountType?: AccountTypeItem } | AccountTypeItem>(
      `/admin/account-types/${id}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    ),

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

const ensureAdminUserIdentifier = (
  value: number | string | undefined | null,
  action: string,
) => {
  if (value === undefined || value === null || `${value}` === "") {
    throw new Error(`A valid user identifier is required to ${action}`);
  }
};

const ensureAdminUserUuid = (
  uuid: string | undefined | null,
  action: string,
) => {
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
  list: ({
    token,
    page = 1,
    limit = 10,
    search,
    status,
    isApproved,
    sort_by,
    sort_order,
    date_from,
    date_to,
  }: AdminUsersListParams) => {
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

    if (
      isApproved !== undefined &&
      isApproved !== null &&
      `${isApproved}` !== ""
    ) {
      qs.set("is_approved", String(isApproved));
    }

    if (sort_by) {
      qs.set("sort_by", sort_by);
    }

    if (sort_order) {
      qs.set("sort_order", sort_order);
    }

    if (date_from) {
      qs.set("date_from", date_from);
    }

    if (date_to) {
      qs.set("date_to", date_to);
    }

    const endpoint = `/admin/user-management/crud/users${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<AdminUsersListApiData>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  create: (body: AdminUserCreateBody, token: string) => {
    ensureAdminUserToken(token, "create admin user");

    const sanitizedBody = Object.entries(body).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (value === undefined || value === null) {
          return acc;
        }

        const stringValue =
          typeof value === "string" ? value.trim() : String(value);
        if (stringValue === "") {
          return acc;
        }

        acc[key] = stringValue;
        return acc;
      },
      {},
    );

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

    return apiCall<AdminUserDetailApiData>(
      `/admin/user-management/crud/users/${id}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  update: (id: number | string, body: AdminUserUpdateBody, token: string) => {
    ensureAdminUserToken(token, "update admin user");
    ensureAdminUserIdentifier(id, "update admin user");

    const sanitizedBody = Object.entries(body).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (value === undefined || value === null) {
          return acc;
        }

        const stringValue =
          typeof value === "string" ? value.trim() : String(value);
        if (stringValue === "") {
          return acc;
        }

        acc[key] = stringValue;
        return acc;
      },
      {},
    );

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

  resendWelcomeEmail: (id: number | string, token: string) => {
    ensureAdminUserToken(token, "resend welcome email");
    ensureAdminUserIdentifier(id, "resend welcome email");

    return apiCall<{ success: boolean; message: string }>(
      `/admin/user-management/crud/users/${id}/resend-welcome-email`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );
  },

  updateStatus: (id: number | string, status: number, token: string) => {
    ensureAdminUserToken(token, "update user status");
    ensureAdminUserIdentifier(id, "update user status");

    return apiCall(`/admin/user-management/crud/users/${id}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    });
  },

  promoteToIb: (body: PromoteToIbBody, token: string) => {
    ensureAdminUserToken(token, "promote user to IB");
    ensureAdminUserIdentifier(body.client_id, "promote user to IB");

    const ibName = body.ib_name?.trim();
    if (!ibName) {
      throw new Error("IB name is required to promote user to IB");
    }

    return apiCall<PromoteToIbResponse>(`/admin/ib-management/promote-to-ib`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: body.client_id,
        ib_name: ibName,
        ...(body.ib_plan_id != null && { ib_plan_id: body.ib_plan_id }),
      }),
    });
  },

  transferSponsor: (body: TransferSponsorBody, token: string) => {
    ensureAdminUserToken(token, "transfer or remove sponsor");
    ensureAdminUserIdentifier(body.user_id, "transfer or remove sponsor");

    const payload: Record<string, number> = { user_id: body.user_id };
    if (body.new_sponsor_user_id !== undefined) {
      ensureAdminUserIdentifier(body.new_sponsor_user_id, "transfer sponsor");
      payload.new_sponsor_user_id = body.new_sponsor_user_id;
    }

    return apiCall<TransferSponsorResponse>(
      `/admin/ib-management/transfer-sponsor`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
  },

  detailByUuid: (uuid: string, token: string) => {
    ensureAdminUserToken(token, "fetch admin user profile");
    ensureAdminUserUuid(uuid, "fetch admin user profile");

    return apiCall<AdminUserDetailsApiData>(
      `/admin/user-management/users/user-details/${uuid}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  mt5TabDetails: (uuid: string, token: string) => {
    ensureAdminUserToken(token, "fetch admin user MT5 details");
    ensureAdminUserUuid(uuid, "fetch admin user MT5 details");

    return apiCall<AdminUserMt5TabDetailsApiData>(
      `/admin/user-management/users/${uuid}/mt5-tab-details`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  deposits: (uuid: string, token: string, page = 1, limit = 10) => {
    ensureAdminUserToken(token, "fetch admin user deposits");
    ensureAdminUserUuid(uuid, "fetch admin user deposits");

    return apiCall<AdminPaginatedApiData<AdminUserTransactionItem>>(
      `/admin/user-management/users/${uuid}/deposit?${buildPaginatedQuery(page, limit)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
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
      },
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
      },
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
      },
    );
  },

  walletHistory: async (
    uuid: string,
    token: string,
    page = 1,
    limit = 10,
  ): Promise<AdminUserWalletHistoryResponse> => {
    ensureAdminUserToken(token, "fetch admin user wallet history");
    ensureAdminUserUuid(uuid, "fetch admin user wallet history");

    const response = await apiCall<AdminUserWalletHistoryItem[]>(
      `/admin/user-management/users/${uuid}/wallet-history?${buildPaginatedQuery(page, limit)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    return response as AdminUserWalletHistoryResponse;
  },

  walletBalances: (userId: number, token: string) => {
    ensureAdminUserToken(token, "fetch admin user wallet balances");

    return apiCall<AdminUserWalletBalancesData>(
      `/admin/user-management/users/wallet-balances`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: userId }),
      },
    );
  },

  referralBy: (uuid: string, token: string, page = 1, limit = 10) => {
    ensureAdminUserToken(token, "fetch admin user referral details");
    ensureAdminUserUuid(uuid, "fetch admin user referral details");

    return apiCall<AdminPaginatedApiData<AdminUserReferralItem>>(
      `/admin/user-management/users/${uuid}/referral-by?${buildPaginatedQuery(page, limit)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  decryptPassword: (id: number | string, token: string) => {
    ensureAdminUserToken(token, "decrypt user password");
    ensureAdminUserIdentifier(id, "decrypt user password");

    return apiCall<{ password: string }>(
      `/admin/user-management/crud/users/${id}/decrypt-password`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
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
  list: (params: {
    token: string;
    page?: number;
    per_page?: number;
    type?: "news" | "promotion" | "all";
  }) => {
    const { token, page = 1, per_page = 10, type } = params;
    const query = new URLSearchParams({
      page: String(page),
      per_page: String(per_page),
    });
    if (type && type !== "all") query.set("type", type);
    return apiCall<NewsListData>(`/admin/news/list?${query.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  get: (id: string | number, token: string) =>
    apiCall<{ success: boolean; message: string; data?: NewsItem }>(
      `/admin/news/${id}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),

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
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
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
      if (body.description !== undefined)
        formData.append("description", body.description);
      if (body.short_description !== undefined)
        formData.append("short_description", body.short_description);
      formData.append("image", body.image);
      if (body.status !== undefined)
        formData.append("status", String(body.status));
      if (body.type) formData.append("type", body.type);

      return apiCall<NewsCreateResponse>(`/admin/news/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    }

    return apiCall<NewsCreateResponse>(`/admin/news/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.short_description !== undefined && {
          short_description: body.short_description,
        }),
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
    apiCall<{ success: boolean; message: string }>(
      `/admin/news/${id}/toggle-status`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      },
    ),
};

export interface CurrencyRateItem {
  id: number;
  from_currency: string;
  to_currency: string;
  deposit_rate: number;
  withdrawal_rate: number;
  status: boolean | number | string;
  created_at: string;
  updated_at: string;
}

export interface CurrencyRatePagination {
  current_page: number;
  total_pages: number;
  total_currency_rates: number;
  per_page: number;
}

export interface CurrencyRateListData {
  currencyRates: CurrencyRateItem[];
  pagination: CurrencyRatePagination;
}

export interface CurrencyRateCreateBody {
  from_currency: string;
  to_currency: string;
  deposit_rate: number;
  withdrawal_rate: number;
  status?: boolean;
}

export interface CurrencyRateUpdateBody {
  deposit_rate: number;
  withdrawal_rate: number;
  status: boolean;
}

export const adminCurrencyRatesApi = {
  list: (params: { token: string; page?: number; per_page?: number }) => {
    const { token, page = 1, per_page = 10 } = params;
    const query = new URLSearchParams({
      page: String(page),
      per_page: String(per_page),
    });
    return apiCall<CurrencyRateListData>(
      `/admin/currency-rates/list?${query.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  history: (params: {
    id: string;
    token: string;
    page?: number;
    per_page?: number;
  }) => {
    const { id, token, page = 1, per_page = 10 } = params;
    const query = new URLSearchParams({
      page: String(page),
      per_page: String(per_page),
    });
    return apiCall<{
      history: Array<{
        id: number;
        currency_rate_id: number;
        from_currency: string;
        to_currency: string;
        deposit_rate: number;
        withdrawal_rate: number;
        status: boolean;
        rate_date: string;
        changed_by: string;
        changed_by_name: string;
        created_at: string;
      }>;
      pagination: {
        current_page: number;
        total_pages: number;
        total_records: number;
        per_page: number;
      };
    }>(`/admin/currency-rates/${id}/history?${query.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  get: (id: string | number, token: string) =>
    apiCall<CurrencyRateItem>(`/admin/currency-rates/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  create: (body: CurrencyRateCreateBody, token: string) =>
    apiCall<CurrencyRateItem>(`/admin/currency-rates/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),

  update: (id: string | number, body: CurrencyRateUpdateBody, token: string) =>
    apiCall<CurrencyRateItem>(`/admin/currency-rates/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),

  delete: (id: string | number, token: string) =>
    apiCall<{ success: boolean; message: string }>(
      `/admin/currency-rates/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),

  toggleStatus: (id: string | number, token: string) =>
    apiCall<CurrencyRateItem>(`/admin/currency-rates/${id}/toggle-status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export const userCurrencyRatesApi = {
  list: (params: { token: string; page?: number; per_page?: number }) => {
    const { token, page = 1, per_page = 100 } = params;
    const query = new URLSearchParams({
      page: String(page),
      per_page: String(per_page),
    });
    return apiCall<CurrencyRateListData>(
      `/admin/currency-rates/list?${query.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },
};

export interface DefaultSettingsItem {
  disable_account: boolean;
  disable_deposit: boolean;
  disable_withdraw: boolean;
  disable_transfer: boolean;
  disable_ib_withdraw: boolean;
  disable_mt5_to_wallet: boolean;
  disable_wallet_to_mt5: boolean;
  disable_ib_commission: boolean;
  updated_by?: string | null;
  updated_at?: string | null;
}

export type DefaultSettingsUpdateBody = Pick<
  DefaultSettingsItem,
  | "disable_account"
  | "disable_deposit"
  | "disable_withdraw"
  | "disable_transfer"
  | "disable_ib_withdraw"
  | "disable_mt5_to_wallet"
  | "disable_wallet_to_mt5"
  | "disable_ib_commission"
>;

export const adminDefaultSettingsApi = {
  get: (token: string) =>
    apiCall<DefaultSettingsItem>("/admin/default-settings", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  update: (body: DefaultSettingsUpdateBody, token: string) =>
    apiCall<DefaultSettingsItem>("/admin/default-settings", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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
    const query = new URLSearchParams({
      page: String(page),
      per_page: String(per_page),
    });
    return apiCall<UserNewsListResponse>(
      `/user/news/list?${query.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
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
    apiCall<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  refreshToken: (token: string) =>
    apiCall<{ token?: string; access_token?: string }>("/auth/refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      skipAuthRedirect: true,
    }),

  resendOtp: (data: ResendOtpRequest) =>
    apiCall("/user/resend-otp", { method: "POST", body: JSON.stringify(data) }),

  forgotPassword: (data: ForgotPasswordRequest) =>
    apiCall("/user/forget-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resetPassword: (data: ResetPasswordRequest) =>
    apiCall("/user/reset-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

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
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
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

  uploadProfileDocuments: async (
    formData: FormData,
    token: string,
  ): Promise<KycUploadResponse> => {
    const response = await fetch(`${API_BASE_URL}/user/profile/document`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` } as Record<string, string>,
      body: formData,
    });
    if (handle401Redirect(response, !!token))
      return new Promise<KycUploadResponse>(() => {});
    const json = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(json?.message || `Upload failed (${response.status})`);
    return json as KycUploadResponse;
  },

  getProfileDocumentsStatus: async (
    token: string,
  ): Promise<KycStatusResponse> => {
    const response = await fetch(`${API_BASE_URL}/user/profile/document`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` } as Record<string, string>,
    });
    if (handle401Redirect(response, !!token))
      return new Promise<KycStatusResponse>(() => {});
    const json = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(json?.message || `Fetch failed (${response.status})`);
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
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }),

  getBankDetails: (token: string) =>
    apiCall<UserBankDetailsData[]>(`/user/bank-details`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  getBankDetailById: (id: number, token: string) =>
    apiCall<UserBankDetailsData>(`/user/bank-details/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  createBankDetails: (data: UserBankDetailsPayload, token: string) => {
    if (data.passbook_photo instanceof File) {
      const formData = new FormData();
      formData.append("account_holder_name", data.account_holder_name);
      formData.append("account_number", data.account_number);
      formData.append("iban_number", data.iban_number);
      formData.append("swift_ifsc_code", data.swift_ifsc_code);
      formData.append("bank_name", data.bank_name);
      formData.append("address", data.address);
      formData.append("country", data.country);
      formData.append("passbook_photo", data.passbook_photo);

      return apiCall<UserBankDetailsData>(`/user/bank-details`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    }

    return apiCall<UserBankDetailsData>(`/user/bank-details`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  },

  updateBankDetails: (
    id: number,
    data: UserBankDetailsPayload,
    token: string,
  ) => {
    if (data.passbook_photo instanceof File) {
      const formData = new FormData();
      formData.append("account_holder_name", data.account_holder_name);
      formData.append("account_number", data.account_number);
      formData.append("iban_number", data.iban_number);
      formData.append("swift_ifsc_code", data.swift_ifsc_code);
      formData.append("bank_name", data.bank_name);
      formData.append("address", data.address);
      formData.append("country", data.country);
      formData.append("passbook_photo", data.passbook_photo);

      return apiCall<UserBankDetailsData>(`/user/bank-details/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    }

    return apiCall<UserBankDetailsData>(`/user/bank-details/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  },

  deleteBankDetails: (id: number, token: string) =>
    apiCall(`/user/bank-details/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  getUserDashboard: (token: string) =>
    apiCall<UserDashboardData>(`/user/dashboard`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  getTradingAccountsSummary: (token: string) =>
    apiCall<TradingAccountsSummaryResponse>(
      `/user/dashboard/trading-accounts-summary`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),

  getWalletStatistics: (
    token: string,
    type: "deposits" | "withdrawals",
    period: number = 30,
  ) =>
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
  list: (
    token: string,
    search?: string | null,
    page: number = 1,
    perPage: number = 10,
    status?: string | null,
    sortColumn?: string | null,
    sortOrder?: string | null,
  ) => {
    if (!token) {
      throw new Error("Token is required to fetch bank details");
    }

    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("per_page", String(perPage));
    if (search && search.trim()) {
      qs.set("search", search.trim());
    }

    const normalizedStatus = status?.trim();
    if (normalizedStatus) {
      qs.set("status", normalizedStatus);
    }

    const normalizedSortColumn = sortColumn?.trim() || "id";
    if (normalizedSortColumn) {
      qs.set("sort_column", normalizedSortColumn);
    }

    const normalizedSortOrder = sortOrder?.trim().toLowerCase();
    if (normalizedSortOrder === "asc" || normalizedSortOrder === "desc") {
      qs.set("sort_order", normalizedSortOrder);
    } else {
      qs.set("sort_order", "desc");
    }

    const endpoint = `/admin/bank-details?${qs.toString()}`;

    return apiCall<AdminBankDetailsListData>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

   create: (body: AdminBankDetailCreateBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to create bank details");
    }

    const formData = new FormData();
    formData.append("user_uuid", body.user_uuid);
    formData.append("account_holder_name", body.account_holder_name);
    formData.append("account_number", body.account_number);
    formData.append("iban_number", body.iban_number);
    formData.append("swift_ifsc_code", body.swift_ifsc_code);
    formData.append("bank_name", body.bank_name);
    formData.append("address", body.address);
    formData.append("country", body.country);
    if (body.passbook_photo instanceof File) {
      formData.append("passbook_photo", body.passbook_photo);
    }

    return apiCall<AdminBankDetailItem>(`/admin/bank-details`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  },

  getByUuid: (uuid: string, token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch bank detail");
    }

    const id = String(uuid ?? "").trim();
    if (!id) {
      throw new Error("Bank detail UUID is required");
    }

    return apiCall<AdminBankDetailItem>(
      `/admin/bank-details/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  update: (uuid: string, body: AdminBankDetailUpdateBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to update bank detail");
    }

    const id = String(uuid ?? "").trim();
    if (!id) {
      throw new Error("Bank detail UUID is required");
    }

    const formData = new FormData();
    formData.append("account_holder_name", body.account_holder_name);
    formData.append("account_number", body.account_number);
    formData.append("iban_number", body.iban_number);
    formData.append("swift_ifsc_code", body.swift_ifsc_code);
    formData.append("bank_name", body.bank_name);
    formData.append("address", body.address);
    formData.append("country", body.country);
    if (body.passbook_photo instanceof File) {
      formData.append("passbook_photo", body.passbook_photo);
    }

    return apiCall<AdminBankDetailItem>(
      `/admin/bank-details/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
    );
  },

  verify: (uuid: string, body: AdminBankDetailVerifyBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to verify bank detail");
    }

    const id = String(uuid ?? "").trim();
    if (!id) {
      throw new Error("Bank detail UUID is required");
    }

    return apiCall<AdminBankDetailItem>(
      `/admin/bank-details/${encodeURIComponent(id)}/verify`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
  },

  delete: (uuid: string, token: string) => {
    if (!token) {
      throw new Error("Token is required to delete bank detail");
    }

    const id = String(uuid ?? "").trim();
    if (!id) {
      throw new Error("Bank detail UUID is required");
    }

    return apiCall(`/admin/bank-details/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  export: (
    token: string,
    search?: string | null,
    status?: string | null,
    sortOrder?: string | null,
    dateFrom?: string | null,
    dateTo?: string | null,
  ) => {
    if (!token) {
      throw new Error("Token is required to export bank details");
    }

    const qs = new URLSearchParams();
    if (search && search.trim()) {
      qs.set("search", search.trim());
    }

    const normalizedStatus = status?.trim();
    if (normalizedStatus && normalizedStatus !== "all") {
      qs.set("status", normalizedStatus);
    }

    const normalizedSortOrder = sortOrder?.trim().toLowerCase();
    if (normalizedSortOrder === "asc" || normalizedSortOrder === "desc") {
      qs.set("sort_order", normalizedSortOrder);
    }

    if (dateFrom && dateFrom.trim()) {
      qs.set("from_date", dateFrom.trim());
    }

    if (dateTo && dateTo.trim()) {
      qs.set("to_date", dateTo.trim());
    }

    const endpoint = `/admin/bank-details/export${qs.toString() ? `?${qs.toString()}` : ""}`;

    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: { 
        Authorization: `Bearer ${token}`,
      },
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

export interface BrokerCryptoWalletItem {
  id: number;
  network: string;
  currency: string;
  wallet_address: string;
  wallet_screenshot_url: string;
  label: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export const userBrokerCryptoWalletsApi = {
  list: (token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch broker crypto wallets");
    }

    return apiCall<BrokerCryptoWalletItem[]>(`/user/broker-crypto-wallets`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

const buildBrokerBankDetailFormData = (body: BrokerBankDetailPayload): FormData => {
  const formData = new FormData();
  formData.append("account_holder_name", body.account_holder_name);
  formData.append("account_number", body.account_number);
  formData.append("address", body.address);
  formData.append("bank_name", body.bank_name);
  formData.append("country", body.country);
  formData.append("iban_number", body.iban_number);
  formData.append("swift_ifsc_code", body.swift_ifsc_code);
  formData.append("is_active", body.is_active ? "1" : "0");

  const qrValue = body.upi_qr_code_url;
  if (qrValue && qrValue.startsWith("data:image")) {
    try {
      const base64Data = qrValue.split(",")[1];
      const mimeType = qrValue.split(";")[0].split(":")[1];
      const byteString = atob(base64Data);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);

      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }

      const blob = new Blob([uint8Array], { type: mimeType });
      const file = new File([blob], "qr-code.png", { type: mimeType });
      formData.append("upi_qr_code", file);
    } catch (error) {
      console.error("Failed to convert base64 to file:", error);
      formData.append("upi_qr_code_url", qrValue);
    }
  } else if (qrValue) {
    formData.append("upi_qr_code_url", qrValue);
  }

  return formData;
};

export const adminBrokerBankDetailsApi = {
  list: (token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch broker bank details");
    }

    return apiCall<AdminBrokerBankDetailsListData>(
      `/admin/broker-bank-details`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  create: (body: BrokerBankDetailPayload, token: string) => {
    if (!token) {
      throw new Error("Token is required to create broker bank details");
    }

    return apiCall<BrokerBankDetailItem>(`/admin/broker-bank-details`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: buildBrokerBankDetailFormData(body),
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

    return apiCall<BrokerBankDetailItem>(
      `/admin/broker-bank-details/${detailId}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  update: (
    id: number | string,
    body: BrokerBankDetailPayload,
    token: string,
  ) => {
    if (!token) {
      throw new Error("Token is required to update broker bank detail");
    }

    const detailId = String(id).trim();
    if (!detailId) {
      throw new Error("Broker bank detail ID is required");
    }

    return apiCall<BrokerBankDetailItem>(
      `/admin/broker-bank-details/${detailId}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: buildBrokerBankDetailFormData(body),
      },
    );
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
    params:
      | {
          page?: number;
          per_page?: number;
          search?: string;
          type?: string;
          mt5_id?: string;
          sort_column?: string;
          sort_order?: string;
        }
      | Record<string, string | number>,
    token: string,
  ) => {
    if (!token) {
      throw new Error("Token is required to fetch bonus list");
    }

    const qs = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        qs.set(key, String(value));
      }
    });

    const suffix = qs.toString() ? `?${qs.toString()}` : "";

    return apiCall<AdminBonusListData>(`/admin/bonus/list${suffix}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  export: async (
    token: string,
    search?: string | null,
    type?: string | null,
    fromDate?: string | null,
    toDate?: string | null,
  ) => {
    if (!token) {
      throw new Error("Token is required to export bonus ledger");
    }

    if (!API_BASE_URL) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
    }

    const qs = new URLSearchParams();
    if (search && search.trim()) {
      qs.set("search", search.trim());
    }
    if (type && type !== "all") {
      qs.set("type", type);
    }
    if (fromDate && fromDate.trim()) {
      qs.set("from_date", fromDate.trim());
    }
    if (toDate && toDate.trim()) {
      qs.set("to_date", toDate.trim());
    }

    const endpoint = `/admin/bonus/list/export${qs.toString() ? `?${qs.toString()}` : ""}`;

    return fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  listMt5Users: (token: string, search?: string) => {
    if (!token) {
      throw new Error("Token is required to fetch MT5 users");
    }

    let endpoint = `/admin/bonus/mt5-users`;
    if (search && search.trim().length >= 3) {
      endpoint += `?search=${encodeURIComponent(search.trim())}`;
    }

    return apiCall<AdminBonusMt5UserOption[]>(endpoint, {
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

  verifyAndEnableTwoFactor: (
    data: { admin_id: string | number; token: string },
    token: string,
  ) =>
    apiCall("/admin/2fa/verify-and-enable", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }),

  disableTwoFactor: (adminId: string | number, token: string) =>
    apiCall<TwoFactorDisableResponse>(`/admin/2fa/disable/${adminId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  verifyLogin2FA: (data: {
    admin_id: string | number;
    verify_otp: string | number;
  }) =>
    apiCall<LoginResponse>("/admin/google-verify-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

export const adminClient2FAApi = {
  enable: async (userId: string | number, token: string) => {
    try {
      return await apiCall<AdminManagedTwoFactorSetupResponse>(
        `/admin/client/${userId}/2fa/enable`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );
    } catch (err: unknown) {
      if (err instanceof ApiRequestError && err.status === 405) {
        return await apiCall<AdminManagedTwoFactorSetupResponse>(
          `/admin/client/${userId}/2fa/enable`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          },
        );
      }
      throw err;
    }
  },

  disable: async (userId: string | number, token: string) => {
    try {
      return await apiCall<TwoFactorDisableResponse>(
        `/admin/client/${userId}/2fa/disable`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );
    } catch (err: unknown) {
      if (err instanceof ApiRequestError && err.status === 405) {
        return await apiCall<TwoFactorDisableResponse>(
          `/admin/client/${userId}/2fa/disable`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }
      throw err;
    }
  },
};

export const manager2FAApi = {
  getTwoFactorStatus: (managerId: string | number, token: string) =>
    apiCall<TwoFactorStatusResponse>(`/subadmin/2fa/status/${managerId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  setupTwoFactor: (managerId: string | number, token: string) =>
    apiCall<TwoFactorSetupResponse>(`/manager/2fa/setup/${managerId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),

  verifyAndEnableTwoFactor: (
    data: { manager_id: string | number; token: string },
    token: string,
  ) =>
    apiCall("/manager/2fa/verify-and-enable", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }),

  disableTwoFactor: (managerId: string | number, token: string) =>
    apiCall<TwoFactorDisableResponse>(`/subadmin/2fa/disable/${managerId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  verifyLogin2FA: (data: {
    manager_id: string | number;
    verify_otp: string | number;
  }) =>
    apiCall<LoginResponse>("/manager/google-verify-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

export const adminManagedManager2FAApi = {
  enable: async (managerId: string | number, token: string) => {
    try {
      return await apiCall<AdminManagedTwoFactorSetupResponse>(
        `/admin/subadmin/${managerId}/2fa/enable`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );
    } catch (err: unknown) {
      if (err instanceof ApiRequestError && err.status === 405) {
        return await apiCall<AdminManagedTwoFactorSetupResponse>(
          `/admin/subadmin/${managerId}/2fa/enable`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          },
        );
      }
      throw err;
    }
  },

  disable: async (managerId: string | number, token: string) => {
    try {
      return await apiCall<TwoFactorDisableResponse>(
        `/admin/subadmin/${managerId}/2fa/disable`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );
    } catch (err: unknown) {
      if (err instanceof ApiRequestError && err.status === 405) {
        return await apiCall<TwoFactorDisableResponse>(
          `/admin/subadmin/${managerId}/2fa/disable`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }
      throw err;
    }
  },
};

export interface AdminKycExportParams {
  token: string;
  format?: "xlsx" | "csv";
  search?: string;
  status?: string | number;
}

const parseKycExportContentDispositionFilename = (
  contentDisposition: string | null,
  fallback: string,
) => {
  if (!contentDisposition) {
    return fallback;
  }

  const utf8Match = contentDisposition.match(
    /filename\*\s*=\s*UTF-8''([^;]+)/i,
  );
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const filenameMatch = contentDisposition.match(
    /filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i,
  );
  const filename = filenameMatch?.[1] ?? filenameMatch?.[2];

  if (!filename) {
    return fallback;
  }

  return filename.trim();
};

export interface AdminKycDetailDocument {
  status?: number | string;
  comment?: string;
  file?: string | null;
  url?: string | null;
}

export interface AdminKycDetailResponseData {
  user?: {
    uuid?: string;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string;
    kyc_status?: string;
    verification_status?: string;
  };
  submitted_at?: string;
  summary?: Record<string, unknown>;
  documents?: Record<
    string,
    AdminKycDetailDocument | number | null | undefined
  >;
  document_files?: Record<string, string | null | undefined>;
  document_urls?: Record<string, string | null | undefined>;
  rejection_comments?: Record<string, string | undefined>;
  kyc_status?: string;
}

const ADMIN_KYC_DOCUMENT_FILE_KEYS = {
  poi_front_file_status: "poi_front_file",
  poa_front_file_status: "poa_front_file",
  poa_back_file_status: "poa_back_file",
  other_file_status: "other_file",
} as const;

const normalizeAdminKycDetailResponse = (
  data: AdminKycDetailResponseData,
): AdminKycDetailResponseData => {
  const normalizedDocuments: Record<
    string,
    AdminKycDetailDocument | number | null | undefined
  > = {
    ...(data.documents ?? {}),
  };

  (
    Object.entries(ADMIN_KYC_DOCUMENT_FILE_KEYS) as Array<
      [
        keyof typeof ADMIN_KYC_DOCUMENT_FILE_KEYS,
        (typeof ADMIN_KYC_DOCUMENT_FILE_KEYS)[keyof typeof ADMIN_KYC_DOCUMENT_FILE_KEYS],
      ]
    >
  ).forEach(([statusKey, fileKey]) => {
    const rawEntry = data.documents?.[statusKey];
    const nestedEntry =
      rawEntry && typeof rawEntry === "object"
        ? (rawEntry as AdminKycDetailDocument)
        : undefined;
    const file = nestedEntry?.file ?? data.document_files?.[fileKey] ?? null;
    const url =
      nestedEntry?.url ??
      data.document_urls?.[fileKey] ??
      (file ? kycFileUrl(file) : null);

    normalizedDocuments[statusKey] = {
      status:
        nestedEntry?.status ??
        (typeof rawEntry === "number" || typeof rawEntry === "string"
          ? rawEntry
          : undefined),
      comment:
        nestedEntry?.comment ?? data.rejection_comments?.[statusKey] ?? "",
      file,
      url,
    };
  });

  return {
    ...data,
    documents: normalizedDocuments,
    kyc_status:
      data.kyc_status ??
      data.user?.verification_status ??
      data.user?.kyc_status,
  };
};

export const adminKycApi = {
  listPending: (
    status: string | number,
    token: string,
    search?: string,
    page = 1,
    limit = 10,
  ) => {
    const qs = new URLSearchParams();
    qs.set("status", encodeURIComponent(String(status)));
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    if (search && search.trim()) {
      qs.set("search", search.trim());
    }

    return apiCall<{
      items: Array<Record<string, unknown>>;
      pagination: {
        current_page: number;
        per_page: number;
        total: number;
        total_pages: number;
      };
    }>(`/admin/user-management/users/kyc/pending?${qs.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getUserKyc: async (userUuid: string, token: string) => {
    const response = await apiCall<AdminKycDetailResponseData>(
      `/admin/user-management/users/kyc/${encodeURIComponent(userUuid)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    return {
      ...response,
      data: normalizeAdminKycDetailResponse(
        (response.data ?? {}) as AdminKycDetailResponseData,
      ),
    };
  },

  uploadForUser: (
    userId: number | string,
    formData: FormData,
    token: string,
  ) => {
    ensureAdminUserToken(token, "upload KYC documents");
    ensureAdminUserIdentifier(userId, "upload KYC documents");

    return apiCall<KycStatusResponse["data"]>(
      `/admin/user-management/crud/users/${userId}/documents`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
    );
  },

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
    token: string,
  ) => {
    if (!body.user_uuid) throw new Error("User UUID missing in review body");
    return apiCall(`/admin/user-management/users/kyc/review`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  },

  export: async ({
    token,
    format = "xlsx",
    search,
    status,
  }: AdminKycExportParams) => {
    if (!token) {
      throw new Error("Token is required to export KYC submissions");
    }

    if (!API_BASE_URL) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
    }

    const qs = new URLSearchParams();
    qs.set("format", format);
    if (search && search.trim()) qs.set("search", search.trim());
    if (
      status !== undefined &&
      status !== null &&
      `${status}` !== "" &&
      `${status}` !== "none"
    ) {
      qs.set("status", String(status));
    }

    const endpoint = `/admin/reports/all_users_kyc/export${qs.toString() ? `?${qs.toString()}` : ""}`;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (handle401Redirect(response, !!token)) {
      return { blob: new Blob(), filename: "" };
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new ApiRequestError({
        message:
          (payload &&
          typeof payload === "object" &&
          "message" in payload &&
          typeof payload.message === "string"
            ? payload.message
            : null) || `HTTP ${response.status}`,
        status: response.status,
        statusText: response.statusText,
        endpoint,
        payload,
      });
    }

    const blob = await response.blob();
    return {
      blob,
      filename: parseKycExportContentDispositionFilename(
        response.headers.get("content-disposition"),
        `all_users_kyc.${format === "csv" ? "csv" : "xlsx"}`,
      ),
    };
  },
};

export const adminManagersApi = {
  list: (token: string) =>
    apiCall<{ subadmins: ManagerItem[]; pagination?: PaginationMeta }>(
      `/admin/subadmin/list`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),

  create: (body: ManagerCreateBody, token: string) =>
    apiCall<{ manager: ManagerItem }>(`/admin/subadmin/create`, {
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
    apiCall<{ manager: ManagerItem }>(`/admin/subadmin/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({ status: status ? "1" : "0" }).toString(),
    }),

  update: (id: number | string, body: ManagerUpdateBody, token: string) =>
    apiCall<{ manager: ManagerItem }>(`/admin/subadmin/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        password:
          typeof body.password === "string" ? body.password.trim() : undefined,
        permissions: Array.isArray(body.permissions) ? body.permissions : [],
      }),
    }),

  detail: (id: number | string, token: string) =>
    apiCall<{ subadmin: ManagerItem }>(`/admin/subadmin/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  delete: (id: number | string, token: string) =>
    apiCall(`/admin/subadmin/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),

  decryptPassword: (id: number | string, token: string) =>
    apiCall<{ password: string }>(`/admin/subadmin/${id}/decrypt-password`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      // Do NOT log out / redirect on 401 - surface the API message via toast instead
      skipAuthRedirect: true,
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

  update: (
    planId: number | string,
    body: CommissionPlanUpsertBody,
    token: string,
  ) => {
    if (!token) {
      throw new Error("Token is required to update a commission plan");
    }

    if (planId === undefined || planId === null || `${planId}` === "") {
      throw new Error(
        "A valid plan identifier is required to update a commission plan",
      );
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
      throw new Error(
        "A valid plan identifier is required to delete a commission plan",
      );
    }

    return apiCall(`/admin/commission/plans/${planId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export interface AdminIbPlanCommissionItem {
  id?: number | string;
  account_type_id?: number | string;
  level: string;
  rate_ib: number | string;
  rate_sub_ib_1?: number | string;
  rate_sub_ib_2?: number | string;
  rate_sub_ib_3?: number | string;
  rate_sub_ib_4?: number | string;
  rate_sub_ib_5?: number | string;
  is_default?: boolean | number | string;
  status?: boolean | number | string;
  created_at?: string;
  updated_at?: string;
}

export interface AdminIbPlanAccountTypeItem {
  account_type_id: number | string;
  account_type_name?: string;
  commissions?: AdminIbPlanCommissionItem[];
}

export interface AdminIbPlanItem {
  id: number | string;
  name: string;
  description?: string | null;
  status?: boolean | number | string;
  ib_user_count?: number | string;
  created_at?: string;
  updated_at?: string;
  account_types?: AdminIbPlanAccountTypeItem[];
}

export interface AdminIbPlanPagination {
  total?: number;
  per_page?: number;
  current_page?: number;
  last_page?: number;
}

export interface AdminIbPlanListResponseData {
  data?: AdminIbPlanItem[];
  pagination?: AdminIbPlanPagination;
}

export type AdminIbPlanUpsertBody = {
  name: string;
  description?: string;
  status?: 0 | 1;
  account_types: Array<{
    account_type_id: number;
    commissions: Array<{
      level: string;
      rate_ib: number;
      rate_sub_ib_1: number;
      rate_sub_ib_2: number;
      rate_sub_ib_3: number;
      rate_sub_ib_4: number;
      rate_sub_ib_5: number;
    }>;
  }>;
};

export type AdminIbPlanListParams = {
  token: string;
  page?: number;
  perPage?: number;
  search?: string;
  status?: string | number;
};

export const adminIbPlansApi = {
  list: ({
    token,
    page = 1,
    perPage = 20,
    search,
    status,
  }: AdminIbPlanListParams) => {
    if (!token) {
      throw new Error("Token is required to fetch IB plans");
    }

    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("per_page", String(perPage));
    if (search && search.trim()) qs.set("search", search.trim());
    if (status !== undefined && status !== null && `${status}`.trim() !== "") {
      qs.set("status", String(status).trim());
    }

    return apiCall<AdminIbPlanListResponseData>(
      `/admin/ib-plans${qs.toString() ? `?${qs.toString()}` : ""}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  getById: (planId: number | string, token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch an IB plan");
    }

    if (planId === undefined || planId === null || `${planId}` === "") {
      throw new Error(
        "A valid plan identifier is required to fetch an IB plan",
      );
    }

    return apiCall<AdminIbPlanItem>(`/admin/ib-plans/${planId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  create: (body: AdminIbPlanUpsertBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to create an IB plan");
    }

    return apiCall<AdminIbPlanItem>(`/admin/ib-plans`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  },

  update: (
    planId: number | string,
    body: AdminIbPlanUpsertBody,
    token: string,
  ) => {
    if (!token) {
      throw new Error("Token is required to update an IB plan");
    }

    if (planId === undefined || planId === null || `${planId}` === "") {
      throw new Error(
        "A valid plan identifier is required to update an IB plan",
      );
    }

    return apiCall<AdminIbPlanItem>(`/admin/ib-plans/${planId}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  },

  patch: (
    planId: number | string,
    body: Partial<AdminIbPlanUpsertBody>,
    token: string,
  ) => {
    if (!token) {
      throw new Error("Token is required to patch an IB plan");
    }

    if (planId === undefined || planId === null || `${planId}` === "") {
      throw new Error(
        "A valid plan identifier is required to patch an IB plan",
      );
    }

    return apiCall<AdminIbPlanItem>(`/admin/ib-plans/${planId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  },

  delete: (planId: number | string, token: string) => {
    if (!token) {
      throw new Error("Token is required to delete an IB plan");
    }

    if (planId === undefined || planId === null || `${planId}` === "") {
      throw new Error(
        "A valid plan identifier is required to delete an IB plan",
      );
    }

    return apiCall(`/admin/ib-plans/${planId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export interface AdminIbPlanCrudItem {
  id: number | string;
  name: string;
  status?: boolean | number | string;
  created_at?: string;
  updated_at?: string;
}

export interface AdminIbPlanCrudPagination {
  current_page?: number;
  total_pages?: number;
  total_ib_plans?: number;
  per_page?: number;
}

export interface AdminIbPlanCrudListData {
  ibPlans: AdminIbPlanCrudItem[];
  pagination?: AdminIbPlanCrudPagination;
}

export type AdminIbPlanCrudCreateBody = {
  name: string;
};

export type AdminIbPlanCrudUpdateBody = {
  name: string;
  status: boolean;
};

export const adminIbPlansCrudApi = {
  // list: (token: string) => {
  //   if (!token) {
  //     throw new Error("Token is required to fetch IB plans");
  //   }

  //   return apiCall<AdminIbPlanCrudListData>(` `, {
  //     method: "GET",
  //     headers: {
  //       Authorization: `Bearer ${token}`,
  //       Accept: "application/json",
  //     },
  //   });
  // },
  list: (token: string) => {
  if (!token) {
    throw new Error("Token is required to fetch IB plans");
  }

  return apiCall<AdminIbPlanCrudListData>(`/admin/ib-plans/list`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
},

  getById: (planId: number | string, token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch an IB plan");
    }

    if (planId === undefined || planId === null || `${planId}` === "") {
      throw new Error(
        "A valid plan identifier is required to fetch an IB plan",
      );
    }

    return apiCall<AdminIbPlanCrudItem>(`/admin/ib-plans/${planId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
  },

  create: (body: AdminIbPlanCrudCreateBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to create an IB plan");
    }

    return apiCall<AdminIbPlanCrudItem>(`/admin/ib-plans/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  },

  update: (
    planId: number | string,
    body: AdminIbPlanCrudUpdateBody,
    token: string,
  ) => {
    if (!token) {
      throw new Error("Token is required to update an IB plan");
    }

    if (planId === undefined || planId === null || `${planId}` === "") {
      throw new Error(
        "A valid plan identifier is required to update an IB plan",
      );
    }

    return apiCall<AdminIbPlanCrudItem>(`/admin/ib-plans/${planId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  },

  delete: (planId: number | string, token: string) => {
    if (!token) {
      throw new Error("Token is required to delete an IB plan");
    }

    if (planId === undefined || planId === null || `${planId}` === "") {
      throw new Error(
        "A valid plan identifier is required to delete an IB plan",
      );
    }

    return apiCall<unknown>(`/admin/ib-plans/${planId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
  },
};

export interface AdminIbCommissionItem {
  id: number | string;
  user_uuid: string;
  user_email?: string;
  user_name?: string;
  ib_plan_id: number | string;
  plan_name?: string;
  status: boolean | number | string;
  assigned_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AdminIbCommissionPagination {
  current_page?: number;
  total_pages?: number;
  total_ib_commissions?: number;
  per_page?: number;
}

export interface AdminIbCommissionListData {
  ibCommissions?: AdminIbCommissionItem[];
  pagination?: AdminIbCommissionPagination;
}

export type AdminIbCommissionCreateBody = {
  ib_plan_id: number;
  user_uuid: string;
};

export type AdminIbCommissionUpdateBody = {
  ib_plan_id: number;
  status: boolean;
};

export const adminIbCommissionApi = {
  list: (
    token: string,
    search?: string | null,
    page: number = 1,
    perPage: number = 10,
    sortOrder?: string | null,
    dateFrom?: string | null,
    dateTo?: string | null,
  ) => {
    if (!token) {
      throw new Error("Token is required to fetch IB commission assignments");
    }

    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("per_page", String(perPage));
    if (search && search.trim()) {
      qs.set("search", search.trim());
    }

    const normalizedSortOrder = sortOrder?.trim().toLowerCase();
    if (normalizedSortOrder === "asc" || normalizedSortOrder === "desc") {
      qs.set("sort_order", normalizedSortOrder);
    }

    if (dateFrom && dateFrom.trim()) {
      qs.set("date_from", dateFrom.trim());
    }

    if (dateTo && dateTo.trim()) {
      qs.set("date_to", dateTo.trim());
    }

    const endpoint = `/admin/ib-commission/list${
      qs.toString() ? `?${qs.toString()}` : ""
    }`;

    return apiCall<AdminIbCommissionListData>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  get: (userUuid: string, token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch an IB commission assignment");
    }

    const id = String(userUuid ?? "").trim();
    if (!id) {
      throw new Error("IB commission user UUID is required");
    }

    return apiCall<AdminIbCommissionItem>(
      `/admin/ib-commission/${encodeURIComponent(id)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  create: (body: AdminIbCommissionCreateBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to create an IB commission assignment");
    }

    const userUuid = String(body.user_uuid ?? "").trim();
    if (!userUuid) {
      throw new Error("IB commission user UUID is required");
    }

    return apiCall<AdminIbCommissionItem>(
      `/admin/ib-commission`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ib_plan_id: body.ib_plan_id,
          user_uuid: userUuid,
        }),
      },
    );
  },

  update: (
    userUuid: string,
    body: AdminIbCommissionUpdateBody,
    token: string,
  ) => {
    if (!token) {
      throw new Error("Token is required to update an IB commission assignment");
    }

    const id = String(userUuid ?? "").trim();
    if (!id) {
      throw new Error("IB commission user UUID is required");
    }

    return apiCall<AdminIbCommissionItem>(
      `/admin/ib-commission/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
  },
};

export interface AdminCommissionGroupRate {
  level: number;
  rate: number;
  symbol_category: string;
}

export interface AdminCommissionGroupItem {
  id: number;
  ib_plan_id: number;
  plan_name: string;
  group_id: number;
  group_name: string;
  mt5_group_name: string;
  status: boolean | number | string;
  created_at?: string;
  updated_at?: string;
  rates?: Record<string, Record<string, number>>;
}

export interface AdminCommissionGroupPagination {
  current_page?: number;
  total_pages?: number;
  total_commission_groups?: number;
  per_page?: number;
}

export interface AdminCommissionGroupListData {
  commissionGroups: AdminCommissionGroupItem[];
  pagination?: AdminCommissionGroupPagination;
}

export interface AdminCommissionGroupCategoriesData {
  categories: string[];
}

export type AdminCommissionGroupCreateBody = {
  ib_plan_id: number;
  group_id: number;
  rates: AdminCommissionGroupRate[];
};

export type AdminCommissionGroupUpdateBody = {
  rates: AdminCommissionGroupRate[];
  status: boolean;
};

export const adminCommissionGroupsApi = {
  getCategories: (token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch commission group categories");
    }

    return apiCall<AdminCommissionGroupCategoriesData>(
      `/admin/commission-groups/categories`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );
  },

  list: (token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch commission groups");
    }

    return apiCall<AdminCommissionGroupListData>(
      `/admin/commission-groups/list`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );
  },

  getById: (groupId: number | string, token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch a commission group");
    }

    if (groupId === undefined || groupId === null || `${groupId}` === "") {
      throw new Error(
        "A valid commission group identifier is required to fetch it",
      );
    }

    return apiCall<AdminCommissionGroupItem>(
      `/admin/commission-groups/${groupId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );
  },

  create: (body: AdminCommissionGroupCreateBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to create a commission group");
    }

    return apiCall<AdminCommissionGroupItem>(
      `/admin/commission-groups/create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      },
    );
  },

  update: (
    groupId: number | string,
    body: AdminCommissionGroupUpdateBody,
    token: string,
  ) => {
    if (!token) {
      throw new Error("Token is required to update a commission group");
    }

    if (groupId === undefined || groupId === null || `${groupId}` === "") {
      throw new Error(
        "A valid commission group identifier is required to update it",
      );
    }

    return apiCall<AdminCommissionGroupItem>(
      `/admin/commission-groups/${groupId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      },
    );
  },

  delete: (groupId: number | string, token: string) => {
    if (!token) {
      throw new Error("Token is required to delete a commission group");
    }

    if (groupId === undefined || groupId === null || `${groupId}` === "") {
      throw new Error(
        "A valid commission group identifier is required to delete it",
      );
    }

    return apiCall<unknown>(`/admin/commission-groups/${groupId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
  },
};

export type ModulePermissionItem = {
  id: number;
  name: string;
  category: string;
  created_at?: string;
  updated_at?: string;
};

export type ModulePermissions = {
  module: string;
  permissions: ModulePermissionItem[];
  count: number;
};

export const permissionsApi = {
  listAll: (token: string) =>
    apiCall<{ modules: ModulePermissions[]; total?: number }>(
      `/admin/permissions/module-wise`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};

export const kycFileUrl = (fileName?: string | null) =>
  fileName ? `${API_BASE_URL}/uploads/${encodeURIComponent(fileName)}` : "";

export interface AdminUSDTDepositRequest {
  deposit_type?: "bank" | "usdt" | string;
  id: number;
  user_id: number;
  transaction_hash: string | null;
  transaction_reference?: string | null;
  user_comment: string | null;
  payment_proof_url: string | null;
  amount: number;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  approved_by: string | null;
  approved_by_manager_id?: string | number | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  managerApprover?: unknown | null;
}

export interface AdminUSDTDepositListResponse {
  deposits: AdminUSDTDepositRequest[];
  pagination?: {
    page?: number;
    current_page?: number;
    limit: number;
    total?: number;
    total_records?: number;
    totalPages?: number;
    total_pages?: number;
  };
}

export interface AdminUSDTDepositVerifyRequest {
  deposit_type: "bank" | "usdt" | string;
  request_id: number;
  action: "approve" | "reject";
  admin_notes?: string;
}

export interface AdminUSDTDepositVerifyResponse {
  id: number;
  status: "approved" | "rejected";
  admin_notes: string | null;
  approved_by: string;
  approved_by_manager_id?: string | number | null;
  approved_by_type?: "admin" | "manager" | string;
  approved_at: string;
}

export const adminUSDTDepositApi = {
  listAll: (
    page: number = 1,
    limit: number = 10,
    token: string,
    search?: string,
    status?: string,
    depositType?: string | null,
  ) => {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    if (search && search.trim()) {
      qs.set("search", search.trim());
    }
    if (status && status !== "all") {
      qs.set("status", status);
    }
    if (depositType && depositType !== "all" && depositType !== "none") {
      qs.set("deposit_type", depositType);
    }

    return apiCall<AdminUSDTDepositListResponse>(
      `/admin/deposits/all?${qs.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  verify: (data: AdminUSDTDepositVerifyRequest, token: string) =>
    apiCall<AdminUSDTDepositVerifyResponse>(`/admin/deposits/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }),
};

export const depositProofUrl = (fileName?: string | null) => {
  if (!fileName) return "";
  if (/^https?:\/\//i.test(fileName)) return fileName;
  return `${API_BASE_URL}${fileName.startsWith("/") ? "" : "/"}${fileName}`;
};

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
  uuid: string | null;
  amount: number;
  status: number;
  file: string | null;
  user_comment: string | null;
  admin_comment: string | null;
  created_at: string;
  payment_method_id: number | null;
  merchant_trade_no?: string | null;
  coinsbuy_deposit_id?: string | null;
  transaction_hash: string | null;
  source: string;
  paymentMethod: {
    type: string;
    name: string;
  } | null;
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
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }),

  getList: (
    page: number = 1,
    perPage: number = 10,
    token: string,
    options?: {
      search?: string;
      payment_method_id?: number | null;
      status?: number | null;
      source?: string | null;
      payment_category?: string | null;
      date_from?: string | null;
      date_to?: string | null;
      sort_column?: string;
      sort_order?: string;
    },
  ) => {
    const qs = new URLSearchParams();
    qs.set("per_page", String(perPage));
    qs.set("page", String(page));
    qs.set("sort_column", options?.sort_column || "created_at");
    qs.set("sort_order", options?.sort_order || "DESC");
    if (options?.search) qs.set("search", options.search);
    if (
      options?.payment_method_id !== undefined &&
      options?.payment_method_id !== null
    ) {
      qs.set("payment_method_id", String(options.payment_method_id));
    }
    if (options?.status !== undefined && options?.status !== null) {
      qs.set("status", String(options.status));
    }
    if (options?.source) qs.set("source", options.source);
    if (options?.payment_category)
      qs.set("payment_category", options.payment_category);
    if (options?.date_from) qs.set("date_from", options.date_from);
    if (options?.date_to) qs.set("date_to", options.date_to);
    return apiCall<DepositListResponse>(`/user/deposit/list?${qs.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getStatus: (merchantTradeNo: string, token: string) =>
    apiCall<BinanceDepositStatusResponse>(
      `/user/deposit/binance/status/${merchantTradeNo}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};

export interface CoinsBuyDepositCreateRequest {
  amount: number;
}

export interface CoinsBuyDepositCreateResponse {
  success: boolean;
  message: string;
  data: {
    // backend may return either deposit_id (number) or deposit_uuid (string) – keep both optional for compatibility
    deposit_id: number | string;
    deposit_uuid?: string;
    coinsbuy_deposit_id: string;
    tracking_id: string;
    wallet_id: string;
    amount: number;
    label: string;
    confirmations_needed: number;
    status: number;
    payment_url: string;
    payment_page?: string;
    payment_page_redirect_url: string;
    callback_url: string;
    created_at?: string;
  };
}

export interface CoinsBuyDepositStatusResponse {
  success: boolean;
  message?: string;
  data: {
    // keep legacy deposit_uuid for backwards compat
    deposit_id: number | string;
    deposit_uuid?: string;
    coinsbuy_deposit_id: string;
    deposit_status: number; // 0 = pending, 1 = credited — trustworthy DB state
    coinsbuy_status: number;
    amount: string | number;
    amount_pending?: string | number;
    currency?: string;
    confirmations_needed: number;
    tracking_id: string;
    address?: string;
    payment_page?: string;
  };
}

export interface CoinsBuyDepositSuccessResponse {
  success: boolean;
  message: string;
  data: {
    deposit_id: string | number;
    tracking_id: string;
    redirect_url: string;
  };
}

// @deprecated — server-to-server only, never call from frontend
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

export const coinsbuyDepositApi = {
  create: (data: CoinsBuyDepositCreateRequest, token: string) =>
    apiCall<CoinsBuyDepositCreateResponse["data"]>(`/user/deposit/coinsbuy/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }),

  getStatus: (depositId: string | number, token: string) =>
    apiCall<CoinsBuyDepositStatusResponse["data"]>(
      `/user/deposit/coinsbuy/status/${encodeURIComponent(String(depositId))}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    ),

  getSuccess: (
    params: { deposit_id: string | number; tracking_id: string },
    token: string,
  ) => {
    const qs = new URLSearchParams({
      deposit_id: String(params.deposit_id),
      tracking_id: params.tracking_id,
    });
    return apiCall<CoinsBuyDepositSuccessResponse["data"]>(
      `/user/deposit/coinsbuy/success?${qs.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );
  },

  /** @deprecated server-to-server webhook — do not use from frontend */
  triggerWebhook: (data: CoinsBuyWebhookRequest, token: string) =>
    apiCall<CoinsBuyWebhookResponse>(`/webhook/coinsbuy`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }),
};

// Cregis Deposit Types
export interface CregisDepositCreateRequest {
  amount: number;
  currency: string;
}

export interface CregisPaymentInfo {
  payment_address: string;
  token_symbol: string;
  blockchain: string;
  token_name: string;
  logo_url: string;
  token_decimals: number;
  receive_amount: string;
  receive_currency: string;
  exchange_rate: string;
  asset_logo: string;
  consolidated_qrcodes: string | null;
}

export interface CregisDepositCreateResponse {
  success: boolean;
  message: string;
  test_mode: boolean;
  data: {
    deposit_uuid: string;
    out_trade_no: string;
    cregis_id: string;
    checkout_url: string;
    merchant_name: string;
    merchant_logo_url: string;
    order_amount: string;
    order_currency: string;
    created_time: number;
    expire_time: number;
    payment_info: CregisPaymentInfo[];
    amount: number;
    currency: string;
  };
}

export interface CregisDepositStatusData {
  deposit_uuid: string;
  out_trade_no: string;
  deposit_status: number; // 0 - pending, 1 - approved/successful, 2 - failed
  cregis_status: string; // "new", "processing", "completed", "failed", etc.
  trade_no: string;
  amount: number;
  currency: string;
}

export interface CregisDepositStatusResponse {
  success: boolean;
  message: string;
  data: CregisDepositStatusData;
}

export const cregisDepositApi = {
  create: (data: CregisDepositCreateRequest, token: string) =>
    apiCall<CregisDepositCreateResponse>(`/user/deposit/cregis/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }),

  getStatus: (outTradeNo: string, token: string) =>
    apiCall<CregisDepositStatusData>(
      `/user/deposit/cregis/status/${outTradeNo}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};

export interface AdminWithdrawalRequest {
  id: number;
  user_id: number;
  amount: string;
  status: "pending" | "approved" | "rejected";
  remarks: string | null;
  admin_notes?: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  wallet_address?: string | null;
  chain_id?: string | null;
  bank_detail_id?: number | null;
  transaction_hash?: string | null;
  source: string;
  mt5_user_id?: number | null;
  mt5_account?: {
    id: number;
    account_id: string;
    mt5_login: number;
  } | null;
  payment_method: {
    id: number;
    type: string;
    name: string;
  };
  updated_at: string;
  user?: {
    id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  bank_detail?: {
    id: number;
    account_holder_name: string;
    account_number: string;
    iban_number: string | null;
    swift_ifsc_code: string | null;
    bank_name: string;
    address: string | null;
    country: string | null;
  } | null;
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

export type BankDepositTarget = "mt5" | "wallet";

export interface BankDepositRequest {
  target: BankDepositTarget;
  account_ref?: string | null;
  amount: number;
  transaction_id: string;
  payment_proof?: string | File | null;
  comment?: string;
}

export interface BankDepositSubmitData {
  id: number;
  transaction_id: string;
  target: BankDepositTarget;
  payment_proof_url: string | null;
  account_ref: string | null;
  mt5_user_id: number | null;
  user_comment: string | null;
  amount: number;
  status: string;
  mt5_account_id: string | null;
  mt5_login: number | null;
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
  user_comment: string | null;
  approved_by: string | null;
  approved_by_manager_id: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  mt5_user_id: number | null;
  target: BankDepositTarget;
  account_ref: string | null;
  mt5_account_id: string | null;
  mt5_login: number | null;
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
  submit: (data: BankDepositRequest, token: string) => {
    const formData = new FormData();
    formData.append("target", data.target);
    if (data.target === "mt5") {
      formData.append("account_ref", data.account_ref ?? "");
    }
    formData.append("amount", String(data.amount));
    formData.append("transaction_id", data.transaction_id);
    if (data.payment_proof) {
      formData.append("payment_proof", data.payment_proof);
    }
    if (data.comment) {
      formData.append("comment", data.comment);
    }

    return apiCall<{
      success: boolean;
      message: string;
      data: BankDepositSubmitData;
    }>(`/user/bank-deposit/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  },

  listRequests: (token: string, page = 1, limit = 10, status?: string) => {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    if (status && status !== "all") {
      qs.set("status", status);
    }
    return apiCall<{ success: boolean; data: BankDepositListData }>(
      `/user/bank-deposit/user-requests?${qs.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  getRequest: (id: number | string, token: string) =>
    apiCall<{ success: boolean; data: BankDepositRecord }>(
      `/user/bank-deposit/user-requests/${id}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};

/* ─── User cash deposit ─────────────────────────────────────────────────── */

export type CashDepositTarget = "mt5" | "wallet";

export interface CashDepositRequest {
  target: CashDepositTarget;
  account_ref?: string | null;
  amount: number;
  comment?: string | null;
  payment_proof?: File | null;
}

export interface CashDepositSubmitData {
  id: number;
  amount: number;
  mt5_user_id: number | null;
  user_comment: string | null;
  status: number;
  file: string | null;
  created_at: string;
  target: CashDepositTarget;
  status_label: string;
  mt5_account_id: string | null;
  mt5_login: number | null;
}

export interface CashDepositRecord {
  id: number;
  user_id: number;
  manager_id: number | null;
  amount: number;
  admin_comment: string | null;
  user_comment: string | null;
  payment_method_id: number | null;
  payment_detail_id: number | null;
  mt5_user_id: number | null;
  user_type: number;
  status: number;
  file: string | null;
  transaction_hash: string | null;
  merchant_trade_no: string | null;
  coinsbuy_deposit_id: string | null;
  created_at: string;
  updated_at: string;
  mt5_account_id: string | null;
  mt5_login: number | null;
  status_label: string;
  target: CashDepositTarget;
  walletTransaction?: unknown;
}

export interface CashDepositListData {
  requests: CashDepositRecord[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_records: number;
    limit: number;
  };
}

export const cashDepositApi = {
  submit: (data: CashDepositRequest, token: string) => {
    const formData = new FormData();
    formData.append("target", data.target);
    if (data.target === "mt5") {
      formData.append("account_ref", data.account_ref ?? "");
    }
    formData.append("amount", String(data.amount));
    if (data.comment) {
      formData.append("comment", data.comment);
    }
    if (data.payment_proof) {
      formData.append("payment_proof", data.payment_proof);
    }

    return apiCall<{
      success: boolean;
      message: string;
      data: CashDepositSubmitData;
    }>(`/cash-deposit/submit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  },

  listRequests: (token: string, page = 1, limit = 10, status?: string) => {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    if (status && status !== "all") {
      qs.set("status", status);
    }
    return apiCall<{ success: boolean; data: CashDepositListData }>(
      `/user/cash-deposit/user-requests?${qs.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  getRequest: (id: number | string, token: string) =>
    apiCall<{ success: boolean; data: CashDepositRecord }>(
      `/user/cash-deposit/user-requests/${id}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};

export const adminWithdrawalApi = {
  listAll: (
    page: number = 1,
    limit: number = 10,
    token: string,
    status?: string,
    search?: string,
  ) => {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    if (status && status !== "all") {
      qs.set("status", status);
    }
    if (search && search.trim()) {
      qs.set("search", search.trim());
    }

    return apiCall<AdminWithdrawalListResponse>(
      `/admin/withdrawals?${qs.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  decision: (
    id: string | number,
    data: AdminWithdrawalDecisionRequest,
    token: string,
  ) =>
    apiCall<AdminWithdrawalDecisionResponse>(
      `/admin/withdrawals/${id}/decision`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    ),
};

// ─── IB Withdrawal API ────────────────────────────────────────────────────────

export interface AdminIbWithdrawalRequest {
  id: number;
  user_id: number;
  amount: number;
  destination: "bank" | "mt5";
  bank_detail_id: number | null;
  mt5_user_id: number | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  initiated_by: string;
  admin_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  user?: {
    id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  bank_detail?: {
    id: number;
    account_holder_name: string;
    account_number: string;
    iban_number: string | null;
    swift_ifsc_code: string | null;
    bank_name: string;
    address: string | null;
    country: string | null;
  } | null;
  mt5_account?: {
    id: number;
    account_id: string;
    mt5_login: number;
  } | null;
}

export interface AdminIbWithdrawalListResponse {
  success?: boolean;
  data?:
    | AdminIbWithdrawalRequest[]
    | {
        withdrawals?: AdminIbWithdrawalRequest[];
        data?: AdminIbWithdrawalRequest[];
        requests?: AdminIbWithdrawalRequest[];
        pagination?: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
  meta?: { total?: number; page?: number; limit?: number };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  withdrawals?: AdminIbWithdrawalRequest[];
  requests?: AdminIbWithdrawalRequest[];
}

export interface AdminIbWithdrawalDecisionRequest {
  decision: "approve" | "reject";
  action: "approve" | "reject";
  admin_notes?: string;
  remarks?: string;
}

export interface AdminIbWithdrawalDecisionResponse {
  success: boolean;
  message: string;
  data: AdminIbWithdrawalRequest;
}

export interface AdminIbWithdrawalCreateRequest {
  user_id: number;
  amount: number;
  destination: "bank" | "mt5";
  bank_detail_id?: number;
  mt5_account_id?: string;
  comment?: string;
}

export const adminIbWithdrawalApi = {
  listAll: (
    page: number = 1,
    limit: number = 10,
    token: string,
    params?: {
      status?: string;
      search?: string;
      destination?: string;
      user_id?: number;
    },
  ) => {
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    if (params?.status && params.status !== "all") {
      qs.set("status", params.status);
    }
    if (params?.search && params.search.trim()) {
      qs.set("search", params.search.trim());
    }
    if (params?.destination && params.destination !== "all") {
      qs.set("destination", params.destination);
    }
    if (params?.user_id) {
      qs.set("user_id", String(params.user_id));
    }

    return apiCall<AdminIbWithdrawalListResponse>(
      `/admin/ib-withdrawals?${qs.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  create: (data: AdminIbWithdrawalCreateRequest, token: string) =>
    apiCall<{ success: boolean; message: string; data: AdminIbWithdrawalRequest }>(
      `/admin/ib-withdrawals`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    ),

  decision: (
    id: string | number,
    data: AdminIbWithdrawalDecisionRequest,
    token: string,
  ) =>
    apiCall<AdminIbWithdrawalDecisionResponse>(
      `/admin/ib-withdrawals/${id}/decision`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    ),
};

export interface BroadcastEmailRequest {
  subject: string;
  body: string;
  emails?: string[];
  attachment_1?: string | null;
  attachment_2?: string | null;
  attachment_3?: string | null;
}

export interface BroadcastEmailHistoryItem {
  id: number;
  uuid: string;
  subject: string;
  body: string;
  recipient_type: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  sent_by_admin_id: string;
  attachment_urls: string[];
  created_at: string;
}

export interface BroadcastEmailHistoryResponse {
  success: boolean;
  message: string;
  data: BroadcastEmailHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface BroadcastEmailResponse {
  success: boolean;
  message: string;
  data: {
    total: number;
    sent: number;
    failed: number;
  };
}

// ─── Campaign-based Broadcast Email ───────────────────────────────────────────

export interface BroadcastCampaignChunkResult {
  campaign_id: number;
  chunk_index: number;
  chunk_sent: number;
  chunk_failed: number;
  chunk_total: number;
  cumulative_sent: number;
  total_recipients: number;
  remaining: number;
  status: "in_progress" | "completed" | "failed";
}

export interface BroadcastCampaignChunkResponse {
  success: boolean;
  message: string;
  data: BroadcastCampaignChunkResult;
}

export interface BroadcastCampaignStatus {
  campaign_id: number;
  subject: string;
  recipient_type: "all" | "specific";
  chunk_size: number;
  total_recipients: number;
  cumulative_sent: number;
  chunks_sent: number;
  remaining: number;
  status: "in_progress" | "completed" | "failed";
  created_at?: string;
  updated_at?: string;
}

export interface BroadcastCampaignStatusResponse {
  success: boolean;
  data: BroadcastCampaignStatus;
}

export interface BroadcastCampaignItem {
  id: number;
  uuid: string;
  subject: string;
  recipient_type: "all" | "specific";
  chunk_size: number;
  total_recipients: number;
  cumulative_sent: number;
  chunks_sent: number;
  status: "in_progress" | "completed" | "failed";
  created_at: string;
  updated_at: string;
}

export interface BroadcastCampaignsListResponse {
  success: boolean;
  data: BroadcastCampaignItem[];
  total: number;
  page: number;
  limit: number;
}

export interface BroadcastCampaignCreateRequest {
  subject: string;
  body: string;
  emails?: string[];
  chunk_size?: number;
}

export const adminBroadcastEmailApi = {
  send: (data: BroadcastEmailRequest | FormData, token: string) => {
    const isFormData = data instanceof FormData;
    return apiCall<BroadcastEmailResponse["data"]>(
      "/admin/user-management/broadcast-email",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
        },
        body: isFormData ? data : JSON.stringify(data),
      },
    );
  },

  history: (params: { token: string; page?: number; limit?: number }) => {
    const { token, page = 1, limit = 10 } = params;
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    return apiCall<BroadcastEmailHistoryResponse>(
      `/admin/user-management/broadcast-email/history?${qs.toString()}`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } },
    );
  },

  // Campaign-based broadcast APIs
  createCampaign: (data: BroadcastCampaignCreateRequest, token: string) => {
    return apiCall<BroadcastCampaignChunkResult>(
      "/admin/user-management/broadcast-email/campaign",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );
  },

  sendNextChunk: (campaignId: number, chunkSize: number, token: string) => {
    return apiCall<BroadcastCampaignChunkResult>(
      `/admin/user-management/broadcast-email/campaign/${campaignId}/send-next-chunk`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chunk_size: chunkSize }),
      },
    );
  },

  getCampaignStatus: (campaignId: number, token: string) => {
    return apiCall<BroadcastCampaignStatus>(
      `/admin/user-management/broadcast-email/campaign/${campaignId}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  listCampaigns: (params: { token: string; page?: number; limit?: number }) => {
    const { token, page = 1, limit = 10 } = params;
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    return apiCall<BroadcastCampaignsListResponse>(
      `/admin/user-management/broadcast-email/campaigns?${qs.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },
};

// ─── Email Exclusion List ────────────────────────────────────────────────────

export interface EmailExclusion {
  id: number;
  email: string;
  added_by_admin_id: string;
  created_at: string;
}

export interface EmailExclusionListResponse {
  success: boolean;
  message: string;
  data: EmailExclusion[];
  total: number;
}

export interface EmailExclusionMutationResponse {
  success: boolean;
  message: string;
}

export const adminEmailExclusionsApi = {
  list: (token: string) =>
    apiCall<EmailExclusionListResponse>(
      "/admin/user-management/email-exclusions",
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),

  add: (email: string, token: string) =>
    apiCall<EmailExclusionMutationResponse>(
      "/admin/user-management/email-exclusions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      },
    ),

  remove: (email: string, token: string) =>
    apiCall<EmailExclusionMutationResponse>(
      "/admin/user-management/email-exclusions",
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      },
    ),
};

// ─── Payment Methods ──────────────────────────────────────────────────────────

export interface PaymentMethod {
  id: number;
  type: string;
  status: number;
  name: string;
  description: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodListResponse {
  status: number;
  message: string;
  data: {
    count: number;
    rows: PaymentMethod[];
  };
}

export interface PaymentMethodResponse {
  status: number;
  message: string;
  data: PaymentMethod;
}

export interface PaymentMethodRequest {
  type: string;
  name: string;
  description?: string;
  status: number;
}

// ─── User-facing Payment Methods ─────────────────────────────────────────────

export interface UserPaymentMethod {
  id: number;
  type: string;
  name: string;
  description: string | null;
  logo_url: string | null;
}

export const userPaymentMethodsApi = {
  list: (token: string) =>
    apiCall<{ status: number; message: string; data: UserPaymentMethod[] }>(
      "/user/payment-methods",
      { method: "GET", headers: { Authorization: `Bearer ${token}` } },
    ),
};

export const adminPaymentMethodsApi = {
  list: (token: string) =>
    apiCall<PaymentMethodListResponse>("/admin/payment-methods", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  create: (data: PaymentMethodRequest, token: string) =>
    apiCall<PaymentMethodResponse>("/admin/payment-methods", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }),

  update: (id: number, data: PaymentMethodRequest, token: string) =>
    apiCall<PaymentMethodResponse>(`/admin/payment-methods/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }),

  toggleStatus: (id: number, token: string) =>
    apiCall<PaymentMethodResponse>(
      `/admin/payment-methods/${id}/toggle-status`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),

  delete: (id: number, token: string) =>
    apiCall<{ status: number; message: string }>(
      `/admin/payment-methods/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};
