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

type FormErrors = Partial<Record<keyof BankDetailFormValues, string>>;

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
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  error?: string;
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
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function validateForm(values: BankDetailFormValues, isCreateMode: boolean): FormErrors {
  const errors: FormErrors = {};

  if (isCreateMode && !values.user_uuid) {
    errors.user_uuid = "Please select a user.";
  }
  if (!values.account_holder_name.trim()) {
    errors.account_holder_name = "Account holder name is required.";
  } else if (!/^[a-zA-Z\s.'-]{2,100}$/.test(values.account_holder_name.trim())) {
    errors.account_holder_name = "Enter a valid account holder name.";
  }
  if (!values.account_number.trim()) {
    errors.account_number = "Account number is required.";
  } else if (!/^\d{6,18}$/.test(values.account_number.trim())) {
    errors.account_number = "Account number must be 6-18 digits only.";
  }
  if (!values.iban_number.trim()) {
    errors.iban_number = "IBAN number is required.";
  } else if (!/^[A-Z]{2}[A-Z0-9]{13,32}$/.test(values.iban_number.trim().toUpperCase())) {
    errors.iban_number = "Enter a valid IBAN number.";
  }
  if (!values.swift_ifsc_code.trim()) {
    errors.swift_ifsc_code = "Swift / IFSC code is required.";
  } else if (!/^[A-Z0-9]{8,15}$/.test(values.swift_ifsc_code.trim().toUpperCase())) {
    errors.swift_ifsc_code = "Enter a valid Swift / IFSC code.";
  }
  if (!values.bank_name.trim()) {
    errors.bank_name = "Bank name is required.";
  } else if (values.bank_name.trim().length < 2) {
    errors.bank_name = "Bank name must be at least 2 characters.";
  }
  if (!values.country.trim()) {
    errors.country = "Country is required.";
  }
  if (!values.address.trim()) {
    errors.address = "Address is required.";
  } else if (values.address.trim().length < 5) {
    errors.address = "Address must be at least 5 characters.";
  }

  return errors;
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
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof BankDetailFormValues, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
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
  const errors = useMemo(() => validateForm(values, isCreateMode), [isCreateMode, values]);
  const canSearchUsers = userSearch.trim().length >= 3;
  const visibleUserOptions = canSearchUsers ? userOptions : [];

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

  useEffect(() => {
    if (!open) {
      setTouchedFields({});
      setSubmitAttempted(false);
    }
  }, [open]);

  const markTouched = (field: keyof BankDetailFormValues) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  const shouldShowError = (field: keyof BankDetailFormValues) => submitAttempted || Boolean(touchedFields[field]);
  const hasErrors = Object.keys(errors).length > 0;
  const handleSubmit = () => {
    setSubmitAttempted(true);
    if (!hasErrors) {
      onSubmit();
    }
  };

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
                      selectedUser ? `Selected user: ${selectedUser.name} (${selectedUser.email})` : null
                    }
                    onSearchValueChange={(value) => {
                      onUserSearchChange(value);
                      markTouched("user_uuid");
                      onValuesChange({ ...values, user_uuid: "" });
                    }}
                    onOptionSelect={(user) => {
                      onUserSearchChange(user.email || user.name);
                      markTouched("user_uuid");
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
                  {shouldShowError("user_uuid") && errors.user_uuid ? (
                    <p className="text-xs text-destructive">{errors.user_uuid}</p>
                  ) : null}
                </div>
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
              onChange={(account_holder_name) => {
                markTouched("account_holder_name");
                onValuesChange({ ...values, account_holder_name });
              }}
              placeholder="Example: John Smith"
              disabled={submitting}
              error={shouldShowError("account_holder_name") ? errors.account_holder_name : undefined}
            />
            <Field
              id="account-number"
              label="Account number"
              value={values.account_number}
              onChange={(account_number) => {
                markTouched("account_number");
                onValuesChange({ ...values, account_number: account_number.replace(/\D/g, "") });
              }}
              placeholder="Example: 1234567890"
              disabled={submitting}
              error={shouldShowError("account_number") ? errors.account_number : undefined}
            />
            <Field
              id="iban-number"
              label="IBAN number"
              value={values.iban_number}
              onChange={(iban_number) => {
                markTouched("iban_number");
                onValuesChange({ ...values, iban_number });
              }}
              placeholder="Example: GB29NWBK60161331926819"
              disabled={submitting}
              error={shouldShowError("iban_number") ? errors.iban_number : undefined}
            />
            <Field
              id="swift-ifsc-code"
              label="Swift / IFSC code"
              value={values.swift_ifsc_code}
              onChange={(swift_ifsc_code) => {
                markTouched("swift_ifsc_code");
                onValuesChange({ ...values, swift_ifsc_code });
              }}
              placeholder="Example: HDFC0001234"
              disabled={submitting}
              error={shouldShowError("swift_ifsc_code") ? errors.swift_ifsc_code : undefined}
            />
            <Field
              id="bank-name"
              label="Bank name"
              value={values.bank_name}
              onChange={(bank_name) => {
                markTouched("bank_name");
                onValuesChange({ ...values, bank_name });
              }}
              placeholder="Example: HDFC Bank"
              disabled={submitting}
              error={shouldShowError("bank_name") ? errors.bank_name : undefined}
            />
            <div className="space-y-2">
              <Label htmlFor="country-select">Country</Label>
              <Select
                value={countryValue}
                onValueChange={(selectedCountryId) => {
                  const selectedCountry = countryOptions.find(
                    (country) => String(country.id) === selectedCountryId
                  );
                  markTouched("country");
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
              {shouldShowError("country") && errors.country ? (
                <p className="text-xs text-destructive">{errors.country}</p>
              ) : null}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bank-address">Address</Label>
              <Input
                id="bank-address"
                value={values.address}
                onChange={(event) => {
                  markTouched("address");
                  onValuesChange({ ...values, address: event.target.value });
                }}
                placeholder="Example: 221B Baker Street"
                disabled={submitting}
              />
              {shouldShowError("address") && errors.address ? (
                <p className="text-xs text-destructive">{errors.address}</p>
              ) : null}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || isLoadingDetail}>
            {submitting ? (isCreateMode ? "Creating..." : "Saving...") : isCreateMode ? "Create Bank Details" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
