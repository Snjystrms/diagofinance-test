"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import type { BrokerBankDetailItem } from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";

import { isBrokerBankDetailActive } from "../_lib/broker-bank-details";

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm break-words">{value || "-"}</div>
    </div>
  );
}

export function BrokerBankDetailViewDialog({
  detail,
  loading,
  open,
  onOpenChange,
}: {
  detail: BrokerBankDetailItem | null;
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isActive = detail ? isBrokerBankDetailActive(detail) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Broker bank detail</DialogTitle>
          <DialogDescription>
            Review the selected bank account configuration used for deposits.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6 text-sm text-muted-foreground">
            Loading bank detail...
          </div>
        ) : !detail ? (
          <div className="py-6 text-sm text-muted-foreground">
            No bank detail selected.
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-4">
              <div className="text-sm font-medium">Record #{detail.id}</div>
              <Badge variant={isActive ? "default" : "secondary"}>
                {isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <DetailRow label="Bank name" value={detail.bank_name} />
              <DetailRow label="Account holder name" value={detail.account_holder_name} />
              <DetailRow label="Account number" value={detail.account_number} />
              <DetailRow label="Country" value={detail.country} />
              <DetailRow label="IBAN number" value={detail.iban_number} />
              <DetailRow label="Swift / IFSC code" value={detail.swift_ifsc_code} />
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <DetailRow label="Address" value={detail.address} />
              <DetailRow label="Created at" value={formatDateTimeInIST(detail.created_at)} />
              <DetailRow label="Updated at" value={formatDateTimeInIST(detail.updated_at)} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
