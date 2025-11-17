"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreateMT5AccountRequest, PendingUser, AccountType } from "@/lib/api";
import { adminUsersApi, accountTypesApi } from "@/lib/api";

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

  // User search state
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);

  // Account type state
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [loadingAccountTypes, setLoadingAccountTypes] = useState(false);
  const [accountTypeSearchOpen, setAccountTypeSearchOpen] = useState(false);
  const [accountTypeSearchQuery, setAccountTypeSearchQuery] = useState("");
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType | null>(null);

  // Load account types
  useEffect(() => {
    if (open && token) {
      loadAccountTypes();
    }
  }, [open, token]);

  const loadAccountTypes = async () => {
    if (!token) return;
    try {
      setLoadingAccountTypes(true);
      const response = await accountTypesApi.getActive(token);
      // Handle ApiResponse structure: { success, message, data: AccountType[] }
      const types = Array.isArray(response) 
        ? response 
        : (response?.data && Array.isArray(response.data) 
            ? response.data 
            : []);
      setAccountTypes(types);
    } catch (error) {
      console.error("Failed to load account types:", error);
      toast.error("Failed to load account types");
    } finally {
      setLoadingAccountTypes(false);
    }
  };

  // Debounced user search
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
      
      const userList = 
        response?.data?.users ||
        response?.data?.items ||
        response?.users ||
        response?.items ||
        (Array.isArray(response?.data) ? response.data : []) ||
        [];
      
      setUsers(userList);
    } catch (error) {
      console.error("Failed to search users:", error);
      toast.error("Failed to search users");
    } finally {
      setLoadingUsers(false);
    }
  }, 300);

  useEffect(() => {
    if (userSearchQuery) {
      debouncedUserSearch(userSearchQuery);
    } else {
      setUsers([]);
    }
  }, [userSearchQuery, debouncedUserSearch]);

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
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
      setAccountTypeSearchQuery("");
      setUsers([]);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
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
      // Error is already handled in the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create MT5 Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>User *</Label>
                <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={userSearchOpen}
                      className="w-full justify-between"
                    >
                      {selectedUser
                        ? `${selectedUser.first_name || ""} ${selectedUser.last_name || ""} (ID: ${selectedUser.id})`
                        : "Search and select user..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search users by name, email..."
                        value={userSearchQuery}
                        onValueChange={setUserSearchQuery}
                      />
                      <CommandList>
                        {loadingUsers ? (
                          <div className="flex items-center justify-center p-4">
                            <Spinner className="h-4 w-4" />
                          </div>
                        ) : (
                          <>
                            <CommandEmpty>
                              {userSearchQuery ? "No users found." : "Start typing to search users..."}
                            </CommandEmpty>
                            <CommandGroup>
                              {users.map((user) => (
                                <CommandItem
                                  key={user.id}
                                  value={`${user.first_name} ${user.last_name} ${user.email} ${user.id}`}
                                  onSelect={() => {
                                    setSelectedUser(user);
                                    setFormData({ ...formData, user_id: Number(user.id) });
                                    setUserSearchOpen(false);
                                    setUserSearchQuery("");
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedUser?.id === user.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>
                                      {user.first_name} {user.last_name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {user.email} • ID: {user.id}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Account Type *</Label>
                <Popover open={accountTypeSearchOpen} onOpenChange={setAccountTypeSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={accountTypeSearchOpen}
                      className="w-full justify-between"
                      disabled={loadingAccountTypes}
                    >
                      {selectedAccountType
                        ? selectedAccountType.name
                        : loadingAccountTypes
                        ? "Loading..."
                        : "Select account type..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search account types..."
                        value={accountTypeSearchQuery}
                        onValueChange={setAccountTypeSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No account types found.</CommandEmpty>
                        <CommandGroup>
                          {accountTypes
                            .filter((type) =>
                              accountTypeSearchQuery
                                ? type.name.toLowerCase().includes(accountTypeSearchQuery.toLowerCase())
                                : true
                            )
                            .map((type) => (
                              <CommandItem
                                key={type.id}
                                value={type.name}
                                onSelect={() => {
                                  setSelectedAccountType(type);
                                  setFormData({ ...formData, account_type_id: Number(type.id) });
                                  setAccountTypeSearchOpen(false);
                                  setAccountTypeSearchQuery("");
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedAccountType?.id === type.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{type.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    Leverage: {type.maximum_leverage} • Spread: {type.spread_from}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_mode">Account Mode *</Label>
                <Select
                  value={formData.account_mode}
                  onValueChange={(value: "demo" | "live") =>
                    setFormData({ ...formData, account_mode: value })
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
                  onValueChange={(value) =>
                    setFormData({ ...formData, currency: value })
                  }
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      leverage_temp: e.target.value ? Number(e.target.value) : 0,
                    })
                  }
                  placeholder="Enter leverage"
                  required
                />
              </div>
              <div className="space-y-2 flex items-end">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="swap_free"
                    checked={formData.swap_free}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, swap_free: checked === true })
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
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Enter password"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password *</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) =>
                    setFormData({ ...formData, confirm_password: e.target.value })
                  }
                  placeholder="Confirm password"
                  required
                  minLength={6}
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

