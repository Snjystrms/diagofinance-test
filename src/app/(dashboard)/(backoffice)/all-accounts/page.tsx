"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { PermissionAwareCrudDataTable } from "@/components/permission-aware-crud-table";
import { getColumns } from "./columns";
import { AccountTypeForm } from "./account-type-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminAccountTypesApi, type AccountTypeItem, type AccountTypeUpsertBody } from "@/lib/api";

// Row type for the table
export type AccountTypeRow = {
  id: string;
  name: string;
  spread_from: string;
  maximum_leverage: string;
  leverage_type: "fixed" | "dynamic" | string;
  leverage_value: number;
  stop_out_level: string;   // keep string for consistent display (e.g., "50.00")
  hedge_margin: string;     // keep string for consistent display
  swap_free_option: boolean;
  base_currency: string;
  status: boolean;
  created_at?: string;
  updated_at?: string;
};

// ---- helpers: normalize / serialize ----
const normalize = (a: AccountTypeItem): AccountTypeRow => ({
  id: String(a.id),
  name: a.name ?? "",
  spread_from: a.spread_from ?? "",
  maximum_leverage: a.maximum_leverage ?? "",
  leverage_type: (a.leverage_type as string) ?? "",
  leverage_value: Number(a.leverage_value ?? 0),
  stop_out_level:
    typeof a.stop_out_level === "number"
      ? a.stop_out_level.toFixed(2)
      : String(a.stop_out_level ?? "0.00"),
  hedge_margin:
    typeof a.hedge_margin === "number"
      ? a.hedge_margin.toFixed(2)
      : String(a.hedge_margin ?? "0.00"),
  swap_free_option: Boolean(a.swap_free_option),
  base_currency: a.base_currency ?? "",
  status: Boolean(a.status),
  created_at: a.created_at,
  updated_at: a.updated_at,
});

const coerceBoolean = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off", ""].includes(normalized)) return false;
  }
  return fallback;
};

const serialize = (r: Partial<AccountTypeRow>): AccountTypeUpsertBody => ({
  name: r.name && r.name.trim() !== "" ? r.name.trim() : "",
  spread_from: r.spread_from ?? "",
  maximum_leverage: r.maximum_leverage ?? "",
  leverage_type: (r.leverage_type as string) ?? "dynamic",
  leverage_value: Number(r.leverage_value ?? 0),
  stop_out_level: Number(
    typeof r.stop_out_level === "string" ? parseFloat(r.stop_out_level) : r.stop_out_level ?? 0
  ),
  hedge_margin: Number(
    typeof r.hedge_margin === "string" ? parseFloat(r.hedge_margin) : r.hedge_margin ?? 0
  ),
  swap_free_option: coerceBoolean(r.swap_free_option, true),
  base_currency: r.base_currency ?? "",
  status: coerceBoolean(r.status, true),
});

// simple debounce hook
const useDebouncedValue = <T,>(value: T, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

export default function AllAccountsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // filters
  const [statusFilter, setStatusFilter] = useState<"all" | "true" | "false">("all");
  const [search, setSearch] = useState<string>("");

  // debounced + min-length-3 rule
  const debouncedSearch = useDebouncedValue(search, 450);
  const effectiveSearch =
    debouncedSearch.trim().length >= 3 ? debouncedSearch.trim() : "";

  const { data: accountTypesResult, isLoading: loading } = useQuery({
    queryKey: ["accountTypes", token, statusFilter, effectiveSearch],
    queryFn: async () => {
      const res = await adminAccountTypesApi.list({
        token: token!,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: effectiveSearch || undefined,
      });
      return ((res?.data?.accountTypes || []) as AccountTypeItem[]).map(normalize);
    },
    enabled: Boolean(token),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
  const data = accountTypesResult ?? [];

  const fetchList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["accountTypes", token] });
  }, [queryClient, token]);

  // CREATE
  const handleAdd = async (payload: Omit<AccountTypeRow, "id">) => {
    if (!token) return Promise.reject();
    
    // Validate that name is not empty
    if (!payload.name || payload.name.trim() === "") {
      toast.error("Account type name is required");
      return Promise.reject(new Error("Account type name is required"));
    }
    
    try {
      await adminAccountTypesApi.create(serialize(payload), token);
      queryClient.invalidateQueries({ queryKey: ["accountTypes", token] });
      toast.success("Account type created");
      return Promise.resolve();
    } catch (e: unknown) {
      console.error("Create error:", e);
      toast.error(e instanceof Error ? e.message : "Create failed");
      return Promise.reject(e);
    }
  };

  // UPDATE
  const handleUpdate = async (row: AccountTypeRow) => {
    if (!token) return Promise.reject();
    
    // Validate that name is not empty
    if (!row.name || row.name.trim() === "") {
      toast.error("Account type name is required");
      return Promise.reject(new Error("Account type name is required"));
    }
    
    try {
      setActionLoadingId(row.id);
      await adminAccountTypesApi.update(row.id, serialize(row), token);
      queryClient.invalidateQueries({ queryKey: ["accountTypes", token] });
      toast.success("Account type updated");
      return Promise.resolve();
    } catch (e: unknown) {
      console.error("Update error:", e);
      const errorMessage = e instanceof Error ? e.message : "Update failed";
      toast.error(errorMessage);
      return Promise.reject(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  // TOGGLE STATUS
  const handleToggleStatus = async (id: string) => {
    if (!token) return;
    try {
      setActionLoadingId(id);
      const toggled = await adminAccountTypesApi.toggleStatus(id, token);
      queryClient.invalidateQueries({ queryKey: ["accountTypes", token] });
      toast.success(toggled.message || "Status updated");
    } catch (e: unknown) {
      console.error("Toggle error:", e);
      const errorMessage = e instanceof Error ? e.message : "Toggle failed";
      toast.error(errorMessage);
    } finally {
      setActionLoadingId(null);
    }
  };

  // DELETE
  const handleDelete = async (id: string) => {
    if (!token) return Promise.reject();
    try {
      setActionLoadingId(id);
      await adminAccountTypesApi.delete(id, token);
      queryClient.invalidateQueries({ queryKey: ["accountTypes", token] });
      toast.success("Account type deleted");
      return Promise.resolve();
    } catch (e: unknown) {
      console.error("Delete error:", e);
      const errorMessage = e instanceof Error ? e.message : "Delete failed";
      toast.error(errorMessage);
      return Promise.reject(e);
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns = useMemo(
    () => getColumns({ onToggleStatus: handleToggleStatus, actionLoadingId }),
    [handleToggleStatus, actionLoadingId]
  );

  return (
    <ProtectedRoute>
      
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-10">
          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="search">Search</Label>
           <div className="flex items-center gap-2">
  <Input
    id="search"
    placeholder="Type at least 3 characters..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
  <Button
    variant="outline"
    onClick={() => fetchList()}   // explicit search
    disabled={search.trim().length < 3} // <- hard block before 3 chars
    title={search.trim().length < 3 ? "Type at least 3 characters to search" : "Search"}
  >
    Search
  </Button>
  <Button
    variant="ghost"
    onClick={() => {
      setSearch("");
      fetchList(); // explicit default reset (no search)
    }}
  >
    Clear
  </Button>
</div>

            </div>

        <div className="space-y-1 w-[60%]">
  <Label>Status</Label>
  <Select
    value={statusFilter}
    onValueChange={(v: "all" | "true" | "false") => setStatusFilter(v)}
  >
    <SelectTrigger className="w-full min-w-[100px] max-w-[127px]">
      <SelectValue placeholder="All" />
    </SelectTrigger>
    <SelectContent className="w-[var(--radix-select-trigger-width)]">
      <SelectItem value="all">All</SelectItem>
      <SelectItem value="true">Active</SelectItem>
      <SelectItem value="false">Inactive</SelectItem>
    </SelectContent>
  </Select>
</div>

          </div>

          <PermissionAwareCrudDataTable<AccountTypeRow>
            data={data}
            initialData={data}
            columns={columns}
            formComponent={AccountTypeForm}
            title="All Accounts"
            description="Create, update, and manage account types"
            requiredModule="account-types"
            onAdd={async (partial) => {
              const { id: _ignore, ...rest } = partial as Partial<AccountTypeRow>;
              return handleAdd(rest as Omit<AccountTypeRow, "id">);
            }}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            rowIsReadOnly={() => false}
          />
        </div>
      
    </ProtectedRoute>
  );
}
