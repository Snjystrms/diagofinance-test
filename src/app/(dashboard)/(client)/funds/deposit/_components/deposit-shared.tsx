"use client";

import React, { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AuthenticatedDocumentViewer } from "@/components/authenticated-document-viewer";
import { formatApiDateTimeAsIST } from "@/lib/formatters";
import type { BrokerBankDetailItem } from "@/lib/api";
import { Clock } from "lucide-react";

export const MINIMUM_DEPOSIT_AMOUNT = 10; // $10 minimum deposit
export const MINIMUM_DEPOSIT_AMOUNT_LABEL = "$10 equivalent";
export const SETTLEMENT_LABEL = "Supported digital asset";

export const formatDateTime = (value?: string | null): string => {
  if (!value) return "-";
  try {
    return formatApiDateTimeAsIST(value);
  } catch {
    return String(value);
  }
};

export function useAuthImageUrl(
  url: string | null | undefined,
  token: string | null,
): string | null {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!url || !token) {
      setBlobUrl(null);
      return;
    }

    let cancelled = false;

    const fetchImage = async () => {
      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok || cancelled) return;
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        objectUrlRef.current = objectUrl;
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setBlobUrl(null);
      }
    };

    void fetchImage();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [url, token]);

  return blobUrl;
}

export const NETWORK_EXPLORER_URLS: Record<string, string> = {
  "BNB Smart Chain (BSC / BEP20)": "https://bscscan.com",
  "opBNB (OPBNB)": "https://mainnet.opbnbscan.com",
  "Tron (TRX / TRC20)": "https://tronscan.org",
  "Ethereum (ETH / ERC20)": "https://etherscan.io",
  "Aptos (APT)": "https://explorer.aptoslabs.com",
  "Solana (SOL)": "https://solscan.io",
  "Polygon (MATIC)": "https://polygonscan.com",
  "Arbitrum One (ARB)": "https://arbiscan.io",
  "Optimism (OP)": "https://optimistic.etherscan.io",
  "Base (BASE)": "https://basescan.org",
  "Avalanche C-Chain (AVAX)": "https://snowtrace.io",
  "Cronos (CRO)": "https://cronoscan.com",
  "Fantom (FTM)": "https://ftmscan.com",
  "Near Protocol (NEAR)": "https://explorer.near.org",
  "Cardano (ADA)": "https://cardanoscan.io",
};

export const NETWORK_EXPLORER_TX_PATH: Record<string, string> = {
  "Tron (TRX / TRC20)": "/#/transaction",
  "Aptos (APT)": "/txn",
  "Near Protocol (NEAR)": "/transactions",
};

export function getExplorerTxUrl(
  network: string | undefined,
  txHash: string,
): string | null {
  if (!network || !txHash) return null;
  const baseUrl = NETWORK_EXPLORER_URLS[network];
  if (!baseUrl) return null;
  const txPath = NETWORK_EXPLORER_TX_PATH[network] ?? "/tx";
  return `${baseUrl}${txPath}/${txHash}`;
}

export const isBrokerBankDetailActive = (detail: BrokerBankDetailItem) =>
  detail.is_active === true || detail.is_active === 1;

export function ComingSoonTab({
  name,
  description,
}: {
  name: string;
  description?: string | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
      <Clock className="h-10 w-10 opacity-40" />
      <p className="text-lg font-semibold text-foreground">{name}</p>
      {description && <p className="text-sm">{description}</p>}
      <Badge variant="outline">Coming Soon</Badge>
    </div>
  );
}

export function UPIQRCodeDisplay({
  qrCodeUrl,
  bankName,
}: {
  qrCodeUrl: string;
  bankName: string;
}) {
  return (
    <AuthenticatedDocumentViewer
      src={qrCodeUrl}
      label={`UPI QR Code for ${bankName}`}
      mode="thumbnail"
      previewClassName="h-48 w-48"
      imageFit="contain"
    />
  );
}

export function CashStatusBadge({ status }: { status: string }) {
  const normalized = String(status ?? "").toLowerCase();
  const isApproved = normalized === "approved" || normalized === "completed";
  const isRejected = normalized === "rejected" || normalized === "cancelled";

  const className = isApproved
    ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
    : isRejected
      ? "border-red-500/40 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/20"
      : "border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20";

  return (
    <Badge variant="outline" className={`text-xs capitalize ${className}`}>
      {status}
    </Badge>
  );
}
