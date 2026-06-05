"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
  const getEditableFieldCount = (level: string) => {
    const levelIndex = COMMISSION_LEVELS.indexOf(level as (typeof COMMISSION_LEVELS)[number]);
    return levelIndex >= 0 ? levelIndex + 1 : COMMISSION_FIELDS.length;
  };

  const numberStr = (value: unknown) => {
    const n = typeof value === "string" ? Number(value) : value;
    return typeof n === "number" && Number.isFinite(n) ? String(n) : "0";
  };

  return (
    <div className="overflow-hidden rounded-lg border shadow-sm">
      <div className="flex items-center justify-between bg-muted/40 px-4 py-3">
        <div>
          <div className="font-semibold leading-tight">
            {accountType.account_type_name || "Account Type"}
          </div>
          <div className="text-xs text-muted-foreground">
            {accountType.commissions.length} commission levels
          </div>
        </div>

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

      <div className="p-4">
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                    Level
                  </th>
                  {COMMISSION_FIELDS.map(([, label]) => (
                    <th
                      key={label}
                      className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accountType.commissions.map((commission, levelIndex) => {
                  const editableFieldCount = getEditableFieldCount(commission.level);
                  return (
                    <tr
                      key={`${accountType.account_type_id}-${commission.level}`}
                      className={levelIndex !== accountType.commissions.length - 1 ? "border-b" : ""}
                    >
                      <td className="px-3 py-2">
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border">
                          {commission.level}
                        </span>
                      </td>
                      {COMMISSION_FIELDS.map(([field], fieldIndex) => (
                        <td key={field} className="px-3 py-2">
                          <div className="relative flex items-center">
                            <Input
                              className="w-20 h-8 text-sm pr-6"
                              type="number"
                              step="1"
                              min="0"
                              value={numberStr(commission[field])}
                              onChange={(event) =>
                                onUpdate(accountType.account_type_id, commission.level, (current) => ({
                                  ...current,
                                  [field]: Number(event.target.value || 0),
                                }))
                              }
                              disabled={disabled || fieldIndex >= editableFieldCount}
                              onWheel={(event) => (event.target as HTMLInputElement).blur()}
                            />
                            <span className="absolute right-2 text-xs text-muted-foreground pointer-events-none select-none">
                              $
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddAccountTypeRow({
  availableAccountTypes,
  onAdd,
}: {
  availableAccountTypes: AccountTypeOption[];
  onAdd: (id: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!selected) return;
    try {
      setAdding(true);
      await onAdd(selected);
      setSelected("");
    } finally {
      setAdding(false);
    }
  };

  if (availableAccountTypes.length === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-4 py-3">
      <Select value={selected} onValueChange={setSelected}>
        <SelectTrigger className="h-8 flex-1 text-sm">
          <SelectValue placeholder="Select account type to add..." />
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
        disabled={!selected || adding}
        className="h-8 shrink-0"
      >
        {adding ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="mr-1.5 h-3.5 w-3.5" />
        )}
        Add
      </Button>
    </div>
  );
}

export function IbPlanForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  readOnly = false,
  accountTypeOptions,
  loadAccountTypeById,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValue) => void | Promise<void>;
  initialData?: IbPlanRow | null;
  readOnly?: boolean;
  accountTypeOptions: AccountTypeOption[];
  loadAccountTypeById: (id: string) => Promise<IbPlanAccountTypeRow | null>;
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

  const addAccountType = async (id: string) => {
    const option = accountTypeOptions.find((item) => item.id === id);
    if (!option) return;

    const detail = await loadAccountTypeById(id);

    setForm((current) => ({
      ...current,
      account_types: [
        ...current.account_types,
        {
          account_type_id: option.id,
          account_type_name: option.name,
          commissions: mergeCommissions(detail?.commissions ?? buildDefaultCommissions()),
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
              {isEdit ? (readOnly ? "View Partner Plan" : "Edit Partner Plan") : "Create Partner Plan"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
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
                    placeholder="e.g. VIP Partner Plan"
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
                    placeholder="Describe this Partner plan..."
                    disabled={disabled}
                    rows={2}
                  />
                </div>
              </div>
            </section>

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
