"use client";

import { useEffect, useMemo, useState } from "react";
import { GetCountries } from "react-country-state-city";

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
import { SearchSelectField } from "@/components/search-select-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { AdminBankDetailItem } from "@/lib/api";

import type { AdminUserOption, BankDetailFormValues } from "../_lib/bank-details";

type CountryOption = {
  id: number;
  name: string;
};

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
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  const isCreateMode = mode === "create";
  const title = isCreateMode ? "Add bank details" : "Edit bank details";
  const description = isCreateMode
    ? "Select a user, then create a bank-details record."
    : "Update the selected bank-details record.";
  const countryValue = useMemo(() => {
    const matched = countryOptions.find((country) => country.name === values.country);
    return matched ? String(matched.id) : "";
  }, [countryOptions, values.country]);
  const selectedUser = useMemo(
    () => userOptions.find((user) => user.uuid === values.user_uuid) ?? null,
    [userOptions, values.user_uuid]
  );

  useEffect(() => {
    let isMounted = true;
    const loadCountries = async () => {
      try {
        const countries = ((await GetCountries()) as CountryOption[])
          .slice()
          .sort((left, right) => left.name.localeCompare(right.name));
        if (isMounted) {
          setCountryOptions(countries);
        }
      } catch (error) {
        console.error("Failed to load countries:", error);
      }
    };

    void loadCountries();
    return () => {
      isMounted = false;
    };
  }, []);

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
                <SearchSelectField
                  id="user-search"
                  label="User"
                  className="md:col-span-2"
                  options={userOptions}
                  searchValue={userSearch}
                  selectedValue={values.user_uuid}
                  placeholder="Search by name, email, or mobile"
                  disabled={submitting}
                  loading={isLoadingUsers}
                  loadingMessage="Searching users..."
                  idleMessage="Start typing to search users."
                  emptyMessage="No users found."
                  helperText={
                    selectedUser ? `Selected user: ${selectedUser.name} (${selectedUser.email})` : null
                  }
                  onSearchValueChange={(value) => {
                    onUserSearchChange(value);
                    onValuesChange({ ...values, user_uuid: "" });
                  }}
                  onOptionSelect={(user) => {
                    onUserSearchChange(user.email || user.name);
                    onValuesChange({ ...values, user_uuid: user.uuid });
                  }}
                  getOptionValue={(user) => user.uuid}
                  getOptionLabel={(user) => user.name}
                  getOptionDescription={(user) =>
                    [user.email, user.mobile ? `Mobile: ${user.mobile}` : null]
                      .filter(Boolean)
                      .join(" | ")
                  }
                />
              </>
            ) : (
              <div className="rounded-md border bg-muted/40 p-3 text-sm md:col-span-2">
                <div className="font-medium">{detail?.user?.name || "-"}</div>
                <div className="text-muted-foreground">{detail?.user?.email || "-"}</div>
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
            <div className="space-y-2">
              <Label htmlFor="country-select">Country</Label>
              <Select
                value={countryValue}
                onValueChange={(selectedCountryId) => {
                  const selectedCountry = countryOptions.find(
                    (country) => String(country.id) === selectedCountryId
                  );
                  onValuesChange({ ...values, country: selectedCountry?.name ?? "" });
                }}
                disabled={submitting}
              >
                <SelectTrigger id="country-select">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map((country) => (
                    <SelectItem key={country.id} value={String(country.id)}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
