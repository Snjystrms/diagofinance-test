"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { Calendar, CheckCircle, Mail, Plus, RefreshCw, Search, Users } from "lucide-react";

import { AppDataTable } from "@/components/app-data-table";
import { DeleteDialog } from "@/components/dialogs/delete-dialog";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ProtectedRoute } from "@/components/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import {
  adminUsersApi,
  type AdminUserDetailApiData,
  type AdminUserUpdateBody,
  type AdminUsersListApiData,
  type PaginationMeta,
  type PendingUser,
} from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";
import { adminUserCreateSchema, type AdminUserCreateFormData } from "@/lib/validations";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

import { getColumnsWithActions } from "./columns";
import { UserFormDialog } from "./user-form-dialog";

const updateUserSchema = z
  .object({
    first_name: z.string().trim().min(2, "First name must be at least 2 characters"),
    last_name: z.string().trim().min(2, "Last name must be at least 2 characters"),
    email: z.string().trim().email("Invalid email address"),
    mobile: z.string().trim().optional().or(z.literal("")),
    country: z.string().trim().optional().or(z.literal("")),
    country_code: z.string().trim(),
    password: z.string().optional().or(z.literal("")),
    confirm_password: z.string().optional().or(z.literal("")),
    referral_code: z.string().trim().optional().or(z.literal("")),
  })
  .refine((data) => {
    if (!data.password && !data.confirm_password) return true;
    return data.password === data.confirm_password;
  }, {
    message: "Passwords don't match",
    path: ["confirm_password"],
  });

type UpdateUserFormData = z.infer<typeof updateUserSchema>;

const statusFilters = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "0" },
  { label: "Active", value: "1" },
  { label: "Blocked", value: "2" },
];

const createInitialCreateFormState = (): AdminUserCreateFormData => ({
  first_name: "",
  last_name: "",
  email: "",
  mobile: "",
  country: "",
  country_code: "",
  password: "",
  confirm_password: "",
  referral_code: "",
});

const createInitialUpdateFormState = (): UpdateUserFormData => ({
  first_name: "",
  last_name: "",
  email: "",
  mobile: "",
  country: "",
  country_code: "",
  password: "",
  confirm_password: "",
  referral_code: "",
});

const transformUser = (raw: Record<string, unknown>): PendingUser => ({
  id: typeof raw.id === "number" ? raw.id : Number(raw.id ?? 0) || 0,
  uuid: String(raw.uuid ?? ""),
  first_name: String(raw.first_name ?? ""),
  last_name: String(raw.last_name ?? ""),
  name: `${String(raw.first_name ?? "")} ${String(raw.last_name ?? "")}`.trim() || String(raw.name ?? "-"),
  email: String(raw.email ?? ""),
  username: String(raw.uuid ?? raw.username ?? ""),
  mobile: String(raw.mobile ?? ""),
  country: String(raw.country ?? ""),
  country_code: String(raw.country_code ?? ""),
  sponsor_id: String(raw.sponsor_id ?? ""),
  referral_code: String(raw.referral_code ?? ""),
  status: String(raw.status ?? ""),
  email_verified: typeof raw.email_verified === "number" ? raw.email_verified : Number(raw.email_verified ?? 0) || 0,
  payment_verified: typeof raw.payment_verified === "number" ? raw.payment_verified : Number(raw.payment_verified ?? 0) || 0,
  created_at: String(raw.created_at ?? ""),
});

const extractUsers = (payload?: AdminUsersListApiData | null): PendingUser[] => {
  if (!payload) return [];
  const pick = (value: unknown) => (Array.isArray(value) ? value as Array<Record<string, unknown>> : []);

  const directUsers = pick(payload.users);
  if (directUsers.length) return directUsers.map(transformUser);

  const directItems = pick(payload.items);
  if (directItems.length) return directItems.map(transformUser);

  if (Array.isArray(payload.data)) {
    return (payload.data as unknown as Array<Record<string, unknown>>).map(transformUser);
  }

  if (payload.data && typeof payload.data === "object") {
    const nested = payload.data as Record<string, unknown>;
    const nestedUsers = pick(nested.users);
    if (nestedUsers.length) return nestedUsers.map(transformUser);
    const nestedItems = pick(nested.items);
    if (nestedItems.length) return nestedItems.map(transformUser);
    const nestedData = pick(nested.data);
    if (nestedData.length) return nestedData.map(transformUser);
  }

  return [];
};

const extractPagination = (
  payload?: AdminUsersListApiData | null,
  response?: { pagination?: PaginationMeta; data?: { pagination?: PaginationMeta } } | null,
): PaginationMeta | undefined => {
  if (!payload) return undefined;
  if (payload.pagination) return payload.pagination;
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    const nested = payload.data as Record<string, unknown>;
    if (nested.pagination && typeof nested.pagination === "object") {
      return nested.pagination as PaginationMeta;
    }
  }
  return payload.meta?.pagination ?? response?.pagination ?? response?.data?.pagination;
};

const extractSingleUser = (payload?: AdminUserDetailApiData | null): PendingUser | null => {
  if (!payload) return null;
  if ("id" in payload) return transformUser(payload as unknown as Record<string, unknown>);

  const payloadObj = payload as Record<string, unknown>;
  if (payloadObj.user && typeof payloadObj.user === "object") {
    return transformUser(payloadObj.user as Record<string, unknown>);
  }
  if (payloadObj.data && typeof payloadObj.data === "object") {
    const nested = payloadObj.data as Record<string, unknown>;
    if (nested.user && typeof nested.user === "object") {
      return transformUser(nested.user as Record<string, unknown>);
    }
    return transformUser(nested);
  }
  return null;
};

export default function NewUsersPage() {
  const { token } = useAuth();

  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [statusFilter, setStatusFilter] = useQueryState("status", parseAsString.withDefault("all"));
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [searchInput, setSearchInput] = useState(search ?? "");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(false);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<PendingUser | null>(null);

  const createUserForm = useForm<AdminUserCreateFormData>({
    resolver: zodResolver(adminUserCreateSchema),
    defaultValues: createInitialCreateFormState(),
  });
  const editUserForm = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: createInitialUpdateFormState(),
  });

  useEffect(() => {
    setSearchInput(search ?? "");
  }, [search]);

  const debouncedApplySearch = useDebouncedCallback((value: string) => {
    void setPage(1);
    void setSearch(value.trim() ? value : null);
  }, 500);

  const setCountryValues = useCallback((countryName: string, mode: "create" | "edit") => {
    const countryData = COUNTRIES.find((country) => country.name === countryName);
    if (!countryData) return;
    const form = mode === "create" ? createUserForm : editUserForm;
    form.setValue("country", countryName, { shouldValidate: true });
    form.setValue("country_code", countryData.code, { shouldValidate: true });
  }, [createUserForm, editUserForm]);

  const loadUsers = useCallback(async () => {
    if (!token) {
      setUsers([]);
      setPaginationMeta(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await adminUsersApi.list({
        token,
        page,
        limit: perPage,
        search: search?.trim() ? search : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });

      const payload = response?.data ?? null;
      setUsers(extractUsers(payload));
      setPaginationMeta(extractPagination(payload, response as { pagination?: PaginationMeta; data?: { pagination?: PaginationMeta } }) ?? null);
    } catch (err) {
      console.error("Failed to load users:", err);
      toast.error(err instanceof Error ? err.message : "Failed to load users");
      setUsers([]);
      setPaginationMeta(null);
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage, search, statusFilter]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleCreate = async (values: AdminUserCreateFormData) => {
    if (!token) return;
    try {
      setCreatingUser(true);
      const { confirm_password: _confirmPassword, ...payload } = values;
      const response = await adminUsersApi.create(payload, token);
      toast.success((response as { message?: string })?.message || "User created successfully");
      setCreateDialogOpen(false);
      createUserForm.reset(createInitialCreateFormState());
      await loadUsers();
    } catch (err) {
      console.error("Failed to create user:", err);
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleEdit = useCallback(async (user: PendingUser) => {
    if (!token) return;
    try {
      setLoadingUserDetails(true);
      const response = await adminUsersApi.detail(user.id, token);
      const detailUser = extractSingleUser(response?.data ?? null) ?? user;
      setSelectedUser(detailUser);
      editUserForm.reset({
        first_name: detailUser.first_name ?? "",
        last_name: detailUser.last_name ?? "",
        email: detailUser.email ?? "",
        mobile: detailUser.mobile ?? "",
        country: detailUser.country ?? "",
        country_code: detailUser.country_code ?? "",
        password: "",
        confirm_password: "",
        referral_code: detailUser.referral_code ?? "",
      });
      setEditDialogOpen(true);
    } catch (err) {
      console.error("Failed to load user detail:", err);
      toast.error(err instanceof Error ? err.message : "Failed to load user detail");
    } finally {
      setLoadingUserDetails(false);
    }
  }, [token, editUserForm]);

  const handleUpdate = async (values: UpdateUserFormData) => {
    if (!token || !selectedUser) return;
    try {
      setUpdatingUser(true);
      const { confirm_password: _confirmPassword, ...payload } = values;
      const body: AdminUserUpdateBody = payload.password ? payload : { ...payload, password: undefined };
      const response = await adminUsersApi.update(selectedUser.id, body, token);
      toast.success((response as { message?: string })?.message || "User updated successfully");
      setEditDialogOpen(false);
      setSelectedUser(null);
      editUserForm.reset(createInitialUpdateFormState());
      await loadUsers();
    } catch (err) {
      console.error("Failed to update user:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleDelete = useCallback((user: PendingUser) => {
    setUserToDelete(user);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!token || !userToDelete) return;
    try {
      await adminUsersApi.delete(userToDelete.id, token);
      toast.success("User deleted successfully");
      setUserToDelete(null);
      await loadUsers();
    } catch (err) {
      console.error("Failed to delete user:", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete user");
    }
  }, [token, userToDelete, loadUsers]);

  const totalUsers = paginationMeta?.total ?? users.length;
  const totalPages =
    paginationMeta?.total_pages ??
    paginationMeta?.last_page ??
    (totalUsers && perPage ? Math.ceil(totalUsers / perPage) : 1);

  const columns = useMemo(() => getColumnsWithActions(handleEdit, handleDelete), [handleEdit, handleDelete]);

  return (
    <ProtectedRoute>
      <>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto space-y-6 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">New Users</h1>
                <p className="text-sm text-muted-foreground">
                  This page now uses the same `AppDataTable` pattern as MT5 accounts and the CRUD user endpoints.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create User
                </Button>
                <Button variant="outline" onClick={() => void loadUsers()} disabled={loading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{totalUsers}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Payment Verified</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{users.filter((user) => user.payment_verified === 1).length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Email Verified</CardTitle>
                  <Mail className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{users.filter((user) => user.email_verified === 1).length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New Today</CardTitle>
                  <Calendar className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {users.filter((user) => user.created_at && new Date(user.created_at).toDateString() === new Date().toDateString()).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex w-full max-w-xs items-center gap-2 rounded-md border bg-background px-3 py-1.5">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSearchInput(value);
                      debouncedApplySearch(value);
                    }}
                    placeholder="Search by name, email, mobile, or uuid"
                    className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                  />
                  {searchInput ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setSearchInput("");
                        void setSearch(null);
                        void setPage(1);
                      }}
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
                <Select
                  value={statusFilter ?? "all"}
                  onValueChange={(value) => {
                    void setStatusFilter(value === "all" ? null : value);
                    void setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-[180px] text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFilters.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                Page {paginationMeta?.current_page ?? paginationMeta?.page ?? page} of {Math.max(1, totalPages)} - {perPage} users per page - {totalUsers} total users
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4 shadow-sm">
              {loading && users.length === 0 ? (
                <TableSectionSkeleton columnCount={4} rowCount={8} />
              ) : (
                <AppDataTable<PendingUser>
                  data={users}
                  columns={columns}
                  pageCount={Math.max(1, totalPages)}
                  getRowId={(row) => String(row.id)}
                />
              )}
            </div>
          </div>
        </div>

        <UserFormDialog
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) {
              setCreatingUser(false);
              createUserForm.reset(createInitialCreateFormState());
            }
          }}
          title="Create User"
          description="Add a new user through the CRUD create endpoint."
          submitLabel="Create User"
          submittingLabel="Creating..."
          submitting={creatingUser}
          form={createUserForm}
          onSubmit={handleCreate}
          onCountryChange={(value) => setCountryValues(value, "create")}
        />

        <UserFormDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) {
              setSelectedUser(null);
              setUpdatingUser(false);
              editUserForm.reset(createInitialUpdateFormState());
            }
          }}
          title="Edit User"
          description="Update an existing user through the CRUD detail and update endpoints."
          submitLabel="Save Changes"
          submittingLabel="Saving..."
          submitting={updatingUser}
          loadingDetails={loadingUserDetails}
          passwordOptional
          form={editUserForm}
          onSubmit={handleUpdate}
          onCountryChange={(value) => setCountryValues(value, "edit")}
        />

        <DeleteDialog
          isOpen={Boolean(userToDelete)}
          onOpenChange={(open) => {
            if (!open) setUserToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Delete User"
          description={`Are you sure you want to delete ${userToDelete?.name || "this user"}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      </>
    </ProtectedRoute>
  );
}
