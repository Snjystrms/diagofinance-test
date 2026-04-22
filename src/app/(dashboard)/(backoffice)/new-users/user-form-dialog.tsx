"use client";

import type { FieldPath, FieldValues, UseFormReturn } from "react-hook-form";

import { BackofficeDetailDialogSkeleton } from "@/components/loading/backoffice-page-skeletons";
import {
  ValidatedFormField,
  ValidatedPasswordField,
  ValidatedTextField,
  sanitizeDigits,
  sanitizePersonText,
} from "@/components/forms/validated-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES } from "@/lib/countries";

type UserFormDialogValues = FieldValues & {
  first_name: string;
  last_name: string;
  email: string;
  mobile?: string;
  country?: string;
  country_code: string;
  password?: string;
  confirm_password?: string;
  referral_code?: string;
};

interface UserFormDialogProps<TFormValues extends UserFormDialogValues> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  loadingDetails?: boolean;
  passwordOptional?: boolean;
  form: UseFormReturn<TFormValues>;
  onSubmit: (values: TFormValues) => void;
  onCountryChange: (country: string) => void;
}

const fieldPath = <TFormValues extends FieldValues>(name: keyof UserFormDialogValues) =>
  name as FieldPath<TFormValues>;

export function UserFormDialog<TFormValues extends UserFormDialogValues>({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  submittingLabel,
  submitting,
  loadingDetails = false,
  passwordOptional = false,
  form,
  onSubmit,
  onCountryChange,
}: UserFormDialogProps<TFormValues>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            {loadingDetails ? (
              <BackofficeDetailDialogSkeleton fieldCount={8} sectionCount={2} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <ValidatedTextField
                  control={form.control}
                  name={fieldPath<TFormValues>("first_name")}
                  label="First name"
                  transformValue={sanitizePersonText}
                  inputProps={{ autoComplete: "given-name", placeholder: "Enter first name" }}
                />
                <ValidatedTextField
                  control={form.control}
                  name={fieldPath<TFormValues>("last_name")}
                  label="Last name"
                  transformValue={sanitizePersonText}
                  inputProps={{ autoComplete: "family-name", placeholder: "Enter last name" }}
                />
                <ValidatedTextField
                  control={form.control}
                  name={fieldPath<TFormValues>("email")}
                  label="Email"
                  className="sm:col-span-2"
                  inputProps={{ type: "email", autoComplete: "email", placeholder: "name@example.com" }}
                />
                <ValidatedFormField
                  control={form.control}
                  name={fieldPath<TFormValues>("mobile")}
                  label="Mobile"
                  renderControl={({ field }) => (
                    <Input
                      {...field}
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="Enter mobile number"
                      value={field.value ?? ""}
                      onChange={(event) => field.onChange(sanitizeDigits(event.target.value, 15))}
                    />
                  )}
                />
                <ValidatedFormField
                  control={form.control}
                  name={fieldPath<TFormValues>("country")}
                  label="Country"
                  renderControl={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        onCountryChange(value);
                        field.onChange(value);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent side="bottom" avoidCollisions={false}>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.name} value={country.name}>
                            {country.name} ({country.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <ValidatedFormField
                  control={form.control}
                  name={fieldPath<TFormValues>("country_code")}
                  label="Country code"
                  renderControl={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const matchedCountry = COUNTRIES.find((country) => country.code === value);
                        if (matchedCountry) {
                          form.setValue(fieldPath<TFormValues>("country"), matchedCountry.name as TFormValues[FieldPath<TFormValues>], { shouldValidate: true });
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select country code" />
                      </SelectTrigger>
                      <SelectContent side="bottom" avoidCollisions={false}>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={`${country.name}-${country.code}`} value={country.code}>
                            {country.code} ({country.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <ValidatedPasswordField
                  control={form.control}
                  name={fieldPath<TFormValues>("password")}
                  label="Password"
                  inputProps={{
                    placeholder: passwordOptional ? "Leave blank to keep current password" : "Create a strong password",
                  }}
                />
                <ValidatedPasswordField
                  control={form.control}
                  name={fieldPath<TFormValues>("confirm_password")}
                  label="Confirm password"
                  inputProps={{
                    placeholder: passwordOptional ? "Confirm new password" : "Confirm password",
                  }}
                />
                <ValidatedTextField
                  control={form.control}
                  name={fieldPath<TFormValues>("referral_code")}
                  label="Referral code"
                  className="sm:col-span-2"
                  inputProps={{ autoComplete: "off", placeholder: "Enter referral code if available" }}
                />
              </div>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={submitting}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={submitting || loadingDetails}>
                {submitting ? submittingLabel : submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
