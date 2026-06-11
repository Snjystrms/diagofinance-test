"use client";

import { useEffect, useState } from "react";
import { Upload, X } from "lucide-react";

import { AuthImage } from "@/components/ui/auth-image";
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
import type { BrokerCryptoWallet, BrokerCryptoWalletUpdateBody } from "@/lib/api";

const NETWORK_OPTIONS = [
  { label: "TRC20", value: "TRC20" },
  { label: "ERC20", value: "ERC20" },
  { label: "BEP20", value: "BEP20" },
];

interface EditWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: BrokerCryptoWallet | null;
  onSubmit: (data: BrokerCryptoWalletUpdateBody) => Promise<void>;
}

export function EditWalletDialog({ open, onOpenChange, wallet, onSubmit }: EditWalletDialogProps) {
  const [network, setNetwork] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [walletScreenshot, setWalletScreenshot] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [isActive, setIsIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && wallet) {
      setNetwork(wallet.network);
      setWalletAddress(wallet.wallet_address);
      setLabel(wallet.label ?? "");
      setIsIsActive(wallet.is_active === 1);
      setWalletScreenshot(null);
      setPreviewUrl(null);
    }
  }, [open, wallet]);

  useEffect(() => {
    if (!open) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setWalletScreenshot(null);
      setIsSubmitting(false);
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

    if (!network || !walletAddress.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        network,
        wallet_address: walletAddress.trim(),
        wallet_screenshot: walletScreenshot ?? undefined,
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

  const currentImageUrl = wallet?.wallet_screenshot_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Crypto Wallet</DialogTitle>
          <DialogDescription>
            Update the broker crypto wallet details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-network">Network *</Label>
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
            <Label htmlFor="edit-wallet_address">Wallet Address *</Label>
            <Input
              id="edit-wallet_address"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter wallet address"
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>Wallet Screenshot / QR Code</Label>
            <p className="text-xs text-muted-foreground">Leave empty to keep the existing screenshot.</p>
            {previewUrl ? (
              <div className="relative inline-block">
                <img
                  src={previewUrl}
                  alt="New screenshot preview"
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
            ) : currentImageUrl ? (
              <div className="flex items-center gap-3">
                <AuthImage
                  src={currentImageUrl}
                  alt="Current screenshot"
                  className="h-20 w-20 rounded-md border object-cover"
                  fallbackClassName="h-20 w-20 rounded-md"
                />
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 hover:bg-muted/50">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Replace</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
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
            <Label htmlFor="edit-label">Label</Label>
            <Input
              id="edit-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. USDT TRC20"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-is_active"
              checked={isActive}
              onChange={(e) => setIsIsActive(e.target.checked)}
              className="h-4 w-4 rounded border"
            />
            <Label htmlFor="edit-is_active" className="cursor-pointer">
              Active
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !network || !walletAddress.trim()}>
              {isSubmitting ? "Updating..." : "Update Wallet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
