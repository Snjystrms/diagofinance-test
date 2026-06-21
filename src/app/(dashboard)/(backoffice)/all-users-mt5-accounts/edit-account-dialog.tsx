"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { adminAccountTypesApi, type AccountTypeItem } from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import toast from "react-hot-toast";
import type { AdminMT5Account, UpdateMT5AccountRequest } from "@/lib/api";

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AdminMT5Account | null;
  onSubmit: (data: UpdateMT5AccountRequest) => Promise<void>;
}

interface EditAccountFormState {
  first_name: string;
  last_name: string;
  account_type_id: string;
  mode: string;
  leverage: string;
  password: string;
  investor_password: string;
}

const getAccountUser = (account: AdminMT5Account) => {
  const user = account.user ?? account.User;
  return {
    first_name: user?.first_name ?? account.first_name ?? "",
    last_name: user?.last_name ?? account.last_name ?? "",
  };
};

export function EditAccountDialog({
  open,
  onOpenChange,
  account,
  onSubmit,
}: EditAccountDialogProps) {
  const { token } = useAuth();
  const [formData, setFormData] = useState<EditAccountFormState>({
    first_name: "",
    last_name: "",
    account_type_id: "",
    mode: "",
    leverage: "",
    password: "",
    investor_password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountTypes, setAccountTypes] = useState<AccountTypeItem[]>([]);
  const [loadingAccountTypes, setLoadingAccountTypes] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showInvestorPassword, setShowInvestorPassword] = useState(false);

  useEffect(() => {
    if (!open || !token) return;

    const loadAccountTypes = async () => {
      try {
        setLoadingAccountTypes(true);
        const response = await adminAccountTypesApi.list({ token });
        const data = response?.data as { accountTypes?: AccountTypeItem[] } | undefined;
        const typesList = Array.isArray(data?.accountTypes) ? data.accountTypes : [];
        setAccountTypes(typesList);
      } catch (error) {
        console.error("Failed to load account types:", error);
        toast.error(
          getAdminFriendlyErrorMessage(error, {
            resource: "account types",
            action: "load",
          })
        );
      } finally {
        setLoadingAccountTypes(false);
      }
    };

    void loadAccountTypes();

    // Cleanup when dialog closes
    return () => {
      if (!open) {
        setShowPassword(false);
        setShowInvestorPassword(false);
      }
    };
  }, [open, token]);

  useEffect(() => {
    if (!account) {
      // Reset form when no account selected
      setFormData({
        first_name: "",
        last_name: "",
        account_type_id: "",
        mode: "",
        leverage: "",
        password: "",
        investor_password: "",
      });
      return;
    }

    const accountTypeId = account.account_type_id ?? account.accountType?.id ?? account.AdminMT5AccountType?.id;
    const mode = account.account_mode ?? "live";
    const userInfo = getAccountUser(account);

    setFormData({
      first_name: userInfo.first_name,
      last_name: userInfo.last_name,
      account_type_id: accountTypeId !== undefined && accountTypeId !== null ? String(accountTypeId) : "",
      mode: typeof mode === "string" ? mode : "",
      leverage: account.leverage !== undefined && account.leverage !== null ? String(account.leverage) : "",
      password: "",
      investor_password: "",
    });
  }, [account, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!account) return;

    const accountTypeId = Number(formData.account_type_id);
    const leverage = Number(formData.leverage);

    if (!Number.isFinite(accountTypeId) || accountTypeId <= 0) {
      toast.error("Please select a valid account type");
      return;
    }

    if (!formData.mode || (formData.mode !== "demo" && formData.mode !== "live")) {
      toast.error("Please select a valid mode (demo or live)");
      return;
    }

    if (!Number.isFinite(leverage) || leverage <= 0) {
      toast.error("Please enter a valid leverage");
      return;
    }

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      toast.error("Please enter first name and last name");
      return;
    }

    setIsSubmitting(true);
    try {
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`;
      const submitData: UpdateMT5AccountRequest = {
        account_type_id: accountTypeId,
        mode: formData.mode as "demo" | "live",
        leverage,
        name: fullName,
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(event) => setFormData({ ...formData, first_name: event.target.value })}
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(event) => setFormData({ ...formData, last_name: event.target.value })}
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account_type_id">Account Type</Label>
                <Select
                  value={formData.account_type_id}
                  onValueChange={(value) => setFormData({ ...formData, account_type_id: value })}
                  disabled={loadingAccountTypes || accountTypes.length === 0}
                >
                  <SelectTrigger id="account_type_id" className="w-full">
                    <SelectValue
                      placeholder={loadingAccountTypes ? "Loading types..." : "Select account type..."}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mode">Mode</Label>
                <Select
                  value={formData.mode}
                  onValueChange={(value) => setFormData({ ...formData, mode: value })}
                >
                  <SelectTrigger id="mode" className="w-full">
                    <SelectValue placeholder="Select mode..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="demo">Demo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
