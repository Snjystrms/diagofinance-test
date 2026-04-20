"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import toast from "react-hot-toast";
import { RefreshCw, Layers, Plus, Trash2 } from "lucide-react";

import { ListPageSkeleton } from "@/components/loading/page-loading-skeleton";
import { ProtectedRoute } from "@/components/protected-route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { DeleteDialog } from "@/components/dialogs/delete-dialog";
import { useAuth } from "@/contexts/auth-context";
import {
  adminCommissionPlansApi,
  type CommissionPlan,
  type CommissionPlanRule,
  type CommissionPlanListResponseData,
  type CommissionPlanRuleInput,
} from "@/lib/api";
import { formatDateTimeInIST } from "@/lib/formatters";

type GroupedRules = {
  key: string;
  label: string;
  rules: CommissionPlanRule[];
};

const subIbColumns: Array<{ key: keyof CommissionPlanRule; label: string }> = [
  { key: "rate_sub_ib_1", label: "Sub IB 1" },
  { key: "rate_sub_ib_2", label: "Sub IB 2" },
  { key: "rate_sub_ib_3", label: "Sub IB 3" },
  { key: "rate_sub_ib_4", label: "Sub IB 4" },
  { key: "rate_sub_ib_5", label: "Sub IB 5" },
];

const defaultRulesTemplate = `[
  {
    "asset_group": "FOREX",
    "asset_group_label": "Forex",
    "level": 0,
    "rate_ib": 5,
    "rate_sub_ib_1": 1.5,
    "rate_sub_ib_2": 0.75,
    "rate_sub_ib_3": 0.5,
    "rate_sub_ib_4": 0.5,
    "rate_sub_ib_5": 0.5,
    "status": "active"
  }
]`;

const formatRate = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return "0";
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return String(value);
  }
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 5,
  }).format(num);
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return formatDateTimeInIST(value);
};

const groupRules = (rules: CommissionPlanRule[] | undefined): GroupedRules[] => {
  if (!rules || rules.length === 0) {
    return [];
  }
  const bucket = new Map<string, GroupedRules>();
  rules.forEach((rule) => {
    const label = rule.asset_group_label?.trim() || rule.asset_group || "Rules";
    const key = `${rule.asset_group}-${label}`.toLowerCase();
    if (!bucket.has(key)) {
      bucket.set(key, {
        key,
        label,
        rules: [],
      });
    }
    bucket.get(key)!.rules.push(rule);
  });

  return Array.from(bucket.values()).map((group) => ({
    ...group,
    rules: [...group.rules].sort((a, b) => a.level - b.level),
  }));
};

export default function IbPlansPage() {
  const { token } = useAuth();

  const [plans, setPlans] = useState<CommissionPlan[]>([]);
  const [pagination, setPagination] = useState<CommissionPlanListResponseData["pagination"]>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    status: "active",
    rules: defaultRulesTemplate,
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommissionPlan | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadPlans = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!token) {
        return;
      }

      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await adminCommissionPlansApi.list({
          token,
          includeRules: true,
        });

        const payload = response?.data;
        setPlans(payload?.plans ?? []);
        setPagination(payload?.pagination);
      } catch (error: unknown) {
        console.error("Failed to fetch commission plans:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to load commission plans";
        toast.error(errorMessage);
        if (!silent) {
          setPlans([]);
        }
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [token],
  );

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const resetCreateForm = useCallback(() => {
    setCreateForm({
      name: "",
      description: "",
      status: "active",
      rules: defaultRulesTemplate,
    });
    setCreateError(null);
    setCreateSubmitting(false);
  }, []);

  const handleCreateDialogChange = (open: boolean) => {
    setCreateDialogOpen(open);
    if (!open) {
      resetCreateForm();
    }
  };

  const handleCreateFieldChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setCreateError(null);
    setCreateForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateStatusChange = (value: string) => {
    setCreateError(null);
    setCreateForm((prev) => ({
      ...prev,
      status: value,
    }));
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      toast.error("Authentication is required to create a commission plan");
      return;
    }

    const trimmedName = createForm.name.trim();
    if (!trimmedName) {
      setCreateError("Plan name is required.");
      return;
    }

    let parsedRules: CommissionPlanRuleInput[] | undefined;
    if (createForm.rules.trim()) {
      try {
        const json = JSON.parse(createForm.rules);
        if (!Array.isArray(json)) {
          throw new Error("Rules JSON must be an array.");
        }

        parsedRules = json.map((rule, index) => {
          if (!rule?.asset_group) {
            throw new Error(`Rule at index ${index} is missing 'asset_group'.`);
          }
          if (typeof rule.level !== "number") {
            throw new Error(`Rule at index ${index} must include a numeric 'level'.`);
          }
          return rule as CommissionPlanRuleInput;
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Invalid rules JSON.";
        setCreateError(errorMessage);
        return;
      }
    }

    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await adminCommissionPlansApi.create(
        {
          name: trimmedName,
          description: createForm.description.trim() || undefined,
          status: createForm.status,
          rules: parsedRules,
        },
        token
      );
      toast.success("Commission plan created");
      handleCreateDialogChange(false);
      await loadPlans({ silent: true });
    } catch (error: unknown) {
      console.error("Failed to create commission plan:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create commission plan";
      toast.error(errorMessage);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!token || !deleteTarget) {
      return;
    }

    const plan = deleteTarget;
    setDeleteLoading(true);
    try {
      await adminCommissionPlansApi.delete(plan.id, token);
      toast.success(`Deleted plan "${plan.name}"`);
      setDeleteTarget(null);
      await loadPlans({ silent: true });
    } catch (error: unknown) {
      console.error("Failed to delete commission plan:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete commission plan";
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const totals = useMemo(() => {
    const planCount = plans.length;
    const ruleCount = plans.reduce((acc, plan) => acc + (plan.rules?.length ?? 0), 0);
    const activePlans = plans.filter((plan) => plan.status?.toLowerCase() === "active").length;
    return { planCount, ruleCount, activePlans };
  }, [plans]);

  const renderRulesTable = (rules: CommissionPlanRule[]) => (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Level</TableHead>
            <TableHead>IB Rate</TableHead>
            {subIbColumns.map((column) => (
              <TableHead key={column.key}>{column.label}</TableHead>
            ))}
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell className="font-medium">Level {rule.level}</TableCell>
              <TableCell>{formatRate(rule.rate_ib)}</TableCell>
              {subIbColumns.map((column) => (
                <TableCell key={column.key}>{formatRate(rule[column.key])}</TableCell>
              ))}
              <TableCell>
                <Badge variant={rule.status === "active" ? "default" : "secondary"}>
                  {rule.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const getPlanKey = (plan: CommissionPlan) => plan.uuid ?? `plan-${plan.id}`;

  const renderPlanPanel = (plan: CommissionPlan) => {
    const grouped = groupRules(plan.rules);

    return (
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl font-semibold">{plan.name}</CardTitle>
              <Badge variant={plan.status?.toLowerCase() === "active" ? "default" : "secondary"}>
                {plan.status ?? "Unknown"}
              </Badge>
            </div>
            {plan.description ? (
              <CardDescription className="max-w-3xl text-sm leading-relaxed">
                {plan.description}
              </CardDescription>
            ) : null}
          </div>
          <div className="flex flex-col items-start gap-3 text-sm text-muted-foreground sm:items-end">
            <div className="space-y-1 whitespace-nowrap">
              <div>Created: {formatDateTime(plan.created_at)}</div>
              <div>Updated: {formatDateTime(plan.updated_at)}</div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteTarget(plan)}
              disabled={deleteLoading && deleteTarget?.id === plan.id}
            >
              {deleteLoading && deleteTarget?.id === plan.id ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {grouped.length > 0 ? (
            grouped.map((group) => (
              <div
                key={group.key}
                className="space-y-3 rounded-xl border border-border/70 bg-card/40 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold">{group.label}</h3>
                    <p className="text-xs text-muted-foreground">
                      {group.rules.length} {group.rules.length === 1 ? "level" : "levels"}
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit">
                    Asset Group: {group.rules[0]?.asset_group ?? "—"}
                  </Badge>
                </div>
                {renderRulesTable(group.rules)}
              </div>
            ))
          ) : (
            <div className="rounded-md border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
              No rules available for this plan.
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <ListPageSkeleton
          contained={false}
          showHeader={false}
          showFilterPanel={false}
          actionCount={0}
          columnCount={5}
          rowCount={7}
          className="px-0"
        />
      );
    }

    if (!loading && plans.length === 0) {
      return (
        <div className="rounded-lg border border-dashed bg-muted/40 p-12 text-center space-y-3">
          <Layers className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No commission plans found</h3>
          <p className="text-sm text-muted-foreground">
            Create a commission plan in the admin panel to have it appear here.
          </p>
          <Button variant="outline" onClick={() => loadPlans({ silent: false })} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Retry
          </Button>
        </div>
      );
    }

    return (
      <Tabs defaultValue={getPlanKey(plans[0]!)} className="space-y-6">
        <div className="rounded-full border border-border/60 bg-muted/40 p-1">
          <TabsList className="flex flex-wrap gap-1 bg-transparent p-1">
            {plans.map((plan) => {
              const isActive = plan.status?.toLowerCase() === "active";
              return (
                <TabsTrigger
                  key={getPlanKey(plan)}
                  value={getPlanKey(plan)}
                  className="group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:hover:bg-background/70"
                >
                  <span>{plan.name}</span>
                  <Badge
                    variant={isActive ? "default" : "secondary"}
                    className="rounded-full px-2 py-0 text-[10px] uppercase tracking-wide"
                  >
                    {plan.status ?? "unknown"}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {plans.map((plan) => (
          <TabsContent key={getPlanKey(plan)} value={getPlanKey(plan)} className="space-y-6">
            {renderPlanPanel(plan)}
          </TabsContent>
        ))}
      </Tabs>
    );
  };

  return (
    <ProtectedRoute>
      <>
        
          <div className="container mx-auto space-y-6 p-4 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">IB Commission Plans</h1>
                <p className="text-sm text-muted-foreground">
                  Review payout structures across all Introducing Broker plans. Levels expand to show IB
                  and sub-IB commission rates by asset group.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Dialog open={createDialogOpen} onOpenChange={handleCreateDialogChange}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      New Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form className="space-y-5" onSubmit={handleCreateSubmit}>
                      <DialogHeader>
                        <DialogTitle>Create Commission Plan</DialogTitle>
                        <DialogDescription>
                          Configure a new commission plan. Provide at least one rule using the JSON
                          template to match backend expectations.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="plan-name">Name</Label>
                          <Input
                            id="plan-name"
                            name="name"
                            placeholder="Standard Plus"
                            value={createForm.name}
                            onChange={handleCreateFieldChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="plan-description">Description</Label>
                          <Textarea
                            id="plan-description"
                            name="description"
                            placeholder="Describe the commission plan..."
                            value={createForm.description}
                            onChange={handleCreateFieldChange}
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={createForm.status} onValueChange={handleCreateStatusChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="plan-rules">Rules JSON</Label>
                          <Textarea
                            id="plan-rules"
                            name="rules"
                            value={createForm.rules}
                            onChange={handleCreateFieldChange}
                            rows={10}
                            spellCheck={false}
                          />
                          <p className="text-xs text-muted-foreground">
                            Paste an array of rule objects. Levels must be numeric and match backend
                            schema.
                          </p>
                          {createError ? (
                            <p className="text-sm text-destructive">{createError}</p>
                          ) : null}
                        </div>
                      </div>

                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleCreateDialogChange(false)}
                          disabled={createSubmitting}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createSubmitting}>
                          {createSubmitting ? (
                            <Spinner className="mr-2 h-4 w-4" />
                          ) : (
                            <Plus className="mr-2 h-4 w-4" />
                          )}
                          {createSubmitting ? "Creating..." : "Create Plan"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="outline"
                  onClick={() => loadPlans({ silent: true })}
                  disabled={loading || refreshing}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="rounded-full border border-border/60 bg-muted/40 px-6 py-4">
              <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Total Plans
                    </p>
                    <p className="text-xl font-semibold">{totals.planCount}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Active Plans
                    </p>
                    <p className="text-xl font-semibold text-emerald-500">{totals.activePlans}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Total Rules
                    </p>
                    <p className="text-xl font-semibold">{totals.ruleCount}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {pagination?.total_records
                    ? `${pagination.total_records} records in backend`
                    : "Counts based on fetched plans"}
                </div>
              </div>
            </div>

            {renderContent()}
          </div>
        
        <DeleteDialog
          isOpen={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
            }
          }}
          onConfirm={() => {
            void handleDeletePlan();
          }}
          title={`Delete ${deleteTarget?.name ?? "plan"}?`}
          description="This action will permanently remove the commission plan and its rules."
          confirmText={deleteLoading ? "Deleting..." : "Delete"}
          cancelText="Cancel"
          variant="destructive"
        />
      </>
    </ProtectedRoute>
  );
}

