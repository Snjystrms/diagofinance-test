"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

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
import type { AccountTypeGroupItem, CreateIBExistingClientRequest, PendingUser } from "@/lib/api";

interface CreateExistingClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateIBExistingClientRequest) => Promise<void>;
}

type CreateExistingClientFormState = CreateIBExistingClientRequest;

export function CreateExistingClientDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateExistingClientDialogProps) {
  const { token } = useAuth();
  const [formData, setFormData] = useState<CreateExistingClientFormState>({
    client_id: 0,
    group_id: 0,
    leverage: 100,
    mt5_id: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingAccountTypes, setLoadingAccountTypes] = useState(false);
  const [groups, setGroups] = useState<AccountTypeGroupItem[]>([]);

  useEffect(() => {
    if (open && token) {
      void loadAccountTypes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token]);

  const loadAccountTypes = async () => {
    if (!token) return;

    try {
      setLoadingAccountTypes(true);
      const response = await adminAccountTypesApi.list({ token });
      const items = response?.data?.accountTypes ?? [];

      // Extract live groups from account types
      const liveGroups = items
        .filter((type) => type.groups?.live && type.groups.live.status)
        .map((type) => type.groups!.live!);
      setGroups(liveGroups);
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
      client_id: 0,
      group_id: 0,
      leverage: 100,
      mt5_id: "",
    });
    setUserSearchQuery("");
    setUsers([]);
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.client_id || formData.client_id === 0) {
      toast.error("Please select a client");
      return;
    }

    if (!formData.group_id || formData.group_id === 0) {
      toast.error("Please select a group");
      return;
    }

    if (!formData.leverage || formData.leverage <= 0) {
      toast.error("Please enter a valid leverage");
      return;
    }

    if (!formData.mt5_id || String(formData.mt5_id).trim() === "") {
      toast.error("Please enter MT5 ID");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateIBExistingClientRequest = {
        client_id: formData.client_id,
        group_id: formData.group_id,
        leverage: formData.leverage,
        mt5_id: formData.mt5_id,
      };

      await onSubmit(payload);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating existing client:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserSearchChange = (value: string) => {
    setUserSearchQuery(value);
    setFormData((prev) => ({ ...prev, client_id: 0 }));
  };

  const handleUserSelect = (user: PendingUser) => {
    setUserSearchQuery(user.email || user.name || String(user.id));
    setFormData((prev) => ({
      ...prev,
      client_id: Number(user.id),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Existing Client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Input
                id="client-search"
                placeholder="Type at least 3 letters to search clients"
                value={userSearchQuery}
                onChange={(e) => handleUserSearchChange(e.target.value)}
                disabled={loadingUsers}
              />
              {loadingUsers && <div className="text-sm text-muted-foreground">Searching clients...</div>}
              {userSearchQuery.trim().length >= 3 && !loadingUsers && users.length === 0 && (
                <div className="text-sm text-muted-foreground">No clients found.</div>
              )}
              {users.map((user) => (
                <div
                  key={user.id}
                  className="border rounded p-2 cursor-pointer hover:bg-muted"
                  onClick={() => handleUserSelect(user)}
                >
                  <div className="font-medium">{user.name || user.email || `User ${user.id}`}</div>
                  <div className="text-xs text-muted-foreground">
                    {user.email} | ID: {user.id}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label>Group *</Label>
              <Select
                value={formData.group_id ? String(formData.group_id) : ""}
                onValueChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    group_id: value ? Number(value) : 0,
                  }));
                }}
                disabled={loadingAccountTypes || groups.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      loadingAccountTypes
                        ? "Loading groups..."
                        : "Select group..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={String(group.id)}>
                      <div className="flex flex-col">
                        <span>{group.name}</span>
                        <span className="text-xs text-muted-foreground">
                          MT5: {group.mt5_group_name}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="mt5_id">MT5 ID *</Label>
                <Input
                  id="mt5_id"
                  type="text"
                  value={formData.mt5_id}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      mt5_id: event.target.value,
                    }))
                  }
                  placeholder="Enter MT5 ID"
                  required
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
                  Adding...
                </>
              ) : (
                "Add Existing Client"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}