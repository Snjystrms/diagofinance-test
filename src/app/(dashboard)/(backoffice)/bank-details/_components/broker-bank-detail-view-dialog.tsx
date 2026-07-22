"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AuthenticatedDocumentViewer } from "@/components/authenticated-document-viewer";

import type { BrokerBankDetailItem } from "@/lib/api";
import { formatApiDateTimeAsIST } from "@/lib/formatters";

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

            {detail.upi_qr_code_url && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    UPI QR Code
                  </div>
                  {detail.upi_qr_code_url.startsWith('data:image') ? (
                    <div className="flex items-start gap-4">
                      <div className="relative h-32 w-32 overflow-hidden rounded border bg-muted flex-shrink-0">
                        <Image
                          src={detail.upi_qr_code_url}
                          alt="UPI QR Code"
                          fill
                          className="object-cover"
                          sizes="128px"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="text-sm text-muted-foreground">Base64 Image</div>
                      </div>
                    </div>
                  ) : (
                    <AuthenticatedDocumentViewer
                      src={detail.upi_qr_code_url}
                      label="UPI QR Code"
                      mode="thumbnail"
                      imageFit="contain"
                      previewClassName="h-32 w-32"
                    />
                  )}
                </div>
              </>
            )}

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <DetailRow label="Address" value={detail.address} />
              <DetailRow label="Created at" value={formatApiDateTimeAsIST(detail.created_at)} />
              <DetailRow label="Updated at" value={formatApiDateTimeAsIST(detail.updated_at)} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
