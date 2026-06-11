"use client";

import { useEffect, useMemo, useState } from "react";

import type { AccountTypeRow } from "./page";
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
import { Loader2 } from "lucide-react";
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

const createEmptyForm = (): FormValue => ({
  name: "",
  spread_from: "",
  maximum_leverage: "2000",
  leverage_type: "dynamic",
  leverage_value: 2000,
  base_currency: "USD",
  commission_pool: 0,
  status: true,
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        base_currency: initialData.base_currency ?? "USD",
        commission_pool: Number(initialData.commission_pool || 0),
        status: Boolean(initialData.status),
      });
    } else {
      setForm(createEmptyForm());
    }
  }, [initialData, open]);

  const isEdit = useMemo(() => !!initialData?.id, [initialData]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    
    setIsSubmitting(true);
    try {
      await Promise.resolve(onSubmit(form));
      onOpenChange(false);
    } catch {
      // keep dialog open when the request fails so the user can fix values
    } finally {
      setIsSubmitting(false);
    }
  };

  const numberStr = (v: string | number) => {
    if (v === "" || v === null || v === undefined) return "";
    const n = typeof v === "string" ? parseFloat(v) : v;
    if (!Number.isFinite(n)) return "";
    return String(n);
  };

  const disabled = readOnly || isSubmitting;

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
                step="0.1"
                min="0.1"
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
              <Label htmlFor="commission_pool">Commission</Label>
              <Input
                id="commission_pool"
                type="number"
                step="1"
                min="1"
                value={form.commission_pool}
               onChange={(e) =>
                  setForm({
                    ...form,
                    commission_pool: Number(e.target.value || 0),
                  }) }
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                placeholder="5"
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

            {/* <div className="space-y-3 md:col-span-2">
              <div>
                <Label>IB Commissions</Label>
                <p className="text-sm text-muted-foreground">
                  Configure the commission rates for IB and each downline level.
                </p>
              </div>

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
                        <th className="text-center px-3 py-2 font-medium text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.ib_commissions.map((commission, i) => {
                        const editableFieldCount = getEditableFieldCount(
                          commission.level,
                        );

                        return (
                          <tr
                            key={commission.level}
                            className={
                              i !== form.ib_commissions.length - 1
                                ? "border-b"
                                : ""
                            }
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
                                    step="0.1"
                                    min="0"
                                    value={numberStr(commission[field])}
                                    onChange={(e) =>
                                      updateCommission(
                                        commission.level,
                                        (cur) => ({
                                          ...cur,
                                          [field]: Number(e.target.value || 0),
                                        }),
                                      )
                                    }
                                    disabled={
                                      disabled || fieldIndex >= editableFieldCount
                                    }
                                    onWheel={(e) =>
                                      (e.target as HTMLInputElement).blur()
                                    }
                                  />
                                  <span className="absolute right-2 text-xs text-muted-foreground pointer-events-none select-none">
                                    $
                                  </span>
                                </div>
                              </td>
                            ))}

                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Switch
                                  checked={commission.status}
                                  onCheckedChange={(value) =>
                                    updateCommission(
                                      commission.level,
                                      (cur) => ({
                                        ...cur,
                                        status: value,
                                      }),
                                    )
                                  }
                                  disabled={disabled}
                                />
                                <span className="text-xs text-muted-foreground w-12 text-left">
                                  {commission.status ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div> */}
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Save Changes" : "Create"}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
