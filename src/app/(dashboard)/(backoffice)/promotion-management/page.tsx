"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { AppDataTable } from "@/components/app-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DeleteDialog } from "@/components/dialogs/delete-dialog";
import { Megaphone, Plus, Pencil, Trash2, Loader2, ImageIcon } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { Switch } from "@/components/ui/switch";
import { formatDateTimeInIST } from "@/lib/formatters";
import { adminNewsApi, type NewsItem } from "@/lib/api-auth-admin";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
import { NewsForm, type NewsFormValue } from "../news-management/news-form";
import Image from "next/image";

type PromotionRow = {
  id: string;
  title: string;
  description: string;
  short_description: string;
  image?: string;
  image_url?: string;
  status: boolean;
  type: "news" | "promotion";
  created_at?: string;
  updated_at?: string;
};

const normalize = (item: NewsItem): PromotionRow => ({
  id: String(item.id),
  title: item.title ?? "",
  description: item.description ?? "",
  short_description: item.short_description ?? "",
  image: item.image,
  image_url: item.image_url,
  status: Number(item.status) === 1,
  type: (item.type as "news" | "promotion") ?? "promotion",
  created_at: item.created_at,
  updated_at: item.updated_at,
});

const fmtDate = (s?: string) => (s ? formatDateTimeInIST(s) : "-");

export default function PromotionManagementPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PromotionRow | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    data: rows = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["news", token, "promotion"],
    queryFn: async () => {
      const res = await adminNewsApi.list({ token: token!, type: "promotion", per_page: 100 });
      return (res?.data?.news ?? []).filter((item) => item.type === "promotion").map(normalize);
    },
    enabled: Boolean(token),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["news", token, "promotion"] });
  }, [queryClient, token]);

  const filtered = useMemo(() => {
    let d = rows;
    if (statusFilter === "active") d = d.filter((r: PromotionRow) => r.status);
    else if (statusFilter === "inactive") d = d.filter((r: PromotionRow) => !r.status);
    if (search.trim().length >= 3) {
      const q = search.toLowerCase();
      d = d.filter(
        (r: PromotionRow) =>
          r.title.toLowerCase().includes(q) ||
          r.short_description.toLowerCase().includes(q)
      );
    }
    return d;
  }, [rows, statusFilter, search]);

  const handleCreate = async (form: NewsFormValue) => {
    if (!token) return;
    try {
      const image =
        form.imageMode === "file" && form.imageFile
          ? form.imageFile
          : form.imageUrl || undefined;

      const res = await adminNewsApi.create(
        {
          title: form.title,
          description: form.description,
          short_description: form.short_description,
          status: form.status ? 1 : 0,
          image,
          type: "promotion",
        },
        token
      );
      if (res?.success) {
        toast.success(res.message || "Promotion created");
        invalidate();
      } else {
        toast.error(res?.message || "Failed to create promotion");
      }
    } catch (e) {
      toast.error(getAdminFriendlyErrorMessage(e, { resource: "promotions", action: "create" }));
    }
  };

  const handleUpdate = async (form: NewsFormValue) => {
    if (!token || !form.id) return;
    try {
      const image =
        form.imageMode === "file" && form.imageFile
          ? form.imageFile
          : form.imageUrl || undefined;

      const res = await adminNewsApi.update(
        form.id,
        {
          title: form.title,
          description: form.description,
          short_description: form.short_description,
          status: form.status ? 1 : 0,
          ...(image !== undefined && { image }),
        },
        token
      );
      if (res?.success) {
        toast.success(res.message || "Promotion updated");
        invalidate();
      } else {
        toast.error(res?.message || "Failed to update promotion");
      }
    } catch (e) {
      toast.error(getAdminFriendlyErrorMessage(e, { resource: "promotions", action: "update" }));
    }
  };

  const handleToggleStatus = async (id: string, current: boolean) => {
    if (!token) return;
    try {
      setActionLoadingId(id);
      const res = await adminNewsApi.toggleStatus(id, current ? 0 : 1, token);
      toast.success(res?.message || "Status updated");
      invalidate();
    } catch (e) {
      toast.error(getAdminFriendlyErrorMessage(e, { resource: "promotions", action: "update" }));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!token || !deletingId) return;
    try {
      setActionLoadingId(deletingId);
      const res = await adminNewsApi.delete(deletingId, token);
      toast.success(res?.message || "Promotion deleted");
      invalidate();
    } catch (e) {
      toast.error(getAdminFriendlyErrorMessage(e, { resource: "promotions", action: "delete" }));
    } finally {
      setActionLoadingId(null);
      setDeletingId(null);
      setIsDeleteOpen(false);
    }
  };

  const handleFormSubmit = async (form: NewsFormValue) => {
    if (form.id) {
      await handleUpdate(form);
    } else {
      await handleCreate(form);
    }
  };

  const columns = useMemo<ColumnDef<PromotionRow>[]>(
    () => [
      {
        id: "sr_no",
        header: "Sr. No.",
        cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
        enableSorting: false,
      },
      {
        id: "image",
        header: "Image",
        cell: ({ row }) =>
          row.original.image_url ? (
            <div className="relative h-10 w-16 overflow-hidden rounded border bg-muted">
              <Image
                src={row.original.image_url}
                alt={row.original.title}
                fill
                className="object-cover"
                sizes="64px"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-10 w-16 items-center justify-center rounded border bg-muted">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          ),
        enableSorting: false,
      },
      {
        id: "title",
        accessorKey: "title",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
        cell: ({ row }) => (
          <div className="flex flex-col max-w-xs">
            <span className="font-medium truncate">{row.original.title}</span>
            <span className="text-xs text-muted-foreground truncate">
              {row.original.short_description}
            </span>
          </div>
        ),
      },
      {
        id: "description",
        accessorKey: "description",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
        cell: ({ row }) => (
          <p className="max-w-xs truncate text-sm text-muted-foreground">
            {row.original.description}
          </p>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <div className="inline-flex items-center gap-2">
            <Switch
              checked={row.original.status}
              onCheckedChange={() =>
                handleToggleStatus(row.original.id, row.original.status)
              }
              disabled={actionLoadingId === row.original.id}
              aria-label="Toggle status"
            />
            {/* <Badge
              variant="outline"
              className={
                row.original.status
                  ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                  : "border-slate-400 text-slate-600 bg-slate-50"
              }
            >
              {row.original.status ? "Active" : "Inactive"}
            </Badge> */}
          </div>
        ),
      },
      {
        id: "type",
        accessorKey: "type",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <Badge className="bg-purple-100 text-purple-700 border-purple-300 capitalize">
            {row.original.type}
          </Badge>
        ),
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {fmtDate(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setEditingItem(row.original);
                setIsFormOpen(true);
              }}
              title="Edit"
            >
              {actionLoadingId === row.original.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive/80"
              onClick={() => {
                setDeletingId(row.original.id);
                setIsDeleteOpen(true);
              }}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actionLoadingId]
  );

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Megaphone className="h-6 w-6 text-primary" />
              Promotion Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Create, edit, and manage promotional content
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingItem(null);
              setIsFormOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Promotion
          </Button>
        </div>

        {/* Filters */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="search-promo">Search</Label>
            <Input
              id="search-promo"
              placeholder="Type at least 3 characters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(v: "all" | "active" | "inactive") => setStatusFilter(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isError && (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load promotions.{" "}
            <button onClick={() => refetch()} className="underline">
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <AppDataTable data={filtered} columns={columns} />
        )}

        {/* Create / Edit Form */}
        <NewsForm
          open={isFormOpen}
          onOpenChange={(o) => {
            setIsFormOpen(o);
            if (!o) setEditingItem(null);
          }}
          onSubmit={handleFormSubmit}
          initialData={editingItem}
          newsType="promotion"
        />

        {/* Delete Confirmation */}
        <DeleteDialog
          isOpen={isDeleteOpen}
          onOpenChange={(o) => {
            setIsDeleteOpen(o);
            if (!o) setDeletingId(null);
          }}
          onConfirm={handleDelete}
          title="Delete Promotion"
          description="Are you sure you want to delete this promotion? This action cannot be undone."
        />
      </div>
    </ProtectedRoute>
  );
}



