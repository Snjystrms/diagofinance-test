"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { AdminBankDetailItem } from "@/lib/api";

import type { AdminUserOption, BankDetailFormValues } from "../_lib/bank-details";

type BankDetailFormDialogProps = {
  detail?: AdminBankDetailItem | null;
  isLoadingDetail?: boolean;
  isLoadingUsers?: boolean;
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onUserSearchChange: (value: string) => void;
  open: boolean;
  submitting: boolean;
  userOptions: AdminUserOption[];
  userSearch: string;
  values: BankDetailFormValues;
  onValuesChange: (values: BankDetailFormValues) => void;
};

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

export function BankDetailFormDialog({
  detail,
  isLoadingDetail,
  isLoadingUsers,
  mode,
  onOpenChange,
  onSubmit,
  onUserSearchChange,
  open,
  submitting,
  userOptions,
  userSearch,
  values,
  onValuesChange,
}: BankDetailFormDialogProps) {
  const isCreateMode = mode === "create";
  const title = isCreateMode ? "Add bank details" : "Edit bank details";
  const description = isCreateMode
    ? "Select a user, then create a bank-details record."
    : "Update the selected bank-details record.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {isLoadingDetail ? (
          <div className="py-6 text-sm text-muted-foreground">Loading bank detail...</div>
        ) : (
          <div className="grid gap-4 py-2 md:grid-cols-2">
            {isCreateMode ? (
              <>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="user-search">Search user</Label>
                  <Input
                    id="user-search"
                    value={userSearch}
                    onChange={(event) => onUserSearchChange(event.target.value)}
                    placeholder="Search by name, email, or mobile"
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="user-select">User</Label>
                  <Select
                    value={values.user_uuid}
                    onValueChange={(userUuid) => onValuesChange({ ...values, user_uuid: userUuid })}
                    disabled={submitting || isLoadingUsers}
                  >
                    <SelectTrigger id="user-select">
                      <SelectValue
                        placeholder={isLoadingUsers ? "Loading users..." : "Select a user"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {userOptions.map((user) => (
                        <SelectItem key={user.uuid} value={user.uuid}>
                          {user.name} - {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {values.user_uuid && detail?.user ? (
                    <p className="text-xs text-muted-foreground">
                      Selected user: {detail.user.name} ({detail.user.email})
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="rounded-md border bg-muted/40 p-3 text-sm md:col-span-2">
                <div className="font-medium">{detail?.user?.name || "-"}</div>
                <div className="text-muted-foreground">{detail?.user?.email || "-"}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {detail?.user?.uuid || values.user_uuid}
                </div>
              </div>
            )}

            <Field
              id="account-holder-name"
              label="Account holder name"
              value={values.account_holder_name}
              onChange={(account_holder_name) => onValuesChange({ ...values, account_holder_name })}
              placeholder="Example: John Smith"
              disabled={submitting}
            />
            <Field
              id="account-number"
              label="Account number"
              value={values.account_number}
              onChange={(account_number) => onValuesChange({ ...values, account_number })}
              placeholder="Example: 1234567890"
              disabled={submitting}
            />
            <Field
              id="iban-number"
              label="IBAN number"
              value={values.iban_number}
              onChange={(iban_number) => onValuesChange({ ...values, iban_number })}
              placeholder="Example: GB29NWBK60161331926819"
              disabled={submitting}
            />
            <Field
              id="swift-ifsc-code"
              label="Swift / IFSC code"
              value={values.swift_ifsc_code}
              onChange={(swift_ifsc_code) => onValuesChange({ ...values, swift_ifsc_code })}
              placeholder="Example: HDFC0001234"
              disabled={submitting}
            />
            <Field
              id="bank-name"
              label="Bank name"
              value={values.bank_name}
              onChange={(bank_name) => onValuesChange({ ...values, bank_name })}
              placeholder="Example: HDFC Bank"
              disabled={submitting}
            />
            <Field
              id="country"
              label="Country"
              value={values.country}
              onChange={(country) => onValuesChange({ ...values, country })}
              placeholder="Example: India"
              disabled={submitting}
            />
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bank-address">Address</Label>
              <Input
                id="bank-address"
                value={values.address}
                onChange={(event) => onValuesChange({ ...values, address: event.target.value })}
                placeholder="Example: 221B Baker Street"
                disabled={submitting}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={submitting || isLoadingDetail}>
            {submitting ? (isCreateMode ? "Creating..." : "Saving...") : isCreateMode ? "Create Bank Details" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
