"use client";

import { useEffect, useMemo, useState } from "react";
import type { AccountTypeRow } from "./page";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type FormValue = Omit<AccountTypeRow, "id" | "created_at" | "updated_at"> & { id?: string };

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
  const [form, setForm] = useState<FormValue>({
    name: "",
    spread_from: "",
    maximum_leverage: "Up to 1:2000 (dynamic)",
    leverage_type: "dynamic",
    leverage_value: 2000,
    stop_out_level: "50.00",
    hedge_margin: "0.00",
    swap_free_option: true,
    base_currency: "$, €, £, ¥",
    status: true,
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        id: initialData.id,
        name: initialData.name,
        spread_from: initialData.spread_from,
        maximum_leverage: initialData.maximum_leverage,
        leverage_type: (initialData.leverage_type as string) || "dynamic",
        leverage_value: Number(initialData.leverage_value || 0),
        stop_out_level: initialData.stop_out_level ?? "0.00",
        hedge_margin: initialData.hedge_margin ?? "0.00",
        swap_free_option: Boolean(initialData.swap_free_option),
        base_currency: initialData.base_currency ?? "$, €, £, ¥",
        status: Boolean(initialData.status),
      });
    } else {
      setForm({
        name: "",
        spread_from: "",
        maximum_leverage: "Up to 1:2000 (dynamic)",
        leverage_type: "dynamic",
        leverage_value: 2000,
        stop_out_level: "50.00",
        hedge_margin: "0.00",
        swap_free_option: true,
        base_currency: "$, €, £, ¥",
        status: true,
      });
    }
  }, [initialData, open]);

  const isEdit = useMemo(() => !!initialData?.id, [initialData]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    onSubmit(form);
    onOpenChange(false);
  };

  const numberStr = (v: string | number) => {
    const n = typeof v === "string" ? parseFloat(v) : v;
    if (!Number.isFinite(n)) return "";
    return String(n);
  };

  const disabled = readOnly;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? (readOnly ? "View Account Type" : "Edit Account Type") : "Create Account Type"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Exclusive account" disabled={disabled} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spread_from">Spread From</Label>
              <Input id="spread_from" value={form.spread_from} onChange={(e) => setForm({ ...form, spread_from: e.target.value })} placeholder="0 pip / 1.6 pip / Raw Spread" disabled={disabled} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leverage_type">Leverage Type</Label>
              <Select value={form.leverage_type} onValueChange={(v: string) => setForm({ ...form, leverage_type: v })} disabled={disabled}>
                <SelectTrigger><SelectValue placeholder="dynamic" /></SelectTrigger>
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
                min={1}
                value={numberStr(form.leverage_value)}
                onChange={(e) => setForm({ ...form, leverage_value: Number(e.target.value || 0) })}
                placeholder="2000"
                disabled={disabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maximum_leverage">Maximum Leverage (display)</Label>
              <Input
                id="maximum_leverage"
                value={form.maximum_leverage}
                onChange={(e) => setForm({ ...form, maximum_leverage: e.target.value })}
                placeholder='e.g., "Up to 1:2000 (dynamic)"'
                disabled={disabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stop_out_level">Stop-out Level (%)</Label>
              <Input
                id="stop_out_level"
                type="number"
                step="0.01"
                min="0"
                value={form.stop_out_level}
                onChange={(e) => setForm({ ...form, stop_out_level: e.target.value })}
                placeholder="50.00"
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
                onChange={(e) => setForm({ ...form, hedge_margin: e.target.value })}
                placeholder="0.00"
                disabled={disabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_currency">Base Currency</Label>
              <Input
                id="base_currency"
                value={form.base_currency}
                onChange={(e) => setForm({ ...form, base_currency: e.target.value })}
                placeholder="$, €, £, ¥"
                disabled={disabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Swap Free Option</Label>
              <div className="flex items-center gap-3">
                <Switch checked={form.swap_free_option} onCheckedChange={(v) => setForm({ ...form, swap_free_option: v })} disabled={disabled} />
                <span className="text-sm">{form.swap_free_option ? "Enabled" : "Disabled"}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-3">
                <Switch checked={form.status} onCheckedChange={(v) => setForm({ ...form, status: v })} disabled={disabled} />
                <span className="text-sm">{form.status ? "Active" : "Inactive"}</span>
              </div>
            </div>

            {/* Optional notes/help (kept for layout symmetry) */}
            <div className="md:col-span-2">
              <Label htmlFor="notes" className="text-muted-foreground">Notes (optional)</Label>
              <Textarea id="notes" placeholder="Internal note (not sent to API)" disabled={disabled} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && <Button type="submit">{isEdit ? "Save Changes" : "Create"}</Button>}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}