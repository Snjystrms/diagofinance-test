"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  History,
  Landmark,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";

import { ApiErrorState } from "@/components/errors/api-error-state";
import { FeatureDisabledPanel } from "@/components/errors/feature-disabled-panel";
import { IbMetricCard, IbPageHeader, IbPageShell, IbSectionCard } from "@/components/ib/ib-page-primitives";
import { getStatusBadge, ReusableDataTable, type ColumnDef } from "@/components/data-table/reusable-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import {
  type IbDashboardResponse,
  type IbInternalTransferData,
  type IbInternalTransferRequest,
  ibRequestsApi,
} from "@/lib/api";
import { mt5AccountsApi, type MT5Account } from "@/lib/api-trading-ib";
import { authApi, type UserBankDetailsData } from "@/lib/api-auth-admin";
import { formatCurrency } from "@/lib/format";
import { formatDateTimeInIST } from "@/lib/formatters";
import { getFriendlyErrorMessage } from "@/lib/friendly-errors";
import { cn } from "@/lib/utils";

type TransferDestination = "main" | "mt5" | "bank";

function TransferLoadingState() {
  return (
    <IbPageShell>
      <section className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-10 w-64 rounded-full" />
          <Skeleton className="h-4 w-full max-w-xl rounded-full" />
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
            <div className="space-y-4">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="h-8 w-36 rounded-full" />
              <Skeleton className="h-4 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <div className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
          <div className="space-y-4">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-11 w-40 rounded-2xl" />
          </div>
        </div>
        <div className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-[28px] border border-border/60 bg-card p-6 shadow-sm">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </IbPageShell>
  );
}

function Mt5DestinationIcon({ isSelected }: { isSelected: boolean }) {
  return (
    <Image
      src={isSelected ? "/metatrader-5.svg" : "/metatrader-5-dark.svg"}
      alt="MT5"
      width={36}
      height={36}
      className="h-7 w-7"
      aria-hidden="true"
    />
  );
}

const DESTINATIONS: {
  value: TransferDestination;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "main",
    label: "Main Wallet",
    description: "Move funds into the main wallet",
    icon: <Wallet className="h-4 w-4" />,
  },
  {
    value: "mt5",
    label: "MT5 Account",
    description: "Fund a trading account",
    icon: <Mt5DestinationIcon isSelected={false} />,
  },
  {
    value: "bank",
    label: "Bank Account",
    description: "Withdraw to your bank",
    icon: <Building2 className="h-4 w-4" />,
  },
];

const getDestinationLabel = (value: TransferDestination | string) => {
  switch (value) {
    case "main":
      return "Main Wallet";
    case "mt5":
      return "MT5 Account";
    case "bank":
      return "Bank Account";
    default:
      return "Unknown";
  }
};

const renderDestination = (item: IbInternalTransferData) => {
  if (item.destination === "mt5" && item.mt5_account) {
    return (
      <div>
        <p className="text-sm font-medium text-foreground">MT5 Account</p>
        <p className="text-xs text-muted-foreground">
          {item.mt5_account.account_id} ({item.mt5_account.mt5_login})
        </p>
      </div>
    );
  }
  if (item.destination === "bank" && item.bank_detail) {
    return (
      <div>
        <p className="text-sm font-medium text-foreground">Bank Account</p>
        <p className="text-xs text-muted-foreground">
          {item.bank_detail.bank_name || "Bank"} •{" "}
          {item.bank_detail.account_number || "—"}
        </p>
      </div>
    );
  }
  return <span className="text-sm font-medium text-foreground">Main Wallet</span>;
};

const getHistoryColumns = (
  currency: string,
): ColumnDef<IbInternalTransferData>[] => [
  {
    header: "Destination",
    key: "destination",
    render: (item) => renderDestination(item),
    className: "whitespace-nowrap",
  },
  {
    header: "Note",
    key: "note",
    render: (item) => (
      <div className="max-w-[200px] break-words text-muted-foreground">
        {item.note || <span className="text-border">—</span>}
      </div>
    ),
  },
  {
    header: "Status",
    key: "status",
    render: (item) => getStatusBadge(item.status),
    className: "whitespace-nowrap",
  },
  {
    header: "Date",
    key: "date",
    render: (item) => (
      <span className="tabular-nums text-xs text-muted-foreground">
        {item.created_at ? formatDateTimeInIST(item.created_at) : "—"}
      </span>
    ),
    className: "whitespace-nowrap",
  },
  {
    header: "Amount",
    key: "amount",
    align: "right",
    render: (item) => (
      <span className="font-semibold tabular-nums text-foreground">
        {formatCurrency(item.amount, currency)}
      </span>
    ),
    className: "whitespace-nowrap",
  },
];

export default function TransferPage() {
  const { token, defaultSettings } = useAuth();
  const [dashboardData, setDashboardData] = useState<IbDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  const [destination, setDestination] = useState<TransferDestination>("main");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState<IbInternalTransferData | null>(null);

  const [mt5Accounts, setMt5Accounts] = useState<MT5Account[]>([]);
  const [mt5AccountsLoading, setMt5AccountsLoading] = useState(true);
  const [selectedMt5AccountId, setSelectedMt5AccountId] = useState<string>("");
  const [bankDetails, setBankDetails] = useState<UserBankDetailsData[]>([]);
  const [bankDetailsLoading, setBankDetailsLoading] = useState(true);
  const [selectedBankDetailId, setSelectedBankDetailId] = useState<string>("");

  const [history, setHistory] = useState<IbInternalTransferData[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(10);
  const [historyPagination, setHistoryPagination] = useState({
    current_page: 1,
    per_page: 10,
    total: 0,
    total_pages: 1,
  });

  const fetchDashboard = useCallback(async () => {
    if (!token) {
      setError("Authentication required");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await ibRequestsApi.getDashboard(token);
      if (response?.data) {
        setDashboardData(response.data);
      } else {
        setDashboardData(null);
        setError("Unable to load transfer data");
      }
    } catch (fetchError) {
      console.error("Failed to fetch IB dashboard:", fetchError);
      setDashboardData(null);
      setError(fetchError);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const fetchMt5Accounts = useCallback(async () => {
    if (!token) return;
    try {
      setMt5AccountsLoading(true);
      const response = await mt5AccountsApi.getAll(token);
      const accounts = Array.isArray(response.data?.mt5_accounts)
        ? response.data.mt5_accounts
        : [];
      setMt5Accounts(accounts);
    } catch (fetchError) {
      console.error("Failed to fetch MT5 accounts:", fetchError);
      setMt5Accounts([]);
    } finally {
      setMt5AccountsLoading(false);
    }
  }, [token]);

  const fetchBankDetails = useCallback(async () => {
    if (!token) return;
    try {
      setBankDetailsLoading(true);
      const response = await authApi.getBankDetails(token);
      const payload = response.data as unknown;
      const list: UserBankDetailsData[] = Array.isArray(payload)
        ? payload
        : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)
          ? ((payload as { data?: unknown }).data as UserBankDetailsData[])
          : [];
      setBankDetails(list);
    } catch (fetchError) {
      console.error("Failed to fetch bank details:", fetchError);
      setBankDetails([]);
    } finally {
      setBankDetailsLoading(false);
    }
  }, [token]);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      setHistoryLoading(true);
      const response = await ibRequestsApi.getInternalTransfers(token, {
        page: historyPage,
        limit: historyPerPage,
      });
      const list = response?.data?.data;
      if (response?.success && Array.isArray(list)) {
        setHistory(list);
        const meta = response.data?.meta;
        setHistoryPagination({
          current_page: meta?.page ?? historyPage,
          per_page: meta?.limit ?? historyPerPage,
          total: meta?.total ?? list.length,
          total_pages:
            meta?.limit && meta?.total
              ? Math.max(Math.ceil(meta.total / meta.limit), 1)
              : 1,
        });
      } else {
        setHistory([]);
      }
    } catch (fetchError) {
      console.error("Failed to fetch transfer history:", fetchError);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [token, historyPage, historyPerPage]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    void fetchMt5Accounts();
  }, [fetchMt5Accounts]);

  useEffect(() => {
    void fetchBankDetails();
  }, [fetchBankDetails]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const selectedMt5Account = useMemo(
    () =>
      mt5Accounts.find(
        (acc) => String(acc.id) === String(selectedMt5AccountId),
      ),
    [mt5Accounts, selectedMt5AccountId],
  );

  const selectedBankDetail = useMemo(
    () =>
      bankDetails.find(
        (bank) => String(bank.id) === String(selectedBankDetailId),
      ),
    [bankDetails, selectedBankDetailId],
  );

  const handleTransfer = useCallback(async () => {
    if (!token || !dashboardData) {
      toast.error("Authentication required");
      return;
    }

    const amount = Number(transferAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > dashboardData.partner_wallet.balance) {
      toast.error("Insufficient partner wallet balance");
      return;
    }

    let payload: IbInternalTransferRequest;

    if (destination === "mt5") {
      if (!selectedMt5AccountId) {
        toast.error("Please select an MT5 account");
        return;
      }
      payload = {
        amount,
        destination: "mt5",
        mt5_account_id: Number(selectedMt5AccountId),
        ...(transferNote.trim() ? { note: transferNote.trim() } : {}),
      };
    } else if (destination === "bank") {
      if (!selectedBankDetailId) {
        toast.error("Please select a bank account");
        return;
      }
      payload = {
        amount,
        destination: "bank",
        bank_detail_id: Number(selectedBankDetailId),
        ...(transferNote.trim() ? { note: transferNote.trim() } : {}),
      };
    } else {
      payload = {
        amount,
        destination: "main",
        ...(transferNote.trim() ? { comment: transferNote.trim() } : {}),
      };
    }

    try {
      setIsTransferring(true);
      setTransferResult(null);
      const response = await ibRequestsApi.internalTransfer(payload, token);

      if (response.success && response.data) {
        setTransferResult(response.data);
        toast.success(response.message || "Request submitted successfully");
        setTransferAmount("");
        setTransferNote("");
        await Promise.all([fetchDashboard(), fetchHistory()]);
        return;
      }

      toast.error(
        getFriendlyErrorMessage(response.message || "Transfer failed", {
          audience: "client",
          resource: "IB transfer",
          action: "submit",
        }),
      );
    } catch (transferError) {
      console.error("Transfer error:", transferError);
      toast.error(
        getFriendlyErrorMessage(transferError, {
          audience: "client",
          resource: "IB transfer",
          action: "submit",
        }),
      );
    } finally {
      setIsTransferring(false);
    }
  }, [
    dashboardData,
    destination,
    fetchDashboard,
    fetchHistory,
    selectedBankDetailId,
    selectedMt5AccountId,
    token,
    transferAmount,
    transferNote,
  ]);

  const handlePerPageChange = (newPerPage: number) => {
    setHistoryPerPage(newPerPage);
    setHistoryPage(1);
  };

  if (defaultSettings?.disable_ib_withdraw) {
    return (
      <IbPageShell>
        <FeatureDisabledPanel
          title="IB Withdrawals Temporarily Unavailable"
          message="IB transfer and withdrawal services are currently disabled by the administrator. Please try again later. If you have any urgent concerns, please contact our support team."
        />
      </IbPageShell>
    );
  }

  if (isLoading) {
    return <TransferLoadingState />;
  }

  if (error || !dashboardData) {
    return (
      <IbPageShell>
        <ApiErrorState
          error={error || "Unable to load transfer data"}
          audience="client"
          resource="IB transfer"
          action="load"
          variant="panel"
          onRetry={fetchDashboard}
        />
      </IbPageShell>
    );
  }

  const { partner_wallet, client_wallet } = dashboardData;
  const currency = partner_wallet.currency || client_wallet.currency || "USD";
  const amount = Number(transferAmount);
  const projectedPartnerBalance =
    Number.isFinite(amount) && amount > 0
      ? Math.max(partner_wallet.balance - amount, 0)
      : partner_wallet.balance;
  const projectedClientBalance =
    Number.isFinite(amount) && amount > 0
      ? client_wallet.balance + amount
      : client_wallet.balance;

  const handleDestinationChange = (value: TransferDestination) => {
    setDestination(value);
    setTransferResult(null);
  };

  return (
    <IbPageShell>
      <IbPageHeader
        eyebrow="IB Transfer"
        title="Move funds out of the IB wallet"
        description="Transfer balance from the IB wallet into the main wallet, fund an MT5 trading account, or submit a bank withdrawal for review."
        actions={
          <>
            <Button variant="outline" onClick={() => void fetchDashboard()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </>
        }
      />

      {/* <div className="grid gap-4 md:grid-cols-2">
        <IbMetricCard
          title="Partner Wallet"
          value={formatCurrency(partner_wallet.balance, partner_wallet.currency)}
          description="Source wallet for this transfer."
          icon={<Wallet className="h-5 w-5" />}
          accent="primary"
        />
        {destination === "main" ? (
          <IbMetricCard
            title="Main Wallet"
            value={formatCurrency(client_wallet.balance, client_wallet.currency)}
            description="Destination wallet that receives the transferred amount."
            icon={<Wallet className="h-5 w-5" />}
            accent="emerald"
          />
        ) : destination === "mt5" ? (
          <IbMetricCard
            title="MT5 Account"
            value={
              selectedMt5Account
                ? `${selectedMt5Account.account_id} (${selectedMt5Account.mt5_id})`
                : "Select an account below"
            }
            description="Trading account that will be funded."
            icon={<Landmark className="h-5 w-5" />}
            accent="emerald"
          />
        ) : (
          <IbMetricCard
            title="Bank Account"
            value={
              selectedBankDetail
                ? `${selectedBankDetail.bank_name || "Bank"} • ${selectedBankDetail.account_number}`
                : "Select an account below"
            }
            description="Bank account that will receive the payout."
            icon={<Building2 className="h-5 w-5" />}
            accent="emerald"
          />
        )}
      </div> */}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <IbSectionCard
          title="Transfer request"
          description="Choose where the funds should go, then submit the request."
        >
          <div className="space-y-5">
            {/* Destination selector */}
            <div className="space-y-2">
              <Label>Destination</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {DESTINATIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleDestinationChange(option.value)}
                    className={cn(
                      "flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition-colors",
                      destination === option.value
                        ? "border-primary/60 bg-primary/5"
                        : "border-border/60 bg-transparent hover:bg-muted/40",
                    )}
                  >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-xl",
                      destination === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {option.value === "mt5" ? (
                      <Mt5DestinationIcon isSelected={destination === "mt5"} />
                    ) : (
                      option.icon
                    )}
                  </span>
                    <span className="text-sm font-medium text-foreground">
                      {option.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div
              className={
                destination === "mt5"
                  ? "grid gap-4 sm:grid-cols-2"
                  : "space-y-2"
              }
            >
              <div className="space-y-2">
                <Label htmlFor="ib-amount">Amount</Label>
                <Input
                  id="ib-amount"
                  type="number"
                  step="1"
                  min="1"
                  max={partner_wallet.balance}
                  placeholder="Enter amount"
                  value={transferAmount}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  onChange={(event) => setTransferAmount(event.target.value)}
                  disabled={isTransferring}
                />
                <p className="text-sm text-muted-foreground">
                  Available balance:{" "}
                  {formatCurrency(
                    partner_wallet.balance,
                    partner_wallet.currency,
                  )}
                </p>
              </div>

              {destination === "mt5" && (
                <div className="space-y-2">
                  <Label htmlFor="ib-mt5-account">MT5 Account</Label>
                  {mt5AccountsLoading ? (
                    <Skeleton className="h-10 w-full rounded-md" />
                  ) : mt5Accounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No MT5 accounts found. Create a trading account before
                      funding it.
                    </p>
                  ) : (
                    <Select
                      value={selectedMt5AccountId}
                      onValueChange={setSelectedMt5AccountId}
                      disabled={isTransferring}
                    >
                      <SelectTrigger id="ib-mt5-account" className="w-full">
                        <SelectValue placeholder="Select an MT5 account" />
                      </SelectTrigger>
                      <SelectContent>
                        {mt5Accounts.map((acc) => (
                          <SelectItem key={acc.id} value={String(acc.id)}>
                            {acc.account_id} ({acc.mt5_id}) — {acc.account_mode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>

            {destination === "bank" && (
              <div className="space-y-2">
                <Label htmlFor="ib-bank-account">Bank Account</Label>
                {bankDetailsLoading ? (
                  <Skeleton className="h-10 w-full rounded-md" />
                ) : bankDetails.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No bank accounts found. Add bank details in your profile to
                    withdraw to a bank account.
                  </p>
                ) : (
                  <Select
                    value={selectedBankDetailId}
                    onValueChange={setSelectedBankDetailId}
                    disabled={isTransferring}
                  >
                    <SelectTrigger id="ib-bank-account" className="w-full">
                      <SelectValue placeholder="Select a bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankDetails.map((bank) => (
                        <SelectItem key={bank.id} value={String(bank.id)}>
                          {bank.bank_name} • {bank.account_number} (
                          {bank.account_holder_name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ib-note">
                {destination === "main" ? "Comment" : "Note"}
              </Label>
              <Textarea
                id="ib-note"
                rows={4}
                placeholder={
                  destination === "main"
                    ? "Optional note for this transfer"
                    : "Optional note for this request"
                }
                value={transferNote}
                onChange={(event) => setTransferNote(event.target.value)}
                disabled={isTransferring}
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={handleTransfer} disabled={isTransferring}>
                {isTransferring ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    {destination === "main" ? "Transfer funds" : "Submit request"}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTransferAmount("");
                  setTransferNote("");
                }}
                disabled={isTransferring}
              >
                Reset
              </Button>
            </div>
          </div>
        </IbSectionCard>

        {transferResult ? (
          <IbSectionCard
            title="Request submitted"
            description="The details below are the values returned by the server."
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-50 px-4 py-3 dark:bg-emerald-950/20">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    {formatCurrency(transferResult.amount, currency)}{" "}
                    {transferResult.destination === "main"
                      ? "transferred"
                      : "request submitted"}
                  </p>
                  <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">
                    Partner wallet → {getDestinationLabel(transferResult.destination)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Request details
                </p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span>{getStatusBadge(transferResult.status)}</span>
                </div>
                {transferResult.note && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Note</span>
                    <span className="text-sm break-words text-foreground">
                      {transferResult.note}
                    </span>
                  </div>
                )}
                {transferResult.mt5_account && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      MT5 Account
                    </span>
                    <span className="text-sm font-mono text-foreground">
                      {transferResult.mt5_account.account_id} (
                      {transferResult.mt5_account.mt5_login})
                    </span>
                  </div>
                )}
                {transferResult.bank_detail && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      Bank Account
                    </span>
                    <span className="text-sm text-foreground">
                      {transferResult.bank_detail.bank_name || "Bank"} •{" "}
                      {transferResult.bank_detail.account_number} (
                      {transferResult.bank_detail.account_holder_name})
                    </span>
                  </div>
                )}
                {transferResult.created_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Submitted</span>
                    <span className="text-foreground">
                      {formatDateTimeInIST(transferResult.created_at)}
                    </span>
                  </div>
                )}
              </div>

              <div className="ib-portal-note rounded-3xl border p-4 text-sm text-muted-foreground">
                {transferResult.destination === "main"
                  ? "The transfer is complete and the updated balances are shown above."
                  : "Your withdrawal request is pending review. Funds will move once an admin approves the request."}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setTransferResult(null)}
              >
                Dismiss
              </Button>
            </div>
          </IbSectionCard>
        ) : (
          <IbSectionCard
            title="Transfer preview"
            description="Estimated balances after applying the entered amount."
          >
            <div className="space-y-4">
              <div className="rounded-3xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  IB Wallet After Transfer
                </p>
                <p className="mt-2 text-xl font-semibold text-foreground">
                  {formatCurrency(projectedPartnerBalance, partner_wallet.currency)}
                </p>
              </div>
              {destination === "main" ? (
                <div className="rounded-3xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Main Wallet After Transfer
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {formatCurrency(projectedClientBalance, client_wallet.currency)}
                  </p>
                </div>
              ) : (
                <div className="rounded-3xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {destination === "mt5" ? "MT5 Account Funding" : "Bank Withdrawal"}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {destination === "mt5"
                      ? "The requested amount will be credited to the selected MT5 account after approval."
                      : "The requested amount will be sent to the selected bank account after approval."}
                  </p>
                </div>
              )}
              <div className="ib-portal-note rounded-3xl border p-4 text-sm text-muted-foreground">
                {destination === "main"
                  ? "Transfers are immediate and reflected in the IB wallet history once the backend confirms the operation."
                  : "Withdrawal requests are submitted for review. Funds remain in the partner wallet until the request is approved."}
              </div>
            </div>
          </IbSectionCard>
        )}
      </div>

      <IbSectionCard
        title="Request history"
        description="Recent transfer and withdrawal requests submitted from your IB wallet."
      >
        <ReusableDataTable
          data={history}
          columns={getHistoryColumns(currency)}
          pagination={historyPagination}
          isLoading={historyLoading}
          showSerialNumber={true}
          serialNumberStart={
            (historyPagination.current_page - 1) * historyPagination.per_page + 1
          }
          onPageChange={setHistoryPage}
          onPerPageChange={handlePerPageChange}
          emptyState={
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[24px] border border-dashed border-border/60 bg-muted/10 px-6 text-center">
              <History className="mb-4 h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">
                No requests yet
              </h3>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Transfers and withdrawal requests will appear here once you
                submit one.
              </p>
            </div>
          }
        />
      </IbSectionCard>
    </IbPageShell>
  );
}
