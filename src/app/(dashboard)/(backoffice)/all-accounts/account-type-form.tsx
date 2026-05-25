"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  AccountTypeCommissionRow,
  AccountTypeRow,
} from "./page";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormValue = Omit<AccountTypeRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
};

const COMMISSION_LEVELS = [
  "IB",
  "Level-1",
  "Level-2",
  "Level-3",
  "Level-4",
  "Level-5",
] as const;

const buildDefaultCommissions = (): AccountTypeCommissionRow[] =>
  COMMISSION_LEVELS.map((level, index) => ({
    is_default: index === 0,
    level,
    rate_ib: 0,
    rate_sub_ib_1: 0,
    rate_sub_ib_2: 0,
    rate_sub_ib_3: 0,
    rate_sub_ib_4: 0,
    rate_sub_ib_5: 0,
    status: true,
  }));

const extractEditableNumberString = (
  value: string | number | undefined,
  options?: { preferLastMatch?: boolean },
) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "";
    }

    const direct = Number(trimmed);
    if (Number.isFinite(direct)) {
      return String(direct);
    }

    const matches = trimmed.match(/-?\d+(\.\d+)?/g);
    if (matches && matches.length > 0) {
      const candidate = options?.preferLastMatch
        ? matches[matches.length - 1]
        : matches[0];
      const extracted = Number(candidate);
      if (Number.isFinite(extracted)) {
        return String(extracted);
      }
    }
  }

  return "";
};

const mergeCommissions = (
  commissions?: AccountTypeCommissionRow[],
): AccountTypeCommissionRow[] => {
  const byLevel = new Map<string, AccountTypeCommissionRow>();

  for (const item of buildDefaultCommissions()) {
    byLevel.set(item.level, item);
  }

  for (const item of commissions ?? []) {
    byLevel.set(item.level, {
      ...item,
      is_default: Boolean(item.is_default),
      status: Boolean(item.status),
    });
  }

  return COMMISSION_LEVELS.map((level) => byLevel.get(level) ?? {
    is_default: level === "IB",
    level,
    rate_ib: 0,
    rate_sub_ib_1: 0,
    rate_sub_ib_2: 0,
    rate_sub_ib_3: 0,
    rate_sub_ib_4: 0,
    rate_sub_ib_5: 0,
    status: true,
  });
};

const createEmptyForm = (): FormValue => ({
  name: "",
  spread_from: "",
  maximum_leverage: "2000",
  leverage_type: "dynamic",
  leverage_value: 2000,
  stop_out_level: "50.00",
  hedge_margin: "0.00",
  swap_free_option: true,
  base_currency: "USD",
  status: true,
  ib_commissions: buildDefaultCommissions(),
});

export function AccountTypeForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  readOnly = false,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (data: FormValue) => void;
  initialData?: AccountTypeRow | null;
  readOnly?: boolean;
}) {
  const [form, setForm] = useState<FormValue>(createEmptyForm);

  useEffect(() => {
    if (initialData) {
      setForm({
        id: initialData.id,
        name: initialData.name,
        spread_from: extractEditableNumberString(initialData.spread_from),
        maximum_leverage: extractEditableNumberString(
          initialData.maximum_leverage,
          { preferLastMatch: true },
        ),
        leverage_type: (initialData.leverage_type as string) || "dynamic",
        leverage_value: Number(initialData.leverage_value || 0),
        stop_out_level: initialData.stop_out_level ?? "0.00",
        hedge_margin: initialData.hedge_margin ?? "0.00",
        swap_free_option: Boolean(initialData.swap_free_option),
        base_currency: initialData.base_currency ?? "USD",
        status: Boolean(initialData.status),
        ib_commissions: mergeCommissions(initialData.ib_commissions),
      });
    } else {
      setForm(createEmptyForm());
    }
  }, [initialData, open]);

  const isEdit = useMemo(() => !!initialData?.id, [initialData]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await Promise.resolve(onSubmit(form));
      onOpenChange(false);
    } catch {
      // keep dialog open when the request fails so the user can fix values
    }
  };

  const numberStr = (v: string | number) => {
    const n = typeof v === "string" ? parseFloat(v) : v;
    if (!Number.isFinite(n)) return "";
    return String(n);
  };

  const disabled = readOnly;

  const updateCommission = (
    level: string,
    updater: (current: AccountTypeCommissionRow) => AccountTypeCommissionRow,
  ) => {
    setForm((current) => ({
      ...current,
      ib_commissions: current.ib_commissions.map((commission) =>
        commission.level === level ? updater(commission) : commission,
      ),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit
                ? readOnly
                  ? "View Account Type"
                  : "Edit Account Type"
                : "Create Account Type"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Standard account"
                disabled={disabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_currency">Base Currency</Label>
              <Input
                id="base_currency"
                value={form.base_currency}
                onChange={(e) =>
                  setForm({ ...form, base_currency: e.target.value })
                }
                placeholder="USD"
                disabled={disabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spread_from">Spread From</Label>
              <Input
                id="spread_from"
                type="number"
                step="1"
                min="1"
                value={form.spread_from}
                onChange={(e) =>
                  setForm({ ...form, spread_from: e.target.value })
                }
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                placeholder="0.5"
                disabled={disabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maximum_leverage">Maximum Leverage</Label>
              <Input
                id="maximum_leverage"
                type="number"
                step="1"
                min="1"
                value={form.maximum_leverage}
                onChange={(e) =>
                  setForm({ ...form, maximum_leverage: e.target.value })
                }
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                placeholder="500"
                disabled={disabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leverage_type">Leverage Type</Label>
              <Select
                value={form.leverage_type}
                onValueChange={(v: string) =>
                  setForm({ ...form, leverage_type: v })
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="dynamic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dynamic">dynamic</SelectItem>
                  <SelectItem value="fixed">fixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leverage_value">Leverage Value</Label>
              <Input
                id="leverage_value"
                type="number"
                step="1"
                min={1}
                value={numberStr(form.leverage_value)}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                onChange={(e) =>
                  setForm({
                    ...form,
                    leverage_value: Number(e.target.value || 0),
                  })
                }
                placeholder="100"
                disabled={disabled}
                required
              />
            </div>

            {/* <div className="space-y-2">
              <Label htmlFor="stop_out_level">Stop-out Level (%)</Label>
              <Input
                id="stop_out_level"
                type="number"
                step="0.01"
                min="0"
                value={form.stop_out_level}
                onChange={(e) =>
                  setForm({ ...form, stop_out_level: e.target.value })
                }
                placeholder="20"
                disabled={disabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hedge_margin">Hedge Margin</Label>
              <Input
                id="hedge_margin"
                type="number"
                step="0.01"
                min="0"
                value={form.hedge_margin}
                onChange={(e) =>
                  setForm({ ...form, hedge_margin: e.target.value })
                }
                placeholder="0"
                disabled={disabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Swap Free Option</Label>
              <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                <Switch
                  checked={form.swap_free_option}
                  onCheckedChange={(v) =>
                    setForm({ ...form, swap_free_option: v })
                  }
                  disabled={disabled}
                />
                <span className="text-sm">
                  {form.swap_free_option ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div> */}

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                <Switch
                  checked={form.status}
                  onCheckedChange={(v) => setForm({ ...form, status: v })}
                  disabled={disabled}
                />
                <span className="text-sm">
                  {form.status ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            <div className="space-y-3 md:col-span-2">
              <div>
                <Label>IB Commissions</Label>
                <p className="text-sm text-muted-foreground">
                  Configure the commission rates for IB and each downline level.
                </p>
              </div>

              <div className="space-y-3">
                {form.ib_commissions.map((commission) => (
                  <div
                    key={commission.level}
                    className="rounded-lg border p-4"
                  >
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-medium">{commission.level}</div>
                        <div className="text-xs text-muted-foreground">
                          Commission rule for {commission.level}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        {/* <div className="flex items-center gap-2">
                          <Switch
                            checked={commission.is_default}
                            onCheckedChange={(value) => {
                              updateCommission(commission.level, (current) => ({
                                ...current,
                                is_default: value,
                              }));
                            }}
                            disabled={disabled}
                          />
                          <span className="text-sm">Default</span>
                        </div> */}

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={commission.status}
                            onCheckedChange={(value) => {
                              updateCommission(commission.level, (current) => ({
                                ...current,
                                status: value,
                              }));
                            }}
                            disabled={disabled}
                          />
                          <span className="text-sm">
                            {commission.status ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
                      {(
                        [
                          ["rate_ib", "Rate IB"],
                          ["rate_sub_ib_1", "Sub IB 1"],
                          ["rate_sub_ib_2", "Sub IB 2"],
                          ["rate_sub_ib_3", "Sub IB 3"],
                          ["rate_sub_ib_4", "Sub IB 4"],
                          ["rate_sub_ib_5", "Sub IB 5"],
                        ] as const
                      ).map(([field, label]) => (
                        <div key={field} className="space-y-2">
                          <Label htmlFor={`${commission.level}-${field}`}>
                            {label}
                          </Label>
                          <Input
                            id={`${commission.level}-${field}`}
                            type="number"
                            step="1"
                            min="1"
                            value={numberStr(commission[field])}
                            onChange={(e) => {
                              updateCommission(commission.level, (current) => ({
                                ...current,
                                [field]: Number(e.target.value || 0),
                              }));
                            }}
                            disabled={disabled}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly ? (
              <Button type="submit">
                {isEdit ? "Save Changes" : "Create"}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
