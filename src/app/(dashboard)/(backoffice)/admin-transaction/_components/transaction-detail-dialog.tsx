"use client";

import { Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fmtDateTime, fmtISTDateTime, formatAmount, transactionTypeLabel } from "../_lib/transaction-format";
import type { AdminTransactionItem } from "@/lib/api-admin-transactions";

interface TransactionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: AdminTransactionItem | null;
}

export function TransactionDetailDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionDetailDialogProps) {
  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Transaction Details
            <Badge variant="outline" className="ml-2 font-mono">
              #{transaction.id}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              User Information
            </h3>
            <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{transaction.user?.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium">{transaction.user?.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="font-medium">{transaction.user?.username || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">User ID</p>
                <p className="font-medium font-mono">{transaction.user_id}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Transaction Details */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Transaction Details
            </h3>
            <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="font-medium capitalize">
                  {transactionTypeLabel(transaction.transaction_label)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium">
                  {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-medium">
                  {formatAmount(transaction.amount)} {transaction.currency}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Amount</p>
                <p className="font-medium">
                  {formatAmount(transaction.net_amount)} {transaction.currency}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fee</p>
                <p className="font-medium">
                  {transaction.fee != null && transaction.fee > 0 ? `${formatAmount(transaction.fee)} ${transaction.currency}` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="font-medium capitalize">{transaction.transaction_category || "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="font-medium">{transaction.description || "—"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Balance Changes */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Balance Changes
            </h3>
            <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
              <div>
                <p className="text-xs text-muted-foreground">Balance Before</p>
                <p className="font-medium font-mono">
                  {formatAmount(transaction.balance_before)} {transaction.currency}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Balance After</p>
                <p className="font-medium font-mono">
                  {formatAmount(transaction.balance_after)} {transaction.currency}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Reference & Proof */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Reference & Proof
            </h3>
            <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
              <div>
                <p className="text-xs text-muted-foreground">Transaction Hash</p>
                <p className="font-medium font-mono break-all">
                  {transaction.transaction_hash || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reference ID</p>
                <p className="font-medium font-mono break-all">
                  {transaction.reference_id || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Reference Type</p>
                <p className="font-medium capitalize">{transaction.reference_type || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Processed By</p>
                <p className="font-medium">{transaction.processed_by || "—"}</p>
              </div>
            </div>
          </div>

          {transaction.transaction_proof && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Transaction Proof
                </h3>
                <div className="rounded-lg border p-4">
                  <img
                    src={transaction.transaction_proof}
                    alt="Transaction proof"
                    className="max-w-full h-auto rounded-md"
                  />
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Admin Notes */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Admin Notes
            </h3>
            <div className="rounded-lg border p-4">
              <p className="font-medium">{transaction.admin_notes || "No notes"}</p>
            </div>
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Timestamps
            </h3>
            <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
              <div>
                <p className="text-xs text-muted-foreground">Created At</p>
                <p className="font-medium">{fmtDateTime(transaction.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Updated At</p>
                <p className="font-medium">{fmtDateTime(transaction.updated_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Processed At</p>
                <p className="font-medium">
                  {transaction.processed_at ? fmtISTDateTime(transaction.processed_at) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Original Model</p>
                <p className="font-medium">{transaction.original_model || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}