"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import {
  Calendar,
  ChevronDown,
  Download,
  Plus,
  RefreshCw,
  Search,
  Users,
  ShieldPlus,
  ShieldMinus,
} from "lucide-react";

import { AppDataTable } from "@/components/app-data-table";
import { DeleteDialog } from "@/components/dialogs/delete-dialog";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ProtectedRoute } from "@/components/protected-route";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import {
  adminUsersApi,
  adminAllUsersReportApi,
  type AdminUserDetailApiData,
  type AdminUserUpdateBody,
  type AdminUsersListApiData,
  type PaginationMeta,
  type PendingUser,
} from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";
import { adminUserCreateSchema, type AdminUserCreateFormData } from "@/lib/validations";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { useCrudCapabilities, useModuleCapabilities } from "@/hooks/use-permission-capabilities";

import { getColumnsWithActions } from "./columns";
import { UserFormDialog } from "./user-form-dialog";

const updateUserSchema = z
  .object({
    first_name: z.string().trim().min(2, "First name must be at least 2 characters"),
    last_name: z.string().trim().min(2, "Last name must be at least 2 characters"),
    email: z.string().trim().email("Invalid email address"),
    mobile: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((value) => !value || /^\d+$/.test(value), "Mobile number must contain only digits")
      .refine((value) => !value || value.length === 10, "Mobile number must be exactly 10 digits"),
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

type SponsorOption = {
  id: number;
  name: string;
};

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

const transformUser = (raw: Record<string, unknown>): PendingUser => {
  const email = String(raw.email ?? "");
  const username =
    String(raw.username ?? "").trim() ||
    (email.includes("@") ? email.split("@")[0] : "");

  return {
    id: typeof raw.id === "number" ? raw.id : Number(raw.id ?? 0) || 0,
    uuid: String(raw.uuid ?? ""),
    first_name: String(raw.first_name ?? ""),
    last_name: String(raw.last_name ?? ""),
    name: `${String(raw.first_name ?? "")} ${String(raw.last_name ?? "")}`.trim() || String(raw.name ?? "-"),
    email,
    username,
    mobile: String(raw.mobile ?? ""),
    country: String(raw.country ?? ""),
    country_code: String(raw.country_code ?? ""),
    sponsor_id: String(raw.sponsor_id ?? ""),
    sponsor_by: raw.sponsor_by == null ? null : String(raw.sponsor_by),
    sponsor_by_email: raw.sponsor_by_email == null ? null : String(raw.sponsor_by_email),
    referral_code: String(raw.referral_code ?? ""),
    ib_plan_id: (() => {
      const v = raw.ib_plan_id;
      if (v == null || typeof v === "object") return null;
      return typeof v === "number" || typeof v === "string" ? v : null;
    })(),
    status: String(raw.status ?? ""),
    email_verified: typeof raw.email_verified === "number" ? raw.email_verified : Number(raw.email_verified ?? 0) || 0,
    payment_verified: typeof raw.payment_verified === "number" ? raw.payment_verified : Number(raw.payment_verified ?? 0) || 0,
    main_wallet_balance: toNullableNumber(raw.main_wallet_balance),
    created_at: String(raw.created_at ?? ""),
  };
};

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

type UserSummaryCounts = {
  newToday: number | null;
  activeCount: number | null;
  inactiveCount: number | null;
};

const toNullableNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const extractUserSummaryCounts = (payload?: AdminUsersListApiData | null): UserSummaryCounts => {
  if (!payload) {
    return { newToday: null, activeCount: null, inactiveCount: null };
  }

  const root = payload as unknown as Record<string, unknown>;
  const nested =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null;

  return {
    newToday: toNullableNumber(root.new_today ?? nested?.new_today),
    activeCount: toNullableNumber(root.active_count ?? nested?.active_count),
    inactiveCount: toNullableNumber(root.inactive_count ?? nested?.inactive_count),
  };
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
  const {
    canViewList: canViewUserList,
    canAdd: canAddUser,
    canEdit: canEditUser,
    canDelete: canDeleteUser,
    showActionsColumn,
  } = useCrudCapabilities("userManagement", {
    list: "list",
    add: "add",
    edit: "edit",
    delete: "delete",
  });
  const { can: canUserCapability } = useModuleCapabilities("userManagement");
  const canViewUser = canUserCapability("view");
  const { can: canIbCapability } = useModuleCapabilities("ibManagement");
  const canPromoteToIb = canIbCapability("promoteClientToIb");

  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [userSummaryCounts, setUserSummaryCounts] = useState<UserSummaryCounts>({
    newToday: null,
    activeCount: null,
    inactiveCount: null,
  });

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
  const [promotingUserIds, setPromotingUserIds] = useState<Set<number>>(new Set());
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<PendingUser | null>(null);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [promoteTargetUser, setPromoteTargetUser] = useState<PendingUser | null>(null);
  const [promoteSubmitting, setPromoteSubmitting] = useState(false);
  const [manageSponsorDialogOpen, setManageSponsorDialogOpen] = useState(false);
  const [manageSponsorTargetUser, setManageSponsorTargetUser] = useState<PendingUser | null>(null);
  const [manageSponsorTab, setManageSponsorTab] = useState<"transfer" | "remove">("transfer");
  const [selectedNewSponsorId, setSelectedNewSponsorId] = useState("");
  const [manageSponsorSubmitting, setManageSponsorSubmitting] = useState(false);

  const [sponsorSearchQuery, setSponsorSearchQuery] = useState("");
  const [sponsorSearchResults, setSponsorSearchResults] = useState<SponsorOption[]>([]);
  const [sponsorSearching, setSponsorSearching] = useState(false);

  const handleSponsorSearch = useCallback(async (query: string) => {
    if (!token || !manageSponsorTargetUser || !query.trim() || query.trim().length < 3) {
      setSponsorSearchResults([]);
      return;
    }
    try {
      setSponsorSearching(true);
      const response = await adminUsersApi.list({
        token,
        page: 1,
        limit: 50,
        search: query.trim(),
      });
      const results = extractUsers(response?.data ?? null)
        .filter((user) => user.id !== manageSponsorTargetUser.id && Boolean(String(user.sponsor_id ?? "").trim()))
        .map((user) => ({
          id: user.id,
          name:
            user.name?.trim() ||
            `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() ||
            user.username ||
            user.email ||
            `User ${user.id}`,
        }));
      setSponsorSearchResults(results);
    } catch {
      setSponsorSearchResults([]);
    } finally {
      setSponsorSearching(false);
    }
  }, [token, manageSponsorTargetUser]);

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

  const setCountryValues = useCallback((countryName: string, mode: "create" | "edit") => {
    const countryData = COUNTRIES.find((country) => country.name === countryName);
    if (!countryData) return;
    if (mode === "create") {
      createUserForm.setValue("country", countryName, { shouldValidate: true });
      createUserForm.setValue("country_code", countryData.code, { shouldValidate: true });
    } else {
      editUserForm.setValue("country", countryName, { shouldValidate: true });
      editUserForm.setValue("country_code", countryData.code, { shouldValidate: true });
    }
  }, [createUserForm, editUserForm]);

  const loadUsers = useCallback(async () => {
    if (!canViewUserList) {
      setUsers([]);
      setPaginationMeta(null);
      setUserSummaryCounts({ newToday: null, activeCount: null, inactiveCount: null });
      setLoadError(null);
      setLoading(false);
      return;
    }
    if (!token) {
      setUsers([]);
      setPaginationMeta(null);
      setUserSummaryCounts({ newToday: null, activeCount: null, inactiveCount: null });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      const response = await adminUsersApi.list({
        token,
        page,
        limit: perPage,
        search: search?.trim() ? search : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });

      const payload = response?.data ?? null;
      setUsers(extractUsers(payload));
      setUserSummaryCounts(extractUserSummaryCounts(payload));
      setPaginationMeta(extractPagination(payload, response as { pagination?: PaginationMeta; data?: { pagination?: PaginationMeta } }) ?? null);
    } catch (err) {
      console.error("Failed to load users:", err);
      setLoadError(err);
      toast.error(
        getAdminFriendlyErrorMessage(err, { resource: "users", action: "load" })
      );
      setUsers([]);
      setPaginationMeta(null);
      setUserSummaryCounts({ newToday: null, activeCount: null, inactiveCount: null });
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage, search, statusFilter, canViewUserList]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleExport = useCallback(async (formatType: "xlsx" | "csv") => {
    if (!canViewUserList) {
      toast.error("You do not have permission to export users");
      return;
    }
    if (!token) {
      toast.error("Authentication required to export data");
      return;
    }

    const exportToastId = `users-export-${formatType}`;
    try {
      toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });

      const { blob, filename } = await adminAllUsersReportApi.export({
        token,
        format: formatType,
        search: search?.trim() ? search : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });

      if (!blob.size) {
        toast.error("No data returned for export", { id: exportToastId });
        return;
      }

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);

      toast.success(`Downloaded ${filename}`, { id: exportToastId });
    } catch (err) {
      console.error(`Failed to export ${formatType}:`, err);
      toast.error(
        getAdminFriendlyErrorMessage(err, { resource: "users", action: "export" }),
        { id: exportToastId },
      );
    }
  }, [canViewUserList, token, search, statusFilter]);

  const handleCreate = async (values: AdminUserCreateFormData) => {
    if (!token) return;
    try {
      setCreatingUser(true);
      const { confirm_password: _confirmPassword, ...rest } = values;
      const response = await adminUsersApi.create(rest, token);
      toast.success((response as { message?: string })?.message || "User created successfully");
      setCreateDialogOpen(false);
      createUserForm.reset(createInitialCreateFormState());
      await loadUsers();
    } catch (err) {
      console.error("Failed to create user:", err);
      toast.error(
        getAdminFriendlyErrorMessage(err, { resource: "users", action: "create" })
      );
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
      toast.error(
        getAdminFriendlyErrorMessage(err, { resource: "user details", action: "load" })
      );
    } finally {
      setLoadingUserDetails(false);
    }
  }, [token, editUserForm]);

  const handleUpdate = async (values: UpdateUserFormData) => {
    if (!token || !selectedUser) return;
    try {
      setUpdatingUser(true);
      const { confirm_password: _confirmPassword, ...rest } = values;
      const basePayload = rest.password ? rest : { ...rest, password: undefined };
      const response = await adminUsersApi.update(selectedUser.id, basePayload, token);
      toast.success((response as { message?: string })?.message || "User updated successfully");
      setEditDialogOpen(false);
      setSelectedUser(null);
      editUserForm.reset(createInitialUpdateFormState());
      await loadUsers();
    } catch (err) {
      console.error("Failed to update user:", err);
      toast.error(
        getAdminFriendlyErrorMessage(err, { resource: "users", action: "update" })
      );
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
      toast.error(
        getAdminFriendlyErrorMessage(err, { resource: "users", action: "delete" })
      );
    }
  }, [token, userToDelete, loadUsers]);

  const handleToggleStatus = useCallback(async (user: PendingUser, newStatus: number) => {
    if (!token) return;
    try {
      await adminUsersApi.updateStatus(user.id, newStatus, token);
      toast.success(newStatus === 1 ? "User activated successfully" : "User deactivated successfully");
      await loadUsers();
    } catch (err) {
      console.error("Failed to toggle user status:", err);
      toast.error(
        getAdminFriendlyErrorMessage(err, { resource: "user status", action: "update" })
      );
      throw err;
    }
  }, [token, loadUsers]);

  const handlePromoteDialogOpen = useCallback((user: PendingUser) => {
    const hasSponsorId = Boolean(String(user.sponsor_id ?? "").trim());
    if (hasSponsorId) {
      toast.success("User is already an IB");
      return;
    }

    setPromoteTargetUser(user);
    setPromoteDialogOpen(true);
  }, []);

  const handlePromoteToIb = useCallback(async () => {
    if (!token || !promoteTargetUser) return;

    const ibName =
      promoteTargetUser.name?.trim() ||
      `${promoteTargetUser.first_name ?? ""} ${promoteTargetUser.last_name ?? ""}`.trim() ||
      "IB User";

    if (!ibName) {
      toast.error("IB name is required");
      return;
    }

    try {
      setPromoteSubmitting(true);
      setPromotingUserIds((prev) => {
        const next = new Set(prev);
        next.add(promoteTargetUser.id);
        return next;
      });

      const response = await adminUsersApi.promoteToIb(
        {
          client_id: promoteTargetUser.id,
          ib_name: ibName,
        },
        token,
      );

      toast.success((response as { message?: string })?.message || "Client has been successfully promoted to Partner");
      setPromoteDialogOpen(false);
      setPromoteTargetUser(null);
      await loadUsers();
    } catch (err) {
      console.error("Failed to promote user to Partner:", err);
      toast.error(
        getAdminFriendlyErrorMessage(err, { resource: "Partner promotion", action: "create" })
      );
    } finally {
      setPromoteSubmitting(false);
      setPromotingUserIds((prev) => {
        const next = new Set(prev);
        if (promoteTargetUser) {
          next.delete(promoteTargetUser.id);
        }
        return next;
      });
    }
  }, [token, promoteTargetUser, loadUsers]);

  const handleManageSponsorOpen = useCallback((user: PendingUser) => {
    setManageSponsorTargetUser(user);
    setManageSponsorTab("transfer");
    setSelectedNewSponsorId("");
    setSponsorSearchQuery("");
    setSponsorSearchResults([]);
    setManageSponsorDialogOpen(true);
  }, []);

  const handleManageSponsorSubmit = useCallback(async () => {
    if (!token || !manageSponsorTargetUser) return;

    try {
      setManageSponsorSubmitting(true);
      if (manageSponsorTab === "transfer") {
        if (!selectedNewSponsorId) {
          toast.error("Please select a sponsor");
          return;
        }

        const response = await adminUsersApi.transferSponsor(
          {
            user_id: manageSponsorTargetUser.id,
            new_sponsor_user_id: Number(selectedNewSponsorId),
          },
          token,
        );
        toast.success(response?.message || "Sponsor transferred successfully");
      } else {
        const response = await adminUsersApi.transferSponsor(
          { user_id: manageSponsorTargetUser.id },
          token,
        );
        toast.success(response?.message || "Sponsor removed successfully");
      }

      setManageSponsorDialogOpen(false);
      setManageSponsorTargetUser(null);
      setSelectedNewSponsorId("");
      setSponsorSearchQuery("");
      setSponsorSearchResults([]);
      await loadUsers();
    } catch (err) {
      console.error("Failed to update sponsor:", err);
      toast.error(
        getAdminFriendlyErrorMessage(err, { resource: "sponsor", action: "update" })
      );
    } finally {
      setManageSponsorSubmitting(false);
    }
  }, [token, manageSponsorTargetUser, manageSponsorTab, selectedNewSponsorId, loadUsers]);

  const totalUsers = paginationMeta?.total ?? users.length;
  const activeUsersCount = userSummaryCounts.activeCount ?? users.filter((user) => user.status === "1").length;
  const inactiveUsersCount = userSummaryCounts.inactiveCount ?? users.filter((user) => user.status !== "1").length;
  const newTodayCount =
    userSummaryCounts.newToday ??
    users.filter((user) => user.created_at && new Date(user.created_at).toDateString() === new Date().toDateString()).length;
  const totalPages =
    paginationMeta?.total_pages ??
    paginationMeta?.last_page ??
    (totalUsers && perPage ? Math.ceil(totalUsers / perPage) : 1);

  const columns = useMemo(
    () =>
      getColumnsWithActions(
        handleEdit,
        handleDelete,
        handleToggleStatus,
        handlePromoteDialogOpen,
        handleManageSponsorOpen,
        promotingUserIds,
        {
          canEditUser,
          canDeleteUser,
          canToggleStatus: canEditUser,
          canPromoteToIb,
          canManageSponsor: canEditUser,
          canViewUser,
          showActionsColumn: showActionsColumn || canViewUser,
        },
      ),
    [handleEdit, handleDelete, handleToggleStatus, handlePromoteDialogOpen, handleManageSponsorOpen, promotingUserIds, canEditUser, canDeleteUser, canPromoteToIb, canViewUser, showActionsColumn],
  );

  if (!canViewUserList && !canAddUser) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
          <ApiErrorState
            audience="admin"
            variant="panel"
            title="Access restricted"
            message="Your account does not have permission to manage users."
          />
        </div>
      </ProtectedRoute>
    );
  }

  if (canViewUserList && loadError && users.length === 0) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
          <ApiErrorState
            error={loadError}
            audience="admin"
            variant="panel"
            resource="users"
            action="load"
            onRetry={() => {
              void loadUsers();
            }}
          />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto space-y-6 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                  <Users className="h-6 w-6 text-primary" />
                  New Users
                </h1>
                <p className="text-sm text-muted-foreground">
                  Listed are all the crm users
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {canViewUserList ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        Export
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => void handleExport("xlsx")}>
                        Export Excel (.xlsx)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => void handleExport("csv")}>
                        Export CSV (.csv)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
                {canAddUser ? (
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create User
                  </Button>
                ) : null}
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
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <ShieldPlus className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{activeUsersCount}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
                  <ShieldMinus className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent><div className="text-2xl font-bold">{inactiveUsersCount}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New Today</CardTitle>
                  <Calendar className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{newTodayCount}</div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <ApiSearchBar
                value={searchInput}
                onChange={setSearchInput}
                onSearch={(value) => {
                  void setSearch(value || null);
                  void setPage(1);
                }}
                placeholder="Search by name, email, or mobile"
                minimumLength={3}
                delay={300}
              />
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
              {canViewUserList ? (
                loading && users.length === 0 ? (
                  <TableSectionSkeleton columnCount={4} rowCount={8} />
                ) : (
                  <AppDataTable<PendingUser>
                    data={users}
                    columns={columns}
                    pageCount={Math.max(1, totalPages)}
                    getRowId={(row) => String(row.id)}
                  />
                )
              ) : (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  You can add users, but your account is not allowed to view the user list.
                </div>
              )}
            </div>
          </div>
        </div>

        {canAddUser ? (
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
            description="Add a new user."
            submitLabel="Create User"
            submittingLabel="Creating..."
            submitting={creatingUser}
            form={createUserForm}
            onSubmit={handleCreate}
            onCountryChange={(value) => setCountryValues(value, "create")}
          />
        ) : null}

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
          description="Update an existing user's detail and update their information."
          submitLabel="Save Changes"
          submittingLabel="Saving..."
          submitting={updatingUser}
          loadingDetails={loadingUserDetails}
          passwordOptional
          showReferralCode={false}
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

        <Dialog
          open={manageSponsorDialogOpen}
          onOpenChange={(open) => {
            setManageSponsorDialogOpen(open);
            if (!open) {
              setManageSponsorTargetUser(null);
              setManageSponsorTab("transfer");
              setSelectedNewSponsorId("");
              setSponsorSearchQuery("");
              setSponsorSearchResults([]);
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Manage Parent</DialogTitle>
              <DialogDescription>
                Update or remove parent for {manageSponsorTargetUser?.name || "this client"}.
              </DialogDescription>
            </DialogHeader>

            <Tabs
              value={manageSponsorTab}
              onValueChange={(value) => setManageSponsorTab(value as "transfer" | "remove")}
              className="space-y-4"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transfer">Update Parent</TabsTrigger>
                <TabsTrigger value="remove">Remove Parent</TabsTrigger>
              </TabsList>

              <TabsContent value="transfer" className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="sponsor-search">New Sponsor</Label>
                  <ApiSearchBar
                    value={sponsorSearchQuery}
                    onChange={setSponsorSearchQuery}
                    onSearch={(value) => {
                      void handleSponsorSearch(value || "");
                    }}
                    placeholder="Search parent by name, email, or mobile"
                    minimumLength={3}
                    delay={300}
                  />
                  {sponsorSearching ? (
                    <p className="text-xs text-muted-foreground">Searching...</p>
                  ) : null}
                  {!sponsorSearching && sponsorSearchQuery.length >= 3 && sponsorSearchResults.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No parent users found.</p>
                  ) : null}
                  {sponsorSearchResults.length > 0 ? (
                    <div className="max-h-48 overflow-auto rounded-md border">
                      {sponsorSearchResults.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${
                            selectedNewSponsorId === String(option.id) ? "bg-accent font-medium" : ""
                          }`}
                          onClick={() => setSelectedNewSponsorId(String(option.id))}
                        >
                          {option.name}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {selectedNewSponsorId ? (
                    <p className="text-xs text-muted-foreground">
                      Selected: {sponsorSearchResults.find((o) => String(o.id) === selectedNewSponsorId)?.name ?? `Sponsor #${selectedNewSponsorId}`}
                    </p>
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="remove" className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  This will remove the current parent and keep this client out of partner tree structure.
                </p>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setManageSponsorDialogOpen(false);
                  setManageSponsorTargetUser(null);
                  setManageSponsorTab("transfer");
                  setSelectedNewSponsorId("");
                  setSponsorSearchQuery("");
                  setSponsorSearchResults([]);
                }}
                disabled={manageSponsorSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleManageSponsorSubmit()}
                disabled={manageSponsorSubmitting || (manageSponsorTab === "transfer" && !selectedNewSponsorId)}
              >
                {manageSponsorSubmitting
                  ? manageSponsorTab === "transfer"
                    ? "Updating..."
                    : "Removing..."
                  : manageSponsorTab === "transfer"
                    ? "Update Sponsor"
                    : "Remove Sponsor"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={promoteDialogOpen}
          onOpenChange={(open) => {
            setPromoteDialogOpen(open);
            if (!open) {
              setPromoteTargetUser(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Promote to Partner</DialogTitle>
              <DialogDescription>
                This action will promote {promoteTargetUser?.name || "this user"} to a Partner. Please confirm the details before proceeding.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>IB Name</Label>
                <Input
                  value={
                    promoteTargetUser
                      ? promoteTargetUser.name?.trim() ||
                        `${promoteTargetUser.first_name ?? ""} ${promoteTargetUser.last_name ?? ""}`.trim() ||
                        "IB User"
                      : ""
                  }
                  disabled
                />
              </div>

              {/* <div className="space-y-2">
                <Label htmlFor="ib-plan-id">IB Plan</Label>
                <Select value={selectedIbPlanId} onValueChange={setSelectedIbPlanId} disabled={loadingIbPlans || ibPlans.length === 0}>
                  <SelectTrigger id="ib-plan-id">
                    <SelectValue placeholder={loadingIbPlans ? "Loading plans..." : "Select IB plan"} />
                  </SelectTrigger>
                  <SelectContent>
                    {ibPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!loadingIbPlans && ibPlans.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No IB plans available.</p>
                ) : null}
              </div> */}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPromoteDialogOpen(false);
                  setPromoteTargetUser(null);
                }}
                disabled={promoteSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handlePromoteToIb()}
                disabled={promoteSubmitting}
              >
                {promoteSubmitting ? "Promoting..." : "Promote"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </ProtectedRoute>
  );
}
