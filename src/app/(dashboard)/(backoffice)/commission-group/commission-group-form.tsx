"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit, Loader2, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  adminCommissionGroupsApi,
  adminGroupsApi,
  adminIbPlansCrudApi,
  type AdminCommissionGroupRate,
  type AdminGroupItem,
  type AdminIbPlanCrudItem,
} from "@/lib/api";
import { getAdminFriendlyErrorMessage } from "@/lib/admin-friendly-errors";
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
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CommissionGroupRow } from "./page";

const COMMISSION_LEVELS = [1, 2, 3, 4, 5, 6, 7] as const;

type CommissionGroupFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<CommissionGroupRow>) => void | Promise<void>;
  initialData?: CommissionGroupRow | null;
  readOnly?: boolean;
};

const buildRatesMap = (
  categories: string[],
  existing?: Record<string, Record<string, number>>,
): Record<string, Record<string, number>> => {
  const result: Record<string, Record<string, number>> = {};
  for (const category of categories) {
    const row: Record<string, number> = {};
    for (const level of COMMISSION_LEVELS) {
      row[`level${level}`] = existing?.[category]?.[`level${level}`] ?? 0;
    }
    result[category] = row;
  }
  return result;
};

export function CommissionGroupForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  readOnly = false,
}: CommissionGroupFormProps) {
  const { token } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);
  const [ibPlans, setIbPlans] = useState<AdminIbPlanCrudItem[]>([]);
  const [groups, setGroups] = useState<AdminGroupItem[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [status, setStatus] = useState(true);
  const [rates, setRates] = useState<Record<string, Record<string, number>>>(
    {},
  );
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ratesEditing, setRatesEditing] = useState(false);
  const [ratesSnapshot, setRatesSnapshot] = useState<
    Record<string, Record<string, number>>
  >({});

  const authToken = useMemo(() => {
    if (token) return token;
    if (typeof window === "undefined") return null;
    return (
      sessionStorage.getItem("authToken") ||
      localStorage.getItem("auth_token")
    );
  }, [token]);

  const isEdit = useMemo(
    () => Boolean(initialData?.id && !readOnly),
    [initialData, readOnly],
  );

  useEffect(() => {
    if (open && initialData) {
      setSelectedPlanId(String(initialData.ib_plan_id ?? ""));
      setSelectedGroupId(String(initialData.group_id ?? ""));
      setStatus(Boolean(initialData.status));
    } else if (open) {
      setSelectedPlanId("");
      setSelectedGroupId("");
      setStatus(true);
    }

    if (open) {
      setRatesEditing(false);
      setRatesSnapshot({});
    }
  }, [open, initialData]);

  useEffect(() => {
    if (!open || !authToken) return;

    let mounted = true;
    const run = async () => {
      setOptionsLoading(true);
      try {
        const [categoriesRes, plansRes, groupsRes] = await Promise.all([
          adminCommissionGroupsApi.getCategories(authToken),
          adminIbPlansCrudApi.list(authToken),
          adminGroupsApi.list(authToken),
        ]);

        if (!mounted) return;

        const nextCategories = categoriesRes?.data?.categories ?? [];
        const nextPlans = plansRes?.data?.ibPlans ?? [];
        const nextGroups = (
          Array.isArray(groupsRes?.data) ? groupsRes.data : []
        ).filter(
          (group) =>
            !group.mode || group.mode.toLowerCase() === "live",
        );

        setCategories(nextCategories);
        setIbPlans(nextPlans);
        setGroups(nextGroups);
        setRates(
          buildRatesMap(
            nextCategories,
            Array.isArray(initialData?.rates)
              ? undefined
              : initialData?.rates,
          ),
        );
      } catch (error) {
        if (mounted) {
          toast.error(
            getAdminFriendlyErrorMessage(error, {
              resource: "commission group options",
              action: "load",
            }),
          );
        }
      } finally {
        if (mounted) setOptionsLoading(false);
      }
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [open, authToken, initialData]);

  const disabled = readOnly || isSubmitting || optionsLoading;
  const ratesEditable = !readOnly && (!isEdit || ratesEditing);

  const handleRateChange = (category: string, level: number, value: number) => {
    setRates((current) => ({
      ...current,
      [category]: {
        ...current[category],
        [`level${level}`]: value,
      },
    }));
  };

  const startEditingRates = () => {
    setRatesSnapshot(rates);
    setRatesEditing(true);
  };

  const cancelEditingRates = () => {
    setRates(ratesSnapshot);
    setRatesEditing(false);
  };

  const saveEditingRates = () => {
    setRatesEditing(false);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isEdit && !selectedPlanId) {
      toast.error("Please select an IB plan");
      return;
    }

    if (!isEdit && !selectedGroupId) {
      toast.error("Please select a group");
      return;
    }

    const ratesPayload: AdminCommissionGroupRate[] = [];
    for (const category of categories) {
      for (const level of COMMISSION_LEVELS) {
        const rate = Number(rates[category]?.[`level${level}`]) || 0;
        if (rate > 0) {
          ratesPayload.push({ level, rate, symbol_category: category });
        }
      }
    }

    if (ratesPayload.length === 0 && !isEdit) {
      toast.error("Please enter at least one commission rate");
      return;
    }

    try {
      setIsSubmitting(true);
      await Promise.resolve(
        onSubmit({
          ib_plan_id: selectedPlanId
            ? Number(selectedPlanId)
            : initialData?.ib_plan_id ?? 0,
          group_id: selectedGroupId
            ? Number(selectedGroupId)
            : initialData?.group_id ?? 0,
          rates: ratesPayload,
          status,
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
      <DialogContent className="!max-w-3xl max-h-[90vh] overflow-y-auto sm:!max-w-3xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>
              {readOnly
                ? "View Commission Group"
                : initialData?.id
                  ? "Edit Commission Group"
                  : "Create Commission Group"}
            </DialogTitle>
          </DialogHeader>

          {optionsLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Spinner className="h-6 w-6" />
              <p className="text-sm text-muted-foreground">
                Loading commission group options...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 py-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>IB Plan</Label>
                  {initialData ? (
                    <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
                      {initialData.plan_name}
                    </div>
                  ) : (
                    <Select
                      value={selectedPlanId}
                      onValueChange={setSelectedPlanId}
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select IB plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {ibPlans.map((plan) => (
                          <SelectItem key={plan.id} value={String(plan.id)}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Group</Label>
                  {initialData ? (
                    <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
                      {initialData.mt5_group_name || initialData.group_name}
                    </div>
                  ) : (
                    <Select
                      value={selectedGroupId}
                      onValueChange={setSelectedGroupId}
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={String(group.id)}>
                            {/* {group.name} */}
                            {group.mt5_group_name
                              ? ` (${group.mt5_group_name})`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                  <Switch
                    checked={status}
                    onCheckedChange={(value) => setStatus(value)}
                    disabled={disabled}
                  />
                  <span className="text-sm">
                    {status ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Commission Rates</Label>
                  {isEdit && !optionsLoading ? (
                    ratesEditing ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={cancelEditingRates}
                          disabled={isSubmitting}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={saveEditingRates}
                          disabled={isSubmitting}
                        >
                          <Save className="mr-1 h-4 w-4" />
                          Save
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={startEditingRates}
                        disabled={isSubmitting}
                      >
                        <Edit className="mr-1 h-4 w-4" />
                        Edit
                      </Button>
                    )
                  ) : null}
                </div>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[140px]">
                          Symbol Category
                        </TableHead>
                        {COMMISSION_LEVELS.map((level) => (
                          <TableHead key={level} className="min-w-[80px] text-center">
                            Level {level}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={COMMISSION_LEVELS.length + 1}
                            className="h-24 text-center text-muted-foreground"
                          >
                            No symbol categories available
                          </TableCell>
                        </TableRow>
                      ) : (
                        categories.map((category) => (
                          <TableRow key={category}>
                            <TableCell className="font-medium capitalize">
                              {category}
                            </TableCell>
                            {COMMISSION_LEVELS.map((level) => {
                              const rateValue =
                                rates[category]?.[`level${level}`] ?? 0;

                              return (
                                <TableCell key={level} className="p-2">
                                  {ratesEditable ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={String(rateValue)}
                                      disabled={disabled}
                                      onWheel={(e) =>
                                        (e.target as HTMLInputElement).blur()
                                      }
                                      onChange={(e) => {
                                        const nextValue = Number(
                                          e.target.value,
                                        );
                                        handleRateChange(
                                          category,
                                          level,
                                          Number.isFinite(nextValue)
                                            ? nextValue
                                            : 0,
                                        );
                                      }}
                                      className="h-9 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                  ) : (
                                    <div className="flex h-9 items-center justify-center rounded-md bg-muted/40 px-2 text-sm tabular-nums">
                                      {rateValue}
                                    </div>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly && !optionsLoading ? (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {initialData?.id ? "Save Changes" : "Create"}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
