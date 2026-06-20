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
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { adminTransactionsApi, type AdminClientWithdrawalData } from "@/lib/api-admin-transactions";
import { adminUsersApi, type PendingUser, type AdminWalletBalanceItem } from "@/lib/api-auth-admin";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

interface ClientWithdrawalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  onSuccess: (data: AdminClientWithdrawalData) => void;
}

export function ClientWithdrawalDialog({ open, onOpenChange, token, onSuccess }: ClientWithdrawalDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [walletBalances, setWalletBalances] = useState<AdminWalletBalanceItem[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchUsers = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!token || trimmed.length < 3) {
      setUsers([]);
      return;
    }
    try {
      setSearching(true);
      const res = await adminUsersApi.list({ token, search: trimmed, limit: 10 });
      const list = (res.data as { users?: PendingUser[] })?.users ?? [];
      setUsers(list);
      setShowResults(true);
    } catch {
      setUsers([]);
    } finally {
      setSearching(false);
    }
  }, [token]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setSelectedUser(null);
    if (searchTimerRef.current !== null) clearTimeout(searchTimerRef.current);
    if (value.trim().length >= 3) {
      searchTimerRef.current = setTimeout(() => searchUsers(value), 300);
    } else {
      setUsers([]);
      setShowResults(false);
    }
  };

  const handleSelectUser = (user: PendingUser) => {
    setSelectedUser(user);
    setSearchQuery(user.name || user.first_name || user.email || String(user.id));
    setShowResults(false);
    setUsers([]);
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setSearchQuery("");
    setShowResults(false);
    setUsers([]);
    setWalletBalances([]);
  };

  const fetchWalletBalances = useCallback(async (userId: number) => {
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
  }, [token]);

  useEffect(() => {
    if (!open) {
      setSelectedUser(null);
      setAmount("");
      setComment("");
      setSearchQuery("");
      setUsers([]);
      setShowResults(false);
      setSubmitting(false);
      setWalletBalances([]);
    }
  }, [open]);

  useEffect(() => {
    if (selectedUser) {
      fetchWalletBalances(selectedUser.id);
    }
  }, [selectedUser, fetchWalletBalances]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async () => {
    if (!selectedUser) {
      toast.error("Please select a client");
      return;
    }
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setSubmitting(true);
      const res = await adminTransactionsApi.clientWithdrawal(
        {
          client_id: selectedUser.id,
          amount: numAmount,
          comment: comment || undefined,
        },
        token
      );
      if (res.data) onSuccess(res.data);
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "withdrawal", action: "process" }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Client Withdrawal</DialogTitle>
          <DialogDescription>Process a withdrawal on behalf of a client</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Select Client</Label>
            <div ref={searchRef} className="relative">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  placeholder="Type at least 3 letters to search clients"
                  autoComplete="off"
                  className="pl-9 pr-9"
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => { if (users.length > 0) setShowResults(true); }}
                />
                {searching ? (
                  <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" size="sm" />
                ) : searchQuery ? (
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

              {showResults && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border/60 bg-popover shadow-lg">
                  {searching ? (
                    <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                      <Spinner className="h-4 w-4" size="sm" />
                      Searching clients...
                    </div>
                  ) : users.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      {searchQuery.trim().length < 3 ? "Type at least 3 letters to search." : "No clients found."}
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {users.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
                          onMouseDown={(e) => { e.preventDefault(); handleSelectUser(user); }}
                        >
                          <Check
                            className={cn(
                              "h-4 w-4 shrink-0",
                              selectedUser?.id === user.id ? "text-primary opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">
                              {user.name || user.first_name || "Unknown"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedUser && (
              <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                <span className="font-medium">{selectedUser.name || selectedUser.first_name}</span>
                <span className="text-muted-foreground">({selectedUser.email})</span>
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

            {selectedUser && (
              <div className="space-y-2">
                <Label>Wallet Balances</Label>
                {loadingWallets ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner className="h-4 w-4" size="sm" />
                    Loading wallets...
                  </div>
                ) : walletBalances.length > 0 ? (
                  <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-border/60 bg-popover p-3">
                    {walletBalances.map((wallet) => (
                      <div key={wallet.id} className="flex items-center justify-between text-sm">
                        <div className="flex flex-col">
                          {wallet.wallet_type === "mt5" ? (
                            <span className="text-xs text-muted-foreground">{wallet.mt5_id}</span>
                          ) : (
                            <>
                              <span className="capitalize text-muted-foreground">{wallet.wallet_type}</span>
                              {wallet.mt5_id && <span className="text-xs text-muted-foreground">{wallet.mt5_id}</span>}
                            </>
                          )}
                        </div>
                        <span className="font-medium">
                          {wallet.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {wallet.currency}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No wallets found</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdraw-amount">Amount (USD)</Label>
            <Input
              id="withdraw-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="withdraw-comment">Comment</Label>
            <Textarea
              id="withdraw-comment"
              placeholder="Optional comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><Spinner className="mr-2 h-4 w-4" /> Processing...</> : "Process Withdrawal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
