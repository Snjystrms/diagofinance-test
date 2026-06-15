import type {
  IbClient,
  IbDashboardResponse,
  IbRebate,
  IbSubIb,
  IbWalletBalance,
  IbWalletData,
  IbWalletEarningSummary,
  IbWalletTransaction,
  IbWalletTransactions,
} from "@/lib/api";

const emptyTransactions: IbWalletTransactions = {
  data: [],
  pagination: {
    current_page: 1,
    per_page: 0,
    total: 0,
    total_pages: 0,
  },
};

const emptyBalance = (currency = "USD"): IbWalletBalance => ({
  amount: 0,
  currency,
});

const emptyEarningSummary = (currency = "USD"): IbWalletEarningSummary => ({
  total_earned: 0,
  total_internal_transfers: 0,
  currency,
});



// const fallbackClients: IbClient[] = [
//   {
//     client_id: "CL-10024",
//     client_name: "Aarav Mehta",
//     lots_traded: 18.4,
//     pending_rebates: 145.2,
//     earned_rebates: 982.5,
//     registration_date: "2026-04-08T10:30:00Z",
//   },
//   {
//     client_id: "CL-10025",
//     client_name: "Sara Khan",
//     lots_traded: 12.8,
//     pending_rebates: 96.75,
//     earned_rebates: 640.1,
//     registration_date: "2026-04-10T14:10:00Z",
//   },
//   {
//     client_id: "CL-10026",
//     client_name: "Rahul Sethi",
//     lots_traded: 9.15,
//     pending_rebates: 58.4,
//     earned_rebates: 421.35,
//     registration_date: "2026-04-15T08:45:00Z",
//   },
// ];

// const fallbackSubIbs: IbSubIb[] = [
//   {
//     client_id: "SIB-20011",
//     client_name: "Neha Arora",
//     level: 1,
//     lots_traded: 34.6,
//     pending_rebates: 240.15,
//     earned_rebates: 1482.2,
//     registration_date: "2026-04-05T11:20:00Z",
//   },
//   {
//     client_id: "SIB-20012",
//     client_name: "Imran Shaikh",
//     level: 2,
//     lots_traded: 21.35,
//     pending_rebates: 175.8,
//     earned_rebates: 995.45,
//     registration_date: "2026-04-11T16:05:00Z",
//   },
//   {
//     client_id: "SIB-20013",
//     client_name: "Priya Nair",
//     level: 1,
//     lots_traded: 15.9,
//     pending_rebates: 118.25,
//     earned_rebates: 760.4,
//     registration_date: "2026-04-18T09:55:00Z",
//   },
// ];

// const fallbackRebates: IbRebate[] = [
//   {
//     client_id: "RB-30041",
//     client_name: "Dev Patel",
//     lots_traded: 11.25,
//     pending_rebates: 82.15,
//     earned_rebates: 552.6,
//     registration_date: "2026-04-06T12:00:00Z",
//   },
//   {
//     client_id: "RB-30042",
//     client_name: "Maya Joseph",
//     lots_traded: 17.7,
//     pending_rebates: 133.9,
//     earned_rebates: 889.4,
//     registration_date: "2026-04-13T15:25:00Z",
//   },
//   {
//     client_id: "RB-30043",
//     client_name: "Karan Malhotra",
//     lots_traded: 7.9,
//     pending_rebates: 44.3,
//     earned_rebates: 286.75,
//     registration_date: "2026-04-19T07:35:00Z",
//   },
// ];

type IbSummaryPagination = {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeWalletBalance(raw: unknown, currency = "USD"): IbWalletBalance {
  if (typeof raw === "number" || typeof raw === "string") {
    return {
      amount: toNumber(raw, 0),
      currency,
    };
  }

  if (!isRecord(raw)) {
    return emptyBalance(currency);
  }

  return {
    amount: toNumber(raw.amount ?? raw.balance, 0),
    currency: toString(raw.currency, currency),
  };
}

function normalizeEarningSummary(raw: unknown, currency = "USD"): IbWalletEarningSummary {
  if (!isRecord(raw)) {
    return emptyEarningSummary(currency);
  }

  return {
    total_earned: toNumber(raw.total_earned ?? raw.totalEarned, 0),
    total_internal_transfers: toNumber(raw.total_internal_transfers ?? raw.totalInternalTransfers, 0),
    currency: toString(raw.currency, currency),
  };
}

function normalizeTransaction(raw: unknown, currency = "USD"): IbWalletTransaction | null {
  if (!isRecord(raw)) {
    return null;
  }

  const type = toString(raw.type, "Transaction");
  const amount = toNumber(raw.amount, 0);
  const description = toString(raw.description, "");
  const createdAt = toString(raw.created_at ?? raw.createdAt, "");

  if (!type && !description && !createdAt && amount === 0) {
    return null;
  }

  return {
    id: typeof raw.id === "number" ? raw.id : undefined,
    type,
    amount,
    currency: toString(raw.currency, currency),
    description: description || undefined,
    status: toString(raw.status, "Completed"),
    created_at: createdAt || undefined,
  };
}

function normalizeTransactions(raw: unknown, currency = "USD"): IbWalletTransactions {
  const source = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.data)
      ? raw.data
      : [];

  const data = source
    .map((entry) => normalizeTransaction(entry, currency))
    .filter((entry): entry is IbWalletTransaction => Boolean(entry));

  const paginationSource = isRecord(raw) && isRecord(raw.pagination) ? raw.pagination : null;
  const currentPage = paginationSource ? toNumber(paginationSource.current_page ?? paginationSource.page, 1) : 1;
  const perPage = paginationSource ? toNumber(paginationSource.per_page ?? paginationSource.limit, data.length) : data.length;
  const total = paginationSource ? toNumber(paginationSource.total, data.length) : data.length;
  const totalPages = paginationSource
    ? toNumber(
        paginationSource.total_pages ?? paginationSource.last_page,
        total > 0 ? Math.ceil(total / Math.max(perPage, 1)) : 1,
      )
    : total > 0 ? Math.ceil(total / Math.max(perPage || data.length || 1, 1)) : 1;

  return {
    data,
    pagination: {
      current_page: currentPage,
      per_page: perPage || data.length,
      total,
      total_pages: totalPages,
    },
  };
}

export function normalizeIbWalletData(raw: unknown): IbWalletData | null {
  if (!isRecord(raw)) {
    return null;
  }

  const walletBalance = raw.wallet_balance ?? raw.partner_wallet;
  const clientWallet = raw.client_wallet;
  const earningSummary = raw.earning_summary;
  const transactions = raw.transactions;

  const hasWalletBalance = walletBalance !== undefined && walletBalance !== null;
  const hasClientWallet = clientWallet !== undefined && clientWallet !== null;
  const hasEarningSummary = earningSummary !== undefined && earningSummary !== null;
  const hasTransactions = transactions !== undefined && transactions !== null;

  if (!hasWalletBalance && !hasClientWallet && !hasEarningSummary && !hasTransactions) {
    return null;
  }

  const currency =
    (isRecord(walletBalance) ? toString(walletBalance.currency) : "") ||
    (isRecord(clientWallet) ? toString(clientWallet.currency) : "") ||
    (isRecord(earningSummary) ? toString(earningSummary.currency) : "") ||
    "USD";

  return {
    wallet_balance: normalizeWalletBalance(walletBalance, currency),
    client_wallet: normalizeWalletBalance(clientWallet, currency),
    earning_summary: normalizeEarningSummary(earningSummary, currency),
    transactions: normalizeTransactions(transactions, currency),
  };
}



function filterRowsBySearch<T extends IbClient | IbSubIb | IbRebate>(rows: T[], search?: string) {
  if (!search?.trim()) {
    return rows;
  }

  const normalizedSearch = search.trim().toLowerCase();
  return rows.filter((row) => {
    return (
      row.client_id.toLowerCase().includes(normalizedSearch) ||
      row.client_name.toLowerCase().includes(normalizedSearch)
    );
  });
}

function createPagination(page: number, limit: number, total: number): IbSummaryPagination {
  return {
    current_page: page,
    per_page: limit,
    total,
    total_pages: Math.max(1, Math.ceil(total / Math.max(limit, 1))),
  };
}

function paginateRows<T>(rows: T[], page: number, limit: number) {
  const perPage = Math.max(limit, 1);
  const currentPage = Math.max(page, 1);
  const start = (currentPage - 1) * perPage;

  return {
    rows: rows.slice(start, start + perPage),
    pagination: createPagination(currentPage, perPage, rows.length),
  };
}

// export function getFallbackIbClients(params?: { page?: number; limit?: number; search?: string }) {
//   const filtered = filterRowsBySearch(fallbackClients, params?.search);
//   return paginateRows(filtered, params?.page ?? 1, params?.limit ?? 10);
// }

// export function getFallbackIbSubIbs(params?: { page?: number; limit?: number; search?: string }) {
//   const filtered = filterRowsBySearch(fallbackSubIbs, params?.search);
//   return paginateRows(filtered, params?.page ?? 1, params?.limit ?? 10);
// }

// export function getFallbackIbRebates(params?: { page?: number; limit?: number; search?: string }) {
//   const filtered = filterRowsBySearch(fallbackRebates, params?.search);
//   return paginateRows(filtered, params?.page ?? 1, params?.limit ?? 10);
// }

export function getIbWalletSnapshot(
  walletData?: IbWalletData | null,
  dashboardData?: IbDashboardResponse | null,
) {
  const fallbackCurrency =
    walletData?.wallet_balance?.currency ??
    walletData?.client_wallet?.currency ??
    walletData?.earning_summary?.currency ??
    dashboardData?.partner_wallet?.currency ??
    dashboardData?.client_wallet?.currency ??
    dashboardData?.earning_summary?.currency ??
    "USD";

  const partnerWallet =
    walletData?.wallet_balance ??
    (dashboardData
      ? {
          amount: dashboardData.partner_wallet.balance,
          currency: dashboardData.partner_wallet.currency,
        }
      : emptyBalance(fallbackCurrency));

  const clientWallet =
    walletData?.client_wallet ??
    (dashboardData
      ? {
          amount: dashboardData.client_wallet.balance,
          currency: dashboardData.client_wallet.currency,
        }
      : emptyBalance(fallbackCurrency));

  const earningSummary =
    walletData?.earning_summary ??
    dashboardData?.earning_summary ??
    emptyEarningSummary(fallbackCurrency);

  const transactions = walletData?.transactions ?? emptyTransactions;

  return {
    partnerWallet,
    clientWallet,
    earningSummary,
    transactions,
    currency: fallbackCurrency,
  };
}
