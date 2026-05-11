"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

import { SearchSelectField } from "@/components/search-select-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth-context";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { accountTypesApi, adminUsersApi } from "@/lib/api";
import type { AccountType, CreateMT5AccountRequest, PendingUser } from "@/lib/api";

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateMT5AccountRequest) => Promise<void>;
}

export function CreateAccountDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateAccountDialogProps) {
  const { token } = useAuth();
  const [formData, setFormData] = useState<CreateMT5AccountRequest>({
    account_type_id: 0,
    account_mode: "demo",
    leverage_temp: 50,
    currency: "USD",
    swap_free: false,
    password: "",
    confirm_password: "",
    user_id: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [loadingAccountTypes, setLoadingAccountTypes] = useState(false);
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (open && token) {
      void loadAccountTypes();
    }
  }, [open, token]);

  const loadAccountTypes = async () => {
    if (!token) return;

    try {
      setLoadingAccountTypes(true);
      const response = await accountTypesApi.getActive(token);
      const types = Array.isArray(response)
        ? response
        : response?.data && Array.isArray(response.data)
          ? response.data
          : [];
      setAccountTypes(types);
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

  const debouncedUserSearch = useDebouncedCallback(async (search: string) => {
    if (!token || !search.trim()) {
      setUsers([]);
      return;
    }

    try {
      setLoadingUsers(true);
      const response = await adminUsersApi.list({
        token,
        page: 1,
        limit: 50,
        search: search.trim(),
      });

      const data = response?.data;
      const userList =
        (data && "users" in data ? (data.users as PendingUser[]) : undefined) ||
        (data && "items" in data ? (data.items as PendingUser[]) : undefined) ||
        (Array.isArray(data) ? (data as PendingUser[]) : undefined) ||
        (data &&
        typeof data === "object" &&
        "data" in data &&
        Array.isArray((data as { data?: unknown }).data)
          ? (data as { data: PendingUser[] }).data
          : undefined) ||
        [];

      setUsers(userList);
    } catch (error) {
      console.error("Failed to search users:", error);
      toast.error(
        getAdminFriendlyErrorMessage(error, {
          resource: "users",
          action: "load",
        })
      );
    } finally {
      setLoadingUsers(false);
    }
  }, 300);

  useEffect(() => {
    if (userSearchQuery.trim()) {
      debouncedUserSearch(userSearchQuery);
    } else {
      setUsers([]);
    }
  }, [userSearchQuery, debouncedUserSearch]);

  useEffect(() => {
    if (!open) return;

    setFormData({
      account_type_id: 0,
      account_mode: "demo",
      leverage_temp: 50,
      currency: "USD",
      swap_free: false,
      password: "",
      confirm_password: "",
      user_id: 0,
    });
    setSelectedUser(null);
    setSelectedAccountType(null);
    setUserSearchQuery("");
    setUsers([]);
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.account_type_id || formData.account_type_id === 0) {
      toast.error("Please select an account type");
      return;
    }

    if (!formData.user_id || formData.user_id === 0) {
      toast.error("Please select a user");
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }

    if (!formData.leverage_temp || formData.leverage_temp <= 0) {
      toast.error("Please enter a valid leverage");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating account:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserSearchChange = (value: string) => {
    setUserSearchQuery(value);
    setSelectedUser(null);
    setFormData((prev) => ({ ...prev, user_id: 0 }));
  };

  const handleUserSelect = (user: PendingUser) => {
    setSelectedUser(user);
    setUserSearchQuery(user.email || user.name || String(user.id));
    setFormData((prev) => ({
      ...prev,
      user_id: Number(user.id),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create MT5 Account</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <SearchSelectField
                id="user-search"
                label="User *"
                options={users}
                searchValue={userSearchQuery}
                selectedValue={selectedUser ? String(selectedUser.id) : ""}
                placeholder="Search users by name, email, or mobile"
                loading={loadingUsers}
                loadingMessage="Searching users..."
                idleMessage="Start typing to search users."
                emptyMessage="No users found."
                onSearchValueChange={handleUserSearchChange}
                onOptionSelect={handleUserSelect}
                getOptionValue={(user) => String(user.id)}
                getOptionLabel={(user) => user.name || user.email || `User ${user.id}`}
                getOptionDescription={(user) =>
                  [user.email, user.mobile ? `Mobile: ${user.mobile}` : null, `ID: ${user.id}`]
                    .filter(Boolean)
                    .join(" | ")
                }
              />

              <div className="space-y-2">
                <Label>Account Type *</Label>
                <Select
                  value={selectedAccountType?.id ? String(selectedAccountType.id) : ""}
                  onValueChange={(value) => {
                    const type = accountTypes.find((item) => String(item.id) === value) || null;
                    setSelectedAccountType(type);
                    setFormData((prev) => ({
                      ...prev,
                      account_type_id: type ? Number(type.id) : 0,
                    }));
                  }}
                  disabled={loadingAccountTypes || accountTypes.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        loadingAccountTypes
                          ? "Loading account types..."
                          : "Select account type..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {accountTypes.map((type) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        <div className="flex flex-col">
                          <span>{type.name}</span>
                          <span className="text-xs text-muted-foreground">
                            Leverage: {type.maximum_leverage} | Spread: {type.spread_from}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_mode">Account Mode *</Label>
                <Select
                  value={formData.account_mode}
                  onValueChange={(value: "demo" | "live") =>
                    setFormData((prev) => ({ ...prev, account_mode: value }))
                  }
                >
                  <SelectTrigger id="account_mode">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="demo">Demo</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leverage_temp">Leverage *</Label>
                <Input
                  id="leverage_temp"
                  type="number"
                  value={formData.leverage_temp || ""}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      leverage_temp: event.target.value ? Number(event.target.value) : 0,
                    }))
                  }
                  placeholder="Enter leverage"
                  required
                />
              </div>

              <div className="flex items-end space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="swap_free"
                    checked={formData.swap_free}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, swap_free: checked === true }))
                    }
                  />
                  <Label htmlFor="swap_free" className="cursor-pointer">
                    Swap Free
                  </Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, password: event.target.value }))
                    }
                    placeholder="Enter password"
                    required
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
                <Label htmlFor="confirm_password">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirm_password}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, confirm_password: event.target.value }))
                    }
                    placeholder="Confirm password"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
