"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { IbPlanAccountTypeRow, IbPlanCommissionRow, IbPlanRow } from "./page";

type AccountTypeOption = {
  id: string;
  name: string;
};

type FormValue = Omit<IbPlanRow, "id" | "created_at" | "updated_at" | "ib_user_count"> & {
  id?: string;
};

const COMMISSION_LEVELS = ["IB", "Level-1", "Level-2", "Level-3", "Level-4", "Level-5"] as const;

const COMMISSION_FIELDS = [
  ["rate_ib", "Rate IB"],
  ["rate_sub_ib_1", "Sub IB 1"],
  ["rate_sub_ib_2", "Sub IB 2"],
  ["rate_sub_ib_3", "Sub IB 3"],
  ["rate_sub_ib_4", "Sub IB 4"],
  ["rate_sub_ib_5", "Sub IB 5"],
] as const;

const buildDefaultCommissions = (): IbPlanCommissionRow[] =>
  COMMISSION_LEVELS.map((level) => ({
    level,
    rate_ib: 0,
    rate_sub_ib_1: 0,
    rate_sub_ib_2: 0,
    rate_sub_ib_3: 0,
    rate_sub_ib_4: 0,
    rate_sub_ib_5: 0,
  }));

const mergeCommissions = (commissions?: IbPlanCommissionRow[]) => {
  const byLevel = new Map<string, IbPlanCommissionRow>();
  for (const row of buildDefaultCommissions()) {
    byLevel.set(row.level, row);
  }
  for (const row of commissions ?? []) {
    byLevel.set(row.level, {
      level: row.level,
      rate_ib: Number(row.rate_ib ?? 0),
      rate_sub_ib_1: Number(row.rate_sub_ib_1 ?? 0),
      rate_sub_ib_2: Number(row.rate_sub_ib_2 ?? 0),
      rate_sub_ib_3: Number(row.rate_sub_ib_3 ?? 0),
      rate_sub_ib_4: Number(row.rate_sub_ib_4 ?? 0),
      rate_sub_ib_5: Number(row.rate_sub_ib_5 ?? 0),
    });
  }
  return COMMISSION_LEVELS.map(
    (level) =>
      byLevel.get(level) ?? {
        level,
        rate_ib: 0,
        rate_sub_ib_1: 0,
        rate_sub_ib_2: 0,
        rate_sub_ib_3: 0,
        rate_sub_ib_4: 0,
        rate_sub_ib_5: 0,
      },
  );
};

const createEmptyForm = (): FormValue => ({
  name: "",
  description: "",
  status: true,
  account_types: [],
});

// ─── Commission Level Row ────────────────────────────────────────────────────

function CommissionLevelRow({
  commission,
  accountTypeId,
  disabled,
  onUpdate,
}: {
  commission: IbPlanCommissionRow;
  accountTypeId: string;
  disabled: boolean;
  onUpdate: (
    accountTypeId: string,
    level: string,
    updater: (current: IbPlanCommissionRow) => IbPlanCommissionRow,
  ) => void;
}) {
  const [open, setOpen] = useState(commission.level === "IB");

  return (
    <div className="rounded-md border bg-muted/20">
      {/* Level header — always visible, click to collapse */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex h-5 min-w-[2.5rem] items-center justify-center rounded-full px-2 text-xs font-semibold",
              commission.level === "IB"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {commission.level}
          </span>
          {!open && (
            <span className="text-xs text-muted-foreground">
              IB: {commission.rate_ib} &nbsp;·&nbsp; Sub IB 1: {commission.rate_sub_ib_1} &nbsp;·&nbsp; Sub IB 2:{" "}
              {commission.rate_sub_ib_2} &nbsp;···
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Rate inputs */}
      {open && (
        <div className="grid grid-cols-2 gap-3 border-t px-4 pb-4 pt-3 sm:grid-cols-3 xl:grid-cols-6">
          {COMMISSION_FIELDS.map(([field, label]) => (
            <div key={field} className="space-y-1.5">
              <Label
                htmlFor={`${accountTypeId}-${commission.level}-${field}`}
                className="text-xs text-muted-foreground"
              >
                {label}
              </Label>
              <Input
                id={`${accountTypeId}-${commission.level}-${field}`}
                type="number"
                step="1"
                min="1"
                value={String(commission[field] ?? 0)}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                onChange={(event) => {
                  onUpdate(accountTypeId, commission.level, (current) => ({
                    ...current,
                    [field]: Number(event.target.value || 0),
                  }));
                }}
                disabled={disabled}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Account Type Card ────────────────────────────────────────────────────────

function AccountTypeCard({
  accountType,
  disabled,
  onRemove,
  onUpdate,
}: {
  accountType: IbPlanAccountTypeRow;
  disabled: boolean;
  onRemove: (id: string) => void;
  onUpdate: (
    accountTypeId: string,
    level: string,
    updater: (current: IbPlanCommissionRow) => IbPlanCommissionRow,
  ) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border shadow-sm">
      {/* Card header */}
      <div className="flex items-center justify-between bg-muted/40 px-4 py-3">
        <button
          type="button"
          onClick={() => setCollapsed((prev) => !prev)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          {collapsed ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <div>
            <div className="font-semibold leading-tight">
              {accountType.account_type_name || "Account Type"}
            </div>
            <div className="text-xs text-muted-foreground">
              {/* ID: {accountType.account_type_id} &nbsp;·&nbsp;{" "} */}
              {accountType.commissions.length} commission levels
            </div>
          </div>
        </button>

        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(accountType.account_type_id)}
            className="ml-2 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Commission levels */}
      {!collapsed && (
        <div className="space-y-2 p-4">
          {accountType.commissions.map((commission) => (
            <CommissionLevelRow
              key={`${accountType.account_type_id}-${commission.level}`}
              commission={commission}
              accountTypeId={accountType.account_type_id}
              disabled={disabled}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Add Account Type Inline Row ─────────────────────────────────────────────

function AddAccountTypeRow({
  availableAccountTypes,
  onAdd,
}: {
  availableAccountTypes: AccountTypeOption[];
  onAdd: (id: string) => void;
}) {
  const [selected, setSelected] = useState("");

  const handleAdd = () => {
    if (!selected) return;
    onAdd(selected);
    setSelected("");
  };

  if (availableAccountTypes.length === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-3">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="h-8 flex-1 text-sm">
          <SelectValue placeholder="Select account type to add…" />
        </SelectTrigger>
        <SelectContent>
          {availableAccountTypes.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleAdd}
        disabled={!selected}
        className="h-8 shrink-0"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add
      </Button>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export function IbPlanForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  readOnly = false,
  accountTypeOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValue) => void | Promise<void>;
  initialData?: IbPlanRow | null;
  readOnly?: boolean;
  accountTypeOptions: AccountTypeOption[];
}) {
  const [form, setForm] = useState<FormValue>(createEmptyForm);

  useEffect(() => {
    if (initialData) {
      setForm({
        id: initialData.id,
        name: initialData.name,
        description: initialData.description ?? "",
        status: Boolean(initialData.status),
        account_types: initialData.account_types.map((accountType) => ({
          account_type_id: accountType.account_type_id,
          account_type_name: accountType.account_type_name,
          commissions: mergeCommissions(accountType.commissions),
        })),
      });
      return;
    }
    setForm(createEmptyForm());
  }, [initialData, open]);

  const isEdit = useMemo(() => Boolean(initialData?.id), [initialData]);
  const disabled = readOnly;

  const availableAccountTypes = useMemo(
    () =>
      accountTypeOptions.filter(
        (option) =>
          !form.account_types.some((at) => at.account_type_id === option.id),
      ),
    [accountTypeOptions, form.account_types],
  );

  const addAccountType = (id: string) => {
    const option = accountTypeOptions.find((item) => item.id === id);
    if (!option) return;
    setForm((current) => ({
      ...current,
      account_types: [
        ...current.account_types,
        {
          account_type_id: option.id,
          account_type_name: option.name,
          commissions: buildDefaultCommissions(),
        },
      ],
    }));
  };

  const removeAccountType = (accountTypeId: string) => {
    setForm((current) => ({
      ...current,
      account_types: current.account_types.filter(
        (at) => at.account_type_id !== accountTypeId,
      ),
    }));
  };

  const updateCommission = (
    accountTypeId: string,
    level: string,
    updater: (current: IbPlanCommissionRow) => IbPlanCommissionRow,
  ) => {
    setForm((current) => ({
      ...current,
      account_types: current.account_types.map((at) => {
        if (at.account_type_id !== accountTypeId) return at;
        return {
          ...at,
          commissions: at.commissions.map((commission) =>
            commission.level === level ? updater(commission) : commission,
          ),
        };
      }),
    }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || form.account_types.length === 0) return;
    try {
      await Promise.resolve(onSubmit(form));
      onOpenChange(false);
    } catch {
      // Keep dialog open on failure.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <form onSubmit={submit}>
          <DialogHeader className="pb-2">
            <DialogTitle>
              {isEdit ? (readOnly ? "View IB Plan" : "Edit IB Plan") : "Create IB Plan"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* ── Plan details ── */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Plan Details
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="plan-name">Plan Name</Label>
                  <Input
                    id="plan-name"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="e.g. VIP IB Plan"
                    disabled={disabled}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                    <Switch
                      checked={form.status}
                      onCheckedChange={(value) =>
                        setForm((current) => ({ ...current, status: value }))
                      }
                      disabled={disabled}
                    />
                    <span className="text-sm">{form.status ? "Active" : "Inactive"}</span>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="plan-description">Description</Label>
                  <Textarea
                    id="plan-description"
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Describe this IB plan…"
                    disabled={disabled}
                    rows={2}
                  />
                </div>
              </div>
            </section>

            {/* ── Account Types ── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Account Types
                </h3>
                {form.account_types.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {form.account_types.length} configured
                  </span>
                )}
              </div>

              {form.account_types.length === 0 ? (
                <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                  No account types added yet. Use the selector below to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {form.account_types.map((accountType: IbPlanAccountTypeRow) => (
                    <AccountTypeCard
                      key={accountType.account_type_id}
                      accountType={accountType}
                      disabled={disabled}
                      onRemove={removeAccountType}
                      onUpdate={updateCommission}
                    />
                  ))}
                </div>
              )}

              {/* Add account type — always at the bottom of the list */}
              {!disabled && (
                <AddAccountTypeRow
                  availableAccountTypes={availableAccountTypes}
                  onAdd={addAccountType}
                />
              )}
            </section>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && (
              <Button
                type="submit"
                disabled={!form.name.trim() || form.account_types.length === 0}
              >
                {isEdit ? "Save Changes" : "Create Plan"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}