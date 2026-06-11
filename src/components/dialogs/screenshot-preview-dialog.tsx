"use client";

import { AuthImage } from "@/components/ui/auth-image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ScreenshotPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string | null;
  title?: string;
}

export function ScreenshotPreviewDialog({
  open,
  onOpenChange,
  imageUrl,
  title = "Wallet Screenshot",
}: ScreenshotPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            QR code / screenshot for the crypto wallet address.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center py-4">
          {imageUrl ? (
            <AuthImage
              src={imageUrl}
              alt={title}
              className="max-h-[70vh] max-w-full rounded-md border object-contain"
              fallbackClassName="h-48 w-48 rounded-md"
            />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center rounded-md border bg-muted text-sm text-muted-foreground">
              No screenshot available
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
