"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { adminGroupsApi } from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import toast from "react-hot-toast";
import type { AdminGroupItem, AdminMT5Account, UpdateMT5AccountRequest } from "@/lib/api";

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
  const { token } = useAuth();
  const [formData, setFormData] = useState<EditAccountFormState>({
    name: "",
    group_id: "",
    leverage: "",
    password: "",
    investor_password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groups, setGroups] = useState<AdminGroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showInvestorPassword, setShowInvestorPassword] = useState(false);

  useEffect(() => {
    if (!open || !token) return;

    const loadGroups = async () => {
      try {
        setLoadingGroups(true);
        const response = await adminGroupsApi.list(token);
        const groupsList = Array.isArray(response?.data) ? response.data : [];
        setGroups(groupsList);
      } catch (error) {
        console.error("Failed to load groups:", error);
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "groups",
            action: "load",
          })
        );
      } finally {
        setLoadingGroups(false);
      }
    };

    void loadGroups();
  }, [open, token]);

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
                <Select
                  value={formData.group_id}
                  onValueChange={(value) => setFormData({ ...formData, group_id: value })}
                  disabled={loadingGroups || groups.length === 0}
                >
                  <SelectTrigger id="group_id" className="w-full">
                    <SelectValue
                      placeholder={loadingGroups ? "Loading groups..." : "Select group..."}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={String(group.id)}>
                        {group.name || `Group ${group.id}`} (ID: {group.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                    placeholder="Leave blank to keep current"
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="investor_password">Investor password</Label>
                <div className="relative">
                  <Input
                    id="investor_password"
                    type={showInvestorPassword ? "text" : "password"}
                    value={formData.investor_password}
                    onChange={(event) =>
                      setFormData({ ...formData, investor_password: event.target.value })
                    }
                    placeholder="Leave blank to keep current"
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowInvestorPassword((prev) => !prev)}
                  >
                    {showInvestorPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
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
