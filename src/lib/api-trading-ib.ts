import { API_BASE_URL, ApiResponse, PaginationMeta, apiCall } from "./api-core";

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

export const accountTypesApi = {
  getActive: (token: string) =>
    apiCall<AccountType[]>(`/admin/account-types/active`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export interface UserMT5AccountCreateRequest {
  account_type_id: number;
  account_mode: "demo" | "live";
  balance?: number;
  extra_fields: Record<string, unknown>;
  group_id: number;
  investor_password: string;
  leverage: number;
  main_password: string;
}

export interface UserMT5AccountCreateData {
  login: number | string;
  name: string;
  server: string;
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
  balance: number;
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
    apiCall<UserMT5AccountDetailResponseData>(`/user/mt5-account/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }),

  demoDeposit: (data: UserMT5DemoDepositRequest, token: string) =>
    apiCall<UserMT5DemoDepositData>(`/user/mt5/demo-deposit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  resetMainPassword: (
    id: string | number,
    data: UserMT5PasswordResetRequest,
    token: string,
    length: number = data.new_password.length
  ) =>
    apiCall<UserMT5MainPasswordResetData>(`/user/mt5-account/${id}/reset-main-password?${buildMt5PasswordResetQuery(length)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  resetInvestorPassword: (
    id: string | number,
    data: UserMT5PasswordResetRequest,
    token: string,
    length: number = data.new_password.length
  ) =>
    apiCall<UserMT5InvestorPasswordResetData>(
      `/user/mt5-account/${id}/reset-investor-password?${buildMt5PasswordResetQuery(length)}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
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
    token: string
  ) => {
    if (params.login === undefined || params.login === null || `${params.login}`.trim() === "") {
      throw new Error("MT5 login is required to fetch trades history");
    }

    const qs = new URLSearchParams();
    qs.set("login", String(params.login));
    if (params.from_dt) qs.set("from_dt", params.from_dt);
    if (params.to_dt) qs.set("to_dt", params.to_dt);
    if (params.page) qs.set("page", String(params.page));
    if (params.per_page) qs.set("per_page", String(params.per_page));
    if (params.debug !== undefined) qs.set("debug", String(params.debug));

    return apiCall<UserMT5TradesHistoryData>(`/user/mt5-account/trades-history?${qs.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
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

export interface IbWalletApiData {
  partner_wallet?: number | string | IbWalletBalance;
  wallet_balance?: number | string | IbWalletBalance;
  client_wallet?: number | string | IbWalletBalance;
  earning_summary?: Partial<IbWalletEarningSummary> | Record<string, unknown>;
  transactions?: unknown;
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
    apiCall<IbWalletApiData>(`/user/ib-wallet`, {
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

  getPlan: (token: string) =>
    apiCall<IbPlanResponseData>(`/user/ib-plan`, {
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
  ib_plan_name?: string;
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
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
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
    if (user_id === null || user_id === undefined || `${user_id}`.trim() === "") {
      throw new Error("User ID is required to fetch IB commission level report");
    }

    const qs = new URLSearchParams();
    if (date_from) qs.set("date_from", date_from);
    if (date_to) qs.set("date_to", date_to);

    const endpoint = `/admin/ib-management/commission-level-report/${encodeURIComponent(
      String(user_id)
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
      }
    ),

  process: (data: AdminMT5RequestProcessRequest, token: string) =>
    apiCall(`/admin/mt5-request/process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

export interface MT5Account {
  id: number;
  name: string;
  email: string;
  mt5_id: string;
  account_id: string;
  balance: number;
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
  self_wallet?: string | number;
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
  user_id: number;
  account_type_id: number;
  group_id: number;
  leverage: number;
  account_mode: "demo" | "live";
  main_password: string;
  investor_password: string;
  balance: number;
  extra_fields: Record<string, unknown>;
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

export const mt5AccountsApi = {
  getAll: (token: string) =>
    apiCall<{ mt5_accounts: MT5Account[] }>(`/user/mt5-account`, {
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
  }: AdminMT5AccountsListParams) => {
    if (!token) {
      throw new Error("Token is required to fetch MT5 accounts");
    }

    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));

    if (search && search.trim()) qs.set("search", search.trim());
    if (status !== undefined && status !== null && `${status}` !== "") qs.set("status", String(status));
    if (account_mode !== undefined && account_mode !== null && `${account_mode}` !== "") {
      qs.set("account_mode", String(account_mode));
    }
    if (user_id !== undefined && user_id !== null && `${user_id}` !== "") qs.set("user_id", String(user_id));
    if (group_id !== undefined && group_id !== null && `${group_id}` !== "") qs.set("group_id", String(group_id));
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
    }>(`/admin/mt5-accounts/${id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  update: (id: string | number, data: UpdateMT5AccountRequest, token: string) => {
    if (!token) {
      throw new Error("Token is required to update MT5 account");
    }

    return apiCall<{ data?: AdminMT5Account; account?: AdminMT5Account }>(`/admin/mt5-accounts/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },

  delete: (id: string | number, token: string) => {
    if (!token) {
      throw new Error("Token is required to delete MT5 account");
    }

    return apiCall<{ success: boolean; message: string }>(`/admin/mt5-accounts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  create: (data: CreateMT5AccountRequest, token: string) => {
    if (!token) {
      throw new Error("Token is required to create MT5 account");
    }

    return apiCall<{ success?: boolean; message?: string; data?: AdminMT5Account; account?: AdminMT5Account }>(`/admin/mt5-accounts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
  },
};
