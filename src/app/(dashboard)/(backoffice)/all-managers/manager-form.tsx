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
import { AlertTriangle, ChevronDown, ChevronRight, Eye, EyeOff, Loader2, Plus } from "lucide-react";
import {
  computeMissingDependencies,
  type ResolvedDependency,
} from "@/lib/permission-dependencies";

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
  password?: string;
  status?: boolean;
  permissions?: number[];
};

interface ManagerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValue) => void | Promise<unknown>;
  initialData?: ManagerRow | null;
  allPermissions?: PermissionItem[];
  groupedPermissions?: PermissionGroup[];
  onFetchPermissions?: () => void;
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const selectedPermissions = useMemo(
    () => new Set(form.permissions ?? []),
    [form.permissions]
  );

  // Permissions this selection depends on (cross-module API prerequisites) that
  // are not yet enabled — e.g. Commission Group needs Group List + IB Plan to
  // populate its dropdowns.
  const missingDependencies = useMemo<ResolvedDependency[]>(() => {
    if (readOnly) return [];
    return computeMissingDependencies({
      selectedIds: selectedPermissions,
      grouped: groupedPermissions,
    });
  }, [readOnly, selectedPermissions, groupedPermissions]);

  // Group the missing dependencies by their owning category for display.
  const missingDependenciesByCategory = useMemo(() => {
    const map = new Map<string, ResolvedDependency[]>();
    missingDependencies.forEach((dependency) => {
      const list = map.get(dependency.category) ?? [];
      list.push(dependency);
      map.set(dependency.category, list);
    });
    return Array.from(map.entries());
  }, [missingDependencies]);

  const addMissingDependencies = () => {
    if (!missingDependencies.length) return;
    setForm((prev) => {
      const current = new Set(prev.permissions ?? []);
      missingDependencies.forEach((dependency) => current.add(dependency.id));
      return { ...prev, permissions: Array.from(current) };
    });
  };

  useEffect(() => {
    if (open && (!allPermissions.length || !groupedPermissions.length)) {
      onFetchPermissions?.();
    }
  }, [open, allPermissions.length, groupedPermissions.length, onFetchPermissions]);

  useEffect(() => {
    if (isEdit && initialData) {
      setForm({
        id: initialData.id,
        name: initialData.name ?? "",
        email: initialData.email ?? "",
        mobile: (initialData.mobile ?? "").replace(/\D/g, "").slice(-10),
        status: !!initialData.status,
        permissions: (initialData.permissions ?? []).map((permission) => permission.id),
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

    setShowPassword(false);
    setShowNewPassword(false);
    setErrors({});
    setSubmitting(false);
  }, [isEdit, initialData, open]);

  useEffect(() => {
    if (!groupedPermissions.length) return;

    setCollapsedCategories((prev) => {
      const nextState: Record<string, boolean> = {};

      groupedPermissions.forEach((group) => {
        nextState[group.category] = prev[group.category] ?? false;
      });

      return nextState;
    });
  }, [groupedPermissions]);

  const togglePermission = (permissionId: number, checked: boolean) => {
    setForm((prev) => {
      const current = new Set(prev.permissions ?? []);
      if (checked) {
        current.add(permissionId);
      } else {
        current.delete(permissionId);
      }
      return { ...prev, permissions: Array.from(current) };
    });
  };

  const toggleCategoryPermissions = (group: PermissionGroup, checked: boolean) => {
    setForm((prev) => {
      const current = new Set(prev.permissions ?? []);

      group.permissions.forEach((permission) => {
        if (checked) {
          current.add(permission.id);
        } else {
          current.delete(permission.id);
        }
      });

      return { ...prev, permissions: Array.from(current) };
    });
  };

  const toggleCategoryCollapsed = (category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const validateField = (field: string, value: string) => {
    setErrors((prev) => {
      const nextErrors = { ...prev };
      delete nextErrors[field];
      return nextErrors;
    });

    if (field === "name") {
      if (!value.trim()) {
        setErrors((prev) => ({ ...prev, name: "Name is required" }));
        return false;
      }
      if (value.trim().length < 2) {
        setErrors((prev) => ({ ...prev, name: "Name must be at least 2 characters" }));
        return false;
      }
      if (!/^[a-zA-Z\s'-]+$/.test(value)) {
        setErrors((prev) => ({
          ...prev,
          name: "Name can only contain letters, spaces, hyphens, and apostrophes",
        }));
        return false;
      }
    } else if (field === "email") {
      if (!value.trim()) {
        setErrors((prev) => ({ ...prev, email: "Email is required" }));
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setErrors((prev) => ({ ...prev, email: "Invalid email address" }));
        return false;
      }
    } else if (field === "mobile") {
      if (!value.trim()) {
        setErrors((prev) => ({ ...prev, mobile: "Mobile number is required" }));
        return false;
      }
      if (!/^\d+$/.test(value)) {
        setErrors((prev) => ({ ...prev, mobile: "Mobile number must contain only digits" }));
        return false;
      }
      if (value.length !== 10) {
        setErrors((prev) => ({ ...prev, mobile: "Mobile number must be exactly 10 digits" }));
        return false;
      }
    } else if (field === "password" && value) {
      if (value.length < 8) {
        setErrors((prev) => ({ ...prev, password: "Password must be at least 8 characters" }));
        return false;
      }
      if (!/[A-Z]/.test(value)) {
        setErrors((prev) => ({ ...prev, password: "Password must contain at least one uppercase letter" }));
        return false;
      }
      if (!/[a-z]/.test(value)) {
        setErrors((prev) => ({ ...prev, password: "Password must contain at least one lowercase letter" }));
        return false;
      }
      if (!/[0-9]/.test(value)) {
        setErrors((prev) => ({ ...prev, password: "Password must contain at least one number" }));
        return false;
      }
      if (!/[^A-Za-z0-9]/.test(value)) {
        setErrors((prev) => ({ ...prev, password: "Password must contain at least one special character" }));
        return false;
      }
    }

    return true;
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === "" || /^[a-zA-Z\s'-]*$/.test(value)) {
      setForm({ ...form, name: value });
      validateField("name", value);
    }
  };

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.toLowerCase();
    setForm({ ...form, email: value });
    validateField("email", value);
  };

  const handleMobileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      const limitedValue = value.slice(0, 10);
      setForm({ ...form, mobile: limitedValue });
      validateField("mobile", limitedValue);
    }
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setForm({ ...form, password: value });

    if (value) {
      validateField("password", value);
      return;
    }

    setErrors((prev) => {
      const nextErrors = { ...prev };
      delete nextErrors.password;
      return nextErrors;
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const nameValid = validateField("name", form.name);
    const emailValid = validateField("email", form.email);
    const mobileValid = validateField("mobile", form.mobile);

    if (isEdit) {
      let passwordValid = true;
      if (form.password?.trim()) {
        passwordValid = validateField("password", form.password);
      }

      if (!nameValid || !emailValid || !mobileValid || !passwordValid) {
        return;
      }

      const payload: FormValue = {
        id: form.id,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.trim().slice(0, 10),
        status: !!form.status,
        permissions: form.permissions ?? [],
      };
      const trimmedPassword = form.password?.trim();
      if (trimmedPassword) {
        payload.password = trimmedPassword;
      }

      try {
        setSubmitting(true);
        await onSubmit(payload);
      } catch {
        // Toast handling stays with the parent caller.
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!form.password?.trim()) {
      setErrors((prev) => ({ ...prev, password: "Password is required" }));
      return;
    }

    const passwordValid = validateField("password", form.password);
    if (!nameValid || !emailValid || !mobileValid || !passwordValid) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.trim().slice(0, 10),
        password: form.password.trim(),
        permissions: form.permissions ?? [],
      });
      onOpenChange(false);
    } catch {
      // Toast handling stays with the parent caller.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        KEY FIX: DialogContent is now a flex column with a fixed max-height.
        - Header and footer are non-shrinking flex children ("shrink-0").
        - Only the middle body section scrolls ("flex-1 overflow-y-auto min-h-0").
        Previously, `max-h-[90vh] overflow-y-auto` sat on the outer grid container
        that also held the header + footer, so the whole dialog (including the
        footer) lived inside one scrollable area. When the permissions list
        expanded/collapsed, that grid could compute extra height that the actual
        content no longer needed, leaving dead space below the Cancel/Create
        buttons that you could still scroll into. Splitting header/body/footer
        into distinct flex regions means the footer always sits directly under
        the real content, and only the body scrolls.
      */}
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-3xl">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>{isEdit ? (readOnly ? "View Sub-Admin" : "Edit Sub-Admin") : "Create Sub-Admin"}</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={handleNameChange}
                  onBlur={() => validateField("name", form.name)}
                  placeholder="John Manager"
                  disabled={readOnly}
                  maxLength={80}
                  required
                />
                {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={handleEmailChange}
                  onBlur={() => validateField("email", form.email)}
                  placeholder="john.manager@example.com"
                  disabled={readOnly}
                  required
                />
                {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={form.mobile}
                  onChange={handleMobileChange}
                  onBlur={() => validateField("mobile", form.mobile)}
                  placeholder="1234567890"
                  disabled={readOnly}
                  maxLength={10}
                  required
                />
                {errors.mobile ? <p className="text-sm text-destructive">{errors.mobile}</p> : null}
              </div>

              {!isEdit ? (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={handlePasswordChange}
                      onBlur={() => {
                        if (form.password) {
                          validateField("password", form.password);
                        }
                      }}
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
                  {errors.password ? <p className="text-sm text-destructive">{errors.password}</p> : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={form.password ?? ""}
                      onChange={handlePasswordChange}
                      onBlur={() => {
                        if (form.password) {
                          validateField("password", form.password);
                        }
                      }}
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
                  {errors.password ? <p className="text-sm text-destructive">{errors.password}</p> : null}
                  <p className="text-xs text-muted-foreground">Leave blank to keep the existing password.</p>
                </div>
              )}

              {isEdit ? (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="status"
                      checked={!!form.status}
                      onCheckedChange={(value) => setForm({ ...form, status: !!value })}
                      disabled={readOnly}
                    />
                    <span className="text-sm text-muted-foreground">Active</span>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3 rounded-md border p-4 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Permissions (by category)</Label>
                  {!readOnly ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onFetchPermissions?.()}
                    >
                      Refresh
                    </Button>
                  ) : null}
                </div>

                <div className="space-y-4">
                  {groupedPermissions.map((group) => {
                    const totalPermissions = group.permissions.length;
                    const checkedCount = group.permissions.filter((permission) =>
                      selectedPermissions.has(permission.id)
                    ).length;
                    const isAllChecked = totalPermissions > 0 && checkedCount === totalPermissions;
                    const isPartiallyChecked =
                      checkedCount > 0 && checkedCount < totalPermissions;
                    const isCollapsed = collapsedCategories[group.category] ?? false;

                    return (
                      <div key={group.category} className="rounded-lg border border-border/70 bg-muted/20">
                        <div className="flex items-center gap-3 px-3 py-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => toggleCategoryCollapsed(group.category)}
                            aria-label={isCollapsed ? `Expand ${group.category}` : `Collapse ${group.category}`}
                          >
                            {isCollapsed ? (
                              <ChevronRight className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>

                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <Checkbox
                              checked={isAllChecked ? true : isPartiallyChecked ? "indeterminate" : false}
                              onCheckedChange={(value) =>
                                toggleCategoryPermissions(group, value === true || value === "indeterminate")
                              }
                              disabled={readOnly || totalPermissions === 0}
                            />
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              onClick={() => toggleCategoryCollapsed(group.category)}
                            >
                              <div className="truncate text-sm font-semibold text-foreground">
                                {group.category}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {checkedCount}/{totalPermissions} selected
                              </div>
                            </button>
                          </div>
                        </div>

                        {!isCollapsed ? (
                          <div className="grid grid-cols-1 gap-3 border-t border-border/60 px-4 py-4 sm:grid-cols-2 md:grid-cols-3">
                            {group.permissions.map((permission) => {
                              const checked = selectedPermissions.has(permission.id);
                              return (
                                <label key={permission.id} className="flex items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(value) => togglePermission(permission.id, !!value)}
                                    disabled={readOnly}
                                  />
                                  <span className="text-muted-foreground">{permission.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {missingDependencies.length > 0 ? (
            <div className="shrink-0 border-t border-amber-300 bg-amber-50 px-6 py-3 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold">
                      {missingDependencies.length} dependent permission
                      {missingDependencies.length > 1 ? "s" : ""} not enabled
                    </p>
                    <p className="text-xs text-amber-800/90 dark:text-amber-300/80">
                      Selected modules load data from other modules&apos; APIs — without these,
                      those screens show empty dropdowns or fail.
                    </p>
                    <div className="max-h-24 space-y-1 overflow-y-auto pr-2">
                      {missingDependenciesByCategory.map(([category, dependencies]) => (
                        <div key={category} className="text-xs leading-relaxed">
                          <span className="font-medium">{category}:</span>{" "}
                          <span className="text-amber-800/80 dark:text-amber-300/70">
                            {dependencies.map((dependency) => dependency.name).join(", ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {!readOnly ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addMissingDependencies}
                    className="shrink-0 border-amber-400 bg-amber-100/60 text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100 dark:hover:bg-amber-900/50"
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add required permission{missingDependencies.length > 1 ? "s" : ""}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          <DialogFooter className="shrink-0 border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly ? (
              <Button type="submit" disabled={submitting} className="min-w-[9.5rem]">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                <span>{submitting ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save Changes" : "Create"}</span>
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}