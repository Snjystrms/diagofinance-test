"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminMT5Account, UpdateMT5AccountRequest } from "@/lib/api";

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AdminMT5Account | null;
  onSubmit: (data: UpdateMT5AccountRequest) => Promise<void>;
}

export function EditAccountDialog({
  open,
  onOpenChange,
  account,
  onSubmit,
}: EditAccountDialogProps) {
  const [formData, setFormData] = useState<UpdateMT5AccountRequest>({
    name: "",
    email: "",
    mobile: "",
    leverage: undefined,
    status: 1,
    self_wallet: undefined,
    mt5_id: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || "",
        email: account.email || "",
        mobile: account.mobile || "",
        leverage: account.leverage ? Number(account.leverage) : undefined,
        status: account.status !== undefined ? Number(account.status) : 1,
        self_wallet: (account.self_wallet as string | number | undefined) || undefined,
        mt5_id: (account.mt5_id as string) || "",
      });
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    setIsSubmitting(true);
    try {
      // Convert self_wallet to number if it's a string
      const submitData: UpdateMT5AccountRequest = {
        ...formData,
        self_wallet: formData.self_wallet
          ? typeof formData.self_wallet === "string"
            ? parseFloat(formData.self_wallet)
            : formData.self_wallet
          : undefined,
      };

      await onSubmit(submitData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating account:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit MT5 Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="Enter mobile"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt5_id">MT5 ID</Label>
                <Input
                  id="mt5_id"
                  value={formData.mt5_id}
                  onChange={(e) => setFormData({ ...formData, mt5_id: e.target.value })}
                  placeholder="Enter MT5 ID"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leverage">Leverage</Label>
                <Input
                  id="leverage"
                  type="number"
                  value={formData.leverage || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      leverage: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  placeholder="Enter leverage"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="self_wallet">Self Wallet</Label>
                <Input
                  id="self_wallet"
                  type="number"
                  step="0.00000001"
                  value={formData.self_wallet || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      self_wallet: e.target.value ? e.target.value : undefined,
                    })
                  }
                  placeholder="Enter wallet amount"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={String(formData.status || 1)}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: Number(value) })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


