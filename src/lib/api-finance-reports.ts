import { API_BASE_URL, ApiRequestError, PaginationMeta, apiCall, handle401Redirect } from "./api-core";

export interface Mt5ToMt5TransferRequest {
  from_mt5_account_id: string;
  to_mt5_account_id: string;
  amount: number;
  comment?: string;
  from_mt5_user_id?: string;
  to_mt5_user_id?: string;
}

export interface WalletToWalletTransferRequest {
  from_wallet_type: string;
  to_wallet_type: string;
  amount: number;
  remarks?: string;
}

export interface WalletToMt5TransferRequest {
  account_ref: string;
  amount: number;
  comment?: string;
}

export interface Mt5ToWalletTransferRequest {
  from_mt5_account_id: string;
  to_wallet_type: string;
  amount: number;
  remarks?: string;
}

export interface WalletSummaryWallet {
  id: number;
  address: string;
  balance: number;
  currency: string;
  status: string;
  is_primary: boolean;
}

export interface WalletSummaryMt5Wallet extends WalletSummaryWallet {
  mt5_user_id: number;
  wallet_type: string;
  mt5_id: string | number;
}

export interface WalletSummaryTransaction {
  id: number;
  wallet_id?: number;
  wallet_type: string;
  mt5_user_id?: number | null;
  type: string;
  amount: string | number;
  description: string;
  created_at: string;
}

export interface WalletSummaryData {
  total_balance: number;
  wallets: {
    [key: string]: WalletSummaryWallet;
  };
  mt5_wallets?: WalletSummaryMt5Wallet[];
  recent_transactions: WalletSummaryTransaction[];
}

export interface WalletSummaryResponse {
  success: boolean;
  message: string;
  data: WalletSummaryData;
}

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
  deposited_by: string | null;
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
      status?: string;
      start_date?: string;
      end_date?: string;
      period?: string;
    }
  ) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.per_page) queryParams.append("per_page", String(params.per_page));
    if (params?.transaction_type) queryParams.append("transaction_type", params.transaction_type);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    if (params?.period) queryParams.append("period", params.period);

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

export interface WithdrawalRequest {
  amount: string;
  wallet_address?: string;
  chain_id?: string;
  payment_method_id?: number;
  bank_detail_id?: number;
}

export interface WithdrawalItem {
  id: number;
  user_id: number;
  amount: number;
  status: "pending" | "approved" | "rejected" | "processing" | "completed";
  wallet_address?: string | null;
  chain_id?: string | null;
  payment_method_id?: number | null;
  bank_detail_id?: number | null;
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
      let withdrawals: WithdrawalItem[] = [];
      let pagination:
        | {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
          }
        | undefined;

      if (response.success && response.data) {
        const data = response.data as Record<string, unknown>;

        if (Array.isArray(data.withdrawals)) {
          withdrawals = data.withdrawals as WithdrawalItem[];
          pagination = data.pagination as typeof pagination;
        } else if (Array.isArray(response.data)) {
          withdrawals = response.data as WithdrawalItem[];
        } else if (data.withdrawals) {
          withdrawals = Array.isArray(data.withdrawals) ? (data.withdrawals as WithdrawalItem[]) : [];
          pagination = data.pagination as typeof pagination;
        }
      } else if (!response.success) {
        console.error("API returned unsuccessful response:", response);
        throw new Error(response.message || "Failed to fetch withdrawals");
      }

      return {
        success: response.success || true,
        data: {
          withdrawals,
          pagination,
        },
      } as WithdrawalsResponse;
    });
  },
};

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

export interface AdminNotificationItem {
  id: number;
  uuid: string;
  message: string;
  status: number;
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
  priority_label?: string | number | null;
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
  message: string;
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
    } = {}
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
  status: number;
  status_text: string;
  date: string;
  reference?: string | null;
  approved_by?: string | null;
  created_at: string;
  marketing_name?: string | null;
  approved_rejected_by?: string | null;
  transaction_hash?: string | null;
  merchant_trade_no?: string | null;
  coinsbuy_deposit_id?: string | null;
}

export interface DepositReportListParams {
  token: string;
  status?: number | string;
  payment_method_id?: number | string | "all";
  from_date?: string;
  to_date?: string;
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
  withdraw_to?: string | null;
  transaction_hash?: string | null;
  status: number | string;
  status_text?: string;
  date?: string;
  created_at: string;
  comment?: string | null;
  updated_at?: string;
  remarks?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface WithdrawalReportListParams {
  token: string;
  status?: number | string | "pending" | "approved" | "rejected";
  payment_method_id?: number | string | "all";
  from_date?: string;
  to_date?: string;
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

export interface IbWithdrawalReportItem {
  id: number | string;
  name?: string;
  email?: string;
  name_email?: string;
  ib_name?: string;
  partner_id?: string;
  amount: number | string;
  payment_method?: string;
  withdraw_to?: string;
  payment_method_id?: number | string;
  wallet_address?: string | null;
  chain_id?: string | null;
  transaction_hash?: string | null;
  status: number | string;
  status_text?: string;
  date?: string;
  created_at: string;
  comment?: string | null;
  updated_at?: string;
  remarks?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
}

export interface IbWithdrawalReportListParams {
  token: string;
  from_date?: string;
  to_date?: string;
  search?: string;
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
    if (queryParams.search) qs.set("search", queryParams.search);

    const endpoint = `/admin/reports/ib-withdrawal-report${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<IbWithdrawalReportListPayload>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export interface InternalTransferReportItem {
  id: number | string;
  name?: string | null;
  email?: string | null;
  name_email?: string | null;
  from_account?: string | null;
  to_account?: string | null;
  amount: number | string;
  date?: string | null;
  created_at: string;
  marketing_name?: string | null;
  comment?: string | null;
  type?: number | null;
  status?: number | string | null;
}

export interface InternalTransferReportListParams {
  token: string;
  search?: string;
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

export interface IbLevelTrader {
  trader_user_id: number;
  trader_name: string;
  trader_email: string;
  total_volume: number;
  commission_amount: number;
  pending_commission: number;
}

export interface IbCommissionLevel {
  level: number;
  commission_rate: number;
  total_volume: number;
  commission_amount: number;
  pending_commission: number;
  traders: IbLevelTrader[];
}

export interface IbCommissionGroup {
  ib_user_id: number;
  ib_user_name: string;
  ib_user_email: string;
  total_volume: number;
  total_commission: number;
  total_pending: number;
  levels: IbCommissionLevel[];
}

export interface IbCommissionReportListParams {
  token: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface IbCommissionReportListPayload {
  success: boolean;
  message: string;
  data: IbCommissionGroup[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
  filters?: Record<string, string | null | undefined>;
}

export interface IbCommissionReportExportParams {
  token: string;
  format?: "xlsx" | "csv";
}

export const adminIbCommissionListReportApi = {
  list: (params: IbCommissionReportListParams) => {
    const { token, ...queryParams } = params;
    if (!token) {
      throw new Error("Token is required to fetch IB commission report");
    }

    const qs = new URLSearchParams();
    if (queryParams.page) qs.set("page", String(queryParams.page));
    if (queryParams.per_page) qs.set("per_page", String(queryParams.per_page));
    if (queryParams.search) qs.set("search", queryParams.search);

    const endpoint = `/admin/reports/commission-report${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<IbCommissionReportListPayload>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  export: async ({ token, format = "xlsx" }: IbCommissionReportExportParams) => {
    if (!token) {
      throw new Error("Token is required to export IB commission report");
    }

    if (!API_BASE_URL) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
    }

    const qs = new URLSearchParams();
    qs.set("format", format);

    const endpoint = `/admin/reports/commission-report/export${qs.toString() ? `?${qs.toString()}` : ""}`;
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
            : null) ||
          `HTTP ${response.status}`,
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
        `ib-commission-report.${format === "csv" ? "csv" : "xlsx"}`
      ),
    };
  },
};

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
  state?: string;
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

export interface TransactionReportItem {
  id: number | string;
  transaction_type?: string | null;
  transaction_type_label?: string | null;
  name?: string | null;
  email?: string | null;
  // name_email?: string | null;
  name_email?: string | null;
  amount: number | string;
  payment_method?: string | null;
  reference?: string | null;
  status?: string | null;
  comment?: string | null;
  status_text?: string | null;
  approved_by?: string | null;
  date?: string | null;
  created_at: string;
}

export interface TransactionReportListParams {
  token: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface TransactionReportListPayload {
  success: boolean;
  message: string;
  data: TransactionReportItem[];
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

export interface TransactionReportExportParams {
  token: string;
  format?: "xlsx" | "csv";
  search?: string;
}

export const adminTransactionReportApi = {
  list: (params: TransactionReportListParams) => {
    const { token, ...queryParams } = params;
    if (!token) {
      throw new Error("Token is required to fetch transaction report");
    }

    const qs = new URLSearchParams();
    if (queryParams.page) qs.set("page", String(queryParams.page));
    if (queryParams.per_page) qs.set("per_page", String(queryParams.per_page));
    if (queryParams.search && queryParams.search.trim()) {
      qs.set("search", queryParams.search.trim());
    }

    const endpoint = `/admin/reports/transaction-report${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<TransactionReportListPayload>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  export: async ({ token, format = "xlsx", search }: TransactionReportExportParams) => {
    if (!token) {
      throw new Error("Token is required to export transaction report");
    }

    if (!API_BASE_URL) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
    }

    const qs = new URLSearchParams();
    qs.set("format", format);
    if (search && search.trim()) {
      qs.set("search", search.trim());
    }

    const endpoint = `/admin/reports/transaction-report/export${qs.toString() ? `?${qs.toString()}` : ""}`;
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
            : null) ||
          `HTTP ${response.status}`,
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
        `transaction-report.${format === "csv" ? "csv" : "xlsx"}`
      ),
    };
  },
};

export interface LoginActivityReportListParams {
  token: string;
  search?: string;
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

export interface TradingHistoryReportItem {
  id: number | string;
  login: number | string;
  name?: string | null;
  email?: string | null;
  account_id?: string | null;
  record_type?: string | null;
  ticket?: number | string | null;
  symbol?: string | null;
  volume?: number | string | null;
  price?: number | string | null;
  profit?: number | string | null;
  trade_time_ist?: string | null;
  created_at?: string | null;
}

export interface TradingHistoryReportListParams {
  token: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface TradingHistoryReportListPayload {
  success: boolean;
  message: string;
  data: TradingHistoryReportItem[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
  filters?: Record<string, string | null | undefined>;
}

export interface TradingHistoryReportExportParams {
  token: string;
  format?: "xlsx" | "csv";
}

const parseContentDispositionFilename = (contentDisposition: string | null, fallback: string) => {
  if (!contentDisposition) {
    return fallback;
  }

  const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const filenameMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i);
  const filename = filenameMatch?.[1] ?? filenameMatch?.[2];

  if (!filename) {
    return fallback;
  }

  return filename.trim();
};

export const adminTradingHistoryReportApi = {
  list: (params: TradingHistoryReportListParams) => {
    const { token, ...queryParams } = params;
    if (!token) {
      throw new Error("Token is required to fetch trading history report");
    }

    const qs = new URLSearchParams();
    if (queryParams.page) qs.set("page", String(queryParams.page));
    if (queryParams.per_page) qs.set("per_page", String(queryParams.per_page));
    if (queryParams.search) qs.set("search", queryParams.search);

    const endpoint = `/admin/reports/trading-history-report${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<TradingHistoryReportListPayload>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  export: async ({ token, format = "xlsx" }: TradingHistoryReportExportParams) => {
    if (!token) {
      throw new Error("Token is required to export trading history report");
    }

    if (!API_BASE_URL) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
    }

    const qs = new URLSearchParams();
    qs.set("format", format);

    const endpoint = `/admin/reports/trading-history-report/export${qs.toString() ? `?${qs.toString()}` : ""}`;
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
            : null) ||
          `HTTP ${response.status}`,
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
        `trading-history-report.${format === "csv" ? "csv" : "xlsx"}`
      ),
    };
  },
};

export interface AllUsersReportExportParams {
  token: string;
  format?: "xlsx" | "csv";
  search?: string;
  status?: string;
}

export const adminAllUsersReportApi = {
  export: async ({
    token,
    format = "xlsx",
    search,
    status,
  }: AllUsersReportExportParams) => {
    if (!token) {
      throw new Error("Token is required to export all users report");
    }

    if (!API_BASE_URL) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
    }

    const qs = new URLSearchParams();
    qs.set("format", format);
    if (search && search.trim()) qs.set("search", search.trim());
    if (status !== undefined && status !== null && `${status}` !== "" && status !== "all") {
      qs.set("status", String(status));
    }

    const endpoint = `/admin/reports/all-users-report/export${qs.toString() ? `?${qs.toString()}` : ""}`;
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
            : null) ||
          `HTTP ${response.status}`,
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
        `all-users-report.${format === "csv" ? "csv" : "xlsx"}`
      ),
    };
  },
};

export interface Mt5UsersReportExportParams {
  token: string;
  format?: "xlsx" | "csv";
  search?: string;
  status?: string;
  account_mode?: string;
  user_id?: string;
  group_id?: string;
  manager_id?: string;
}

export const adminMt5UsersReportApi = {
  export: async ({
    token,
    format = "xlsx",
    search,
    status,
    account_mode,
    user_id,
    group_id,
    manager_id,
  }: Mt5UsersReportExportParams) => {
    if (!token) {
      throw new Error("Token is required to export MT5 users report");
    }

    if (!API_BASE_URL) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
    }

    const qs = new URLSearchParams();
    qs.set("format", format);
    if (search && search.trim()) qs.set("search", search.trim());
    if (status !== undefined && status !== null && `${status}` !== "" && status !== "all") {
      qs.set("status", String(status));
    }
    if (account_mode !== undefined && account_mode !== null && `${account_mode}` !== "" && account_mode !== "all") {
      qs.set("account_mode", String(account_mode));
    }
    if (user_id !== undefined && user_id !== null && `${user_id}` !== "") qs.set("user_id", String(user_id));
    if (group_id !== undefined && group_id !== null && `${group_id}` !== "") qs.set("group_id", String(group_id));
    if (manager_id !== undefined && manager_id !== null && `${manager_id}` !== "") {
      qs.set("manager_id", String(manager_id));
    }

    const endpoint = `/admin/reports/mt5-users-report/export${qs.toString() ? `?${qs.toString()}` : ""}`;
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
            : null) ||
          `HTTP ${response.status}`,
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
        `mt5-users-report.${format === "csv" ? "csv" : "xlsx"}`
      ),
    };
  },
};

export interface AdminDashboardKpis {
  total_clients: number;
  total_ib: number;
  pending_kyc_clients: number;
  approved_deposit: number;
  pending_deposit: number;
  pending_withdraw: number;
  pending_ib_withdraw: number;
  active_traders: number;
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

export interface AdminDashboardClientsGraphData {
  date: string;
  clients: number;
}

export interface AdminDashboardClientsGraph {
  start_date: string;
  end_date: string;
  data: AdminDashboardClientsGraphData[];
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
  clients_graph: AdminDashboardClientsGraph;
  summary_metrics: AdminDashboardSummaryMetrics;
}

export interface AdminDashboardResponse {
  success: boolean;
  message: string;
  data: AdminDashboardData;
}

export interface AdminDashboardParams {
  token: string;
  start_date?: string;
  end_date?: string;
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

export interface ManagerInfo {
  id: number;
  name: string;
  email: string;
  status: number;
  total_client: number;
}

export interface ManagerClientsStats {
  total: number;
  new_today: number;
  new_this_week: number;
  new_this_month: number;
  pending_approval: number;
  ftd_count: number;
  non_ftd_count: number;
  active_last_30_days: number;
}

export interface ManagerDepositsStats {
  pending_count: number;
  pending_amount: number;
  approved_today_count: number;
  approved_today_amount: number;
  approved_this_month_count: number;
  approved_this_month_amount: number;
  approved_all_time_count: number;
  approved_all_time_amount: number;
}

export interface ManagerWithdrawalsStats {
  pending_count: number;
  pending_amount: number;
  approved_today_count: number;
  approved_today_amount: number;
  approved_this_month_count: number;
  approved_this_month_amount: number;
  approved_all_time_count: number;
  approved_all_time_amount: number;
  rejected_this_month_count: number;
}

export interface ManagerTransactionStats {
  deposits?: ManagerDepositsStats;
  withdrawals?: ManagerWithdrawalsStats;
}

export interface ManagerStats {
  clients?: ManagerClientsStats;
  transactions?: ManagerTransactionStats;
}

export interface ManagerDashboardData {
  manager?: ManagerInfo;
  permissions?: string[];
  stats?: ManagerStats;
}

export const managerDashboardApi = {
  getDashboard: (params: AdminDashboardParams) => {
    const { token, start_date, end_date } = params;
    if (!token) {
      throw new Error("Token is required to fetch manager dashboard");
    }

    const qs = new URLSearchParams();
    if (start_date) qs.set("start_date", start_date);
    if (end_date) qs.set("end_date", end_date);

    const endpoint = `/manager/dashboard${qs.toString() ? `?${qs.toString()}` : ""}`;

    return apiCall<ManagerDashboardData>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};
