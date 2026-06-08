"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import toast from "react-hot-toast";
import { CircleDollarSign, Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { AppDataTable } from "@/components/app-data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteDialog } from "@/components/dialogs/delete-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { SerialNumberCell } from "@/components/data-table/serial-number-cell";
import { formatDateTimeInIST } from "@/lib/formatters";
import {
  adminCurrencyRatesApi,
  type CurrencyRateItem,
  type CurrencyRateCreateBody,
} from "@/lib/api-auth-admin";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";

type CurrencyRateRow = {
  id: string;
  from_currency: string;
  to_currency: string;
  deposit_rate: number;
  withdrawal_rate: number;
  status: boolean;
  created_at?: string;
  updated_at?: string;
};

type CurrencyRateFormValue = {
  id?: string;
  from_currency: string;
  to_currency: string;
  deposit_rate: string;
  withdrawal_rate: string;
  status: boolean;
};

const normalize = (item: CurrencyRateItem): CurrencyRateRow => ({
  id: String(item.id),
  from_currency: item.from_currency ?? "",
  to_currency: item.to_currency ?? "",
  deposit_rate: Number(item.deposit_rate ?? 0),
  withdrawal_rate: Number(item.withdrawal_rate ?? 0),
  status: item.status === true || item.status === 1 || item.status === "1",
  created_at: item.created_at,
  updated_at: item.updated_at,
});

const fmtDate = (s?: string) => (s ? formatDateTimeInIST(s) : "-");

const defaultFormValue: CurrencyRateFormValue = {
  from_currency: "USD",
  to_currency: "EUR",
  deposit_rate: "",
  withdrawal_rate: "",
  status: true,
};

const MAINSTREAM_CURRENCIES = [
  { code: "USD", label: "US Dollar (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "INR", label: "Indian Rupee (INR)" },
  { code: "GBP", label: "British Pound (GBP)" },
  { code: "AUD", label: "Australian Dollar (AUD)" },
  { code: "CAD", label: "Canadian Dollar (CAD)" },
  { code: "CHF", label: "Swiss Franc (CHF)" },
  { code: "NZD", label: "New Zealand Dollar (NZD)" },
  { code: "SGD", label: "Singapore Dollar (SGD)" },
  { code: "HKD", label: "Hong Kong Dollar (HKD)" },
  { code: "CNY", label: "Chinese Yuan (CNY)" },
  { code: "JPY", label: "Japanese Yen (JPY)" },
  { code: "THB", label: "Thai Baht (THB)" },
  { code: "AED", label: "United Arab Emirates Dirham (AED)" },
  { code: "SAR", label: "Saudi Riyal (SAR)" },
  { code: "QAR", label: "Qatari Riyal (QAR)" },
  { code: "KWD", label: "Kuwaiti Dinar (KWD)" },
  { code: "BHD", label: "Bahraini Dinar (BHD)" },
  { code: "ZAR", label: "South African Rand (ZAR)" },
];

function CurrencyRateFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: CurrencyRateFormValue) => Promise<void>;
  initialData: CurrencyRateRow | null;
  loading: boolean;
}) {
  const [form, setForm] = useState<CurrencyRateFormValue>(defaultFormValue);
  const [toCurrencyCustom, setToCurrencyCustom] = useState("");

  const isToCustom = !MAINSTREAM_CURRENCIES.some((c) => c.code === form.to_currency);

  const isEdit = Boolean(form.id);

  const syncForm = useCallback((data: CurrencyRateRow | null) => {
    if (!data) {
      setForm(defaultFormValue);
      setToCurrencyCustom("");
      return;
    }
    setForm({
      id: data.id,
      from_currency: data.from_currency,
      to_currency: data.to_currency,
      deposit_rate: String(data.deposit_rate),
      withdrawal_rate: String(data.withdrawal_rate),
      status: data.status,
    });
    setToCurrencyCustom(
      MAINSTREAM_CURRENCIES.some((c) => c.code === data.to_currency.toUpperCase())
        ? ""
        : data.to_currency
    );
  }, []);

  useEffect(() => {
    if (open) syncForm(initialData);
  }, [open, initialData, syncForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Currency Rate" : "Add Currency Rate"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update deposit and withdrawal rates and status."
              : "Create a new currency conversion rate."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* From Currency */}
          <div className="grid gap-1.5 max-w-[110px]">
            <Label htmlFor="from_currency">From Currency</Label>
            <Input
              id="from_currency"
              value={form.from_currency || "USD"}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground whitespace-nowrap">All rates are converted from USD</p>
          </div>

          {/* To Currency */}
          <div className="grid gap-1.5">
            <Label htmlFor="to_currency">To Currency</Label>
            <Select
              value={isToCustom ? "CUSTOM" : form.to_currency}
              onValueChange={(value) => {
                if (value === "CUSTOM") {
                  setForm((prev) => ({ ...prev, to_currency: "CUSTOM" }));
                  setToCurrencyCustom("");
                } else {
                  setForm((prev) => ({ ...prev, to_currency: value.toUpperCase() }));
                  setToCurrencyCustom("");
                }
              }}
              disabled={isEdit}
            >
              <SelectTrigger id="to_currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {MAINSTREAM_CURRENCIES.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.label}
                  </SelectItem>
                ))}
                <SelectItem value="CUSTOM">Other (type custom code)</SelectItem>
              </SelectContent>
            </Select>
            {isToCustom && (
              <Input
                value={toCurrencyCustom}
                disabled={isEdit}
                onChange={(e) => setToCurrencyCustom(e.target.value.toUpperCase())}
                placeholder="Type custom code (e.g. BDT)"
                autoFocus
              />
            )}
          </div>

          {/* Deposit Rate */}
          <div className="grid gap-1.5">
            <Label htmlFor="deposit_rate">Deposit Rate</Label>
            <Input
              id="deposit_rate"
              value={form.deposit_rate}
              onChange={(e) => setForm((prev) => ({ ...prev, deposit_rate: e.target.value }))}
              placeholder="0.9215"
            />
          </div>

          {/* Withdrawal Rate */}
          <div className="grid gap-1.5">
            <Label htmlFor="withdrawal_rate">Withdrawal Rate</Label>
            <Input
              id="withdrawal_rate"
              value={form.withdrawal_rate}
              onChange={(e) => setForm((prev) => ({ ...prev, withdrawal_rate: e.target.value }))}
              placeholder="0.915"
            />
          </div>

          {/* Status */}
          <div className="inline-flex items-center gap-3">
            <Label htmlFor="status">Status</Label>
            <Switch
              id="status"
              checked={form.status}
              onCheckedChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
              aria-label="Toggle currency rate status"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            disabled={loading}
            onClick={async () => {
              const finalFromCurrency = form.from_currency.toUpperCase();
              const finalToCurrency = (toCurrencyCustom.trim() || form.to_currency).toUpperCase();
              if (!finalToCurrency || finalToCurrency === "CUSTOM") {
                toast.error("Please enter a custom currency code for To Currency");
                return;
              }
              if (form.deposit_rate.trim() === "" || Number.isNaN(Number(form.deposit_rate))) {
                toast.error("Valid deposit rate is required");
                return;
              }
              if (
                form.withdrawal_rate.trim() === "" ||
                Number.isNaN(Number(form.withdrawal_rate))
              ) {
                toast.error("Valid withdrawal rate is required");
                return;
              }
              await onSubmit({
                ...form,
                from_currency: finalFromCurrency,
                to_currency: finalToCurrency,
              });
            }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEdit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CurrencyManagementPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<CurrencyRateRow | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    data: rows = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["currency-rates", token],
    queryFn: async () => {
      const res = await adminCurrencyRatesApi.list({ token: token!, per_page: 100 });
      return (res?.data?.currencyRates ?? []).map(normalize);
    },
    enabled: Boolean(token),
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["currency-rates", token] });
  }, [queryClient, token]);

  const filtered = useMemo(() => {
    if (search.trim().length < 2) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r: CurrencyRateRow) =>
        r.from_currency.toLowerCase().includes(q) ||
        r.to_currency.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const handleCreate = async (form: CurrencyRateFormValue) => {
    if (!token) return;
    const body: CurrencyRateCreateBody = {
      from_currency: form.from_currency.trim().toUpperCase(),
      to_currency: form.to_currency.trim().toUpperCase(),
      deposit_rate: Number(form.deposit_rate),
      withdrawal_rate: Number(form.withdrawal_rate),
      status: form.status,
    };
    const res = await adminCurrencyRatesApi.create(body, token);
    if (!res?.success) throw new Error(res?.message || "Failed to create currency rate");
    toast.success(res.message || "Currency rate created");
    invalidate();
  };

  const handleUpdate = async (form: CurrencyRateFormValue) => {
    if (!token || !form.id) return;
    const res = await adminCurrencyRatesApi.update(
      form.id,
      {
        deposit_rate: Number(form.deposit_rate),
        withdrawal_rate: Number(form.withdrawal_rate),
        status: form.status,
      },
      token
    );
    if (!res?.success) throw new Error(res?.message || "Failed to update currency rate");
    toast.success(res.message || "Currency rate updated");
    invalidate();
  };

  const handleDelete = async () => {
    if (!token || !deletingId) return;
    try {
      setActionLoadingId(deletingId);
      const res = await adminCurrencyRatesApi.delete(deletingId, token);
      toast.success(res?.message || "Currency rate deleted");
      invalidate();
    } catch (e) {
      toast.error(getAdminFriendlyErrorMessage(e, { resource: "currency rates", action: "delete" }));
    } finally {
      setActionLoadingId(null);
      setDeletingId(null);
      setIsDeleteOpen(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    if (!token) return;
    try {
      setActionLoadingId(id);
      const res = await adminCurrencyRatesApi.toggleStatus(id, token);
      toast.success(res?.message || "Status updated");
      invalidate();
    } catch (e) {
      toast.error(getAdminFriendlyErrorMessage(e, { resource: "currency rates", action: "update" }));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEdit = async (id: string) => {
    if (!token) return;
    try {
      setActionLoadingId(id);
      const res = await adminCurrencyRatesApi.get(id, token);
      if (!res?.data) throw new Error(res?.message || "Failed to fetch currency rate");
      setEditingItem(normalize(res.data));
      setIsFormOpen(true);
    } catch (e) {
      toast.error(getAdminFriendlyErrorMessage(e, { resource: "currency rates", action: "read" }));
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns = useMemo<ColumnDef<CurrencyRateRow>[]>(
    () => [
      {
        id: "sr_no",
        header: "Sr. No.",
        cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
      },
      {
        id: "from_currency",
        accessorKey: "from_currency",
        header: ({ column }) => <DataTableColumnHeader column={column} title="From" />,
      },
      {
        id: "to_currency",
        accessorKey: "to_currency",
        header: ({ column }) => <DataTableColumnHeader column={column} title="To" />,
      },
      {
        id: "deposit_rate",
        accessorKey: "deposit_rate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Deposit Rate" />,
      },
      {
        id: "withdrawal_rate",
        accessorKey: "withdrawal_rate",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Withdrawal Rate" />,
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <Switch
            checked={row.original.status}
            onCheckedChange={() => handleToggleStatus(row.original.id)}
            disabled={actionLoadingId === row.original.id}
            aria-label="Toggle status"
          />
        ),
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{fmtDate(row.original.created_at)}</span>
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
              onClick={() => handleEdit(row.original.id)}
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
        <div className="mb-6 flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <CircleDollarSign className="h-6 w-6 text-primary" />
              Currency Management
            </h1>
            <p className="text-sm text-muted-foreground">Create, edit, and manage currency rates</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void refetch()} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={() => {
                setEditingItem(null);
                setIsFormOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Currency Rate
            </Button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="search-currency-rates">Search</Label>
            <Input
              id="search-currency-rates"
              placeholder="Search by currency code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isError && (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            Failed to load currency rates.{" "}
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

        <CurrencyRateFormDialog
          open={isFormOpen}
          onOpenChange={(open) => {
            setIsFormOpen(open);
            if (!open) setEditingItem(null);
          }}
          initialData={editingItem}
          loading={formLoading}
          onSubmit={async (form) => {
            try {
              setFormLoading(true);
              if (form.id) await handleUpdate(form);
              else await handleCreate(form);
              setIsFormOpen(false);
              setEditingItem(null);
            } catch (e) {
              toast.error(getAdminFriendlyErrorMessage(e, { resource: "currency rates", action: form.id ? "update" : "create" }));
            } finally {
              setFormLoading(false);
            }
          }}
        />

        <DeleteDialog
          isOpen={isDeleteOpen}
          onOpenChange={(open) => {
            setIsDeleteOpen(open);
            if (!open) setDeletingId(null);
          }}
          onConfirm={handleDelete}
          title="Delete Currency Rate"
          description="Are you sure you want to delete this currency rate? This action cannot be undone."
        />
      </div>
    </ProtectedRoute>
  );
}
