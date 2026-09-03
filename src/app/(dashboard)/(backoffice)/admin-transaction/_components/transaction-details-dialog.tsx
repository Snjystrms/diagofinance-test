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
import { TransactionBalanceCell } from "./transaction-balance-cell";

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
              {transaction.currency && transaction.currency !== transaction.wallet_currency && (
                <InfoRow label="Original Currency" value={<span className="capitalize">{transaction.currency}</span>} />
              )}
              <InfoRow
                label="Balance"
                icon={ArrowUpDown}
                value={<TransactionBalanceCell transaction={transaction} />}
              />
            </div>
          </div>

          {/* Wallet & Reference Information */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallet & Reference
            </h3>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              {transaction.wallet_id && (
                <InfoRow label="Wallet ID" icon={Wallet} value={`#${transaction.wallet_id}`} />
              )}
              {transaction.source && (
                <InfoRow
                  label="Source"
                  value={
                    <Badge variant="secondary" className="capitalize">
                      {transaction.source.replace(/_/g, " ")}
                    </Badge>
                  }
                />
              )}
              {transaction.wallet_type && (
                <InfoRow label="Wallet Type" value={<span className="capitalize">{transaction.wallet_type.replace(/_/g, " ")}</span>} />
              )}
              {transaction.wallet_currency && (
                <InfoRow label="Wallet Currency" value={transaction.wallet_currency} />
              )}
              {transaction.mt5_account_id && (
                <InfoRow label="MT5 Account" value={<span className="font-mono">{transaction.mt5_account_id}</span>} />
              )}
              {transaction.mt5_user_id && (
                <InfoRow label="MT5 User ID" value={<span className="font-mono">{transaction.mt5_user_id}</span>} />
              )}
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

          {/* Crypto / Withdrawal Details */}
          {(transaction.wallet_address || transaction.chain_id || transaction.payment_method_id) && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Crypto / Withdrawal Details
              </h3>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                {transaction.wallet_address && (
                  <InfoRow
                    label="Wallet Address"
                    value={
                      <span className="font-mono text-xs break-all max-w-md">
                        {transaction.wallet_address}
                      </span>
                    }
                  />
                )}
                {transaction.chain_id && (
                  <InfoRow
                    label="Chain"
                    value={
                      <Badge variant="secondary" className="font-mono">
                        {transaction.chain_id}
                      </Badge>
                    }
                  />
                )}
                {/* {transaction.payment_method_id && (
                  <InfoRow label="Payment Method ID" value={<span className="font-mono">#{transaction.payment_method_id}</span>} />
                )} */}
                {transaction.bank_detail_id && (
                  <InfoRow label="Bank Detail ID" value={<span className="font-mono">#{transaction.bank_detail_id}</span>} />
                )}
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
              {transaction.approved_by && (
                <InfoRow label="Approved By" value={transaction.approved_by} />
              )}
              {transaction.approved_at && (
                <InfoRow label="Approved At" value={fmtISTDateTime(transaction.approved_at)} />
              )}
              {transaction.fee != null && transaction.fee !== 0 && (
                <InfoRow label="Fee" value={<span className="font-mono">{formatAmount(transaction.fee)} {transaction.wallet_currency}</span>} />
              )}
              {transaction.net_amount != null && transaction.net_amount !== 0 && (
                <InfoRow label="Net Amount" value={<span className="font-mono font-bold">{formatAmount(transaction.net_amount)} {transaction.wallet_currency}</span>} />
              )}
            </div>
          </div>

          {/* Transaction Proof */}
          {transaction.transaction_proof && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Proof
              </h3>
              <div className="rounded-lg border bg-muted/30 p-4">
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
              </div>
            </div>
          )}

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
