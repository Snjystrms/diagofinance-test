// C:\Users\DELL\Desktop\crminhouse\src\app\all-managers\page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { MainLayout } from "@/components/main-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { PermissionAwareCrudDataTable } from "@/components/permission-aware-crud-table";
import { PermissionAwareButton } from "@/components/permission-aware-button";
import { Plus } from "lucide-react";
import { getColumns } from "./columns";
import {
  adminManagersApi,
  permissionsApi,
  type ManagerItem,
  type ManagerCreateBody,
  type ManagerUpdateBody,
  type GroupedPermissions,
} from "@/lib/api";
import { ManagerForm } from "./manager-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

const normalize = (m: ManagerItem): ManagerRow => ({
  id: String(m.id),
  uuid: m.uuid,
  name: m.name,
  email: m.email,
  mobile: m.mobile,
  status: !!m.status,
  created_at: m.created_at,
  updated_at: m.updated_at,
  permissions: (m.permissions || []).map((p) => ({ id: p.id, name: p.name })),
});

/** ✅ Robustly normalize any incoming `permissions` into number[] */
function toIdArray(perms: unknown): number[] {
  if (!perms) return [];
  // already number[]
  if (Array.isArray(perms) && perms.every((x) => typeof x === "number")) {
    return perms as number[];
  }
  // array of objects with id
  if (Array.isArray(perms)) {
    const ids = (perms as any[])
      .map((p) => (p && typeof p.id === "number" ? p.id : null))
      .filter((x) => typeof x === "number") as number[];
    return ids;
  }
  return [];
}

export default function AllManagersPage() {
  const { token } = useAuth();

  const [data, setData] = useState<ManagerRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);

  // Permissions data
  const [allPerms, setAllPerms] = useState<PermissionLite[]>([]);
  const [groupedPerms, setGroupedPerms] = useState<GroupedPermissions[]>([]);
  const [permIndex, setPermIndex] = useState<
    Record<number, { id: number; name: string; category: string }>
  >({});

  // View modal state
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<ManagerRow | null>(null);

  const buildIndex = (groups: GroupedPermissions[]) => {
    const idx: Record<number, { id: number; name: string; category: string }> = {};
    groups.forEach((g) =>
      g.permissions.forEach((p) => {
        idx[p.id] = { id: p.id, name: p.name, category: g.category };
      })
    );
    return idx;
  };

  const fetchPermissions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await permissionsApi.listAll(token);
      const groups = ((res?.data as any)?.permissions || []) as GroupedPermissions[];
      setGroupedPerms(groups);

      const flat: PermissionLite[] = groups.flatMap((g) =>
        (g.permissions || []).map((p) => ({ id: p.id, name: p.name }))
      );
      setAllPerms(flat);
      setPermIndex(buildIndex(groups));
    } catch (e) {
      console.error("Fetch permissions failed:", e);
      toast.error("Failed to load permissions");
      setGroupedPerms([]);
      setAllPerms([]);
      setPermIndex({});
    }
  }, [token]);

  const fetchList = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await adminManagersApi.list(token);
      const list = (res?.data?.managers || []) as ManagerItem[];
      setData(list.map(normalize));
    } catch (err) {
      console.error("Fetch managers failed:", err);
      toast.error("Failed to load managers");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchList();
    fetchPermissions();
  }, [fetchList, fetchPermissions]);

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
      };
      if (!body.password) {
        toast.error("Password is required to create manager");
        return Promise.reject(new Error("Password required"));
      }
      const res = await adminManagersApi.create(body, token);
      const created = normalize(res.data!.manager as ManagerItem);
      setData((prev) => [created, ...prev]);
      toast.success("Manager created successfully");
      return Promise.resolve();
    } catch (e: any) {
      console.error("Create manager error:", e);
      toast.error(e?.message || "Create failed");
      return Promise.reject(e);
    }
  };

  // UPDATE — ✅ always send permissions as number[]
  const handleUpdate = async (row: ManagerRow & { password?: string; permissions?: any }) => {
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
      console.log("Sending update request with body:", body);
      const res = await adminManagersApi.update(row.id, body, token);
      
      const norm = normalize(res.data!.manager as ManagerItem);
      setData((prev) => prev.map((x) => (x.id === row.id ? norm : x)));
      toast.success("Manager updated successfully");
      return Promise.resolve();
    } catch (e: any) {
      console.error("Update manager error:", e);
      toast.error(e?.message || "Update failed");
      return Promise.reject(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // ✅ Use PATCH endpoint for toggling status
  const handleToggleStatus = useCallback(async (id: string, desiredStatus: boolean) => {
    if (!token) return;
    
    console.log(`[Toggle] Manager ${id} -> ${desiredStatus}`);
    
    try {
      setActionLoadingId(id);
      
      // ✅ Use PATCH endpoint with just the status field
      // The API accepts any value for status and converts it to boolean internally
      const res = await adminManagersApi.patchStatus(id, desiredStatus, token);
      console.log("[Toggle] Response:", res);
      
      if (!res.success || !res.data?.manager) {
        throw new Error(res.message || "Invalid response from server");
      }
      
      const updated = normalize(res.data.manager as ManagerItem);
      
      // Update the local state with the response
      setData((prev) => prev.map((x) => (x.id === id ? updated : x)));
      
      toast.success(`Manager ${updated.status ? "activated" : "deactivated"} successfully`);
    } catch (e: any) {
      console.error("[Toggle] Error:", e);
      toast.error(e?.message || "Failed to update status");
    } finally {
      setActionLoadingId(null);
    }
  }, [token]);

  // DELETE
  const handleDelete = async (id: string) => {
    if (!token) return Promise.reject();
    try {
      setActionLoadingId(id);
      await adminManagersApi.delete(id, token);
      setData((prev) => prev.filter((x) => x.id !== id));
      toast.success("Manager deleted");
      return Promise.resolve();
    } catch (e: any) {
      console.error("Delete manager error:", e);
      toast.error(e?.message || "Delete failed");
      return Promise.reject(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns = useMemo(
    () =>
      getColumns({
        onToggleStatus: handleToggleStatus,
        onView: (row) => {
          setViewItem(row);
          setViewOpen(true);
        },
        actionLoadingId,
      }) as any,
    [handleToggleStatus, actionLoadingId]
  );

  // Build categorized view for the View modal
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

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight">Managers</h2>
              <p className="text-sm text-muted-foreground">
                Create, update, and manage managers & their permissions
              </p>
            </div>

            <PermissionAwareButton
              requiredModule="manager"
              requiredAction="write"
              onClick={() => setCreateOpen(true)}
              showTooltip
              tooltipMessage="You need write permission for manager module to create"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Manager
            </PermissionAwareButton>
          </div>

          <PermissionAwareCrudDataTable<ManagerRow>
            data={data}
            initialData={data}
            columns={columns}
            formComponent={(props: any) => (
              <ManagerForm
                {...props}
                allPermissions={allPerms}
                groupedPermissions={groupedPerms}
                onFetchPermissions={fetchPermissions}
              />
            )}
            title="All Managers"
            description="Managers list with status and permissions"
            requiredModule="manager"
            hideAddButton={true}
            onAdd={async (partial) => {
              const { id: _i, uuid: _u, created_at: _c1, updated_at: _c2, ...rest } = partial as any;
              return handleAdd(rest);
            }}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            rowIsReadOnly={() => false}
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
                status: form.status,
                permissions: [],
              } as any);
            }}
          />
        </div>

        {/* View Modal */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manager Details</DialogTitle>
            </DialogHeader>

            {viewItem && (
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
                    <div className="text-xs text-muted-foreground">Created</div>
                    <div className="font-medium">{viewItem.created_at || "-"}</div>
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
            )}
          </DialogContent>
        </Dialog>
      </MainLayout>
    </ProtectedRoute>
  );
}