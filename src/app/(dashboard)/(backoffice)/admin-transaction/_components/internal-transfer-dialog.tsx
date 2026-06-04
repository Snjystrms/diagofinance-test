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
import { adminUsersApi, type PendingUser } from "@/lib/api-auth-admin";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

const TRANSFER_TYPE_OPTIONS: { value: InternalTransferType; label: string }[] = [
  { value: "mt5_to_mt5", label: "MT5 to MT5" },
  { value: "main_to_mt5", label: "Main Wallet to MT5" },
  { value: "ib_to_main", label: "IB Wallet to Main Wallet" },
];

type SearchMode = "mt5" | "user";

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
    if (Array.isArray(d.mt5_accounts)) return d.mt5_accounts as AdminMT5Account[];
  }
  if (Array.isArray(data.accounts)) return data.accounts as AdminMT5Account[];
  if (Array.isArray(data.items)) return data.items as AdminMT5Account[];
  if (Array.isArray(data.mt5_accounts)) return data.mt5_accounts as AdminMT5Account[];
  return [];
}

export function InternalTransferDialog({ open, onOpenChange, token, onSuccess }: InternalTransferDialogProps) {
  const [transferType, setTransferType] = useState<InternalTransferType>("mt5_to_mt5");
  const [fromAccount, setFromAccount] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [fromMt5Accounts, setFromMt5Accounts] = useState<AdminMT5Account[]>([]);
  const [toMt5Accounts, setToMt5Accounts] = useState<AdminMT5Account[]>([]);
  const [fromUsers, setFromUsers] = useState<PendingUser[]>([]);
  const [toUsers, setToUsers] = useState<PendingUser[]>([]);
  const [loadingFrom, setLoadingFrom] = useState(false);
  const [loadingTo, setLoadingTo] = useState(false);
  const [showFromResults, setShowFromResults] = useState(false);
  const [showToResults, setShowToResults] = useState(false);
  const fromSearchRef = useRef<HTMLDivElement>(null);
  const toSearchRef = useRef<HTMLDivElement>(null);
  const fromTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fromMode: SearchMode = transferType === "mt5_to_mt5" ? "mt5" : "user";
  const toMode: SearchMode = transferType === "ib_to_main" ? "user" : "mt5";

  const searchFromMt5 = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!token || trimmed.length < 3) { setFromMt5Accounts([]); return; }
    try {
      setLoadingFrom(true);
      const res = await adminMT5AccountsApi.list({ token, search: trimmed, limit: 10 });
      setFromMt5Accounts(extractMt5Accounts(res.data ?? res));
      setShowFromResults(true);
    } catch { setFromMt5Accounts([]); } finally { setLoadingFrom(false); }
  }, [token]);

  const searchToMt5 = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!token || trimmed.length < 3) { setToMt5Accounts([]); return; }
    try {
      setLoadingTo(true);
      const res = await adminMT5AccountsApi.list({ token, search: trimmed, limit: 10 });
      setToMt5Accounts(extractMt5Accounts(res.data ?? res));
      setShowToResults(true);
    } catch { setToMt5Accounts([]); } finally { setLoadingTo(false); }
  }, [token]);

  const searchFromUser = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!token || trimmed.length < 3) { setFromUsers([]); return; }
    try {
      setLoadingFrom(true);
      const res = await adminUsersApi.list({ token, search: trimmed, limit: 10 });
      const list = (res.data as { users?: PendingUser[] })?.users ?? [];
      setFromUsers(list);
      setShowFromResults(true);
    } catch { setFromUsers([]); } finally { setLoadingFrom(false); }
  }, [token]);

  const searchToUser = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!token || trimmed.length < 3) { setToUsers([]); return; }
    try {
      setLoadingTo(true);
      const res = await adminUsersApi.list({ token, search: trimmed, limit: 10 });
      const list = (res.data as { users?: PendingUser[] })?.users ?? [];
      setToUsers(list);
      setShowToResults(true);
    } catch { setToUsers([]); } finally { setLoadingTo(false); }
  }, [token]);

  const handleFromChange = (value: string) => {
    setFromAccount(value);
    setFromAccountId("");
    if (transferType === "ib_to_main") { setToAccount(""); setToAccountId(""); }
    if (fromTimerRef.current !== null) clearTimeout(fromTimerRef.current);
    if (value.trim().length >= 3) {
      const fn = fromMode === "mt5" ? searchFromMt5 : searchFromUser;
      fromTimerRef.current = setTimeout(() => fn(value), 300);
    } else {
      setFromMt5Accounts([]);
      setFromUsers([]);
      setShowFromResults(false);
    }
  };

  const handleToChange = (value: string) => {
    setToAccount(value);
    setToAccountId("");
    if (transferType === "ib_to_main") { setFromAccount(""); setFromAccountId(""); }
    if (toTimerRef.current !== null) clearTimeout(toTimerRef.current);
    if (value.trim().length >= 3) {
      const fn = toMode === "mt5" ? searchToMt5 : searchToUser;
      toTimerRef.current = setTimeout(() => fn(value), 300);
    } else {
      setToMt5Accounts([]);
      setToUsers([]);
      setShowToResults(false);
    }
  };

  const handleFromSelectMt5 = (account: AdminMT5Account) => {
    const val = String(account.account_id ?? account.id ?? "");
    setFromAccount(val);
    setFromAccountId(val);
    setShowFromResults(false);
    setFromMt5Accounts([]);
  };

  const handleFromSelectUser = (user: PendingUser) => {
    const label = `${user.name || user.first_name || "Unknown"} (${user.email})`;
    const id = String(user.id);
    setFromAccount(label);
    setFromAccountId(id);
    setShowFromResults(false);
    setFromUsers([]);

    if (transferType === "ib_to_main") {
      setToAccount(label);
      setToAccountId(id);
    }
  };

  const handleToSelectMt5 = (account: AdminMT5Account) => {
    const val = String(account.account_id ?? account.id ?? "");
    setToAccount(val);
    setToAccountId(val);
    setShowToResults(false);
    setToMt5Accounts([]);
  };

  const handleToSelectUser = (user: PendingUser) => {
    const label = `${user.name || user.first_name || "Unknown"} (${user.email})`;
    const id = String(user.id);
    setToAccount(label);
    setToAccountId(id);
    setShowToResults(false);
    setToUsers([]);

    if (transferType === "ib_to_main") {
      setFromAccount(label);
      setFromAccountId(id);
    }
  };

  useEffect(() => {
    if (!open) {
      setTransferType("mt5_to_mt5");
      setFromAccount("");
      setFromAccountId("");
      setToAccount("");
      setToAccountId("");
      setAmount("");
      setFromMt5Accounts([]);
      setToMt5Accounts([]);
      setFromUsers([]);
      setToUsers([]);
      setShowFromResults(false);
      setShowToResults(false);
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    setFromAccount("");
    setFromAccountId("");
    setToAccount("");
    setToAccountId("");
    setFromMt5Accounts([]);
    setToMt5Accounts([]);
    setFromUsers([]);
    setToUsers([]);
    setShowFromResults(false);
    setShowToResults(false);
  }, [transferType]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (fromSearchRef.current && !fromSearchRef.current.contains(e.target as Node)) {
        setShowFromResults(false);
      }
      if (toSearchRef.current && !toSearchRef.current.contains(e.target as Node)) {
        setShowToResults(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const getFromPlaceholder = () => {
    if (fromMode === "mt5") return "Type at least 3 letters to search MT5 accounts";
    return "Type at least 3 letters to search users";
  };

  const getToPlaceholder = () => {
    if (toMode === "mt5") return "Type at least 3 letters to search MT5 accounts";
    return "Type at least 3 letters to search users";
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!fromAccount.trim()) {
      toast.error("Please enter the from account");
      return;
    }
    if (!toAccount.trim()) {
      toast.error("Please enter the to account");
      return;
    }

    try {
      setSubmitting(true);
      const submitFrom = (fromAccountId || fromAccount).trim();
      const submitTo = (toAccountId || toAccount).trim();

      const res = await adminTransactionsApi.internalTransfer(
        {
          amount: numAmount,
          from_account: submitFrom,
          to_account: submitTo,
          type: transferType,
        },
        token
      );
      if (res.data) onSuccess(res.data);
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "internal transfer", action: "process" }));
    } finally {
      setSubmitting(false);
    }
  };

  const renderFromResults = () => {
    if (fromMode === "mt5") {
      if (loadingFrom) {
        return <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-muted-foreground"><Spinner className="h-4 w-4" size="sm" />Searching MT5 accounts...</div>;
      }
      if (fromMt5Accounts.length === 0) {
        return <div className="px-3 py-4 text-center text-sm text-muted-foreground">{fromAccount.trim().length < 3 ? "Type at least 3 letters to search." : "No MT5 accounts found."}</div>;
      }
      return (
        <div className="divide-y divide-border/50">
          {fromMt5Accounts.map((acc) => {
            const val = String(acc.account_id ?? acc.id ?? "");
            return (
              <button
                key={val}
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
                onMouseDown={(e) => { e.preventDefault(); handleFromSelectMt5(acc); }}
              >
                <Check className={cn("h-4 w-4 shrink-0", fromAccount === val ? "text-primary opacity-100" : "opacity-0")} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{val}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[acc.name || acc.first_name, acc.email].filter(Boolean).join(" - ") || "No details"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    if (loadingFrom) {
      return <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-muted-foreground"><Spinner className="h-4 w-4" size="sm" />Searching users...</div>;
    }
    if (fromUsers.length === 0) {
      return <div className="px-3 py-4 text-center text-sm text-muted-foreground">{fromAccount.trim().length < 3 ? "Type at least 3 letters to search." : "No users found."}</div>;
    }
    return (
      <div className="divide-y divide-border/50">
        {fromUsers.map((u) => (
          <button
            key={u.id}
            type="button"
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
            onMouseDown={(e) => { e.preventDefault(); handleFromSelectUser(u); }}
          >
            <Check className={cn("h-4 w-4 shrink-0", fromAccount === String(u.id) ? "text-primary opacity-100" : "opacity-0")} />
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{u.name || u.first_name || "Unknown"}</p>
              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
            </div>
          </button>
        ))}
      </div>
    );
  };

  const renderToResults = () => {
    if (toMode === "mt5") {
      if (loadingTo) {
        return <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-muted-foreground"><Spinner className="h-4 w-4" size="sm" />Searching MT5 accounts...</div>;
      }
      if (toMt5Accounts.length === 0) {
        return <div className="px-3 py-4 text-center text-sm text-muted-foreground">{toAccount.trim().length < 3 ? "Type at least 3 letters to search." : "No MT5 accounts found."}</div>;
      }
      return (
        <div className="divide-y divide-border/50">
          {toMt5Accounts.map((acc) => {
            const val = String(acc.account_id ?? acc.id ?? "");
            return (
              <button
                key={val}
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
                onMouseDown={(e) => { e.preventDefault(); handleToSelectMt5(acc); }}
              >
                <Check className={cn("h-4 w-4 shrink-0", toAccount === val ? "text-primary opacity-100" : "opacity-0")} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{val}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[acc.name || acc.first_name, acc.email].filter(Boolean).join(" - ") || "No details"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    if (loadingTo) {
      return <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-muted-foreground"><Spinner className="h-4 w-4" size="sm" />Searching users...</div>;
    }
    if (toUsers.length === 0) {
      return <div className="px-3 py-4 text-center text-sm text-muted-foreground">{toAccount.trim().length < 3 ? "Type at least 3 letters to search." : "No users found."}</div>;
    }
    return (
      <div className="divide-y divide-border/50">
        {toUsers.map((u) => (
          <button
            key={u.id}
            type="button"
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
            onMouseDown={(e) => { e.preventDefault(); handleToSelectUser(u); }}
          >
            <Check className={cn("h-4 w-4 shrink-0", toAccount === String(u.id) ? "text-primary opacity-100" : "opacity-0")} />
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{u.name || u.first_name || "Unknown"}</p>
              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
            </div>
          </button>
        ))}
      </div>
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
            <Select value={transferType} onValueChange={(v) => setTransferType(v as InternalTransferType)}>
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
            <Label>From Account</Label>
            <div ref={fromSearchRef} className="relative">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={fromAccount}
                  placeholder={getFromPlaceholder()}
                  autoComplete="off"
                  className="pl-9 pr-9"
                  onChange={(e) => handleFromChange(e.target.value)}
                  onFocus={() => {
                    if (fromMode === "mt5" && fromMt5Accounts.length > 0) setShowFromResults(true);
                    if (fromMode === "user" && fromUsers.length > 0) setShowFromResults(true);
                  }}
                />
                {loadingFrom ? (
                  <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" size="sm" />
                ) : fromAccount ? (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => { setFromAccount(""); setFromAccountId(""); setFromMt5Accounts([]); setFromUsers([]); setShowFromResults(false); if (transferType === "ib_to_main") { setToAccount(""); setToAccountId(""); } }}
                    tabIndex={-1}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {showFromResults && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border/60 bg-popover shadow-lg">
                  {renderFromResults()}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>To Account</Label>
            <div ref={toSearchRef} className="relative">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={toAccount}
                  placeholder={getToPlaceholder()}
                  autoComplete="off"
                  className="pl-9 pr-9"
                  disabled={transferType === "ib_to_main"}
                  onChange={(e) => handleToChange(e.target.value)}
                  onFocus={() => {
                    if (toMode === "mt5" && toMt5Accounts.length > 0) setShowToResults(true);
                    if (toMode === "user" && toUsers.length > 0) setShowToResults(true);
                  }}
                />
                {transferType !== "ib_to_main" && loadingTo ? (
                  <Spinner className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" size="sm" />
                ) : transferType !== "ib_to_main" && toAccount ? (
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => { setToAccount(""); setToAccountId(""); setToMt5Accounts([]); setToUsers([]); setShowToResults(false); }}
                    tabIndex={-1}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {showToResults && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border/60 bg-popover shadow-lg">
                  {renderToResults()}
                </div>
              )}
            </div>
          </div>

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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><Spinner className="mr-2 h-4 w-4" /> Transferring...</> : "Process Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
