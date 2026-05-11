"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import type { AdminBankDetailItem } from "@/lib/api";

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value || "-"}</div>
    </div>
  );
}

export function BankDetailViewDialog({
  detail,
  loading,
  open,
  onOpenChange,
}: {
  detail: AdminBankDetailItem | null;
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bank detail</DialogTitle>
          <DialogDescription>Review the selected bank-details record.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6 text-sm text-muted-foreground">Loading bank detail...</div>
        ) : !detail ? (
          <div className="py-6 text-sm text-muted-foreground">No bank detail selected.</div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 md:grid-cols-2">
              <DetailRow label="User name" value={detail.user?.name} />
              <DetailRow label="User email" value={detail.user?.email} />
              <DetailRow label="User mobile" value={detail.user?.mobile} />
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <DetailRow label="Account holder name" value={detail.account_holder_name} />
              <DetailRow label="Account number" value={detail.account_number} />
              <DetailRow label="IBAN number" value={detail.iban_number} />
              <DetailRow label="Swift / IFSC code" value={detail.swift_ifsc_code} />
              <DetailRow label="Bank name" value={detail.bank_name} />
              <DetailRow label="Country" value={detail.country} />
              <DetailRow label="Address" value={detail.address} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
