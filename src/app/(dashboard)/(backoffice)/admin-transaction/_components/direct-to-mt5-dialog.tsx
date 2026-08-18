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
import { adminTransactionsApi } from "@/lib/api-admin-transactions";
import { adminMT5AccountsApi, type AdminMT5Account } from "@/lib/api";
import { mt5AccountsApi, type MT5AccountBalance } from "@/lib/api-trading-ib";
import { adminUsersApi, type PendingUser } from "@/lib/api-auth-admin";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

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
  account?.accountType?.name ??
  account?.AdminMT5AccountType?.name ??
  account?.account_type ??
  "";

const isCentMt5Account = (account?: AdminMT5Account) =>
  getAccountTypeName(account).trim().toLowerCase() === "cent";

const getMt5AccountCurrency = (account?: AdminMT5Account) =>
  isCentMt5Account(account) ? "usc" : "usd";

const getMt5AccountBalance = (
  account?: AdminMT5Account,
  liveBalances?: Map<string, number>,
) => {
  if (!account) return 0;
  if (liveBalances) {
    const accId = String(
      account.account_id ?? account.mt5_id ?? account.id ?? "",
    );
    const liveBalance = liveBalances.get(accId);
    if (liveBalance !== undefined) {
      return liveBalance;
    }
  }
  if (isCentMt5Account(account)) {
    const rawBalance = account.balance ?? account.self_wallet ?? 0;
    return typeof rawBalance === "number"
      ? rawBalance * 100
      : Number(rawBalance) * 100;
  }
  return account.self_wallet ?? 0;
};

interface DirectToMt5DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  onSuccess: () => void;
}

export function DirectToMt5Dialog({
  open,
  onOpenChange,
  token,
  onSuccess,
}: DirectToMt5DialogProps) {
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<PendingUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [showUserResults, setShowUserResults] = useState(false);
  const [toMt5Account, setToMt5Account] = useState("");
  const [userMt5Accounts, setUserMt5Accounts] = useState<AdminMT5Account[]>([]);
  const [loadingMt5Accounts, setLoadingMt5Accounts] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mt5LiveBalances, setMt5LiveBalances] = useState<Map<string, number>>(
    new Map(),
  );
  const [loadingBalances, setLoadingBalances] = useState(false);
  const userSearchRef = useRef<HTMLDivElement>(null);
  const userSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedToMt5Account = userMt5Accounts.find(
    (acc) =>
      String(acc.account_id ?? acc.mt5_id ?? acc.id ?? "") === toMt5Account,
  );

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
    setToMt5Account("");
    fetchUserMt5Accounts(user.id);
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setUserSearchQuery("");
    setUserSearchResults([]);
    setToMt5Account("");
    setUserMt5Accounts([]);
    setMt5LiveBalances(new Map());
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
        const liveAccounts = allAccounts.filter(
          (acc) => (acc.account_mode ?? "").toLowerCase() === "live",
        );
        setUserMt5Accounts(liveAccounts);

        setLoadingBalances(true);
        const balancePromises = liveAccounts.map(async (acc) => {
          const mt5Login = acc.mt5_id ?? acc.account_id ?? acc.id;
          const accId = String(acc.account_id ?? acc.mt5_id ?? acc.id ?? "");
          if (!mt5Login) return { accId, balance: null };

          try {
            const balanceResponse = (await mt5AccountsApi.getAdminBalance(
              mt5Login,
              token,
            )) as unknown as MT5AccountBalance;
            if (
              balanceResponse.success &&
              balanceResponse.equity !== undefined
            ) {
              return { accId, balance: balanceResponse.equity };
            }
            return { accId, balance: null };
          } catch {
            return { accId, balance: null };
          }
        });

        const balances = await Promise.all(balancePromises);
        const balanceMap = new Map<string, number>();
        balances.forEach(({ accId, balance }) => {
          if (balance !== null) {
            balanceMap.set(accId, balance);
          }
        });
        setMt5LiveBalances(balanceMap);
        setLoadingBalances(false);
      } catch {
        setUserMt5Accounts([]);
        setMt5LiveBalances(new Map());
      } finally {
        setLoadingMt5Accounts(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!open) {
      setSelectedUser(null);
      setUserSearchQuery("");
      setUserSearchResults([]);
      setToMt5Account("");
      setUserMt5Accounts([]);
      setAmount("");
      setSubmitting(false);
      setMt5LiveBalances(new Map());
    }
  }, [open]);

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
    if (!toMt5Account.trim()) {
      toast.error("Please select the MT5 account");
      return;
    }

    try {
      setSubmitting(true);

      const selectedToAccount = userMt5Accounts.find(
        (acc) =>
          String(acc.account_id ?? acc.mt5_id ?? acc.id ?? "") === toMt5Account,
      );

      if (!selectedToAccount) {
        toast.error("Unable to find selected MT5 account");
        return;
      }

      const mt5Login =
        selectedToAccount.mt5_id ??
        selectedToAccount.account_id ??
        selectedToAccount.id;
      if (!mt5Login) {
        toast.error("MT5 account login not found");
        return;
      }

      await adminTransactionsApi.internalTransfer(
        {
          amount: numAmount,
          to_account: String(mt5Login),
          type: "direct_to_mt5",
          comment: "Direct to MT5 transfer",
        },
        token,
      );

      toast.success("Direct to MT5 transfer processed successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "direct to MT5 transfer",
          action: "process",
        }),
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

  const renderMt5AccountSelect = () => {
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
      <Select value={toMt5Account} onValueChange={setToMt5Account}>
        <SelectTrigger className="h-auto min-h-9">
          <SelectValue placeholder="Select MT5 Account">
            {toMt5Account &&
              (() => {
                const acc = userMt5Accounts.find(
                  (a) =>
                    String(a.account_id ?? a.mt5_id ?? a.id ?? "") ===
                    toMt5Account,
                );
                if (!acc) return null;
                const accId = String(
                  acc.account_id ?? acc.mt5_id ?? acc.id ?? "",
                );
                const accBalance = getMt5AccountBalance(acc, mt5LiveBalances);
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
        <SelectContent
          side="bottom"
          align="start"
          sideOffset={4}
          avoidCollisions={false}
          className="max-h-[300px] overflow-y-auto"
        >
          {userMt5Accounts.map((acc) => {
            const accId = String(
              acc.account_id ?? acc.mt5_id ?? acc.id ?? "",
            );
            const accBalance = getMt5AccountBalance(acc, mt5LiveBalances);
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
      <DialogContent className="!max-h-[calc(100vh-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Direct to MT5</DialogTitle>
          <DialogDescription>
            Fund an MT5 trading account directly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
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
                <div className="mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border/60 bg-popover shadow-lg">
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

          {selectedUser && (
            <div className="space-y-2">
              <Label>To MT5 Account</Label>
              {renderMt5AccountSelect()}
            </div>
          )}

          {selectedUser && (
            <div className="space-y-2">
              <Label htmlFor="transfer-amount">Amount (USD)</Label>
              <Input
                id="transfer-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {amount && Number(amount) > 0 && isCentMt5Account(selectedToMt5Account) && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Conversion</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {Number(amount).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    USD ={" "}
                    {(Number(amount) * 100).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    USC
                  </p>
                </div>
              )}
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
                <Spinner className="mr-2 h-4 w-4" /> Processing...
              </>
            ) : (
              "Fund Account"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
