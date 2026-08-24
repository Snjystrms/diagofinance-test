// C:\Users\DELL\Desktop\crminhouse\src\app\all-managers\page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { PermissionAwareCrudDataTable } from "@/components/permission-aware-crud-table";
import { PermissionAwareButton } from "@/components/permission-aware-button";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { BackofficeDetailDialogSkeleton } from "@/components/loading/backoffice-page-skeletons";
import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { ChevronDown, Download, Plus, RefreshCw, UserPlus } from "lucide-react";
import * as XLSX from "xlsx";
import { getColumns, DecryptedPassword } from "./columns";
import {
  adminManagersApi,
  permissionsApi,
  type ManagerItem,
  type ManagerCreateBody,
  type ManagerUpdateBody,
  type GroupedPermissions,
  type ModulePermissions,
} from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";
import { ManagerForm } from "./manager-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

export type PermissionLite = { id: number; name: string };

export type ManagerRow = {
  id: string;
  uuid: string;
  name: string;
  email: string;
  mobile: string;
  status: boolean;
  created_at?: string;
  updated_at?: string;
  permissions: PermissionLite[];
};

/** ✅ Flatten both possible shapes of permissions:
 * - flat: [{id,name}]
 * - grouped: [{category, permissions:[{id,name}]}]
 */
const flattenPermissions = (raw: unknown): { id: number; name: string }[] => {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const first = raw[0] as Record<string, unknown> | undefined;
  // Already flat
  if (first && typeof first.id === "number") {
    return raw.map((p: unknown) => {
      const perm = p as { id: number; name: string };
      return { id: perm.id, name: perm.name };
    });
  }
  // Grouped
  if (first && first.category && Array.isArray(first.permissions)) {
    return raw.flatMap((g: unknown) => {
      const group = g as { permissions?: Array<{ id: number; name: string }> };
      return (group.permissions || []).map((p) => ({ id: p.id, name: p.name }));
    });
  }
  return [];
};

const normalize = (m: ManagerItem): ManagerRow => ({
  id: String(m.id),
  uuid: m.uuid,
  name: m.name,
  email: m.email,
  mobile: m.mobile,
  status: !!m.status,
  created_at: m.created_at,
  updated_at: m.updated_at,
  permissions: flattenPermissions((m as ManagerItem & { permissions?: unknown }).permissions),
});

const getExportTimestamp = () => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
};

const formatExportDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** ✅ Robustly normalize any incoming `permissions` into number[] */
function toIdArray(perms: unknown): number[] {
  if (!perms) return [];
  if (Array.isArray(perms) && perms.every((x) => typeof x === "number")) {
    return perms as number[];
  }
  if (Array.isArray(perms)) {
    const ids = (perms as Array<{ id?: number }>)
      .map((p) => (p && typeof p.id === "number" ? p.id : null))
      .filter((x): x is number => typeof x === "number");
    return ids;
  }
  return [];
}

export default function AllManagersPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);

  // Permissions data (now populated from React Query - see below)

  // View modal state
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<ManagerRow | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const buildIndex = (groups: GroupedPermissions[]) => {
    const idx: Record<number, { id: number; name: string; category: string }> = {};
    groups.forEach((g) =>
      g.permissions.forEach((p) => {
        idx[p.id] = { id: p.id, name: p.name, category: g.category };
      })
    );
    return idx;
  };

  const fetchManagerDetail = useCallback(
    async (id: string): Promise<ManagerRow> => {
      if (!token) throw new Error("Missing auth token");
      const res = await adminManagersApi.detail(id, token);
      const manager = res?.data?.subadmin as ManagerItem | undefined;
      if (!manager) {
        throw new Error("Manager details unavailable");
      }
      return normalize(manager);
    },
    [token]
  );

  const {
    data: managersResult,
    isLoading: loading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["managers", token],
    queryFn: async () => {
      const res = await adminManagersApi.list(token!);
      return ((res?.data?.subadmins || []) as ManagerItem[]).map(normalize);
    },
    enabled: Boolean(token),
    staleTime: 60 * 1000,
  });
  const data = managersResult ?? [];

  const [managerSearch, setManagerSearch] = useState("");

  const filteredManagers = useMemo(() => {
    const term = managerSearch.trim().toLowerCase();
    // Only filter if we have at least 3 characters or if search is empty
    if (!term || term.length < 3) return data;
    return data.filter((manager) => {
      const haystack = `${manager.name} ${manager.email} ${manager.mobile}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [data, managerSearch]);

  const { data: permissionsResult } = useQuery({
    queryKey: ["permissions", token],
    queryFn: async () => {
      const res = await permissionsApi.listAll(token!);
      const pd = res?.data as { modules?: ModulePermissions[] } | undefined;
      return (pd?.modules || []).map((m) => ({
        category: m.module,
        permissions: m.permissions,
        count: m.count,
      })) as GroupedPermissions[];
    },
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
  });

  const groupedPerms = permissionsResult ?? [];
  const permIndex = useMemo(() => buildIndex(groupedPerms), [groupedPerms]);
  const allPerms: PermissionLite[] = useMemo(
    () => groupedPerms.flatMap((g) => (g.permissions || []).map((p) => ({ id: p.id, name: p.name }))),
    [groupedPerms]
  );
  const ManagerFormComponent = useCallback(
    (props: {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      initialData?: ManagerRow | null;
      onSubmit: (data: Partial<ManagerRow>) => void | Promise<void>;
      readOnly?: boolean;
    }) => (
      <ManagerForm
        open={props.open}
        onOpenChange={props.onOpenChange}
        initialData={props.initialData}
        onSubmit={props.onSubmit as Parameters<typeof ManagerForm>[0]["onSubmit"]}
        readOnly={props.readOnly}
        allPermissions={allPerms}
        groupedPermissions={groupedPerms}
        onFetchPermissions={undefined}
      />
    ),
    [allPerms, groupedPerms]
  );

  const fetchList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["managers", token] });
  }, [queryClient, token]);

  // CREATE
  const handleAdd = async (
    payload: Omit<ManagerRow, "id" | "uuid" | "created_at" | "updated_at"> & { password?: string }
  ) => {
    if (!token) return Promise.reject();
    try {
      const body: ManagerCreateBody = {
        name: payload.name,
        email: payload.email,
        mobile: payload.mobile,
        password: payload.password || "",
        permissions: toIdArray(payload.permissions),
      };
      if (!body.password) {
        toast.error("Password is required to create sub-admin");
        return Promise.reject(new Error("Password required"));
      }
      await adminManagersApi.create(body, token);
      queryClient.invalidateQueries({ queryKey: ["managers", token] });
      toast.success("Sub-Admin created successfully");
      return Promise.resolve();
    } catch (e: unknown) {
      console.error("Create manager error:", e);
      toast.error(
        getAdminFriendlyErrorMessage(e, { resource: "sub-admins", action: "create" })
      );
      return Promise.reject(e);
    }
  };

  // UPDATE — ✅ always send permissions as number[]
  const handleUpdate = async (row: ManagerRow & { password?: string; permissions?: unknown }) => {
    if (!token) return Promise.reject();
    try {
      setActionLoadingId(row.id);
      const permissions = toIdArray(row.permissions);
      const body: ManagerUpdateBody = {
        name: row.name,
        email: row.email,
        mobile: row.mobile,
        status: row.status,
        permissions,
      };
      const trimmedPassword = row.password?.trim();
      if (trimmedPassword) {
        body.password = trimmedPassword;
      }
      await adminManagersApi.update(row.id, body, token);
      queryClient.invalidateQueries({ queryKey: ["managers", token] });
      toast.success("Sub-Admin updated successfully");
      return Promise.resolve();
    } catch (e: unknown) {
      console.error("Update sub-admin error:", e);
      toast.error(
        getAdminFriendlyErrorMessage(e, { resource: "sub-admins", action: "update" })
      );
      return Promise.reject(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // ✅ Use PATCH endpoint for toggling status
  const handleToggleStatus = useCallback(
    async (id: string, desiredStatus: boolean) => {
      if (!token) return;

      try {
        setActionLoadingId(id);

        // ✅ Optimistic update so the switch flips immediately in the UI
        queryClient.setQueryData<ManagerRow[]>(["managers", token], (old) =>
          (old ?? []).map((m) => (m.id === id ? { ...m, status: desiredStatus } : m))
        );

        const res = await adminManagersApi.patchStatus(id, desiredStatus, token);

        // The backend may return { manager } or { subadmin } or no data at all.
        // Only a failed response (success === false / HTTP error) should be treated as an error.
        if (!res || res.success === false) {
          throw new Error(res?.message || "Invalid response from server");
        }

        queryClient.invalidateQueries({ queryKey: ["managers", token] });
        toast.success("Manager status updated successfully");
      } catch (e: unknown) {
        console.error("[Toggle] Error:", e);
        // Roll back the optimistic update so the UI matches the server state
        queryClient.setQueryData<ManagerRow[]>(["managers", token], (old) =>
          (old ?? []).map((m) => (m.id === id ? { ...m, status: !desiredStatus } : m))
        );
        toast.error(
          getAdminFriendlyErrorMessage(e, { resource: "sub-admin status", action: "update" })
        );
      } finally {
        setActionLoadingId(null);
      }
    },
    [token, queryClient]
  );

  // DELETE
  const handleDelete = async (id: string) => {
    if (!token) return Promise.reject();
    try {
      setActionLoadingId(id);
      await adminManagersApi.delete(id, token);
      queryClient.invalidateQueries({ queryKey: ["managers", token] });
      toast.success("Sub-Admin deleted");
      return Promise.resolve();
    } catch (e: unknown) {
      console.error("Delete sub-admin error:", e);
      toast.error(
        getAdminFriendlyErrorMessage(e, { resource: "sub-admins", action: "delete" })
      );
      return Promise.reject(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleViewManager = useCallback(
    async (id: string) => {
      setViewItem(null);
      setViewOpen(true);
      setViewLoading(true);
      try {
        const manager = await fetchManagerDetail(id);
        setViewItem(manager);
      } catch (error: unknown) {
        console.error("View manager error:", error);
        toast.error(
          getAdminFriendlyErrorMessage(error, { resource: "manager details", action: "load" })
        );
        setViewOpen(false);
      } finally {
        setViewLoading(false);
      }
    },
    [fetchManagerDetail]
  );

  const handleExport = useCallback((formatType: "xlsx" | "csv") => {
    const exportToastId = `managers-export-${formatType}`;
    try {
      if (data.length === 0) {
        toast.error("No data to export", { id: exportToastId });
        return;
      }

      toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });
      const exportData = data.map((manager, index) => ({
        "Sr. No.": index + 1,
        Name: manager.name || "-",
        Email: manager.email || "-",
        Mobile: manager.mobile || "-",
        Status: manager.status ? "Active" : "Inactive",
        Created: formatExportDateTime(manager.created_at),
        Permissions: manager.permissions.map((permission) => permission.name).join(", ") || "-",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const filenameBase = `managers-${getExportTimestamp()}`;
      let filename = `${filenameBase}.xlsx`;

      if (formatType === "xlsx") {
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Managers");
        XLSX.writeFile(workbook, filename);
      } else {
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        filename = `${filenameBase}.csv`;
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
      }

      toast.success(`Exported ${data.length} sub-admins to ${filename}`, { id: exportToastId });
    } catch (error: unknown) {
      console.error(`Failed to export ${formatType}:`, error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "sub-admins", action: "export" }),
        { id: exportToastId },
      );
    }
  }, [data]);

  const columns = useMemo(
    () =>
      getColumns({
        onToggleStatus: handleToggleStatus,
        actionLoadingId,
        token,
      }),
    [handleToggleStatus, actionLoadingId, token]
  );

  const categorizedView: Record<string, PermissionLite[]> = useMemo(() => {
    const cat: Record<string, PermissionLite[]> = {};
    if (!viewItem) return cat;
    viewItem.permissions.forEach((p) => {
      const meta = permIndex[p.id];
      const category = meta?.category || "Uncategorized";
      if (!cat[category]) cat[category] = [];
      cat[category].push({ id: p.id, name: p.name });
    });
    const ordered: Record<string, PermissionLite[]> = {};
    groupedPerms.forEach((g) => {
      if (cat[g.category]) ordered[g.category] = cat[g.category];
    });
    Object.keys(cat).forEach((c) => {
      if (!(c in ordered)) ordered[c] = cat[c];
    });
    return ordered;
  }, [viewItem, permIndex, groupedPerms]);

  if (loading) {
    return (
      <ProtectedRoute>
        <ListPageSkeleton columnCount={5} rowCount={8} actionCount={1} />
      </ProtectedRoute>
    );
  }

  if (isError && data.length === 0) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
          <ApiErrorState
            error={error}
            audience="admin"
            variant="panel"
            resource="managers"
            action="load"
            onRetry={() => {
              void refetch();
            }}
          />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                <UserPlus className="h-6 w-6 text-primary" />
                Sub-Admin
              </h1>
              <p className="text-sm text-muted-foreground">
                Create, update, and manage sub-admin & their permissions
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("xlsx")}>
                    Export Excel (.xlsx)
                  </DropdownMenuItem>
                  {/* <DropdownMenuItem onClick={() => handleExport("csv")}>
                    Export CSV (.csv)
                  </DropdownMenuItem> */}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => void refetch()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <PermissionAwareButton
              requiredModule="manager"
              requiredAction="write"
              onClick={() => setCreateOpen(true)}
              showTooltip
              tooltipMessage="You need write permission for manager module to create"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Sub-Admin
            </PermissionAwareButton>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5">
            <ApiSearchBar
              value={managerSearch}
              onChange={(value) => setManagerSearch(value)}
              onSearch={(value) => setManagerSearch(value)}
              placeholder="Search by name, email, or mobile"
              minimumLength={3}
              delay={200}
            />
          </div>

            <PermissionAwareCrudDataTable<ManagerRow>
              data={filteredManagers}
              fitToWidth
              initialData={filteredManagers}
              columns={columns}
              formComponent={ManagerFormComponent}
              title=""
              description=""
              requiredModule="manager"
              hideAddButton={true}
              onAdd={async (partial) => {
                const partialRow = partial as Partial<ManagerRow>;
                const { id: _i, uuid: _u, created_at: _c1, updated_at: _c2, ...rest } = partialRow;
                return handleAdd(rest as Omit<ManagerRow, 'id' | 'uuid' | 'created_at' | 'updated_at'>);
              }}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onView={(row) => handleViewManager(row.id)}
              rowIsReadOnly={() => false}
              onFetchItem={fetchManagerDetail}
            />

          {/* External Create Dialog */}
          <ManagerForm
            open={createOpen}
            onOpenChange={setCreateOpen}
            initialData={null}
            allPermissions={allPerms}
            groupedPermissions={groupedPerms}
            onFetchPermissions={undefined}
            onSubmit={(form) => {
              return handleAdd({
                name: form.name,
                email: form.email,
                mobile: form.mobile,
                password: form.password,
                status: form.status ?? true,
                permissions: (form.permissions ?? []).map((id) => {
                  const permission = permIndex[id];
                  return permission ? { id: permission.id, name: permission.name } : { id, name: `Permission ${id}` };
                }),
              });
            }}
          />
        </div>

        {/* View Modal */}
        <Dialog
          open={viewOpen}
          onOpenChange={(open) => {
            setViewOpen(open);
            if (!open) {
              setViewItem(null);
              setViewLoading(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Sub-Admin Details</DialogTitle>
            </DialogHeader>

            {viewLoading ? (
              <BackofficeDetailDialogSkeleton />
            ) : viewItem ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Name</div>
                    <div className="font-medium">{viewItem.name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="font-medium">{viewItem.email}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Mobile</div>
                    <div className="font-medium">{viewItem.mobile}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="font-medium">{viewItem.status ? "Active" : "Inactive"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Password</div>
                    <DecryptedPassword managerId={viewItem.id} token={token} />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Created</div>
                    <div className="font-medium">
                      {viewItem.created_at ? formatDateTimeInIST(viewItem.created_at) : "-"}
                    </div>
                  </div>
                </div>

                <div className="rounded-md border p-4">
                  <div className="text-sm font-semibold mb-3">Permissions (categorized)</div>
                  <div className="max-h-64 overflow-y-auto pr-2 space-y-4">
                    {Object.keys(categorizedView).length ? (
                      Object.entries(categorizedView).map(([category, perms]) => (
                        <div key={category}>
                          <div className="text-sm font-medium mb-2">{category}</div>
                          <ul className="list-disc ml-5 space-y-1">
                            {perms.map((p) => (
                              <li key={p.id} className="text-sm text-muted-foreground">
                                {p.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground">No permissions</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No sub-admin details available.
              </div>
            )}
          </DialogContent>
        </Dialog>
      
    </ProtectedRoute>
  );
}
