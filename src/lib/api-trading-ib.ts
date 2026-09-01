import {
  API_BASE_URL,
  ApiRequestError,
  ApiResponse,
  PaginationMeta,
  apiCall,
  handle401Redirect,
} from "./api-core";

export interface AccountTypeGroup {
  id: number;
  name: string;
  mode: string;
  mt5_group_name: string;
  platform: string;
  status: boolean;
}

export interface AccountType {
  id: number;
  name: string;
  maximum_leverage: string;
  mode?: string;
  leverage_value?: number | string;
  status?: boolean;
  minimum_deposit?: number;
  created_at?: string;
  updated_at?: string;
  groups?: {
    live?: AccountTypeGroup;
    demo?: AccountTypeGroup;
  };
}

export interface ActiveAccountTypesResponse {
  accountTypes: AccountType[];
  pagination: PaginationMeta;
}

export interface AccountTypesResponse {
  success: boolean;
  message: string;
  data: AccountType[];
}

export const accountTypesApi = {
  getActive: (token: string) =>
    apiCall<ActiveAccountTypesResponse>(`/admin/account-types/active`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export interface UserMT5AccountCreateRequest {
  account_type_id: number;
  mode: "demo" | "live";
  leverage: number;
  balance?: number;
  extra_fields: Record<string, unknown>;
  main_password: string;
  confirm_password: string;
  investor_password: string;
}

export interface UserMT5AccountCreateData {
  login: number | string;
  name: string;
  server: string;
  group: string;
  leverage: number | string;
  main_password: string;
  investor_password: string;
  account_mode: string;
}

export interface UserMT5AccountListItem {
  id: number;
  name: string;
  email: string;
  mt5_id: string;
  account_id: string;
  balance: number;
  account_mode: string;
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
  server?: string | null;
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

export interface UserMT5AccountDetailResponseData {
  server?: string | null;
  mt5_account: UserMT5AccountDetail;
}

export interface UserMT5DemoDepositRequest {
  account_ref: string;
  amount: number;
}

export interface UserMT5DemoDepositData {
  mt5_account_id: string;
  mt5_login: string | number;
  amount: number;
  mt5_balance_before: number;
  mt5_balance_after: number;
  wallet_balance_before: number;
  wallet_balance_after: number;
  comment: string;
  mt5_result?: {
    login?: number | string;
    amount?: number;
    comment?: string;
    kind?: string;
    method?: string;
    result?: unknown;
  };
  demo: boolean;
}

export interface UserMT5PasswordResetRequest {
  new_password: string;
}

export interface UserMT5MainPasswordResetData {
  accountId: number;
  main_password: string;
}

export interface UserMT5InvestorPasswordResetData {
  accountId: number;
  investor_password: string;
}

const buildMt5PasswordResetQuery = (length: number) =>
  new URLSearchParams({ length: String(length) }).toString();

export interface UserMT5TradesHistoryItem {
  type: string;
  time_ist: string;
  symbol: string | null;
  side: string | null;
  status: string | null;
  deal: number | null;
  order: number | null;
  position: number | null;
  price: number | null;
  volume: number | null;
  volume_raw: number | null;
  profit: number | null;
  comment: string | null;
  mt5_ticket: number | null;
}

export interface UserMT5TradesHistoryPagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface UserMT5TradesHistoryData {
  items: UserMT5TradesHistoryItem[];
  pagination: UserMT5TradesHistoryPagination;
}

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

export const userMT5AccountsApi = {
  create: (data: UserMT5AccountCreateRequest, token: string) => {
    const { extra_fields, ...rest } = data;
    const body: Record<string, unknown> = {
      account_type_id: rest.account_type_id,
      mode: rest.mode,
      leverage: rest.leverage,
      extra_fields,
      main_password: rest.main_password,
      confirm_password: rest.confirm_password,
      investor_password: rest.investor_password,
    };
    if (rest.mode === "demo" && rest.balance !== undefined) {
      body.balance = rest.balance;
    }
    return apiCall<UserMT5AccountCreateData>(`/user/mt5-account`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  },

  list: (token: string) =>
    apiCall<{ mt5_accounts: UserMT5AccountListItem[] }>(`/user/mt5-account`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  getById: (id: string | number, token: string) =>
    apiCall<UserMT5AccountDetailResponseData>(`/user/mt5-account/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  demoDeposit: (data: UserMT5DemoDepositRequest, token: string) =>
    apiCall<UserMT5DemoDepositData>(`/user/mt5/demo-deposit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }),

  resetMainPassword: (
    id: string | number,
    data: UserMT5PasswordResetRequest,
    token: string,
    length: number = data.new_password.length,
  ) =>
    apiCall<UserMT5MainPasswordResetData>(
      `/user/mt5-account/${id}/reset-main-password?${buildMt5PasswordResetQuery(length)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    ),

  resetInvestorPassword: (
    id: string | number,
    data: UserMT5PasswordResetRequest,
    token: string,
    length: number = data.new_password.length,
  ) =>
    apiCall<UserMT5InvestorPasswordResetData>(
      `/user/mt5-account/${id}/reset-investor-password?${buildMt5PasswordResetQuery(length)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    ),

  getTradesHistory: (
    params: {
      login: string | number;
      from_dt?: string;
      to_dt?: string;
      page?: number;
      per_page?: number;
      debug?: number;
    },
    token: string,
  ) => {
    if (
      params.login === undefined ||
      params.login === null ||
      `${params.login}`.trim() === ""
    ) {
      throw new Error("MT5 login is required to fetch trades history");
    }

    const qs = new URLSearchParams();
    qs.set("login", String(params.login));
    if (params.from_dt) qs.set("from_dt", params.from_dt);
    if (params.to_dt) qs.set("to_dt", params.to_dt);
    if (params.page) qs.set("page", String(params.page));
    if (params.per_page) qs.set("per_page", String(params.per_page));
    if (params.debug !== undefined) qs.set("debug", String(params.debug));

    return apiCall<UserMT5TradesHistoryData>(
      `/user/mt5-account/trades-history?${qs.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },

  updateLeverage: (id: string | number, leverage: number, token: string) =>
    apiCall<{ accountId: number; leverage: number }>(
      `/user/mt5-account/${id}/leverage`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leverage }),
      },
    ),
};

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
  volume?: number | null;
  volume_raw?: number | null;
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
  volume?: number | null;
  volume_raw?: number | null;
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

const unwrapDirectOrEnvelope = <T>(response: ApiResponse<T> | T): T => {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    !("items" in response)
  ) {
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
      },
    );

    return unwrapDirectOrEnvelope<Mt5SdkPositionsResponse>(response);
  },

  getTradeHistory: async (
    { login, from_dt, to_dt }: Mt5SdkTradeHistoryParams,
    token?: string | null,
  ) => {
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
      },
    );

    return unwrapDirectOrEnvelope<Mt5SdkTradeHistoryResponse>(response);
  },
};

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
  name: string;
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

/**
 * Admin-facing IB portal detail payload. Mirrors `IbDashboardResponse` so the
 * admin can preview the same widgets the IB user sees on `/ib-dashboard`.
 *
 * Backend contract (placeholders — wire up when the endpoint is ready):
 *   GET /admin/ib-management/ib-users/:id
 *   → { success, message, data: AdminIbUserDetailResponse }
 */
export interface AdminIbUserDetailResponse {
  user: AdminIbUser;
  partner_wallet?: IbDashboardWallet;
  client_wallet?: IbDashboardWallet;
  today_earning?: IbDashboardWallet;
  rebates_graph?: IbDashboardRebatesGraph[];
  pending_rebates?: IbDashboardPendingRebates;
  earning_summary?: IbDashboardEarningSummary;
  partner_info?: IbDashboardPartnerInfo;
  [key: string]: unknown;
}

export type IbTransferDestination = "main" | "mt5" | "bank";

export interface IbInternalTransferToMainRequest {
  amount: number;
  destination: "main";
  comment?: string;
}

export interface IbInternalTransferToMt5Request {
  amount: number;
  destination: "mt5";
  mt5_account_id: string;
  note?: string;
}

export interface IbInternalTransferToBankRequest {
  amount: number;
  destination: "bank";
  bank_detail_id: number;
  note?: string;
}

export type IbInternalTransferRequest =
  | IbInternalTransferToMainRequest
  | IbInternalTransferToMt5Request
  | IbInternalTransferToBankRequest;

export interface IbBankDetailSummary {
  id: number;
  account_holder_name: string;
  account_number: string;
  iban_number?: string;
  swift_ifsc_code?: string;
  bank_name?: string;
  address?: string;
  country?: string;
}

export interface IbMt5AccountSummary {
  id: number;
  account_id: string;
  mt5_login: number;
}

export interface IbInternalTransferData {
  id: number;
  user_id?: number;
  amount: number;
  destination: IbTransferDestination | string;
  bank_detail_id?: number | null;
  mt5_user_id?: number | null;
  note?: string | null;
  status?: string;
  initiated_by?: string;
  admin_notes?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
  bank_detail?: IbBankDetailSummary | null;
  mt5_account?: IbMt5AccountSummary | null;
  [key: string]: unknown;
}

export interface IbInternalTransfersListResponse {
  success: boolean;
  data: IbInternalTransferData[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: unknown;
  };
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

export interface IbWalletApiData {
  partner_wallet: number;
  client_wallet: number;
  total_earned: number;
  total_internal_transfers: number;
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

export interface IbPlanInfo {
  id: number;
  name: string;
  description: string;
  status: boolean;
}

export interface IbPlanCommission {
  id?: number;
  account_type_id?: number;
  account_type_name: string;
  level: string;
  rate_ib: number;
  rate_sub_ib_1: number;
  rate_sub_ib_2: number;
  rate_sub_ib_3: number;
  rate_sub_ib_4: number;
  rate_sub_ib_5: number;
}

export interface IbPlanResponseData {
  ib_plan: IbPlanInfo;
  commissions: IbPlanCommission[];
}

export interface IbDirectRate {
  account_type_id: number;
  account_type_name: string;
  direct_rate: number;
  parent_direct_rate: number;
  assigned_by: number;
  status: number;
  updated_at: string;
}

export interface IbDirectRatesResponse {
  success: boolean;
  user_id: number;
  rates: IbDirectRate[];
}

export interface IbInternalTransferWalletTransaction {
  id?: number;
  transaction_type: string;
  amount: number;
  direction: string;
  description: string;
  status: string;
  created_at: string;
  balance_before: number;
  balance_after: number;
}

export interface IbInternalTransferWalletTransactionsResponse {
  success: boolean;
  data: IbInternalTransferWalletTransaction[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

const parseContentDispositionFilename = (
  contentDisposition: string | null,
  fallback: string,
) => {
  if (!contentDisposition) return fallback;

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

export const ibRequestsApi = {
  overview: (token: string) =>
    apiCall<IbRequestStatusResponse>(`/user/ib-requests/status`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  getStatus: (token: string) => {
    return apiCall<IbRequestStatusResponse>(`/user/ib-requests/status`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  create: (data: CreateIbRequestBody, token: string) =>
    apiCall(`/user/ib-requests`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }),

  getDashboard: (token: string) =>
    apiCall<IbDashboardResponse>(`/user/ib-dashboard`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  internalTransfer: (data: IbInternalTransferRequest, token: string) =>
    apiCall<IbInternalTransferData>(`/user/ib-internal-transfer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }),

  getInternalTransfers: (
    token: string,
    params?: { page?: number; limit?: number },
  ) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    const queryString = queryParams.toString();
    const url = `/user/ib-internal-transfer${queryString ? `?${queryString}` : ""}`;

    return apiCall<IbInternalTransfersListResponse>(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getIbWallet: (token: string) =>
    apiCall<IbWalletApiData>(`/user/ib-wallet`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  getIbWalletTransactions: (
    token: string,
    params?: { page?: number; limit?: number },
  ) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    const queryString = queryParams.toString();
    const url = `/user/internal-transfer/ib-wallet-transactions${queryString ? `?${queryString}` : ""}`;

    return apiCall<IbInternalTransferWalletTransactionsResponse>(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getSubIbs: (
    token: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      from_date?: string | null;
      to_date?: string | null;
      sort_by?: string | null;
      sort_order?: string | null;
      level?: number | null;
    },
  ) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.search) queryParams.append("search", params.search);
    if (params?.from_date) queryParams.append("from_date", params.from_date);
    if (params?.to_date) queryParams.append("to_date", params.to_date);
    if (params?.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params?.sort_order) queryParams.append("sort_order", params.sort_order);
    if (params?.level) queryParams.append("level", String(params.level));
    const queryString = queryParams.toString();
    const url = `/user/ib-client-summary/sub-ibs${queryString ? `?${queryString}` : ""}`;

    return apiCall<IbSubIbsResponse>(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getClients: (
    token: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      from_date?: string | null;
      to_date?: string | null;
      sort_by?: string | null;
      sort_order?: string | null;
    },
  ) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.search) queryParams.append("search", params.search);
    if (params?.from_date) queryParams.append("from_date", params.from_date);
    if (params?.to_date) queryParams.append("to_date", params.to_date);
    if (params?.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params?.sort_order) queryParams.append("sort_order", params.sort_order);
    const queryString = queryParams.toString();
    const url = `/user/ib-client-summary/clients${queryString ? `?${queryString}` : ""}`;

    return apiCall<IbClientsResponse>(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  exportClients: async (
    token: string,
    params?: {
      search?: string;
      from_date?: string | null;
      to_date?: string | null;
    },
  ) => {
    if (!token) {
      throw new Error("Token is required to export clients");
    }

    if (!API_BASE_URL) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
    }

    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append("search", params.search);
    if (params?.from_date) queryParams.append("from_date", params.from_date);
    if (params?.to_date) queryParams.append("to_date", params.to_date);

    const queryString = queryParams.toString();
    const endpoint = `/user/ib-client-summary/clients/export${queryString ? `?${queryString}` : ""}`;
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
      filename: parseContentDispositionFilename(
        response.headers.get("content-disposition"),
        "ib_direct_clients.xlsx",
      ),
    };
  },

  exportSubIbs: async (
    token: string,
    params?: {
      search?: string;
      level?: number | null;
      from_date?: string | null;
      to_date?: string | null;
    },
  ) => {
    if (!token) {
      throw new Error("Token is required to export sub-IBs");
    }

    if (!API_BASE_URL) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
    }

    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append("search", params.search);
    if (params?.level) queryParams.append("level", String(params.level));
    if (params?.from_date) queryParams.append("from_date", params.from_date);
    if (params?.to_date) queryParams.append("to_date", params.to_date);

    const queryString = queryParams.toString();
    const endpoint = `/user/ib-client-summary/sub-ibs/export${queryString ? `?${queryString}` : ""}`;
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
      filename: parseContentDispositionFilename(
        response.headers.get("content-disposition"),
        "ib_sub_ibs.xlsx",
      ),
    };
  },

  getRebates: (
    token: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      from_date?: string | null;
      to_date?: string | null;
      sort_by?: string | null;
      sort_order?: string | null;
    },
  ) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.limit) queryParams.append("limit", String(params.limit));
    if (params?.search) queryParams.append("search", params.search);
    if (params?.from_date) queryParams.append("from_date", params.from_date);
    if (params?.to_date) queryParams.append("to_date", params.to_date);
    if (params?.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params?.sort_order) queryParams.append("sort_order", params.sort_order);
    const queryString = queryParams.toString();
    const url = `/user/ib-client-summary/rebates${queryString ? `?${queryString}` : ""}`;

    return apiCall<IbRebatesResponse>(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  getPlan: (token: string) =>
    apiCall<IbPlanResponseData>(`/user/ib-plan`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  getDirectRates: (token: string) =>
    apiCall<IbDirectRatesResponse>(`/user/ib/direct-rates`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export interface AdminIbRequest {
  id?: number | string;
  uuid?: string;
  status?: number;
  notes?: string | null;
  admin_comment?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  user_comment?: string | null;
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
  ib_plan_id?: number;
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
  list: ({
    token,
    status,
    search,
    page = 1,
    perPage = 20,
  }: AdminIbRequestListParams) => {
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

  updateStatus: (
    id: string | number,
    body: AdminIbRequestUpdateBody,
    token: string,
  ) => {
    if (!token) {
      throw new Error("Token is required to update IB request");
    }

    if (id === null || id === undefined || `${id}`.trim() === "") {
      throw new Error("IB request id is required");
    }

    return apiCall(`/admin/ib-requests/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  },
};

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
  sponsor_by?: string;
  ib_name?: string;
  ib_plan_name?: string;
  partner_id?: string;
  referral_link?: string;
  referral_code?: string;
  status?: number | string;
  is_ib_user?: boolean | number;
  referred_by?: {
    id?: number;
    name?: string;
    email?: string;
    ib_name?: string;
  };
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

export type AdminIbUserPlanUpdateBody = {
  ib_plan_id: number;
};

export interface AdminIbUserPlanUpdateResponse {
  success: boolean;
  message?: string;
  data?: {
    user_id: number;
    ib_plan_id: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  Admin IB Workspace (overview tab)                                  */
/* ------------------------------------------------------------------ */

export interface AdminIbWorkspaceUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  country: string;
  ib_name: string;
  status: number;
  created_at: string;
}

export interface AdminIbWorkspaceWallet {
  balance: number;
  currency: string;
}

export interface AdminIbWorkspacePendingRebates {
  amount: number;
  currency: string;
}

export interface AdminIbWorkspaceTotalEarned {
  amount: number;
  today: number;
  currency: string;
}

export interface AdminIbWorkspaceRebatesGraph {
  date: string;
  rebates: number;
}

export interface AdminIbWorkspaceEarningSummary {
  total_earned: number;
  total_internal_transfers: number;
  currency: string;
}

export interface AdminIbWorkspacePartnerInfo {
  ib_plan: string;
  ib_plan_id: number;
  partner_id: string;
  referral_link: string;
  ib_name: string;
}

export interface AdminIbWorkspaceData {
  user: AdminIbWorkspaceUser;
  ib_wallet: AdminIbWorkspaceWallet;
  main_wallet: AdminIbWorkspaceWallet;
  pending_rebates: AdminIbWorkspacePendingRebates;
  total_earned: AdminIbWorkspaceTotalEarned;
  rebates_graph: AdminIbWorkspaceRebatesGraph[];
  earning_summary: AdminIbWorkspaceEarningSummary;
  partner_info: AdminIbWorkspacePartnerInfo;
}

/* ------------------------------------------------------------------ */
/*  Admin IB Wallet (wallet tab)                                       */
/* ------------------------------------------------------------------ */

export interface AdminIbWalletTransaction {
  id: number;
  wallet_type: string;
  type: string;
  amount: number;
  net_amount: number;
  currency: string;
  status: string;
  description: string;
  date: string;
}

export interface AdminIbWalletData {
  partner_wallet: {
    balance: number;
    currency: string;
    wallet_address: string;
    label: string;
  };
  client_wallet: {
    balance: number;
    currency: string;
    wallet_address: string;
    label: string;
  };
  recent_transactions: AdminIbWalletTransaction[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Admin IB Network (network tab)                                     */
/* ------------------------------------------------------------------ */

export interface AdminIbNetworkBusinessBreakdown {
  level: number;
  level_label: string;
  source: string;
  lots: number;
  volume: number;
  commission_earned: number;
  clients: number;
  sub_ibs: number;
}

export interface AdminIbNetworkData {
  ib_user: {
    id: number;
    name: string;
    email: string;
    ib_name: string;
  };
  overview: {
    direct_clients: number;
    sub_ibs: number;
    total_downline: number;
    total_business: number;
    your_business: number;
    team_business: number;
    total_lots: number;
    currency: string;
  };
  business_breakdown: AdminIbNetworkBusinessBreakdown[];
}

/* ------------------------------------------------------------------ */
/*  Admin IB Clients (network tab — direct clients table)              */
/* ------------------------------------------------------------------ */

export interface AdminIbClient {
  id: number;
  name: string;
  email: string;
  mobile: string;
  lots: number;
  volume: number;
  earned: number;
  pending: number;
  registered: string;
}

export interface AdminIbClientsResponse {
  success: boolean;
  data: AdminIbClient[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Admin IB Sub-IBs (network tab — sub-IBs table)                    */
/* ------------------------------------------------------------------ */

export interface AdminIbSubIb {
  id: number;
  name: string;
  email: string;
  ib_name: string;
  level: number;
  level_label: string;
  lots: number;
  volume: number;
  earned: number;
  pending: number;
}

export interface AdminIbSubIbsResponse {
  success: boolean;
  data: AdminIbSubIb[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Admin IB Commissions (commission tab — per-trade commission list)  */
/* ------------------------------------------------------------------ */

export interface AdminIbCommissionTrade {
  id: number;
  mt5_id: string;
  date: string;
  order: number;
  symbol: string;
  price: number;
  profit: number;
  volume: number;
  my_commission: number;
  type: string;
}

export interface AdminIbCommissionsResponse {
  success: boolean;
  message?: string;
  data: AdminIbCommissionTrade[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
  };
  filters?: {
    from_date?: string | null;
    to_date?: string | null;
  };
}

export const adminIbUsersApi = {
  list: ({
    token,
    page = 1,
    per_page = 10,
    search,
  }: AdminIbUsersListParams) => {
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
  detail: (id: number | string, token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch IB user detail");
    }

    if (id === null || id === undefined || `${id}`.trim() === "") {
      throw new Error("IB user ID is required to fetch IB user detail");
    }

    return apiCall<AdminIbUserDetailResponse>(
      `/admin/ib-management/ib-users/${encodeURIComponent(String(id))}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
  },
  updatePlan: (
    userId: number | string,
    body: AdminIbUserPlanUpdateBody,
    token: string,
  ) => {
    if (!token) {
      throw new Error("Token is required to update IB user plan");
    }

    if (userId === null || userId === undefined || `${userId}`.trim() === "") {
      throw new Error("User ID is required to update IB user plan");
    }

    return apiCall<AdminIbUserPlanUpdateResponse>(
      `/admin/ib-management/ib-users/${userId}/plan`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
  },

  workspace: (id: number | string, token: string) => {
    if (!token) throw new Error("Token is required to fetch IB workspace");
    if (id === null || id === undefined || `${id}`.trim() === "")
      throw new Error("IB user ID is required");
    return apiCall<AdminIbWorkspaceData>(
      `/admin/ib-management/ib-users/${encodeURIComponent(String(id))}/workspace`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } },
    );
  },

  wallet: (id: number | string, token: string, page = 1, perPage = 10) => {
    if (!token) throw new Error("Token is required to fetch IB wallet");
    if (id === null || id === undefined || `${id}`.trim() === "")
      throw new Error("IB user ID is required");
    const qs = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    return apiCall<AdminIbWalletData>(
      `/admin/ib-management/ib-users/${encodeURIComponent(String(id))}/wallet?${qs.toString()}`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } },
    );
  },

  network: (id: number | string, token: string) => {
    if (!token) throw new Error("Token is required to fetch IB network");
    if (id === null || id === undefined || `${id}`.trim() === "")
      throw new Error("IB user ID is required");
    return apiCall<AdminIbNetworkData>(
      `/admin/ib-management/ib-users/${encodeURIComponent(String(id))}/network`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } },
    );
  },

  clients: (
    id: number | string,
    token: string,
    page = 1,
    perPage = 20,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    if (!token) throw new Error("Token is required to fetch IB clients");
    if (id === null || id === undefined || `${id}`.trim() === "")
      throw new Error("IB user ID is required");
    const qs = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    if (dateFrom) qs.append("date_from", dateFrom);
    if (dateTo) qs.append("date_to", dateTo);
    return apiCall<AdminIbClientsResponse>(
      `/admin/ib-management/ib-users/${encodeURIComponent(String(id))}/clients?${qs.toString()}`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } },
    );
  },

  subIbs: (
    id: number | string,
    token: string,
    page = 1,
    perPage = 20,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    if (!token) throw new Error("Token is required to fetch IB sub-IBs");
    if (id === null || id === undefined || `${id}`.trim() === "")
      throw new Error("IB user ID is required");
    const qs = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    if (dateFrom) qs.append("date_from", dateFrom);
    if (dateTo) qs.append("date_to", dateTo);
    return apiCall<AdminIbSubIbsResponse>(
      `/admin/ib-management/ib-users/${encodeURIComponent(String(id))}/sub-ibs?${qs.toString()}`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } },
    );
  },

  commissions: (
    id: number | string,
    token: string,
    page = 1,
    perPage = 10,
    search?: string,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    if (!token) throw new Error("Token is required to fetch IB commissions");
    if (id === null || id === undefined || `${id}`.trim() === "")
      throw new Error("IB user ID is required");
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(perPage),
    });
    if (search) qs.append("search", search);
    if (dateFrom) qs.append("from_date", dateFrom);
    if (dateTo) qs.append("to_date", dateTo);
    return apiCall<AdminIbCommissionsResponse>(
      `/admin/ib-management/ib-users/${encodeURIComponent(String(id))}/commissions?${qs.toString()}`,
      { method: "GET", headers: { Authorization: `Bearer ${token}` } },
    );
  },
};

export interface IbCommissionReportUser {
  user_id: number;
  name: string;
  email: string;
  sponsor_id: string;
  volume: number;
  commission: number;
  trade_count: number;
  trade_days: number;
}

export interface IbCommissionReportLevel {
  level: number;
  level_label: string;
  total_commission: number;
  user_count: number;
  trade_count: number;
  trade_days: number;
  volume: number;
  users: IbCommissionReportUser[];
}

export interface IbCommissionReportSummaryLevel {
  commission: number;
  user_count: number;
  trade_count: number;
  trade_days?: number;
  volume?: number;
}

export interface IbCommissionReportPayload {
  ib_user: {
    id: number;
    name: string;
    email: string;
    ib_name: string;
    sponsor_id: string;
    status: number | string;
  };
  filters: {
    date_from: string | null;
    date_to: string | null;
  };
  summary: {
    total_commission: number;
    total_downline_users: number;
    total_trade_count: number;
    level_1?: IbCommissionReportSummaryLevel;
    by_level?: Record<string, IbCommissionReportSummaryLevel>;
  };
  levels: IbCommissionReportLevel[];
}

export type AdminIbCommissionLevelReportParams = {
  token: string;
  user_id: number | string;
  date_from?: string | null;
  date_to?: string | null;
};

export const adminIbCommissionReportApi = {
  getCommissionLevelReport: ({
    token,
    user_id,
    date_from,
    date_to,
  }: AdminIbCommissionLevelReportParams) => {
    if (!token) {
      throw new Error("Token is required to fetch IB commission level report");
    }
    if (
      user_id === null ||
      user_id === undefined ||
      `${user_id}`.trim() === ""
    ) {
      throw new Error(
        "User ID is required to fetch IB commission level report",
      );
    }

    const qs = new URLSearchParams();
    if (date_from) qs.set("date_from", date_from);
    if (date_to) qs.set("date_to", date_to);

    const endpoint = `/admin/ib-management/commission-level-report/${encodeURIComponent(
      String(user_id),
    )}${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<IbCommissionReportPayload>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export interface UserCommission {
  id: number;
  account_type_id: number;
  account_type_name: string;
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

  updateUserCommissions: (
    userId: string | number,
    body: UserCommissionUpdateBody,
    token: string,
  ) => {
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

  patchUserCommission: (
    userId: string | number,
    commission: UserCommission,
    token: string,
  ) => {
    if (!token) {
      throw new Error("Token is required to update user commission");
    }

    if (userId === null || userId === undefined || `${userId}`.trim() === "") {
      throw new Error("User ID is required to update commission");
    }

    const endpoint = `/admin/ib-management/user-commissions/${userId}`;
    const commissionData = {
      id: commission.id,
      // mt5_user_id: commission.mt5_user_id,
      // mt5_account_id: commission.mt5_account_id,
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

export const adminMT5RequestApi = {
  getPending: (page: number = 1, perPage: number = 10, token: string) =>
    apiCall<AdminMT5RequestListResponse>(
      `/admin/mt5-requests/pending?page=${page}&per_page=${perPage}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),

  process: (data: AdminMT5RequestProcessRequest, token: string) =>
    apiCall(`/admin/mt5-request/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }),
};

/* ------------------------------------------------------------------ */
/*  Broker Crypto Wallets                                              */
/* ------------------------------------------------------------------ */

export interface BrokerCryptoWallet {
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

export interface BrokerCryptoWalletsListResponse {
  status: number;
  message: string;
  data: {
    count: number;
    rows: BrokerCryptoWallet[];
  };
}

export interface BrokerCryptoWalletResponse {
  status: number;
  message: string;
  data: BrokerCryptoWallet;
}

export interface BrokerCryptoWalletCreateBody {
  network: string;
  currency: string;
  wallet_address: string;
  wallet_screenshot: File;
  label?: string;
  is_active?: number;
}

export interface BrokerCryptoWalletUpdateBody {
  network: string;
  currency: string;
  wallet_address: string;
  wallet_screenshot?: File;
  label?: string;
  is_active?: number;
}

export const adminBrokerCryptoWalletsApi = {
  list: (token: string) =>
    apiCall<BrokerCryptoWalletsListResponse["data"]>(
      `/admin/broker-crypto-wallets`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),

  getById: (id: string | number, token: string) =>
    apiCall<BrokerCryptoWalletResponse["data"]>(
      `/admin/broker-crypto-wallets/${id}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),

  create: (data: BrokerCryptoWalletCreateBody, token: string) => {
    const formData = new FormData();
    formData.append("network", data.network);
    formData.append("currency", data.currency);
    formData.append("wallet_address", data.wallet_address);
    formData.append("wallet_screenshot", data.wallet_screenshot);
    if (data.label !== undefined) formData.append("label", data.label ?? "");
    if (data.is_active !== undefined)
      formData.append("is_active", String(data.is_active));

    return apiCall<BrokerCryptoWalletResponse>(`/admin/broker-crypto-wallets`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  },

  update: (
    id: string | number,
    data: BrokerCryptoWalletUpdateBody,
    token: string,
  ) => {
    const formData = new FormData();
    formData.append("network", data.network);
    formData.append("currency", data.currency);
    formData.append("wallet_address", data.wallet_address);
    if (data.wallet_screenshot)
      formData.append("wallet_screenshot", data.wallet_screenshot);
    if (data.label !== undefined) formData.append("label", data.label ?? "");
    if (data.is_active !== undefined)
      formData.append("is_active", String(data.is_active));

    return apiCall<BrokerCryptoWalletResponse>(
      `/admin/broker-crypto-wallets/${id}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
    );
  },

  delete: (id: string | number, token: string) =>
    apiCall<{ success: boolean; message: string }>(
      `/admin/broker-crypto-wallets/${id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};

export interface MT5Account {
  id: number;
  name: string;
  email: string;
  mt5_id: string;
  account_id: string;
  account_type_name: string;
  balance: number;
  balance_in_cent?: number;
  wallet_currency?: string;
  account_mode: "demo" | "live";
}

export interface MT5AccountsResponse {
  success: boolean;
  message?: string;
  data: {
    mt5_accounts: MT5Account[];
  };
}

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
  self_wallet?: number;
  currency?: string;
  server?: string | null;
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
  balance_in_cent?: number;
  created_at?: string;
  mt5_wallet_id?: number | string;
  updated_at?: string;
  user?: AdminMT5AccountUser;
  User?: AdminMT5AccountUser;
  group?: AdminMT5AccountGroup;
  manager?: AdminMT5AccountManager | null;
  Manager?: AdminMT5AccountManager | null;
  accountType?: AdminMT5AccountType;
  AdminMT5AccountType?: AdminMT5AccountType;
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
  sort_by?: string;
  sort_order?: string;
  date_from?: string;
  date_to?: string;
}

export interface UpdateMT5AccountRequest {
  account_type_id: number;
  mode: "demo" | "live";
  leverage: number;
  name: string;
  password?: string;
  investor_password?: string;
}

export interface CreateMT5AccountRequest {
  user_id: number;
  account_type_id: number;
  leverage: number;
  mode: "demo" | "live";
  main_password: string;
  confirm_password: string;
  investor_password: string;
  extra_fields: Record<string, unknown>;
  balance?: number;
}

export interface AdminMT5AccountsListResponse {
  data?:
    | AdminMT5Account[]
    | {
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

export type MT5AccountBalance = {
  success: boolean;
  account_id: string;
  mt5_login: number;
  name: string;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  profit: number;
  currency: string | null;
};

export const mt5AccountsApi = {
  getAll: (token: string) =>
    apiCall<{ mt5_accounts: MT5Account[] }>(`/user/mt5-account`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
  getBalance: (mt5Login: number | string, token: string) =>
    apiCall<MT5AccountBalance>(`/user/mt5-account/${mt5Login}/balance`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
  // Admin endpoint for fetching MT5 balance
  getAdminBalance: (mt5Login: number | string, token: string) =>
    apiCall<MT5AccountBalance>(`/admin/mt5-accounts/${mt5Login}/balance`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

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
    sort_by,
    sort_order,
    date_from,
    date_to,
  }: AdminMT5AccountsListParams) => {
    if (!token) {
      throw new Error("Token is required to fetch MT5 accounts");
    }

    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));

    if (search && search.trim()) qs.set("search", search.trim());
    if (status !== undefined && status !== null && `${status}` !== "")
      qs.set("status", String(status));
    if (
      account_mode !== undefined &&
      account_mode !== null &&
      `${account_mode}` !== ""
    ) {
      qs.set("account_mode", String(account_mode));
    }
    if (user_id !== undefined && user_id !== null && `${user_id}` !== "")
      qs.set("user_id", String(user_id));
    if (group_id !== undefined && group_id !== null && `${group_id}` !== "")
      qs.set("group_id", String(group_id));
    if (
      manager_id !== undefined &&
      manager_id !== null &&
      `${manager_id}` !== ""
    ) {
      qs.set("manager_id", String(manager_id));
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
      data?:
        | AdminMT5Account
        | { mt5_account?: AdminMT5Account; account?: AdminMT5Account };
      account?: AdminMT5Account;
      mt5_account?: AdminMT5Account;
    }>(`/admin/mt5-accounts/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  update: (
    id: string | number,
    data: UpdateMT5AccountRequest,
    token: string,
  ) => {
    if (!token) {
      throw new Error("Token is required to update MT5 account");
    }

    return apiCall<{ data?: AdminMT5Account; account?: AdminMT5Account }>(
      `/admin/mt5-accounts/${id}`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      },
    );
  },

  setStatus: (id: string | number, enabled: boolean, token: string) => {
    if (!token) {
      throw new Error("Token is required to update MT5 account status");
    }
    if (id === undefined || id === null || `${id}`.trim() === "") {
      throw new Error("MT5 account identifier is required to update status");
    }

    return apiCall<{ success: boolean; message: string }>(
      `/admin/mt5-accounts/${id}/status`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      },
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
      },
    );
  },

  create: (data: CreateMT5AccountRequest, token: string) => {
    if (!token) {
      throw new Error("Token is required to create MT5 account");
    }

    const body: Record<string, unknown> = {
      user_id: data.user_id,
      account_type_id: data.account_type_id,
      leverage: data.leverage,
      mode: data.mode,
      extra_fields: data.extra_fields,
      main_password: data.main_password,
      confirm_password: data.confirm_password,
      investor_password: data.investor_password,
    };
    if (data.mode === "demo" && data.balance !== undefined) {
      body.balance = data.balance;
    }

    return apiCall<{
      success?: boolean;
      message?: string;
      data?: AdminMT5Account;
      account?: AdminMT5Account;
    }>(`/admin/mt5-accounts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  },

  resendCredentialsEmail: (mt5Id: string | number, token: string) => {
    if (!token) {
      throw new Error("Token is required to resend MT5 credentials email");
    }
    if (!mt5Id) {
      throw new Error("MT5 ID is required to resend MT5 credentials email");
    }

    return apiCall<{ success: boolean; message: string }>(
      `/admin/mt5-accounts/${mt5Id}/resend-credentials-email`,
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
};

export interface IBExistingClient {
  id: number;
  account_id: string;
  mt5_id: number;
  client_id: number;
  group_id: number;
  status: boolean;
  account_mode: "live" | "demo";
  source: string;
  leverage: number;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  client_email: string;
  group_name: string;
  mt5_group_name: string;
  client_name: string;
}

export interface IBExistingClientsListParams {
  token: string;
  page?: number;
  limit?: number;
  search?: string;
  all_sources?: boolean;
  date_from?: string;
  date_to?: string;
  group_id?: number | string;
}

export interface IBExistingClientsListResponse {
  existingClients: IBExistingClient[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_existing_clients: number;
    per_page: number;
  };
}

export interface CreateIBExistingClientRequest {
  client_id: number;
  group_id: number;
  leverage: number;
  mt5_id: string | number;
}

export interface CreateIBExistingClientResponse {
  success: boolean;
  message: string;
  data?: IBExistingClient;
}

export const adminIBExistingClientsApi = {
  list: ({
    token,
    page = 1,
    limit = 10,
    search,
    all_sources = false,
    date_from,
    date_to,
    group_id,
  }: IBExistingClientsListParams) => {
    if (!token) {
      throw new Error("Token is required to fetch IB existing clients");
    }

    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));

    if (search && search.trim()) qs.set("search", search.trim());
    if (all_sources) qs.set("all_sources", "true");
    if (date_from) qs.set("date_from", date_from);
    if (date_to) qs.set("date_to", date_to);
    if (group_id !== undefined && group_id !== "" && group_id !== null) {
      qs.set("group_id", String(group_id));
    }

    const endpoint = `/admin/ib-existing-clients${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<IBExistingClientsListResponse>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  create: (data: CreateIBExistingClientRequest, token: string) => {
    if (!token) {
      throw new Error("Token is required to create IB existing client");
    }

    return apiCall<CreateIBExistingClientResponse>(`/admin/ib-existing-clients`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  },
};
