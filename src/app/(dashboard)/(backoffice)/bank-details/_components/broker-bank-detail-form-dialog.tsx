"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { GetCountries } from "react-country-state-city";
import Image from "next/image";
import { Upload, X, ImageIcon } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { BrokerBankDetailItem } from "@/lib/api";

import type {
  BrokerBankDetailFieldErrors,
  BrokerBankDetailFormValues,
} from "../_lib/broker-bank-details";

type CountryOption = {
  id: number;
  name: string;
};

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
  validationErrors: BrokerBankDetailFieldErrors;
};

const sanitizePersonText = (value: string): string =>
  value.replace(/[^a-zA-Z\s.'-]/g, "");

const sanitizeAccountNumber = (value: string): string =>
  value.replace(/\D/g, "");

const sanitizeAlphanumeric = (value: string): string =>
  value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  error,
  optional,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  error?: string;
  optional?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {optional ? (
          <span className="text-muted-foreground"> (Optional)</span>
        ) : null}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={error ? "border-destructive" : ""}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
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
  validationErrors,
}: BrokerBankDetailFormDialogProps) {
  const isCreateMode = mode === "create";
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([]);
  const [qrImagePreview, setQrImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Set initial preview when editing and URL exists
  useEffect(() => {
    if (mode === "edit" && values.upi_qr_code_url && !qrImagePreview) {
      setQrImagePreview(values.upi_qr_code_url);
    }
  }, [mode, values.upi_qr_code_url, qrImagePreview]);

  const handleQrImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setQrImagePreview(dataUrl);
        onValuesChange({
          ...values,
          upi_qr_code_url: dataUrl,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveQrImage = () => {
    setQrImagePreview(null);
    onValuesChange({
      ...values,
      upi_qr_code_url: "",
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const countryValue = useMemo(() => {
    const matched = countryOptions.find(
      (country) => country.name === values.country
    );
    return matched ? String(matched.id) : "";
  }, [countryOptions, values.country]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isCreateMode
              ? "Add broker bank detail"
              : "Edit broker bank detail"}
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
              onChange={(bank_name) =>
                onValuesChange({
                  ...values,
                  bank_name: sanitizePersonText(bank_name).slice(0, 80),
                })
              }
              placeholder="Example: HDFC Bank"
              disabled={submitting}
              error={validationErrors.bank_name}
            />
            <Field
              id="account-holder-name"
              label="Account holder name"
              value={values.account_holder_name}
              onChange={(account_holder_name) =>
                onValuesChange({
                  ...values,
                  account_holder_name: sanitizePersonText(
                    account_holder_name
                  ).slice(0, 80),
                })
              }
              placeholder="Example: Company Ltd"
              disabled={submitting}
              error={validationErrors.account_holder_name}
            />
            <Field
              id="account-number"
              label="Account number"
              value={values.account_number}
              onChange={(account_number) =>
                onValuesChange({
                  ...values,
                  account_number: sanitizeAccountNumber(account_number).slice(
                    0,
                    18
                  ),
                })
              }
              placeholder="Example: 1234567890"
              disabled={submitting}
              error={validationErrors.account_number}
            />
            <div className="space-y-2">
              <Label htmlFor="country-select">Country</Label>
              <Select
                value={countryValue}
                onValueChange={(selectedCountryId) => {
                  const selectedCountry = countryOptions.find(
                    (country) => String(country.id) === selectedCountryId
                  );
                  onValuesChange({
                    ...values,
                    country: selectedCountry?.name ?? "",
                  });
                }}
                disabled={submitting}
              >
                <SelectTrigger
                  id="country-select"
                  className={
                    validationErrors.country ? "border-destructive" : ""
                  }
                >
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
              {validationErrors.country ? (
                <p className="text-sm text-destructive">
                  {validationErrors.country}
                </p>
              ) : null}
            </div>
            <Field
              id="iban-number"
              label="IBAN number"
              value={values.iban_number}
              onChange={(iban_number) =>
                onValuesChange({
                  ...values,
                  iban_number: sanitizeAlphanumeric(iban_number).slice(0, 34),
                })
              }
              placeholder="Example: GB29NWBK60161331926819"
              disabled={submitting}
              optional
            />
            <Field
              id="swift-ifsc-code"
              label="Swift / IFSC code"
              value={values.swift_ifsc_code}
              onChange={(swift_ifsc_code) =>
                onValuesChange({
                  ...values,
                  swift_ifsc_code: sanitizeAlphanumeric(
                    swift_ifsc_code
                  ).slice(0, 15),
                })
              }
              placeholder="Example: HDFC0001234"
              disabled={submitting}
              error={validationErrors.swift_ifsc_code}
            />

            <div className="space-y-2">
              <Label htmlFor="upi-qr-code" className="inline">
                UPI QR Code <span className="text-muted-foreground">(Provide it in case you want to enable UPI payments)</span>
              </Label>
              <div className="space-y-3">
                {qrImagePreview ? (
                  <div className="relative inline-block">
                    <div className="relative h-32 w-32 overflow-hidden rounded border bg-muted">
                      <Image
                        src={qrImagePreview}
                        alt="QR Code Preview"
                        fill
                        className="object-cover"
                        sizes="128px"
                        unoptimized
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                      onClick={handleRemoveQrImage}
                      disabled={submitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded border border-dashed bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    id="upi-qr-code"
                    type="file"
                    accept="image/*"
                    onChange={handleQrImageChange}
                    disabled={submitting}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={submitting}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {qrImagePreview ? "Change Image" : "Upload Image"}
                  </Button>
                </div>
              </div>
              {validationErrors.upi_qr_code_url ? (
                <p className="text-sm text-destructive">
                  {validationErrors.upi_qr_code_url}
                </p>
              ) : null}
            </div>

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
                className={
                  validationErrors.address
                    ? "border-destructive min-h-24"
                    : "min-h-24"
                }
              />
              {validationErrors.address ? (
                <p className="text-sm text-destructive">
                  {validationErrors.address}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 md:col-span-2">
              <div className="space-y-1">
                <div className="text-sm font-medium">
                  Active for client deposits
                </div>
                <div className="text-xs text-muted-foreground">
                  When enabled, clients can use this bank account on the deposit
                  page.
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
