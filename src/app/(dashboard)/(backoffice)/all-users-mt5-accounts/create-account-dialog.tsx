"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

import { SearchSelectField } from "@/components/search-select-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/auth-context";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { adminAccountTypesApi, adminUsersApi } from "@/lib/api";
import type { AccountTypeItem, CreateMT5AccountRequest, PendingUser } from "@/lib/api";

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateMT5AccountRequest) => Promise<void>;
}

type CreateAccountFormState = CreateMT5AccountRequest;

export function CreateAccountDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateAccountDialogProps) {
  const { token } = useAuth();
  const [formData, setFormData] = useState<CreateAccountFormState>({
    user_id: 0,
    account_type_id: 0,
    leverage: 100,
    mode: "demo",
    main_password: "",
    confirm_password: "",
    investor_password: "",
    extra_fields: {},
    balance: 10000,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [accountTypes, setAccountTypes] = useState<AccountTypeItem[]>([]);
  const [loadingAccountTypes, setLoadingAccountTypes] = useState(false);
  const [showMainPassword, setShowMainPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showInvestorPassword, setShowInvestorPassword] = useState(false);

  const selectedAccountType = accountTypes.find((type) => String(type.id) === String(formData.account_type_id));
  const balanceCurrency = selectedAccountType?.name?.trim().toLowerCase() === "cent" ? "USD" : "USD";

  const getGroupNames = (type: AccountTypeItem) => {
    const names = [
      type.groups?.live?.mt5_group_name,
      type.groups?.demo?.mt5_group_name,
      type.group?.mt5_group_name,
    ]
      .map((name) => name?.trim())
      .filter((name): name is string => Boolean(name));
    return Array.from(new Set(names));
  };

  useEffect(() => {
    if (open && token) {
      void loadAccountTypes();
    }
  }, [open, token]);

  const loadAccountTypes = async () => {
    if (!token) return;

    try {
      setLoadingAccountTypes(true);
      const response = await adminAccountTypesApi.list({ token });
      const items = response?.data?.accountTypes ?? [];
      setAccountTypes(items);
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
    const trimmed = search.trim();
    if (!token || trimmed.length < 3) {
      setUsers([]);
      return;
    }

    try {
      setLoadingUsers(true);
      const response = await adminUsersApi.list({
        token,
        page: 1,
        limit: 50,
        search: trimmed,
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
    if (userSearchQuery.trim().length >= 3) {
      debouncedUserSearch(userSearchQuery);
    } else {
      setUsers([]);
    }
  }, [userSearchQuery, debouncedUserSearch]);

  useEffect(() => {
    if (!open) return;

    setFormData({
      user_id: 0,
      account_type_id: 0,
      leverage: 100,
      mode: "demo",
      main_password: "",
      confirm_password: "",
      investor_password: "",
      extra_fields: {},
      balance: 10000,
    });
    setSelectedUser(null);
    setUserSearchQuery("");
    setUsers([]);
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.account_type_id || formData.account_type_id === 0) {
      toast.error("Please select a group type");
      return;
    }

    if (!formData.user_id || formData.user_id === 0) {
      toast.error("Please select a user");
      return;
    }

    if (!formData.main_password || formData.main_password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (formData.main_password !== formData.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }

    if (!formData.investor_password || formData.investor_password.length < 6) {
      toast.error("Investor password must be at least 6 characters");
      return;
    }

    if (!formData.leverage || formData.leverage <= 0) {
      toast.error("Please enter a valid leverage");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateMT5AccountRequest = {
        user_id: formData.user_id,
        account_type_id: formData.account_type_id,
        leverage: formData.leverage,
        mode: formData.mode,
        main_password: formData.main_password,
        confirm_password: formData.confirm_password,
        investor_password: formData.investor_password,
        extra_fields: {},
      };

      if (formData.mode === "demo") {
        payload.balance = formData.balance;
      }

      await onSubmit(payload);
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
                placeholder="Type at least 3 letters to search users"
                loading={userSearchQuery.trim().length >= 3 ? loadingUsers : false}
                loadingMessage="Searching users..."
                idleMessage="Type at least 3 letters to search users."
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
                <Label>Group Type *</Label>
                <Select
                  value={formData.account_type_id ? String(formData.account_type_id) : ""}
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      account_type_id: value ? Number(value) : 0,
                    }));
                  }}
                  disabled={loadingAccountTypes || accountTypes.length === 0}
                >
                  <SelectTrigger className="w-full">
                    {/* Custom children keep the selected value a clean single
                        line; the rich multi-line rows stay in the dropdown. */}
                    <SelectValue
                      placeholder={
                        loadingAccountTypes
                          ? "Loading group types..."
                          : "Select group type..."
                      }
                    >
                      {selectedAccountType ? (
                        <span className="block truncate">
                          {selectedAccountType.name}
                        </span>
                      ) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-w-[320px]">
                    {accountTypes.map((type) => {
                      const groupNames = getGroupNames(type);
                      return (
                        <SelectItem key={type.id} value={String(type.id)} className="py-2">
                          <div className="min-w-0 max-w-[280px]">
                            <div className="truncate text-sm font-medium">
                              {type.name}
                            </div>
                            {/* <div className="truncate text-xs text-muted-foreground">
                              Group: {groupNames.length ? groupNames.join(", ") : "-"}
                            </div> */}
                            <div className="text-xs text-muted-foreground">
                              Leverage: {type.maximum_leverage ?? "-"}
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mode">Account Mode *</Label>
                <Select
                  value={formData.mode}
                  onValueChange={(value: "demo" | "live") =>
                    setFormData((prev) => ({ ...prev, mode: value }))
                  }
                >
                  <SelectTrigger id="mode">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="demo">Demo</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leverage">Leverage *</Label>
                <Input
                  id="leverage"
                  type="number"
                  value={formData.leverage || ""}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      leverage: event.target.value ? Number(event.target.value) : 0,
                    }))
                  }
                  placeholder="Enter leverage"
                  required
                />
              </div>
            </div>

            {formData.mode === "demo" && (
              <div className="space-y-2">
                <Label htmlFor="balance">Balance ({balanceCurrency}) *</Label>
                <Input
                  id="balance"
                  type="number"
                  value={formData.balance || ""}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      balance: event.target.value ? Number(event.target.value) : 0,
                    }))
                  }
                  placeholder="Enter balance"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="main_password">Main Password *</Label>
                <div className="relative">
                  <Input
                    id="main_password"
                    type={showMainPassword ? "text" : "password"}
                    value={formData.main_password}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, main_password: event.target.value }))
                    }
                    placeholder="Enter main password"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowMainPassword((prev) => !prev)}
                  >
                    {showMainPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

            <div className="space-y-2">
              <Label htmlFor="investor_password">Investor Password *</Label>
              <div className="relative">
                <Input
                  id="investor_password"
                  type={showInvestorPassword ? "text" : "password"}
                  value={formData.investor_password}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, investor_password: event.target.value }))
                  }
                  placeholder="Enter investor password"
                  required
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
