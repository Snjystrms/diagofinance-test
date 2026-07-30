"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { IbPlanRow } from "./page";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type FormValue = Omit<IbPlanRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
};

const createEmptyForm = (): FormValue => ({
  name: "",
  status: true,
});

export function IbPlanForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  readOnly = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValue) => void | Promise<void>;
  initialData?: IbPlanRow | null;
  readOnly?: boolean;
}) {
  const [form, setForm] = useState<FormValue>(createEmptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        id: initialData.id,
        name: initialData.name,
        status: Boolean(initialData.status),
      });
      return;
    }

    setForm(createEmptyForm());
  }, [initialData, open]);

  const isEdit = useMemo(() => Boolean(initialData?.id), [initialData]);
  const disabled = readOnly || isSubmitting;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    try {
      setIsSubmitting(true);
      await Promise.resolve(
        onSubmit({
          ...form,
          name: form.name.trim(),
        }),
      );
      onOpenChange(false);
    } catch {
      // Keep dialog open if the request fails.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>
              {isEdit
                ? readOnly
                  ? "View IB Plan"
                  : "Edit IB Plan"
                : "Create IB Plan"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Default IB Plan"
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
                    setForm((current) => ({
                      ...current,
                      status: value,
                    }))
                  }
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
              <Button type="submit" disabled={isSubmitting || !form.name.trim()}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isEdit ? "Save Changes" : "Create"}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
