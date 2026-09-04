"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import {
  ChevronDown,
  Database,
  Download,
  Plus,
  RefreshCw,
} from "lucide-react";
import { format, parse } from "date-fns";

import { AppDataTable } from "@/components/app-data-table";
import { ApiErrorState } from "@/components/errors/api-error-state";
import { AccessDeniedPanel } from "@/components/errors/access-denied-panel";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { ApiSearchBar } from "@/components/ui/api-search-bar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { adminAccountTypesApi, adminIBExistingClientsApi, type AccountTypeGroupItem, type IBExistingClient, type CreateIBExistingClientRequest } from "@/lib/api";
import { useModuleCapabilities } from "@/hooks/use-permission-capabilities";
import { getColumns } from "./columns";
import { CreateExistingClientDialog } from "./create-existing-client-dialog";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

const extractItems = (data: unknown): IBExistingClient[] => {
  if (!data) return [];
  
  const dataObj = data as Record<string, unknown>;
  
  // If data is already an array, return it
  if (Array.isArray(data)) return data as IBExistingClient[];
  
  // Check for existingClients first (most common case based on API response)
  if (Array.isArray(dataObj.existingClients)) return dataObj.existingClients as IBExistingClient[];
  
  // Check for other common array property names
  if (Array.isArray(dataObj.accounts)) return dataObj.accounts as IBExistingClient[];
  if (Array.isArray(dataObj.items)) return dataObj.items as IBExistingClient[];
  
  // Check nested data structures
  if (dataObj.data) {
    const nestedData = dataObj.data as Record<string, unknown>;
    if (Array.isArray(dataObj.data)) return dataObj.data as IBExistingClient[];
    if (nestedData && Array.isArray(nestedData.existingClients)) return nestedData.existingClients as IBExistingClient[];
    if (nestedData && Array.isArray(nestedData.accounts)) return nestedData.accounts as IBExistingClient[];
    if (nestedData && Array.isArray(nestedData.items)) return nestedData.items as IBExistingClient[];
    if (nestedData && Array.isArray(nestedData.data)) return nestedData.data as IBExistingClient[];
  }
  
  return [];
};

export default function AddExistingClientsPage() {
  const { token } = useAuth();
  const { can } = useModuleCapabilities("userManagement");
  const canViewList = can("mt5List") || can("addExistingClient");
  const canCreate = can("addExistingClient");

  const [clients, setClients] = useState<IBExistingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 10,
    total_pages: 1,
    total: 0,
  });

  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [accountModeFilter] = useQueryState(
    "account_mode",
    parseAsString.withDefault("all"),
  );
  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withDefault(""),
  );
  const [groupFilter, setGroupFilter] = useQueryState(
    "group_id",
    parseAsString.withDefault("all"),
  );
  const [dateFrom, setDateFrom] = useQueryState("date_from", parseAsString);
  const [dateTo, setDateTo] = useQueryState("date_to", parseAsString);

  // Date state for DateRangePicker
  const [fromDateObj, setFromDateObj] = useState<Date | undefined>(undefined);
  const [toDateObj, setToDateObj] = useState<Date | undefined>(undefined);

  // Sync date objects with query params
  useEffect(() => {
    if (dateFrom) {
      const parsed = parse(dateFrom, "yyyy-MM-dd", new Date());
      if (!isNaN(parsed.getTime())) setFromDateObj(parsed);
    } else {
      setFromDateObj(undefined);
    }
  }, [dateFrom]);

  useEffect(() => {
    if (dateTo) {
      const parsed = parse(dateTo, "yyyy-MM-dd", new Date());
      if (!isNaN(parsed.getTime())) setToDateObj(parsed);
    } else {
      setToDateObj(undefined);
    }
  }, [dateTo]);

  const [searchInput, setSearchInput] = useState(search ?? "");

  // Create state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Group filter state
  const [groups, setGroups] = useState<AccountTypeGroupItem[]>([]);

  const loadGroups = useCallback(async () => {
    if (!token) return;

    try {
      const response = await adminAccountTypesApi.list({ token });
      const items = response?.data?.accountTypes ?? [];

      const liveGroups = items
        .filter((type) => type.groups?.live && type.groups.live.status)
        .map((type) => type.groups!.live!);
      setGroups(liveGroups);
    } catch (error) {
      console.error("Failed to load groups:", error);
    }
  }, [token]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    setSearchInput(search ?? "");
  }, [search]);

  const loadClients = useCallback(async () => {
    if (!canViewList) {
      setClients([]);
      setLoadError(null);
      setLoading(false);
      return;
    }
    if (!token) {
      setClients([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      const response = await adminIBExistingClientsApi.list({
        token,
        page,
        limit: perPage,
        search: search?.trim() ? search : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        group_id: groupFilter && groupFilter !== "all" ? Number(groupFilter) : undefined,
      });

      // apiCall returns the full envelope { success, message, data: { existingClients, pagination } },
      // so response.data is already { existingClients: [...], pagination: {...} }
      const responseData = response?.data;

      // Extract clients from the payload
      const items = extractItems(responseData);
      setClients(items);

      const paginationObj = responseData?.pagination as Record<string, unknown> | undefined;
      const payloadTyped = responseData as Record<string, unknown> | undefined;
      
      const total =
        (paginationObj?.total as number | undefined) ??
        (paginationObj?.total_existing_clients as number | undefined) ??
        (paginationObj?.total_items as number | undefined) ??
        (payloadTyped?.total as number | undefined) ??
        items.length;

      const perPageValue =
        (paginationObj?.per_page as number | undefined) ??
        (paginationObj?.perPage as number | undefined) ??
        (paginationObj?.limit as number | undefined) ??
        perPage;

      const totalPages =
        (paginationObj?.total_pages as number | undefined) ??
        (paginationObj?.last_page as number | undefined) ??
        (perPageValue ? Math.max(1, Math.ceil(total / perPageValue)) : 1);

      setPagination({
        current_page:
          (paginationObj?.current_page as number | undefined) ??
          (paginationObj?.page as number | undefined) ??
          page,
        per_page: perPageValue,
        total_pages: totalPages,
        total,
      });
    } catch (error: unknown) {
      console.error("Failed to load IB existing clients:", error);
      setLoadError(error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "IB existing clients", action: "load" })
      );
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, perPage, search, dateFrom, dateTo, canViewList, groupFilter]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  // Create handler
  const handleCreate = useCallback(async (data: CreateIBExistingClientRequest) => {
    if (!token) return;

    try {
      await adminIBExistingClientsApi.create(data, token);
      toast.success("Existing client added successfully");
      setIsCreateDialogOpen(false);
      void loadClients(); // Refresh the list
    } catch (error: unknown) {
      console.error("Failed to create IB existing client:", error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "IB existing clients", action: "create" })
      );
      throw error; // Re-throw to let the dialog handle it
    }
  }, [token, loadClients]);

  const columns: ColumnDef<IBExistingClient>[] = useMemo(
    () => getColumns(),
    []
  );

  const visibleClients = useMemo(() => {
    if (!accountModeFilter || accountModeFilter === "all") return clients;

    return clients.filter((client) => {
      return String(client.account_mode ?? "").toLowerCase() === accountModeFilter;
    });
  }, [clients, accountModeFilter]);

  if (canViewList && loadError && visibleClients.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <ApiErrorState
          error={loadError}
          audience="admin"
          variant="panel"
          resource="IB existing clients"
          action="load"
          onRetry={() => {
            void loadClients();
          }}
        />
      </div>
    );
  }

  if (!canViewList && !canCreate) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <AccessDeniedPanel
          title="Access restricted"
          message="Your account does not have permission to manage IB existing clients."
        />
      </div>
    );
  }

  const renderTableSection = () => {
    if (loading && visibleClients.length === 0) {
      return <TableSectionSkeleton columnCount={7} rowCount={8} />;
    }

    if (!loading && visibleClients.length === 0) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-full bg-muted px-4 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            No IB Existing Clients
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            There are currently no IB existing clients matching your filters. Adjust the filters or refresh
            to check for new clients.
          </p>
          <Button variant="outline" onClick={loadClients} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      );
    }

    return (
      <AppDataTable<IBExistingClient>
        data={visibleClients}
        columns={columns}
        pageCount={Math.max(1, pagination.total_pages)}
        getRowId={(row) => {
          const identifier =
            row.id ??
            row.account_id ??
            row.mt5_id ??
            `${row.created_at ?? row.account_id ?? Math.random().toString(36).slice(2)}`;
          return String(identifier);
        }}
      />
    );
  };

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-6 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
                <Database className="h-6 w-6 text-primary" />
                Add Existing Clients
              </h1>
              <p className="text-sm text-muted-foreground">
                View and manage MT5 Accounts that have been added into the system via &apos;Add Existing Clients&apos; flow.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canViewList ? (
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
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              {canCreate ? (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Existing Client
                </Button>
              ) : null}
              <Button variant="outline" onClick={loadClients} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-5">
            {/* Search and Filters Row */}
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:flex-wrap">
              <ApiSearchBar
                value={searchInput}
                onChange={setSearchInput}
                onSearch={(value) => {
                  void setSearch(value || null);
                  void setPage(1);
                }}
                placeholder="Search by client name/email or MT5 ID"
                className="min-w-[220px] flex-1 max-w-full"
                minimumLength={3}
                delay={300}
              />
              
              <Select
                value={groupFilter}
                onValueChange={(value) => {
                  void setGroupFilter(value);
                  void setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[200px] text-sm">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={String(group.id)}>
                      {group.mt5_group_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DateRangePicker
                fromDate={fromDateObj}
                toDate={toDateObj}
                onFromDateChange={(date) => {
                  setFromDateObj(date);
                  void setDateFrom(date ? format(date, "yyyy-MM-dd") : null);
                  void setPage(1);
                }}
                onToDateChange={(date) => {
                  setToDateObj(date);
                  void setDateTo(date ? format(date, "yyyy-MM-dd") : null);
                  void setPage(1);
                }}
              />
            </div>
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
            {canViewList ? (
              renderTableSection()
            ) : (
              <AccessDeniedPanel
                variant="inline"
                title="Access restricted"
                message="You can add IB existing clients, but your account is not allowed to view the list."
              />
            )}
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      {canCreate ? (
        <CreateExistingClientDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={handleCreate}
        />
      ) : null}
    </>
  );
}

const handleExport = (formatType: "xlsx" | "csv") => {
  toast(`Export ${formatType.toUpperCase()} is not implemented yet`);
};