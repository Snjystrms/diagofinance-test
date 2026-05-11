"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useManagerPermissions } from "@/hooks/use-manager-permissions";
import {
  adminPaymentMethodsApi,
  type PaymentMethod,
  type PaymentMethodRequest,
} from "@/lib/api-auth-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Pencil, Trash2, CreditCard } from "lucide-react";
import toast from "react-hot-toast";

const formatType = (type: string) =>
  type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const defaultForm = (pm?: PaymentMethod): PaymentMethodRequest => ({
  type: pm?.type ?? "",
  name: pm?.name ?? "",
  description: pm?.description ?? "",
  status: pm?.status ?? 1,
});

// ── Shared edit form ─────────────────────────────────────────────────────────
function MethodForm({
  value,
  onChange,
  typeOptions,
}: {
  value: PaymentMethodRequest;
  onChange: (v: PaymentMethodRequest) => void;
  typeOptions: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>
          Payment Type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={value.type}
          onValueChange={(v) => onChange({ ...value, type: v })}
        >
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          className="rounded-xl"
          placeholder="e.g. Bank Transfer"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea
          className="rounded-xl resize-none"
          rows={3}
          placeholder="Short description (optional)"
          value={value.description ?? ""}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select
          value={String(value.status)}
          onValueChange={(v) => onChange({ ...value, status: Number(v) })}
        >
          <SelectTrigger className="rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Active</SelectItem>
            <SelectItem value="0">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PspSettingPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { hasFeature, isManager } = useManagerPermissions();

  const canManagePspSettings =
    !isManager || hasFeature("settingsManagement", "pspSetting");

  const [editTarget, setEditTarget] = useState<PaymentMethod | null>(null);
  const [editForm, setEditForm] = useState<PaymentMethodRequest>(defaultForm());
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethod | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // ── data ────────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["payment-methods", token],
    queryFn: () => adminPaymentMethodsApi.list(token!),
    enabled: Boolean(token) && (!isManager || canManagePspSettings),
    staleTime: 60_000,
  });

  const rows: PaymentMethod[] =
    (data as unknown as { data?: { rows?: PaymentMethod[] } })?.data?.rows ?? [];

  // Derive unique type options from the API response
  const typeOptions = useMemo(() => {
    const seen = new Set<string>();
    return rows
      .filter((pm) => {
        if (seen.has(pm.type)) return false;
        seen.add(pm.type);
        return true;
      })
      .map((pm) => ({ value: pm.type, label: formatType(pm.type) }));
  }, [rows]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["payment-methods", token] });

  // ── mutations ───────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: PaymentMethodRequest }) =>
      adminPaymentMethodsApi.update(id, body, token!),
    onSuccess: () => {
      toast.success("Payment method updated");
      setEditTarget(null);
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update"),
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      setTogglingId(id);
      return adminPaymentMethodsApi.toggleStatus(id, token!);
    },
    onSuccess: (res) => {
      const msg = (res as unknown as { message?: string })?.message ?? "Status updated";
      toast.success(msg);
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to toggle"),
    onSettled: () => setTogglingId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminPaymentMethodsApi.delete(id, token!),
    onSuccess: () => {
      toast.success("Payment method deleted");
      setDeleteTarget(null);
      void invalidate();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete"),
  });

  // ── handlers ────────────────────────────────────────────────────────────────
  const openEdit = (pm: PaymentMethod) => {
    setEditTarget(pm);
    setEditForm(defaultForm(pm));
  };

  const handleUpdate = () => {
    if (!editTarget) return;
    if (!editForm.type) return toast.error("Please select a payment type");
    if (!editForm.name.trim()) return toast.error("Please enter a name");
    updateMutation.mutate({ id: editTarget.id, body: editForm });
  };

  // ── render ──────────────────────────────────────────────────────────────────
  if (isManager && !canManagePspSettings) {
    return (
      <div className="space-y-6 p-6">
        <p className="text-muted-foreground">
          You do not have permission to manage PSP settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-background/80 shadow-sm backdrop-blur-sm">
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            PSP Setting
          </h1>
          <p className="text-xs text-muted-foreground">
            Manage your payment method configurations
          </p>
        </div>
      </div>

      {/* ── Table card ─────────────────────────────────────────────────────── */}
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            Payment Methods
            {rows.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {rows.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
              <CreditCard className="h-8 w-8 opacity-30" />
              <p className="text-sm">No payment methods found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="w-14 text-center">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((pm) => (
                    <TableRow key={pm.id} className="border-border/60">
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {pm.id}
                      </TableCell>

                      <TableCell className="font-medium">{pm.name}</TableCell>

                      <TableCell>
                        <span className="rounded-lg border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-medium">
                          {formatType(pm.type)}
                        </span>
                      </TableCell>

                      <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">
                        {pm.description ?? "—"}
                      </TableCell>

                      <TableCell>
                        <div className="inline-flex items-center gap-2">
                          <Switch
                            checked={pm.status === 1}
                            onCheckedChange={() => toggleMutation.mutate(pm.id)}
                            aria-label="Toggle status"
                            disabled={togglingId === pm.id}
                          />
                          <Badge
                            variant="outline"
                            className={
                              pm.status === 1
                                ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
                                : "border-slate-400 bg-slate-50 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700"
                            }
                          >
                            {pm.status === 1 ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {pm.created_at ? new Date(pm.created_at).toLocaleDateString() : "—"}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-muted"
                            title="Edit"
                            onClick={() => openEdit(pm)}
                          >
                            <Pencil className="h-3.5 w-3.5 text-foreground/70" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                            title="Delete"
                            onClick={() => setDeleteTarget(pm)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit dialog ────────────────────────────────────────────────────── */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(o: boolean) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-primary" />
              Edit Payment Method
            </DialogTitle>
          </DialogHeader>
          <MethodForm value={editForm} onChange={setEditForm} typeOptions={typeOptions} />
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ──────────────────────────────────────────── */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(o: boolean) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete Payment Method
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
            This action cannot be undone.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
