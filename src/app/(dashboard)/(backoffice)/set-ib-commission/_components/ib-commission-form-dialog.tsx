"use client";

import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchSelectField } from "@/components/search-select-field";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { AdminIbCommissionItem } from "@/lib/api";

import type {
  AdminUserOption,
  IbCommissionFormValues,
  IbPlanOption,
} from "../_lib/ib-commission";

type IbCommissionFormDialogProps = {
  detail?: AdminIbCommissionItem | null;
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onUserSearchChange: (value: string) => void;
  open: boolean;
  submitting: boolean;
  userOptions: AdminUserOption[];
  userSearch: string;
  isLoadingUsers: boolean;
  planOptions: IbPlanOption[];
  planLoading: boolean;
  values: IbCommissionFormValues;
  onValuesChange: (values: IbCommissionFormValues) => void;
};

export function IbCommissionFormDialog({
  detail,
  mode,
  onOpenChange,
  onSubmit,
  onUserSearchChange,
  open,
  submitting,
  userOptions,
  userSearch,
  isLoadingUsers,
  planOptions,
  planLoading,
  values,
  onValuesChange,
}: IbCommissionFormDialogProps) {
  const [touchedUser, setTouchedUser] = useState(false);
  const [touchedPlan, setTouchedPlan] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const isCreateMode = mode === "create";
  const title = isCreateMode ? "Assign IB Commission" : "Edit IB Commission";
  const description = isCreateMode
    ? "Select a user and choose the IB plan to assign."
    : "Update the IB plan and status for the selected user.";

  const selectedUser = useMemo(
    () => userOptions.find((user) => user.uuid === values.user_uuid) ?? null,
    [userOptions, values.user_uuid],
  );
  const selectedPlan = useMemo(
    () => planOptions.find((plan) => plan.id === values.ib_plan_id) ?? null,
    [planOptions, values.ib_plan_id],
  );
  const canSearchUsers = userSearch.trim().length >= 3;
  const visibleUserOptions = canSearchUsers ? userOptions : [];

  const userError =
    isCreateMode && !values.user_uuid.trim()
      ? "Please select a user."
      : null;
  const planError = !values.ib_plan_id ? "Please select an IB plan." : null;
  const showUserError = submitAttempted || touchedUser;
  const showPlanError = submitAttempted || touchedPlan;
  const hasErrors = Boolean(userError) || Boolean(planError);

  const handleSubmit = () => {
    setSubmitAttempted(true);
    if (!hasErrors) {
      onSubmit();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setSubmitAttempted(false);
          setTouchedUser(false);
          setTouchedPlan(false);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {isCreateMode ? (
            <div className="space-y-2">
              <SearchSelectField
                id="user-search"
                label="User"
                options={visibleUserOptions}
                searchValue={userSearch}
                selectedValue={values.user_uuid}
                placeholder="Type at least 3 letters to search users"
                disabled={submitting}
                loading={canSearchUsers ? isLoadingUsers : false}
                loadingMessage="Searching users..."
                idleMessage="Type at least 3 letters to search users."
                emptyMessage="No users found."
                helperText={
                  selectedUser
                    ? `Selected user: ${selectedUser.name} (${selectedUser.email})`
                    : null
                }
                onSearchValueChange={(value) => {
                  onUserSearchChange(value);
                  setTouchedUser(true);
                  onValuesChange({ ...values, user_uuid: "" });
                }}
                onOptionSelect={(user) => {
                  onUserSearchChange(user.email || user.name);
                  setTouchedUser(true);
                  onValuesChange({
                    ...values,
                    user_uuid: user.uuid,
                    user_name: user.name,
                    user_email: user.email,
                  });
                }}
                getOptionValue={(user) => user.uuid}
                getOptionLabel={(user) => user.name}
                getOptionDescription={(user) =>
                  [user.email, user.mobile ? `Mobile: ${user.mobile}` : null]
                    .filter(Boolean)
                    .join(" | ")
                }
              />
              {showUserError && userError ? (
                <p className="text-xs text-destructive">{userError}</p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="font-medium">
                {detail?.user_name || values.user_name || "-"}
              </div>
              <div className="text-muted-foreground">
                {detail?.user_email || values.user_email || "-"}
              </div>
              <div className="text-xs text-muted-foreground">
                {detail?.user_uuid || values.user_uuid || "-"}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="ib-plan-select">IB Plan</Label>
            <Select
              value={values.ib_plan_id}
              onValueChange={(value) => {
                setTouchedPlan(true);
                onValuesChange({ ...values, ib_plan_id: value });
              }}
              disabled={submitting || planLoading}
            >
              <SelectTrigger id="ib-plan-select">
                <SelectValue placeholder="Select IB plan" />
              </SelectTrigger>
              <SelectContent>
                {planOptions.length === 0 && !planLoading ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No IB plans available.
                  </div>
                ) : (
                  planOptions.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {planLoading && !selectedPlan ? (
              <p className="text-xs text-muted-foreground">Loading plans...</p>
            ) : null}
            {showPlanError && planError ? (
              <p className="text-xs text-destructive">{planError}</p>
            ) : null}
          </div>

          {!isCreateMode ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="ib-commission-status" className="text-sm font-medium">
                    Status
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {values.status ? "This assignment is active." : "This assignment is inactive."}
                  </p>
                </div>
                <Switch
                  id="ib-commission-status"
                  checked={values.status}
                  onCheckedChange={(checked) => {
                    onValuesChange({ ...values, status: checked });
                  }}
                  disabled={submitting}
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || planLoading}
          >
            {submitting
              ? isCreateMode
                ? "Assigning..."
                : "Saving..."
              : isCreateMode
                ? "Assign Commission"
                : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
