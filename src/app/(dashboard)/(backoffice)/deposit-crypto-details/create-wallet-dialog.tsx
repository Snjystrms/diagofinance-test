"use client";

import { useEffect, useState } from "react";
import { Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BrokerCryptoWalletCreateBody } from "@/lib/api";

const NETWORK_OPTIONS = [
{ label: "BNB Smart Chain (BSC / BEP20)", value: "BNB Smart Chain (BSC / BEP20)" },
{ label: "opBNB (OPBNB)", value: "opBNB (OPBNB)" },
{ label: "Tron (TRX / TRC20)", value: "Tron (TRX / TRC20)" },
{ label: "Ethereum (ETH / ERC20)", value: "Ethereum (ETH / ERC20)" },
{ label: "Aptos (APT)", value: "Aptos (APT)" },
{ label: "Solana (SOL)", value: "Solana (SOL)" },
{ label: "Polygon (MATIC)", value: "Polygon (MATIC)" },
{ label: "Arbitrum One (ARB)", value: "Arbitrum One (ARB)" },
{ label: "Optimism (OP)", value: "Optimism (OP)" },
{ label: "Base (BASE)", value: "Base (BASE)" },
{ label: "Avalanche C-Chain (AVAX)", value: "Avalanche C-Chain (AVAX)" },
{ label: "Cronos (CRO)", value: "Cronos (CRO)" },
{ label: "Fantom (FTM)", value: "Fantom (FTM)" },
{ label: "Near Protocol (NEAR)", value: "Near Protocol (NEAR)" },
{ label: "Cardano (ADA)", value: "Cardano (ADA)" },
];

const CURRENCY_OPTIONS = [
// Major Cryptocurrencies
{ label: "Bitcoin (BTC)", value: "Bitcoin (BTC)" },
{ label: "Ethereum (ETH)", value: "Ethereum (ETH)" },
{ label: "Solana (SOL)", value: "Solana (SOL)" },
{ label: "BNB (BNB)", value: "BNB (BNB)" },
{ label: "Ripple (XRP)", value: "Ripple (XRP)" },
{ label: "Cardano (ADA)", value: "Cardano (ADA)" },
{ label: "Avalanche (AVAX)", value: "Avalanche (AVAX)" },
{ label: "Dogecoin (DOGE)", value: "Dogecoin (DOGE)" },
{ label: "TRON (TRX)", value: "TRON (TRX)" },
{ label: "Toncoin (TON)", value: "Toncoin (TON)" },
{ label: "Polkadot (DOT)", value: "Polkadot (DOT)" },
{ label: "Litecoin (LTC)", value: "Litecoin (LTC)" },

// Major Stablecoins
{ label: "Tether (USDT)", value: "Tether (USDT)" },
{ label: "USD Coin (USDC)", value: "USD Coin (USDC)" },
{ label: "First Digital USD (FDUSD)", value: "First Digital USD (FDUSD)" },
{ label: "Dai (DAI)", value: "Dai (DAI)" },
{ label: "PayPal USD (PYUSD)", value: "PayPal USD (PYUSD)" },
{ label: "Ethena USDe (USDe)", value: "Ethena USDe (USDe)" },
];

interface CreateWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BrokerCryptoWalletCreateBody) => Promise<void>;
}

export function CreateWalletDialog({ open, onOpenChange, onSubmit }: CreateWalletDialogProps) {
  const [network, setNetwork] = useState("");
  const [currency, setCurrency] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletScreenshot, setWalletScreenshot] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [isActive, setIsIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setNetwork("");
      setCurrency("");
      setWalletAddress("");
      setWalletScreenshot(null);
      setLabel("");
      setIsIsActive(true);
      setIsSubmitting(false);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setWalletScreenshot(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setWalletScreenshot(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!network || !currency) {
      return;
    }
    if (!walletAddress.trim()) {
      return;
    }
    if (!walletScreenshot) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        network,
        currency,
        wallet_address: walletAddress.trim(),
        wallet_screenshot: walletScreenshot,
        label: label.trim() || undefined,
        is_active: isActive ? 1 : 0,
      });
      onOpenChange(false);
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add Crypto Wallet</DialogTitle>
          <DialogDescription>
            Add a new broker crypto wallet for deposit payments.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="network">Network *</Label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger>
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                {NETWORK_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency *</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wallet_address">Wallet Address *</Label>
            <Input
              id="wallet_address"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter wallet address"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Wallet Screenshot / QR Code *</Label>
            {previewUrl ? (
              <div className="relative inline-block">
                <img
                  src={previewUrl}
                  alt="Wallet screenshot preview"
                  className="h-32 w-32 rounded-md border object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                  onClick={handleRemoveFile}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-4 hover:bg-muted/50">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Choose an image file</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. USDT TRC20"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={isActive}
              onChange={(e) => setIsIsActive(e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Active
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !network || !currency || !walletAddress.trim() || !walletScreenshot}>
              {isSubmitting ? "Creating..." : "Create Wallet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
