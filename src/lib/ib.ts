import type {
  IbDashboardResponse,
  IbWalletBalance,
  IbWalletData,
  IbWalletEarningSummary,
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

export function normalizeIbWalletData(raw: unknown): IbWalletData | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const source = raw as Record<string, unknown>;
  const walletBalance = source.wallet_balance ?? source.partner_wallet;
  const clientWallet = source.client_wallet;
  const earningSummary = source.earning_summary;
  const transactions = source.transactions ?? emptyTransactions;

  if (!walletBalance || !clientWallet || !earningSummary) {
    return null;
  }

  return {
    wallet_balance: walletBalance as IbWalletData["wallet_balance"],
    client_wallet: clientWallet as IbWalletData["client_wallet"],
    earning_summary: earningSummary as IbWalletData["earning_summary"],
    transactions: transactions as IbWalletData["transactions"],
  };
}

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
