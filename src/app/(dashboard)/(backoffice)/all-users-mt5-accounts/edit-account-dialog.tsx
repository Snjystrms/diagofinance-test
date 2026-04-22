"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminMT5Account, UpdateMT5AccountRequest } from "@/lib/api";

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AdminMT5Account | null;
  onSubmit: (data: UpdateMT5AccountRequest) => Promise<void>;
}

interface EditAccountFormState {
  name: string;
  group_id: string;
  leverage: string;
  password: string;
  investor_password: string;
}

const getAccountName = (account: AdminMT5Account) => {
  if (account.name) return account.name;
  return [account.first_name, account.last_name].filter(Boolean).join(" ").trim();
};

export function EditAccountDialog({
  open,
  onOpenChange,
  account,
  onSubmit,
}: EditAccountDialogProps) {
  const [formData, setFormData] = useState<EditAccountFormState>({
    name: "",
    group_id: "",
    leverage: "",
    password: "",
    investor_password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!account) return;

    setFormData({
      name: getAccountName(account),
      group_id: account.group_id !== undefined && account.group_id !== null ? String(account.group_id) : "",
      leverage: account.leverage !== undefined && account.leverage !== null ? String(account.leverage) : "",
      password: "",
      investor_password: "",
    });
  }, [account]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!account) return;

    const groupId = Number(formData.group_id);
    const leverage = Number(formData.leverage);

    if (!Number.isFinite(groupId) || groupId <= 0) {
      return;
    }

    if (!Number.isFinite(leverage) || leverage <= 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const submitData: UpdateMT5AccountRequest = {
        name: formData.name.trim(),
        group_id: groupId,
        leverage,
      };

      const password = formData.password.trim();
      const investorPassword = formData.investor_password.trim();

      if (password) {
        submitData.password = password;
      }

      if (investorPassword) {
        submitData.investor_password = investorPassword;
      }

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
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit MT5 Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Account holder name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                placeholder="Enter account holder name"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="group_id">Group ID</Label>
                <Input
                  id="group_id"
                  type="number"
                  min="1"
                  value={formData.group_id}
                  onChange={(event) => setFormData({ ...formData, group_id: event.target.value })}
                  placeholder="Enter group ID"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leverage">Leverage</Label>
                <Input
                  id="leverage"
                  type="number"
                  min="1"
                  value={formData.leverage}
                  onChange={(event) => setFormData({ ...formData, leverage: event.target.value })}
                  placeholder="Enter leverage"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">Main password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investor_password">Investor password</Label>
                <Input
                  id="investor_password"
                  type="password"
                  value={formData.investor_password}
                  onChange={(event) =>
                    setFormData({ ...formData, investor_password: event.target.value })
                  }
                  placeholder="Leave blank to keep current"
                />
              </div>
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
