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
  ib_plan_id?: string;
};

type IbPlanOption = {
  id: string;
  name: string;
  status: string;
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
  showReferralCode?: boolean;
  ibPlanOptions?: IbPlanOption[];
  loadingIbPlans?: boolean;
  form: UseFormReturn<TFormValues>;
  onSubmit: (values: TFormValues) => void;
  onCountryChange: (country: string) => void;
}

const fieldPath = <TFormValues extends FieldValues>(
  name: keyof UserFormDialogValues,
) => name as FieldPath<TFormValues>;

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
  showReferralCode = true,
  ibPlanOptions = [],
  loadingIbPlans = false,
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
                {/* ── First name ── */}
                <ValidatedTextField
                  control={form.control}
                  name={fieldPath<TFormValues>("first_name")}
                  label="First name"
                  transformValue={sanitizePersonText}
                  inputProps={{
                    autoComplete: "given-name",
                    placeholder: "Enter first name",
                  }}
                  rules={{ required: "First name is required" }}
                />

                {/* ── Last name ── */}
                <ValidatedTextField
                  control={form.control}
                  name={fieldPath<TFormValues>("last_name")}
                  label="Last name"
                  transformValue={sanitizePersonText}
                  inputProps={{
                    autoComplete: "family-name",
                    placeholder: "Enter last name",
                  }}
                  rules={{ required: "Last name is required" }}
                />

                {/* ── Email ── */}
                <ValidatedTextField
                  control={form.control}
                  name={fieldPath<TFormValues>("email")}
                  label="Email"
                  className="sm:col-span-2"
                  inputProps={{
                    type: "email",
                    autoComplete: "email",
                    placeholder: "name@example.com",
                  }}
                  rules={{
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address",
                    },
                  }}
                />

                {/* ── Country ── */}
                <ValidatedFormField
                  control={form.control}
                  name={fieldPath<TFormValues>("country")}
                  label="Country"
                  rules={{ required: "Country is required" }}
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

                {/* ── Country code ── */}
                <ValidatedFormField
                  control={form.control}
                  name={fieldPath<TFormValues>("country_code")}
                  label="Country code"
                  rules={{ required: "Country code is required" }}
                  renderControl={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const matchedCountry = COUNTRIES.find(
                          (country) => country.code === value,
                        );
                        if (matchedCountry) {
                          form.setValue(
                            fieldPath<TFormValues>("country"),
                            matchedCountry.name as TFormValues[FieldPath<TFormValues>],
                            { shouldValidate: true },
                          );
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select country code" />
                      </SelectTrigger>
                      <SelectContent side="bottom" avoidCollisions={false}>
                        {COUNTRIES.map((country) => (
                          <SelectItem
                            key={`${country.name}-${country.code}`}
                            value={country.code}
                          >
                            {country.code} ({country.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                                {/* ── Mobile ── */}
                <ValidatedFormField
                  control={form.control}
                  name={fieldPath<TFormValues>("mobile")}
                  label="Mobile"
                  rules={{
                    required: "Mobile number is required",
                    minLength: {
                      value: 10,
                      message: "Mobile number must be 10 digits",
                    },
                  }}
                  renderControl={({ field }) => (
                    <Input
                      {...field}
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                      pattern="\d{10}"
                      value={sanitizeDigits(String(field.value ?? ""), 10)}
                      onInput={(event) => {
                        const nextValue = sanitizeDigits(
                          event.currentTarget.value,
                          10,
                        );
                        event.currentTarget.value = nextValue;
                      }}
                      onChange={(event) =>
                        field.onChange(sanitizeDigits(event.target.value, 10))
                      }
                    />
                  )}
                />

                {/* ── Password ── */}
                <ValidatedPasswordField
                  control={form.control}
                  name={fieldPath<TFormValues>("password")}
                  label="Password"
                  inputProps={{
                    placeholder: passwordOptional
                      ? "Leave blank to keep current password"
                      : "Create a strong password",
                  }}
                  rules={
                    passwordOptional
                      ? {
                          minLength: {
                            value: 8,
                            message: "Password must be at least 8 characters",
                          },
                        }
                      : {
                          required: "Password is required",
                          minLength: {
                            value: 8,
                            message: "Password must be at least 8 characters",
                          },
                        }
                  }
                />

                {/* ── Confirm password ── */}
                <ValidatedPasswordField
                  control={form.control}
                  name={fieldPath<TFormValues>("confirm_password")}
                  label="Confirm password"
                  inputProps={{
                    placeholder: passwordOptional
                      ? "Confirm new password"
                      : "Confirm password",
                  }}
                  rules={
                    passwordOptional
                      ? {
                          validate: (value: string) => {
                            const pwd = form.getValues(
                              fieldPath<TFormValues>("password"),
                            );
                            if (pwd && !value)
                              return "Please confirm your password";
                            if (pwd && value !== pwd)
                              return "Passwords do not match";
                            return true;
                          },
                        }
                      : {
                          required: "Please confirm your password",
                          validate: (value: string) =>
                            value ===
                              form.getValues(
                                fieldPath<TFormValues>("password"),
                              ) || "Passwords do not match",
                        }
                  }
                />

                {/* ── Referral code (optional) ── */}
                {showReferralCode ? (
                  <ValidatedTextField
                    control={form.control}
                    name={fieldPath<TFormValues>("referral_code")}
                    label="Referral code"
                    className="sm:col-span-2"
                    inputProps={{
                      autoComplete: "off",
                      placeholder: "Enter referral code if available",
                    }}
                    // intentionally no `rules` — this field is optional
                  />
                ) : null}

                {/* ── IB Plan (optional) ── */}
                {/* <ValidatedFormField
                  control={form.control}
                  name={fieldPath<TFormValues>("ib_plan_id")}
                  label="Partner/IB Plan"
                  className="sm:col-span-2"
                  renderControl={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(value) => {
                        field.onChange(value === "__none__" ? "" : value);
                      }}
                      disabled={loadingIbPlans}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={
                            loadingIbPlans
                              ? "Loading plans..."
                              : "Select partner/IB plan (optional)"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent side="bottom" avoidCollisions={false}>
                        <SelectItem value="__none__">None</SelectItem>
                        {ibPlanOptions.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                /> */}
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
