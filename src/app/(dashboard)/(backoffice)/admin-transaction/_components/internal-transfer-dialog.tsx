"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";
import { Check, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  adminTransactionsApi,
  type AdminInternalTransferData,
  type InternalTransferType,
} from "@/lib/api-admin-transactions";
import { adminMT5AccountsApi, type AdminMT5Account } from "@/lib/api";
import {
  adminUsersApi,
  type PendingUser,
  type AdminWalletBalanceItem,
} from "@/lib/api-auth-admin";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

const TRANSFER_TYPE_OPTIONS: { value: InternalTransferType; label: string }[] =
  [
    { value: "mt5_to_mt5", label: "MT5 to MT5" },
    { value: "main_to_mt5", label: "Main Wallet to MT5" },
    { value: "mt5_to_main", label: "MT5 to Main Wallet" },
    { value: "ib_to_main", label: "IB Wallet to Main Wallet" },
  ];

interface InternalTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  onSuccess: (data: AdminInternalTransferData) => void;
}

function extractMt5Accounts(res: unknown): AdminMT5Account[] {
  const data = res as Record<string, unknown>;
  if (Array.isArray(data)) return data as AdminMT5Account[];
  if (Array.isArray(data.data)) return data.data as AdminMT5Account[];
  if (data.data && typeof data.data === "object") {
    const d = data.data as Record<string, unknown>;
    if (Array.isArray(d.accounts)) return d.accounts as AdminMT5Account[];
    if (Array.isArray(d.items)) return d.items as AdminMT5Account[];
    if (Array.isArray(d.data)) return d.data as AdminMT5Account[];
    if (Array.isArray(d.mt5_accounts))
      return d.mt5_accounts as AdminMT5Account[];
  }
  if (Array.isArray(data.accounts)) return data.accounts as AdminMT5Account[];
  if (Array.isArray(data.items)) return data.items as AdminMT5Account[];
  if (Array.isArray(data.mt5_accounts))
    return data.mt5_accounts as AdminMT5Account[];
  return [];
}

const getAccountTypeName = (account?: AdminMT5Account) =>
  account?.accountType?.name ?? account?.AdminMT5AccountType?.name ?? account?.account_type ?? "";

const isCentMt5Account = (account?: AdminMT5Account) =>
  getAccountTypeName(account).trim().toLowerCase() === "cent";

const getMt5AccountCurrency = (account?: AdminMT5Account) => (isCentMt5Account(account) ? "usc" : "usd");

const formatCurrencyCode = (value: unknown) => String(value ?? "USD").trim().toLowerCase();

export function InternalTransferDialog({
  open,
  onOpenChange,
  token,
  onSuccess,
}: InternalTransferDialogProps) {
  const [transferType, setTransferType] =
    useState<InternalTransferType>("mt5_to_mt5");
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<PendingUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showUserResults, setShowUserResults] = useState(false);
  const [fromMt5Account, setFromMt5Account] = useState("");
  const [toMt5Account, setToMt5Account] = useState("");
  const [userMt5Accounts, setUserMt5Accounts] = useState<AdminMT5Account[]>([]);
  const [loadingMt5Accounts, setLoadingMt5Accounts] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [walletBalances, setWalletBalances] = useState<
    AdminWalletBalanceItem[]
  >([]);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [mt5AccountsWithWalletIds, setMt5AccountsWithWalletIds] = useState<
    Map<string, number>
  >(new Map());
  const userSearchRef = useRef<HTMLDivElement>(null);
  const userSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMt5ToMt5 = transferType === "mt5_to_mt5";
  const needsMt5Accounts =
    transferType === "mt5_to_mt5" ||
    transferType === "main_to_mt5" ||
    transferType === "mt5_to_main";
  const isUserBasedTransfer =
    transferType === "main_to_mt5" ||
    transferType === "mt5_to_main" ||
    transferType === "ib_to_main";
  const selectedFromMt5Account = userMt5Accounts.find(
    (acc) => String(acc.account_id ?? acc.mt5_id ?? acc.id ?? "") === fromMt5Account,
  );
  const selectedToMt5Account = userMt5Accounts.find(
    (acc) => String(acc.account_id ?? acc.mt5_id ?? acc.id ?? "") === toMt5Account,
  );
  const amountCurrency =
    transferType === "main_to_mt5"
      ? getMt5AccountCurrency(selectedToMt5Account)
      : transferType === "mt5_to_mt5" || transferType === "mt5_to_main"
        ? getMt5AccountCurrency(selectedFromMt5Account)
        : "usd";

  const searchUsers = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!token || trimmed.length < 3) {
        setUserSearchResults([]);
        return;
      }
      try {
        setSearchingUsers(true);
        const res = await adminUsersApi.list({
          token,
          search: trimmed,
          limit: 10,
        });
        const list = (res.data as { users?: PendingUser[] })?.users ?? [];
        setUserSearchResults(list);
        setShowUserResults(true);
      } catch {
        setUserSearchResults([]);
      } finally {
        setSearchingUsers(false);
      }
    },
    [token],
  );

  const handleUserSearchChange = (value: string) => {
    setUserSearchQuery(value);
    setSelectedUser(null);
    if (userSearchTimerRef.current !== null)
      clearTimeout(userSearchTimerRef.current);
    if (value.trim().length >= 3) {
      userSearchTimerRef.current = setTimeout(() => searchUsers(value), 300);
    } else {
      setUserSearchResults([]);
      setShowUserResults(false);
    }
  };

  const handleSelectUser = (user: PendingUser) => {
    setSelectedUser(user);
    setUserSearchQuery(
      user.name || user.first_name || user.email || String(user.id),
    );
    setShowUserResults(false);
    setUserSearchResults([]);
    setFromMt5Account("");
    setToMt5Account("");

    if (isUserBasedTransfer) {
      fetchWalletBalances(user.id);
    }
    if (needsMt5Accounts) {
      fetchUserMt5Accounts(user.id);
    }
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setUserSearchQuery("");
    setUserSearchResults([]);
    setFromMt5Account("");
    setToMt5Account("");
    setUserMt5Accounts([]);
    setWalletBalances([]);
    setMt5AccountsWithWalletIds(new Map());
  };

  const fetchUserMt5Accounts = useCallback(
    async (userId: number) => {
      try {
        setLoadingMt5Accounts(true);
        const res = await adminMT5AccountsApi.list({
          token,
          user_id: userId,
          limit: 100,
        });
        const allAccounts = extractMt5Accounts(res.data ?? res);
        // Filter to show only live accounts
        const liveAccounts = allAccounts.filter(
          (acc) => (acc.account_mode ?? "").toLowerCase() === "live"
        );
        setUserMt5Accounts(liveAccounts);

        // Fetch wallet IDs for each MT5 account
        const walletIdMap = new Map<string, number>();
        for (const acc of liveAccounts) {
          const accId = String(acc.account_id ?? acc.mt5_id ?? acc.id ?? "");
          if (accId && acc.id) {
            try {
              const detailRes = await adminMT5AccountsApi.getById(acc.id, token);
              const detailData = detailRes.data ?? detailRes;
              const mt5Account =
                (detailData as Record<string, unknown>).mt5_account ||
                (detailData as Record<string, unknown>).account ||
                detailData;
              const accountData = mt5Account as Record<string, unknown>;
              if (accountData?.mt5_wallet_id) {
                walletIdMap.set(accId, Number(accountData.mt5_wallet_id));
              }
            } catch (error) {
              console.error(
                `Failed to fetch wallet ID for MT5 account ${accId}:`,
                error
              );
            }
          }
        }
        setMt5AccountsWithWalletIds(walletIdMap);
      } catch {
        setUserMt5Accounts([]);
        setMt5AccountsWithWalletIds(new Map());
      } finally {
        setLoadingMt5Accounts(false);
      }
    },
    [token]
  );

  const fetchWalletBalances = useCallback(
    async (userId: number) => {
      try {
        setLoadingWallets(true);
        const res = await adminUsersApi.walletBalances(userId, token);
        if (res.data?.wallets) {
          setWalletBalances(res.data.wallets);
        }
      } catch {
        setWalletBalances([]);
      } finally {
        setLoadingWallets(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!open) {
      setTransferType("mt5_to_mt5");
      setSelectedUser(null);
      setUserSearchQuery("");
      setUserSearchResults([]);
      setFromMt5Account("");
      setToMt5Account("");
      setUserMt5Accounts([]);
      setAmount("");
      setSubmitting(false);
      setWalletBalances([]);
      setMt5AccountsWithWalletIds(new Map());
    }
  }, [open]);

  useEffect(() => {
    setSelectedUser(null);
    setUserSearchQuery("");
    setUserSearchResults([]);
    setFromMt5Account("");
    setToMt5Account("");
    setUserMt5Accounts([]);
    setShowUserResults(false);
    setWalletBalances([]);
    setMt5AccountsWithWalletIds(new Map());
  }, [transferType]);

  useEffect(() => {
    if (selectedUser) {
      if (needsMt5Accounts) {
        fetchUserMt5Accounts(selectedUser.id);
      }
      if (isUserBasedTransfer) {
        fetchWalletBalances(selectedUser.id);
      }
    }
  }, [
    selectedUser,
    transferType,
    needsMt5Accounts,
    isUserBasedTransfer,
    fetchUserMt5Accounts,
    fetchWalletBalances,
  ]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        userSearchRef.current &&
        !userSearchRef.current.contains(e.target as Node)
      ) {
        setShowUserResults(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }
    if (!fromMt5Account.trim()) {
      toast.error("Please select the from account");
      return;
    }
    if (!toMt5Account.trim()) {
      toast.error("Please select the to account");
      return;
    }

    try {
      setSubmitting(true);

      let fromAccountId: string | number = fromMt5Account.trim();
      let toAccountId: string | number = toMt5Account.trim();

      // For MT5 to MT5 transfer, use mt5_wallet_id
      if (transferType === "mt5_to_mt5") {
        const fromWalletId = mt5AccountsWithWalletIds.get(fromMt5Account);
        const toWalletId = mt5AccountsWithWalletIds.get(toMt5Account);

        if (!fromWalletId || !toWalletId) {
          toast.error("Unable to retrieve wallet IDs for MT5 accounts");
          return;
        }

        fromAccountId = fromWalletId;
        toAccountId = toWalletId;
      }
      // For main_to_mt5: from = main wallet id, to = mt5 wallet id
      else if (transferType === "main_to_mt5") {
        const mainWallet = walletBalances.find((w) => w.wallet_type === "main");
        const toWalletId = mt5AccountsWithWalletIds.get(toMt5Account);

        if (!mainWallet?.id || !toWalletId) {
          toast.error("Unable to retrieve wallet IDs");
          return;
        }

        fromAccountId = mainWallet.id;
        toAccountId = toWalletId;
      }
      // For mt5_to_main: from = mt5 wallet id, to = main wallet id
      else if (transferType === "mt5_to_main") {
        const fromWalletId = mt5AccountsWithWalletIds.get(fromMt5Account);
        const mainWallet = walletBalances.find((w) => w.wallet_type === "main");

        if (!fromWalletId || !mainWallet?.id) {
          toast.error("Unable to retrieve wallet IDs");
          return;
        }

        fromAccountId = fromWalletId;
        toAccountId = mainWallet.id;
      }
      // For ib_to_main: from = ib wallet id, to = main wallet id
      else if (transferType === "ib_to_main") {
        const ibWallet = walletBalances.find((w) => w.wallet_type === "ib");
        const mainWallet = walletBalances.find((w) => w.wallet_type === "main");

        if (!ibWallet?.id || !mainWallet?.id) {
          toast.error("Unable to retrieve wallet IDs");
          return;
        }

        fromAccountId = ibWallet.id;
        toAccountId = mainWallet.id;
      }

      const res = await adminTransactionsApi.internalTransfer(
        {
          amount: numAmount,
          from_account: String(fromAccountId),
          to_account: String(toAccountId),
          type: transferType,
        },
        token
      );
      if (res.data) onSuccess(res.data);
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "internal transfer",
          action: "process",
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderUserSearchResults = () => {
    if (searchingUsers) {
      return (
        <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-muted-foreground">
          <Spinner className="h-4 w-4" size="sm" />
          Searching users...
        </div>
      );
    }
    if (userSearchResults.length === 0) {
      return (
        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
          {userSearchQuery.trim().length < 3
            ? "Type at least 3 letters to search."
            : "No users found."}
        </div>
      );
    }
    return (
      <div className="divide-y divide-border/50">
        {userSearchResults.map((u) => (
          <button
            key={u.id}
            type="button"
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelectUser(u);
            }}
          >
            <Check
              className={cn(
                "h-4 w-4 shrink-0",
                selectedUser?.id === u.id
                  ? "text-primary opacity-100"
                  : "opacity-0",
              )}
            />
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {u.name || u.first_name || "Unknown"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {u.email}
              </p>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderMt5AccountSelect = (
    value: string,
    onChange: (val: string) => void,
    label: string,
  ) => {
    if (loadingMt5Accounts) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Spinner className="h-4 w-4" size="sm" />
          Loading MT5 accounts...
        </div>
      );
    }

    if (userMt5Accounts.length === 0) {
      return (
        <p className="text-sm text-muted-foreground py-2">
          No MT5 accounts found for this user
        </p>
      );
    }

    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-auto min-h-9">
          <SelectValue placeholder={`Select ${label}`}>
            {value &&
              (() => {
                const acc = userMt5Accounts.find(
                  (a) =>
                    String(a.account_id ?? a.mt5_id ?? a.id ?? "") === value,
                );
                if (!acc) return null;
                const accId = String(
                  acc.account_id ?? acc.mt5_id ?? acc.id ?? "",
                );
                const accBalance = acc.self_wallet ?? 0;
                const type = acc.account_mode ?? "-";
                const currency = getMt5AccountCurrency(acc);
                return (
                  <span className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{accId}</span>
                    <span className="text-muted-foreground">
                      {Number(accBalance).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      {currency} · {type}
                    </span>
                  </span>
                );
              })()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {userMt5Accounts.map((acc) => {
            const accId = String(acc.account_id ?? acc.mt5_id ?? acc.id ?? "");
            const accBalance = acc.self_wallet ?? 0;
            const type = acc.account_mode ?? "-";
            const currency = getMt5AccountCurrency(acc);
            return (
              <SelectItem key={accId} value={accId}>
                <div className="flex flex-col gap-0.5 py-0.5">
                  <span className="font-medium text-sm">{accId}</span>
                  <span className="text-xs text-muted-foreground">
                    {Number(accBalance).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {currency} · {type}
                  </span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Internal Transfer</DialogTitle>
          <DialogDescription>Transfer funds between accounts</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="transfer-type">Transfer Type</Label>
            <Select
              value={transferType}
              onValueChange={(v) => setTransferType(v as InternalTransferType)}
            >
              <SelectTrigger id="transfer-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {TRANSFER_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Select User</Label>
            <div ref={userSearchRef} className="relative">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={userSearchQuery}
                  placeholder="Type at least 3 letters to search users"
                  autoComplete="off"
                  className="pl-9 pr-9"
                  onChange={(e) => handleUserSearchChange(e.target.value)}
                  onFocus={() => {
                    if (userSearchResults.length > 0) setShowUserResults(true);
                  }}
                />
                {searchingUsers ? (
                  <Spinner
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    size="sm"
                  />
                ) : userSearchQuery ? (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={handleClearUser}
                    tabIndex={-1}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {showUserResults && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border/60 bg-popover shadow-lg">
                  {renderUserSearchResults()}
                </div>
              )}
            </div>

            {selectedUser && (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                <span className="font-medium">
                  {selectedUser.name || selectedUser.first_name}
                </span>
                <span className="text-muted-foreground">
                  ({selectedUser.email})
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto h-6 w-6"
                  onClick={handleClearUser}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {selectedUser && isMt5ToMt5 && (
            <>
              <div className="space-y-2">
                <Label>From MT5 Account</Label>
                {renderMt5AccountSelect(
                  fromMt5Account,
                  (val) => setFromMt5Account(val),
                  "From Account",
                )}
              </div>

              <div className="space-y-2">
                <Label>To MT5 Account</Label>
                {renderMt5AccountSelect(
                  toMt5Account,
                  (val) => setToMt5Account(val),
                  "To Account",
                )}
              </div>
            </>
          )}

          {selectedUser && transferType === "main_to_mt5" && (
            <>
              <div className="space-y-2">
                <Label>From Wallet</Label>
                <Select
                  value={fromMt5Account}
                  onValueChange={(val) => setFromMt5Account(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {walletBalances
                      .filter((w) => w.wallet_type === "main")
                      .map((wallet) => (
                        <SelectItem key={wallet.id} value={`main`}>
                          <div className="flex flex-col">
                            <span>Main Wallet</span>
                            <span className="text-xs text-muted-foreground">
                              Balance:{" "}
                              {wallet.balance.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              {amountCurrency === "usc" ? "usc" : formatCurrencyCode(wallet.currency)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>To MT5 Account</Label>
                {renderMt5AccountSelect(
                  toMt5Account,
                  (val) => setToMt5Account(val),
                  "To Account",
                )}
              </div>
            </>
          )}

          {selectedUser && transferType === "mt5_to_main" && (
            <>
              <div className="space-y-2">
                <Label>From MT5 Account</Label>
                {renderMt5AccountSelect(
                  fromMt5Account,
                  (val) => setFromMt5Account(val),
                  "From Account",
                )}
              </div>

              <div className="space-y-2">
                <Label>To Wallet</Label>
                <Select
                  value={toMt5Account}
                  onValueChange={(val) => setToMt5Account(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {walletBalances
                      .filter((w) => w.wallet_type === "main")
                      .map((wallet) => (
                        <SelectItem key={wallet.id} value={`main`}>
                          <div className="flex flex-col">
                            <span>Main Wallet</span>
                            <span className="text-xs text-muted-foreground">
                              Balance:{" "}
                              {wallet.balance.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              {amountCurrency === "usc" ? "usc" : formatCurrencyCode(wallet.currency)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {selectedUser && transferType === "ib_to_main" && (
            <>
              <div className="space-y-2">
                <Label>From Wallet</Label>
                <Select
                  value={fromMt5Account}
                  onValueChange={(val) => setFromMt5Account(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {walletBalances
                      .filter((w) => w.wallet_type === "ib")
                      .map((wallet) => (
                        <SelectItem key={wallet.id} value={`ib`}>
                          <div className="flex flex-col">
                            <span>IB Wallet</span>
                            <span className="text-xs text-muted-foreground">
                              Balance:{" "}
                              {wallet.balance.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              {formatCurrencyCode(wallet.currency)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>To Wallet</Label>
                <Select
                  value={toMt5Account}
                  onValueChange={(val) => setToMt5Account(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {walletBalances
                      .filter((w) => w.wallet_type === "main")
                      .map((wallet) => (
                        <SelectItem key={wallet.id} value={`main`}>
                          <div className="flex flex-col">
                            <span>Main Wallet</span>
                            <span className="text-xs text-muted-foreground">
                              Balance:{" "}
                              {wallet.balance.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              {formatCurrencyCode(wallet.currency)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {selectedUser && (
            <div className="space-y-2">
              <Label htmlFor="transfer-amount">Amount ({amountCurrency})</Label>
              <Input
                id="transfer-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !selectedUser}>
            {submitting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" /> Transferring...
              </>
            ) : (
              "Process Transfer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
