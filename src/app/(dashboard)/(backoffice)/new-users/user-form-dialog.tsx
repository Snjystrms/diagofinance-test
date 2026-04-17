"use client";

import type { UseFormReturn } from "react-hook-form";

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

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  submittingLabel: string;
  submitting: boolean;
  loadingDetails?: boolean;
  passwordOptional?: boolean;
  form: UseFormReturn<any>;
  onSubmit: (values: any) => void;
  onCountryChange: (country: string) => void;
}

export function UserFormDialog({
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
}: UserFormDialogProps) {
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
              <div className="py-8 text-center text-sm text-muted-foreground">Loading user details...</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <ValidatedTextField
                  control={form.control}
                  name="first_name"
                  label="First name"
                  transformValue={sanitizePersonText}
                  inputProps={{ autoComplete: "given-name", placeholder: "Enter first name" }}
                />
                <ValidatedTextField
                  control={form.control}
                  name="last_name"
                  label="Last name"
                  transformValue={sanitizePersonText}
                  inputProps={{ autoComplete: "family-name", placeholder: "Enter last name" }}
                />
                <ValidatedTextField
                  control={form.control}
                  name="email"
                  label="Email"
                  className="sm:col-span-2"
                  inputProps={{ type: "email", autoComplete: "email", placeholder: "name@example.com" }}
                />
                <ValidatedFormField
                  control={form.control}
                  name="mobile"
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
                  name="country"
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
                  name="country_code"
                  label="Country code"
                  renderControl={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const matchedCountry = COUNTRIES.find((country) => country.code === value);
                        if (matchedCountry) {
                          form.setValue("country", matchedCountry.name, { shouldValidate: true });
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
                  name="password"
                  label="Password"
                  inputProps={{
                    placeholder: passwordOptional ? "Leave blank to keep current password" : "Create a strong password",
                  }}
                />
                <ValidatedPasswordField
                  control={form.control}
                  name="confirm_password"
                  label="Confirm password"
                  inputProps={{
                    placeholder: passwordOptional ? "Confirm new password" : "Confirm password",
                  }}
                />
                <ValidatedTextField
                  control={form.control}
                  name="referral_code"
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
