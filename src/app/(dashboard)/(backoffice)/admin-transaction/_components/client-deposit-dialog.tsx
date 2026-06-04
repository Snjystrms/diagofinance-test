"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";
import { Check, Search, Trash2, Upload, X } from "lucide-react";
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
import { adminTransactionsApi, type AdminClientDepositData } from "@/lib/api-admin-transactions";
import { adminUsersApi, type PendingUser } from "@/lib/api-auth-admin";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

interface ClientDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  onSuccess: (data: AdminClientDepositData) => void;
}

export function ClientDepositDialog({ open, onOpenChange, token, onSuccess }: ClientDepositDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [amount, setAmount] = useState("");
  const [comment, setComment] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [transactionProofFile, setTransactionProofFile] = useState<File | null>(null);
  const [transactionProofPreview, setTransactionProofPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  };

  useEffect(() => {
    if (!open) {
      setSelectedUser(null);
      setAmount("");
      setComment("");
      setTransactionId("");
      setTransactionProofFile(null);
      setTransactionProofPreview(null);
      setSearchQuery("");
      setUsers([]);
      setShowResults(false);
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTransactionProofFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setTransactionProofPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setTransactionProofFile(null);
    setTransactionProofPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
      const res = await adminTransactionsApi.clientDeposit(
        {
          client_id: selectedUser.id,
          amount: numAmount,
          comment: comment || undefined,
          transaction_id: transactionId || undefined,
        },
        token,
        transactionProofFile
      );
      if (res.data) onSuccess(res.data);
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(getAdminFriendlyErrorMessage(error, { resource: "deposit", action: "process" }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Client Deposit</DialogTitle>
          <DialogDescription>Process a deposit on behalf of a client</DialogDescription>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              placeholder="Optional comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionId">Transaction ID</Label>
            <Input
              id="transactionId"
              placeholder="Optional transaction reference"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Transaction Proof</Label>
            {transactionProofPreview ? (
              <div className="relative overflow-hidden rounded-lg border border-border/60">
                <img
                  src={transactionProofPreview}
                  alt="Transaction proof"
                  className="max-h-40 w-full object-contain bg-muted/30"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-2 h-8 w-8 p-0"
                  onClick={handleRemoveFile}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                <Upload className="h-4 w-4" />
                <span>Click to upload proof image</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><Spinner className="mr-2 h-4 w-4" /> Processing...</> : "Process Deposit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
