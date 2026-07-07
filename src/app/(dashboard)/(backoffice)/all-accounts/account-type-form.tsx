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
  maximum_leverage: "2000",
  minimum_deposit: 0,
  leverage_value: 2000,
  live_group_name: "",
  live_mt5_group_name: "",
  demo_group_name: "",
  demo_mt5_group_name: "",
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
        maximum_leverage: extractEditableNumberString(
          initialData.maximum_leverage,
          { preferLastMatch: true },
        ),
        minimum_deposit: Number(initialData.minimum_deposit || 0),
        leverage_value: Number(initialData.leverage_value || 0),
        live_group_name: initialData.live_group_name ?? "",
        live_mt5_group_name: initialData.live_mt5_group_name ?? "",
        demo_group_name: initialData.demo_group_name ?? "",
        demo_mt5_group_name: initialData.demo_mt5_group_name ?? "",
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
              <Label htmlFor="minimum_deposit">First Time Deposit</Label>
              <Input
                id="minimum_deposit"
                type="number"
                step="0.01"
                min="0"
                value={numberStr(form.minimum_deposit)}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                onChange={(e) =>
                  setForm({
                    ...form,
                    minimum_deposit: Number(e.target.value || 0),
                  })
                }
                placeholder="0"
                disabled={disabled}
                required
              />
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

            <div className="space-y-2">
              <Label htmlFor="live_group_name">Live Group Name</Label>
              <Input
                id="live_group_name"
                value={form.live_group_name}
                onChange={(e) =>
                  setForm({ ...form, live_group_name: e.target.value })
                }
                placeholder="Standard Live"
                disabled={disabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="live_mt5_group_name">Live MT5 Group Name</Label>
              <Input
                id="live_mt5_group_name"
                value={form.live_mt5_group_name}
                onChange={(e) =>
                  setForm({ ...form, live_mt5_group_name: e.target.value })
                }
                placeholder="live\StandardUSD"
                disabled={disabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo_group_name">Demo Group Name</Label>
              <Input
                id="demo_group_name"
                value={form.demo_group_name}
                onChange={(e) =>
                  setForm({ ...form, demo_group_name: e.target.value })
                }
                placeholder="Standard Demo"
                disabled={disabled}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo_mt5_group_name">Demo MT5 Group Name</Label>
              <Input
                id="demo_mt5_group_name"
                value={form.demo_mt5_group_name}
                onChange={(e) =>
                  setForm({ ...form, demo_mt5_group_name: e.target.value })
                }
                placeholder="demo\StandardUSD"
                disabled={disabled}
                required
              />
            </div>

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
