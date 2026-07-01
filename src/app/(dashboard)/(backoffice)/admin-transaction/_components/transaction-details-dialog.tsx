"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { AdminTransactionItem } from "@/lib/api-admin-transactions";
import { fmtDateTime, fmtISTDateTime, formatAmount, statusBadge, transactionTypeLabel } from "../_lib/transaction-format";
import { CalendarIcon, User, Wallet, Hash, FileText, Clock, CheckCircle2, DollarSign, ArrowUpDown } from "lucide-react";
import Link from "next/link";

interface TransactionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: AdminTransactionItem | null;
}

export function TransactionDetailsDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionDetailsDialogProps) {
  if (!transaction) return null;

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) => (
    <div className="flex items-start justify-between py-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-sm font-medium text-right">{value}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transaction Details of {transaction.user?.name || "—"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Type */}
          <div className="flex items-center gap-3">
            {statusBadge(transaction.status)}
            <Badge variant="outline" className="capitalize">
              {transactionTypeLabel(transaction.transaction_label)}
            </Badge>
          </div>

          <Separator />

          {/* User Information */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              User Information
            </h3>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <InfoRow
                label="Name"
                value={
                  <Link
                    href={`/new-users/${transaction.user?.id ?? ""}`}
                    className="font-medium hover:underline text-primary"
                  >
                    {transaction.user?.name || "—"}
                  </Link>
                }
              />
              <InfoRow label="Email" value={transaction.user?.email || "—"} />
              {/* <InfoRow label="Username" value={transaction.user?.username || "—"} /> */}
              <InfoRow label="Mobile" value={transaction.user?.mobile || "—"} />
              {/* <InfoRow label="User ID" value={`#${transaction.user_id}`} /> */}
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Transaction Details
            </h3>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <InfoRow
                label="Amount"
                icon={DollarSign}
                value={
                  <span className="font-bold text-base tabular-nums">
                    {formatAmount(transaction.amount)} {transaction.wallet_currency}
                  </span>
                }
              />
              <InfoRow
                label="Balance Before"
                icon={ArrowUpDown}
                value={
                  <span className="tabular-nums">
                    {formatAmount(transaction.balance_before)} {transaction.wallet_currency}
                  </span>
                }
              />
              <InfoRow
                label="Balance After"
                icon={ArrowUpDown}
                value={
                  <span className="tabular-nums">
                    {formatAmount(transaction.balance_after)} {transaction.wallet_currency}
                  </span>
                }
              />
              {/* <InfoRow label="Currency" value={transaction.currency} /> */}
            </div>
          </div>

          {/* Wallet & Reference Information */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallet & Reference
            </h3>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <InfoRow label="Wallet ID" icon={Wallet} value={`#${transaction.wallet_id}`} />
              <InfoRow
                label="Reference Type"
                value={
                  <Badge variant="secondary" className="capitalize">
                    {transaction.reference_type?.replace(/_/g, " ") || "—"}
                  </Badge>
                }
              />
              <InfoRow label="Reference ID" value={transaction.reference_id || "—"} />
              <InfoRow
                label="Transaction Category"
                value={
                  <span className="capitalize">{transaction.transaction_category || "—"}</span>
                }
              />
              <InfoRow label="Original Model" value={transaction.original_model || "—"} />
            </div>
          </div>

          {/* Transaction Hash & Proof */}
          {(transaction.transaction_hash || transaction.transaction_proof) && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Hash & Proof
              </h3>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                {transaction.transaction_hash && (
                  <InfoRow
                    label="Transaction Hash"
                    value={
                      <span className="font-mono text-xs break-all max-w-md">
                        {transaction.transaction_hash}
                      </span>
                    }
                  />
                )}
                {transaction.transaction_proof && (
                  <InfoRow
                    label="Transaction Proof"
                    value={
                      <a
                        href={transaction.transaction_proof}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-xs"
                      >
                        View Proof
                      </a>
                    }
                  />
                )}
              </div>
            </div>
          )}

          {/* Processing Information */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Processing Information
            </h3>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <InfoRow label="Processed By" value={transaction.processed_by || "—"} />
              <InfoRow
                label="Processed At"
                icon={Clock}
                value={fmtISTDateTime(transaction.processed_at) || "—"}
              />
            </div>
          </div>

          {/* Description & Notes */}
          {(transaction.description || transaction.admin_notes) && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Description & Notes
              </h3>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                {transaction.description && (
                  <InfoRow label="Description" value={transaction.description} />
                )}
                {transaction.admin_notes && (
                  <InfoRow
                    label="Admin Notes"
                    value={
                      <span className="text-xs max-w-md break-words">
                        {transaction.admin_notes}
                      </span>
                    }
                  />
                )}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Timestamps
            </h3>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <InfoRow
                label="Created At"
                icon={CalendarIcon}
                value={fmtISTDateTime(transaction.created_at)}
              />
              <InfoRow
                label="Updated At"
                icon={CalendarIcon}
                value={fmtISTDateTime(transaction.updated_at)}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
