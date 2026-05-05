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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { BrokerBankDetailItem } from "@/lib/api";

import type { BrokerBankDetailFormValues } from "../_lib/broker-bank-details";

type BrokerBankDetailFormDialogProps = {
  detail?: BrokerBankDetailItem | null;
  isLoadingDetail?: boolean;
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  open: boolean;
  submitting: boolean;
  values: BrokerBankDetailFormValues;
  onValuesChange: (values: BrokerBankDetailFormValues) => void;
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

export function BrokerBankDetailFormDialog({
  detail,
  isLoadingDetail,
  mode,
  onOpenChange,
  onSubmit,
  open,
  submitting,
  values,
  onValuesChange,
}: BrokerBankDetailFormDialogProps) {
  const isCreateMode = mode === "create";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isCreateMode ? "Add broker bank detail" : "Edit broker bank detail"}
          </DialogTitle>
          <DialogDescription>
            {isCreateMode
              ? "Create a new bank account option for client deposits."
              : "Update the selected bank account configuration."}
          </DialogDescription>
        </DialogHeader>

        {isLoadingDetail ? (
          <div className="py-6 text-sm text-muted-foreground">
            Loading bank detail...
          </div>
        ) : (
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <Field
              id="bank-name"
              label="Bank name"
              value={values.bank_name}
              onChange={(bank_name) => onValuesChange({ ...values, bank_name })}
              placeholder="Example: HDFC Bank"
              disabled={submitting}
            />
            <Field
              id="account-holder-name"
              label="Account holder name"
              value={values.account_holder_name}
              onChange={(account_holder_name) =>
                onValuesChange({ ...values, account_holder_name })
              }
              placeholder="Example: Company Ltd"
              disabled={submitting}
            />
            <Field
              id="account-number"
              label="Account number"
              value={values.account_number}
              onChange={(account_number) =>
                onValuesChange({ ...values, account_number })
              }
              placeholder="Example: 1234567890"
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
            <Field
              id="iban-number"
              label="IBAN number"
              value={values.iban_number}
              onChange={(iban_number) =>
                onValuesChange({ ...values, iban_number })
              }
              placeholder="Example: GB29NWBK60161331926819"
              disabled={submitting}
            />
            <Field
              id="swift-ifsc-code"
              label="Swift / IFSC code"
              value={values.swift_ifsc_code}
              onChange={(swift_ifsc_code) =>
                onValuesChange({ ...values, swift_ifsc_code })
              }
              placeholder="Example: HDFC0001234"
              disabled={submitting}
            />

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bank-address">Address</Label>
              <Textarea
                id="bank-address"
                value={values.address}
                onChange={(event) =>
                  onValuesChange({ ...values, address: event.target.value })
                }
                placeholder="Example: 221B Baker Street"
                disabled={submitting}
                className="min-h-24"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 md:col-span-2">
              <div className="space-y-1">
                <div className="text-sm font-medium">Active for client deposits</div>
                <div className="text-xs text-muted-foreground">
                  When enabled, clients can use this bank account on the deposit page.
                </div>
              </div>
              <Switch
                checked={values.is_active}
                onCheckedChange={(is_active) =>
                  onValuesChange({ ...values, is_active })
                }
                disabled={submitting}
                aria-label="Toggle active state"
              />
            </div>

            {detail ? (
              <div className="rounded-lg border border-dashed px-4 py-3 text-xs text-muted-foreground md:col-span-2">
                Record ID: #{detail.id}
              </div>
            ) : null}
          </div>
        )}

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
            onClick={onSubmit}
            disabled={submitting || isLoadingDetail}
          >
            {submitting
              ? isCreateMode
                ? "Creating..."
                : "Saving..."
              : isCreateMode
                ? "Create Bank Detail"
                : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
