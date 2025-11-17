// C:\Users\DELL\Desktop\crminhouse\src\app\all-managers\manager-form.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, EyeOff } from "lucide-react";

export type ManagerRow = {
  id: string;
  name: string;
  email: string;
  mobile: string;
  status: boolean;
  created_at?: string;
  permissions?: { id: number; name: string }[];
};

type PermissionItem = { id: number; name: string };
type PermissionGroup = { category: string; permissions: PermissionItem[] };

type FormValue = {
  id?: string;
  name: string;
  email: string;
  mobile: string;
  password?: string;         // only used on create
  status?: boolean;          // used on edit
  permissions?: number[];    // IDs only
};

interface ManagerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValue) => void;
  initialData?: ManagerRow | null;
  allPermissions?: PermissionItem[];           // flat, optional
  groupedPermissions?: PermissionGroup[];      // NEW: grouped
  onFetchPermissions?: () => void;             // fetch when opening in edit mode
  readOnly?: boolean;
}

export function ManagerForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  allPermissions = [],
  groupedPermissions = [],
  onFetchPermissions,
  readOnly = false,
}: ManagerFormProps) {
  const isEdit = useMemo(() => !!initialData?.id, [initialData]);

  const [form, setForm] = useState<FormValue>({
    name: "",
    email: "",
    mobile: "",
    password: "",
    status: true,
    permissions: [],
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Ensure permissions are fetched on open (edit only)
  useEffect(() => {
    if (open && isEdit && (!allPermissions?.length || !groupedPermissions?.length)) {
      onFetchPermissions?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit]);

  useEffect(() => {
    if (isEdit && initialData) {
      setForm({
        id: initialData.id,
        name: initialData.name ?? "",
        email: initialData.email ?? "",
        mobile: initialData.mobile ?? "",
        status: !!initialData.status,
        permissions: (initialData.permissions ?? []).map((p) => p.id), // store IDs
        password: "",
      });
    } else {
      setForm({
        name: "",
        email: "",
        mobile: "",
        password: "",
        status: true,
        permissions: [],
      });
    }
    // Reset password visibility when dialog opens/closes
    setShowPassword(false);
    setShowNewPassword(false);
  }, [isEdit, initialData, open]);

  const togglePermission = (pid: number, checked: boolean) => {
    setForm((prev) => {
      const current = new Set(prev.permissions ?? []);
      if (checked) current.add(pid);
      else current.delete(pid);
      return { ...prev, permissions: Array.from(current) };
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) return;
    if (!form.email.trim()) return;
    if (!form.mobile.trim()) return;

    if (isEdit) {
      const payload: FormValue = {
        id: form.id,
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        status: !!form.status,
        permissions: form.permissions ?? [],
      };
      const trimmedPassword = form.password?.trim();
      if (trimmedPassword) {
        payload.password = trimmedPassword;
      }
      onSubmit(payload);
    } else {
      if (!form.password?.trim()) return;
      onSubmit({
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        password: form.password.trim(),
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? (readOnly ? "View Manager" : "Edit Manager") : "Create Manager"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Manager"
                disabled={readOnly}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="john.manager@example.com"
                disabled={readOnly}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile</Label>
              <Input
                id="mobile"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                placeholder="+1234567890"
                disabled={readOnly}
                required
              />
            </div>

            {!isEdit && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="SecurePass123!"
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {isEdit && (
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={form.password ?? ""}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Leave blank to keep current password"
                    disabled={readOnly}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                    disabled={readOnly}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave blank to keep the existing password.
                </p>
              </div>
            )}

            {isEdit && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="status"
                    checked={!!form.status}
                    onCheckedChange={(v) => setForm({ ...form, status: !!v })}
                    disabled={readOnly}
                  />
                  <span className="text-sm text-muted-foreground">Active</span>
                </div>
              </div>
            )}

            {/* Permissions — ONLY in Edit mode, category-wise & scrollable */}
            {isEdit && (
              <div className="md:col-span-2 space-y-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <Label>Permissions (by category)</Label>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onFetchPermissions?.()}
                    >
                      Refresh
                    </Button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto pr-2 space-y-4">
                  {(groupedPermissions || []).map((grp) => (
                    <div key={grp.category}>
                      <div className="text-sm font-semibold mb-2">{grp.category}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {grp.permissions.map((perm) => {
                          const checked = (form.permissions ?? []).includes(perm.id);
                          return (
                            <label key={perm.id} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => togglePermission(perm.id, !!v)}
                                disabled={readOnly}
                              />
                              <span className="text-muted-foreground">
                                {perm.name}
                                {/* ID is not shown, but it's what we store/send */}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  Note: On update, the selected permission IDs are sent in the request.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button type="submit">{isEdit ? "Save Changes" : "Create"}</Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
