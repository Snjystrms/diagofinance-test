import { API_BASE_URL, ApiRequestError, ApiResponse, PaginationMeta, apiCall, handle401Redirect } from "./api-core";

export type TransactionType = "deposit" | "withdrawal" | "credit" | "debit" | "transfer_in" | "transfer_out" | "bonus" | "referral" | "bonus_removal";
export type ReferenceType = "admin_deposit" | "admin_withdrawal" | "usdt_deposit";
export type TransactionStatus = "pending" | "completed" | "failed" | "cancelled" | "approved" | "rejected";

export type InternalTransferType = "mt5_to_mt5" | "main_to_mt5" | "ib_to_main" | "mt5_to_main" | "direct_to_mt5";

export interface AdminTransactionUser {
  id: number;
  username: string;
  email: string;
  name: string;
  mobile: string;
}

export interface AdminTransactionItem {
  id: number;
  user_id: number;
  wallet_id: number;
  transaction_type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  currency: string;
  reference_id: string | null;
  reference_type: ReferenceType;
  description: string;
  status: TransactionStatus;
  processed_by: string;
  processed_at: string;
  transaction_hash: string | null;
  transaction_proof: string | null;
  fee: number;
  net_amount: number;
  created_at: string;
  updated_at: string;
  user: AdminTransactionUser;
  transaction_category: string;
  transaction_label: string;
  original_model: string;
  admin_notes: string | null;
  wallet_currency: string;
}

export interface AdminTransactionPagination {
  current_page: number;
  total_pages: number;
  total_records: number;
  limit: number;
  offset: number;
}

export interface AdminTransactionStatistics {
  total_wallet_transactions: number;
  total_usdt_deposits: number;
  total_withdrawals: number;
  total_all_transactions: number;
  status_counts: Record<string, number>;
}

export interface AdminTransactionsFiltersApplied {
  transaction_type: string | null;
  status: string | null;
  user_id: number | null;
  date_from: string | null;
  date_to: string | null;
  amount_min: number | null;
  amount_max: number | null;
  search: string | null;
  sort_by: string;
  sort_order: string;
}

export interface AdminTransactionsAllData {
  transactions: AdminTransactionItem[];
  pagination: AdminTransactionPagination;
  statistics: AdminTransactionStatistics;
  filters_applied: AdminTransactionsFiltersApplied;
}

export interface AdminTransactionsAllParams {
  token: string;
  page?: number;
  limit?: number;
  transaction_type?: TransactionType | null;
  reference_type?: ReferenceType | null;
  status?: TransactionStatus | null;
  user_id?: number | null;
  date_from?: string | null;
  date_to?: string | null;
  amount_min?: number | null;
  amount_max?: number | null;
  search?: string | null;
  sort_by?: string | null;
  sort_order?: string | null;
}

export interface AdminTransactionStatusCount {
  status: string;
  count: number;
}

export interface AdminTransactionStatsData {
  total_counts: {
    wallet_transactions: number;
    usdt_deposits: number;
    withdrawals: number;
    total: number;
  };
  status_counts: {
    wallet: AdminTransactionStatusCount[];
    usdt_deposits: AdminTransactionStatusCount[];
    withdrawals: AdminTransactionStatusCount[];
  };
  total_amounts: {
    wallet_transactions: number;
    usdt_deposits: number;
    withdrawals: number;
    total: number;
  };
  date_range: {
    from: string | null;
    to: string | null;
  };
}

export interface AdminClientDepositBody {
  client_id: number;
  amount: number;
  comment?: string | null;
  transaction_id?: string | null;
  transaction_proof?: string | null;
}

export interface AdminClientDepositData {
  client_id: number;
  amount: number;
  wallet_balance_before: number;
  wallet_balance_after: number;
  comment: string | null;
  transaction_id: string | null;
  transaction_proof: string | null;
}

export interface AdminClientWithdrawalBody {
  client_id: number;
  amount: number;
  comment?: string | null;
}

export interface AdminClientWithdrawalData {
  client_id: number;
  amount: number;
  wallet_balance_before: number;
  wallet_balance_after: number;
  comment: string | null;
}

export interface AdminInternalTransferBody {
  amount: number;
  from_account?: string;
  to_account: string;
  type: InternalTransferType;
  comment?: string;
}

export interface AdminInternalTransferData {
  type: InternalTransferType;
  from_wallet_id: string | number;
  to_wallet_id: string | number;
  amount: number;
}

export interface AdminTransactionExportParams {
  token: string;
  format?: "xlsx" | "csv";
  search?: string | null;
  transaction_type?: string | null;
  status?: string | null;
  from_date?: string | null;
  to_date?: string | null;
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

export const adminTransactionsApi = {
  all: (params: AdminTransactionsAllParams) => {
    const { token, ...queryParams } = params;
    if (!token) {
      throw new Error("Token is required to fetch transactions");
    }

    const qs = new URLSearchParams();
    qs.set("page", String(queryParams.page ?? 1));
    qs.set("limit", String(queryParams.limit ?? 20));
    qs.set("sort_by", queryParams.sort_by ?? "created_at");
    qs.set("sort_order", queryParams.sort_order ?? "DESC");

    if (queryParams.transaction_type) qs.set("transaction_type", queryParams.transaction_type);
    if (queryParams.reference_type) qs.set("reference_type", queryParams.reference_type);
    if (queryParams.status) qs.set("status", queryParams.status);
    if (queryParams.user_id !== undefined && queryParams.user_id !== null) {
      qs.set("user_id", String(queryParams.user_id));
    }
    if (queryParams.date_from) qs.set("date_from", queryParams.date_from);
    if (queryParams.date_to) qs.set("date_to", queryParams.date_to);
    if (queryParams.amount_min !== undefined && queryParams.amount_min !== null) {
      qs.set("amount_min", String(queryParams.amount_min));
    }
    if (queryParams.amount_max !== undefined && queryParams.amount_max !== null) {
      qs.set("amount_max", String(queryParams.amount_max));
    }
    if (queryParams.search) qs.set("search", queryParams.search);

    const endpoint = `/admin/transactions/all?${qs.toString()}`;

    return apiCall<AdminTransactionsAllData>(endpoint, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  stats: (token: string) => {
    if (!token) {
      throw new Error("Token is required to fetch transaction statistics");
    }

    return apiCall<AdminTransactionStatsData>(`/admin/transactions/stats`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  clientDeposit: (body: AdminClientDepositBody, token: string, transactionProofFile?: File | null) => {
    if (!token) {
      throw new Error("Token is required to process client deposit");
    }

    const formData = new FormData();
    formData.append("client_id", String(body.client_id));
    formData.append("amount", String(body.amount));
    if (body.comment) formData.append("comment", body.comment);
    if (body.transaction_id) formData.append("transaction_id", body.transaction_id);

    if (transactionProofFile) {
      formData.append("transaction_proof", transactionProofFile);
    } else if (body.transaction_proof) {
      formData.append("transaction_proof", body.transaction_proof);
    }

    return apiCall<AdminClientDepositData>(`/admin/transaction/client-deposit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  },

  clientWithdrawal: (body: AdminClientWithdrawalBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to process client withdrawal");
    }

    return apiCall<AdminClientWithdrawalData>(`/admin/transaction/client-withdrawal`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: body.client_id,
        amount: body.amount,
        ...(body.comment !== undefined && { comment: body.comment }),
      }),
    });
  },

  internalTransfer: (body: AdminInternalTransferBody, token: string) => {
    if (!token) {
      throw new Error("Token is required to process internal transfer");
    }

    return apiCall<AdminInternalTransferData>(`/admin/transaction/internal-transfer`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  },

  export: async ({ token, format = "xlsx", search, transaction_type, status, from_date, to_date }: AdminTransactionExportParams) => {
    if (!token) {
      throw new Error("Token is required to export transactions");
    }

    if (!API_BASE_URL) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
    }

    const qs = new URLSearchParams();
    qs.set("format", format);
    if (search && search.trim()) qs.set("search", search.trim());
    if (transaction_type) qs.set("transaction_type", transaction_type);
    if (status) qs.set("status", status);
    if (from_date && from_date.trim()) {
      qs.set("from_date", from_date.trim());
    }
    if (to_date && to_date.trim()) {
      qs.set("to_date", to_date.trim());
    }

    const endpoint = `/admin/transactions/export${qs.toString() ? `?${qs.toString()}` : ""}`;
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
        `transactions.${format === "csv" ? "csv" : "xlsx"}`
      ),
    };
  },
};
