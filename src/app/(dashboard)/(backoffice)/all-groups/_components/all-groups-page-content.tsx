"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Download, Edit, Plus, RefreshCw, Search, Trash2, Users, Pencil } from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

import { ApiErrorState } from "@/components/errors/api-error-state";
import { CapabilityGate, CapabilityProtectedView } from "@/components/capability-gate";
import { ProtectedRoute } from "@/components/protected-route";
import { TableSectionSkeleton } from "@/components/loading/page-loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context";
import { adminGroupsApi, type AdminGroupItem } from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { useCrudCapabilities } from "@/hooks/use-permission-capabilities";

type GroupRow = {
  id: number;
  name: string;
  mt5_group_name: string;
  status: number;
};

type GroupFormState = {
  name: string;
  mt5_group_name: string;
  status: boolean;
};

const emptyForm: GroupFormState = {
  name: "",
  mt5_group_name: "",
  status: true,
};

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

function normalizeGroups(groups?: AdminGroupItem[]): GroupRow[] {
  return (groups ?? []).map((group) => ({
    id: group.id,
    name: group.name ?? "",
    mt5_group_name: group.mt5_group_name ?? "",
    status: typeof group.status === "boolean" ? (group.status ? 1 : 0) : Number(group.status ?? 1),
  }));
}

function toPayload(values: GroupFormState) {
  return {
    name: values.name.trim(),
    mt5_group_name: values.mt5_group_name.trim(),
    status: values.status ? 1 : 0,
  };
}

function GroupFormFields({
  form,
  onChange,
  disabled,
}: {
  form: GroupFormState;
  onChange: (values: GroupFormState) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="group-name">Group name</Label>
        <Input
          id="group-name"
          value={form.name}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
          placeholder="Example: APEXADVANCEUSD"
          disabled={disabled}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mt5-group-name">MT5 group name</Label>
        <Input
          id="mt5-group-name"
          value={form.mt5_group_name}
          onChange={(event) => onChange({ ...form, mt5_group_name: event.target.value })}
          placeholder="Example: demo\\B2COPYUSD"
          disabled={disabled}
          required
        />
      </div>
      <div className="flex items-center justify-between rounded-md border p-3">
        <div className="space-y-1">
          <Label htmlFor="group-status">Active group</Label>
          <p className="text-xs text-muted-foreground">Inactive groups stay hidden from normal account setup choices.</p>
        </div>
        <Switch
          id="group-status"
          checked={form.status}
          onCheckedChange={(status) => onChange({ ...form, status })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export function AllGroupsPageContent() {
  const { token } = useAuth();
  const {
    canViewList: canViewGroupList,
    canAdd: canAddGroup,
    canEdit: canEditGroup,
    canDelete: canDeleteGroup,
    showActionsColumn,
  } = useCrudCapabilities("groupManagement", {
    list: "list",
    add: "add",
    edit: "edit",
    delete: "delete",
  });
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createForm, setCreateForm] = useState<GroupFormState>(emptyForm);
  const [editForm, setEditForm] = useState<GroupFormState>(emptyForm);
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null);

  const queryKey = useMemo(() => ["admin-groups", token] as const, [token]);

  const {
    data: groupsResponse,
    isFetching,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await adminGroupsApi.list(token!);
      return normalizeGroups(response.data);
    },
    enabled: Boolean(token),
    staleTime: 60 * 1000,
  });

  const refreshGroups = () => {
    void queryClient.invalidateQueries({ queryKey });
  };

  const createMutation = useMutation({
    mutationFn: async (values: GroupFormState) => adminGroupsApi.create(toPayload(values), token!),
    onSuccess: (response) => {
      toast.success(response.message || "Group created successfully");
      setCreateOpen(false);
      setCreateForm(emptyForm);
      refreshGroups();
    },
    onError: (error) => {
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "groups", action: "create" })
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: GroupFormState }) =>
      adminGroupsApi.update({ id, ...toPayload(values) }, token!),
    onSuccess: (response) => {
      toast.success(response.message || "Group updated successfully");
      setEditOpen(false);
      setSelectedGroup(null);
      setEditForm(emptyForm);
      refreshGroups();
    },
    onError: (error) => {
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "groups", action: "update" })
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => adminGroupsApi.delete({ id }, token!),
    onSuccess: (response) => {
      toast.success(response.message || "Group deleted successfully");
      refreshGroups();
    },
    onError: (error) => {
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "groups", action: "delete" })
      );
    },
  });

  const groups = useMemo(() => groupsResponse ?? [], [groupsResponse]);
  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;

    return groups.filter((group) => {
      return (
        group.name.toLowerCase().includes(query) ||
        group.mt5_group_name.toLowerCase().includes(query) ||
        String(group.id).includes(query)
      );
    });
  }, [groups, search]);

  const handleCreateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createForm.name.trim() || !createForm.mt5_group_name.trim()) {
      toast.error("Group name and MT5 group name are required");
      return;
    }
    createMutation.mutate(createForm);
  };

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedGroup) return;
    if (!editForm.name.trim() || !editForm.mt5_group_name.trim()) {
      toast.error("Group name and MT5 group name are required");
      return;
    }
    updateMutation.mutate({ id: selectedGroup.id, values: editForm });
  };

  const openEditDialog = (group: GroupRow) => {
    if (!canEditGroup) {
      toast.error("You do not have permission to edit groups");
      return;
    }
    setSelectedGroup(group);
    setEditForm({
      name: group.name,
      mt5_group_name: group.mt5_group_name || group.name,
      status: group.status === 1,
    });
    setEditOpen(true);
  };

  const handleDelete = (group: GroupRow) => {
    if (!canDeleteGroup) {
      toast.error("You do not have permission to delete groups");
      return;
    }
    deleteMutation.mutate(group.id);
  };

  const handleExport = (formatType: "xlsx" | "csv") => {
    if (!canViewGroupList) {
      toast.error("You do not have permission to export groups");
      return;
    }

    const exportToastId = `groups-export-${formatType}`;
    try {
      if (filteredGroups.length === 0) {
        toast.error("No data to export", { id: exportToastId });
        return;
      }

      toast.loading(`Preparing ${formatType.toUpperCase()} export...`, { id: exportToastId });
      const exportData = filteredGroups.map((group, index) => ({
        "Sr. No.": index + 1,
        "Group Name": group.name || "-",
        "MT5 Group Name": group.mt5_group_name || "-",
        Status: group.status === 1 ? "Active" : "Inactive",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const filenameBase = `groups-${getExportTimestamp()}`;
      let filename = `${filenameBase}.xlsx`;

      if (formatType === "xlsx") {
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Groups");
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

      toast.success(`Exported ${filteredGroups.length} groups to ${filename}`, { id: exportToastId });
    } catch (error: unknown) {
      console.error(`Failed to export ${formatType}:`, error);
      toast.error(
        getAdminFriendlyErrorMessage(error, { resource: "groups", action: "export" }),
        { id: exportToastId },
      );
    }
  };

  const mutationInProgress = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  if (isError && groups.length === 0) {
    return (
      <ProtectedRoute>
        <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
          <ApiErrorState
            error={error}
            audience="admin"
            variant="panel"
            resource="groups"
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
      <CapabilityProtectedView
        allowed={canViewGroupList}
        message="You do not have permission to view group list."
      >
      <div className="container mx-auto space-y-6 px-4 py-10 md:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">All Groups</h1>
                <p className="text-sm text-muted-foreground">
                  Create, update, and manage trading groups for account setup.
                </p>
              </div>
            </div>
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
                <DropdownMenuItem onClick={() => handleExport("csv")}>
                  Export CSV (.csv)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching || mutationInProgress}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <CapabilityGate allowed={canAddGroup}>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Group
              </Button>
            </CapabilityGate>
          </div>
        </div>

        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Group List</CardTitle>
              <CardDescription>Search by group name, MT5 group name, or ID.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search groups"
                className="pl-9"
              />
            </div>

            {isLoading ? (
              <TableSectionSkeleton columnCount={5} rowCount={8} />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[90px]">Sr. No.</TableHead>
                      <TableHead>Group Name</TableHead>
                      <TableHead>MT5 Group Name</TableHead>
                      <TableHead>Status</TableHead>
                      {showActionsColumn && <TableHead className="w-[130px] text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGroups.length > 0 ? (
                      filteredGroups.map((group, index) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{group.name}</TableCell>
                          <TableCell>{group.mt5_group_name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={group.status === 1 ? "default" : "secondary"}>
                              {group.status === 1 ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          {showActionsColumn && (
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                {canEditGroup && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => openEditDialog(group)}
                                    disabled={mutationInProgress}
                                    title="Edit group"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDeleteGroup && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDelete(group)}
                                    disabled={mutationInProgress}
                                    title="Delete group"
                                    className="text-destructive hover:text-destructive/80"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={showActionsColumn ? 5 : 4} className="h-24 text-center text-muted-foreground">
                          No groups found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <form className="space-y-5" onSubmit={handleCreateSubmit}>
              <DialogHeader>
                <DialogTitle>Add group</DialogTitle>
                <DialogDescription>Create a new trading group.</DialogDescription>
              </DialogHeader>
              <GroupFormFields form={createForm} onChange={setCreateForm} disabled={createMutation.isPending} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Group"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <form className="space-y-5" onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>Edit group</DialogTitle>
                <DialogDescription>Update the selected trading group.</DialogDescription>
              </DialogHeader>
              <GroupFormFields form={editForm} onChange={setEditForm} disabled={updateMutation.isPending} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={updateMutation.isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      </CapabilityProtectedView>
    </ProtectedRoute>
  );
}
