"use client";

import { useState } from "react";

import { AuthImage } from "@/components/ui/auth-image";
import { Badge } from "@/components/ui/badge";
import { BackofficeDetailDialogSkeleton } from "@/components/loading/backoffice-page-skeletons";
import { ScreenshotPreviewDialog } from "@/components/dialogs/screenshot-preview-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BrokerCryptoWallet } from "@/lib/api";
import { formatApiDateTimeAsIST } from "@/lib/formatters";

interface WalletDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: BrokerCryptoWallet | null;
  loading?: boolean;
}

const emptyValue = "-";

const displayValue = (value: unknown) => {
  if (value === undefined || value === null || value === "") return emptyValue;
  return String(value);
};

const formatDate = (value: unknown) => {
  if (typeof value !== "string" || !value) return emptyValue;
  return formatApiDateTimeAsIST(value);
};

const DetailItem = ({ label, value }: { label: string; value: unknown }) => (
  <div className="space-y-1 rounded-md border bg-background p-3">
    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="break-words text-sm font-medium text-foreground">{displayValue(value)}</dd>
  </div>
);

export function WalletDetailsDialog({
  open,
  onOpenChange,
  wallet,
  loading = false,
}: WalletDetailsDialogProps) {
  const [screenshotPreviewOpen, setScreenshotPreviewOpen] = useState(false);
  const status = wallet?.is_active === 1 ? "Active" : "Inactive";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Crypto Wallet Details</DialogTitle>
          <DialogDescription>
            Complete information for the selected broker crypto wallet.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <BackofficeDetailDialogSkeleton fieldCount={6} sectionCount={2} />
        ) : !wallet ? (
          <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Wallet details are not available.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                {wallet.network}
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                {wallet.currency}
              </Badge>
              {wallet.label ? <span className="text-sm font-medium">{wallet.label}</span> : null}
              <Badge
                className={`ml-auto ${
                  status === "Active"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                }`}
              >
                {status}
              </Badge>
            </div>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Wallet Information</h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="ID" value={wallet.id} />
                <DetailItem label="Network" value={wallet.network} />
                <DetailItem label="Currency" value={wallet.currency} />
                <DetailItem label="Wallet Address" value={wallet.wallet_address} />
                <DetailItem label="Label" value={wallet.label} />
                <DetailItem label="Created" value={formatDate(wallet.created_at)} />
                <DetailItem label="Updated" value={formatDate(wallet.updated_at)} />
              </dl>
            </section>

            {wallet.wallet_screenshot_url ? (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Screenshot / QR Code</h3>
                <button
                  type="button"
                  onClick={() => setScreenshotPreviewOpen(true)}
                  className="cursor-pointer transition-opacity hover:opacity-80"
                >
                  <AuthImage
                    src={wallet.wallet_screenshot_url}
                    alt="Wallet screenshot"
                    className="max-h-64 rounded-md border object-contain"
                    fallbackClassName="h-40 w-40 rounded-md"
                  />
                </button>
                <ScreenshotPreviewDialog
                  open={screenshotPreviewOpen}
                  onOpenChange={setScreenshotPreviewOpen}
                  imageUrl={wallet.wallet_screenshot_url}
                />
              </section>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
