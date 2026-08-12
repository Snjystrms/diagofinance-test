"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as Flags from "country-flag-icons/react/3x2";
import { User, Mail, Lock, Phone, Globe, Gift, Check, X } from "lucide-react";

import { FALLBACK_COUNTRY_OPTIONS, resolveCountryForCode } from "@/lib/country-options";
import { registerSchema, type RegisterFormData } from "@/lib/validations";
import { useAuthMutations } from "@/hooks/use-auth-mutations";
import {
  sanitizeDigits,
  sanitizePersonText,
} from "@/components/forms/validated-fields";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProtectedRoute } from "@/components/protected-route";
import { Spinner } from "@/components/ui/spinner";
import { AuthLayout } from "@/app/(auth)/_components/auth-layout";

// NOTE: country-flag-icons keys its flag components by ISO 3166-1 alpha-2
// code (e.g. "IN", "AE", "US") — not by phone code or country name.
// This expects each entry in FALLBACK_COUNTRY_OPTIONS to expose an
// `iso2` field. If that field isn't present yet, add it to
// `@/lib/country-options`, e.g.:
//   { name: 'India', phone_code: '+91', iso2: 'IN' }
// Until then this component silently renders nothing (no crash).
function CountryFlag({ iso2 }: { iso2?: string }) {
  if (!iso2) return null;
  const FlagComponent = (
    Flags as unknown as Record<
      string,
      React.ComponentType<{ className?: string; title?: string }>
    >
  )[iso2.toUpperCase()];
  if (!FlagComponent) return null;
  return (
    <FlagComponent
      className="h-3.5 w-5 rounded-[2px] shrink-0 object-cover"
      title={iso2}
    />
  );
}

function PasswordRequirements({ password }: { password: string }) {
  const requirements = useMemo(
    () => [
      { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
      { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
      { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
      { label: "One number", test: (p: string) => /[0-9]/.test(p) },
      {
        label: "One special character",
        test: (p: string) => /[^A-Za-z0-9]/.test(p),
      },
    ],
    [],
  );

  return (
    <ul className="space-y-1 mt-1.5">
      {requirements.map((req) => {
        const met = req.test(password);
        return (
          <li
            key={req.label}
            className={`flex items-center gap-1.5 font-sans text-xs transition-colors ${
              met ? "text-emerald-500" : "text-muted-foreground/60"
            }`}
          >
            {met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {req.label}
          </li>
        );
      })}
    </ul>
  );
}

export function RegisterClient() {
  const { registerMutation } = useAuthMutations();
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: {
      first_name: "",
      last_name: "",
      country_code: "",
      email: "",
      mobile: "",
      country: "",
      password: "",
      confirm_password: "",
      referral_code: "",
    },
  });

  const handleCountryChange = (selectedCountry: string) => {
    const countryData = FALLBACK_COUNTRY_OPTIONS.find(
      (country) => country.name === selectedCountry,
    );
    if (!countryData) return;

    form.setValue("country", selectedCountry, { shouldValidate: true });
    form.setValue("country_code", countryData.phone_code, {
      shouldValidate: true,
    });
  };

  useEffect(() => {
    const ibCode = searchParams.get("ib");
    const referralCode = searchParams.get("referral_code");
    const nextReferralCode = ibCode || referralCode || "";

    if (!nextReferralCode) {
      return;
    }

    form.setValue("referral_code", nextReferralCode, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [form, searchParams]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await registerMutation.mutateAsync({
        first_name: data.first_name,
        last_name: data.last_name,
        country_code: data.country_code,
        email: data.email,
        country: data.country,
        mobile: data.mobile,
        password: data.password,
        confirm_password: data.confirm_password,
        referral_code: data.referral_code,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const primaryButtonGradient: React.CSSProperties = {
    background:
      "linear-gradient(0deg, #C50435, #C50435), linear-gradient(180deg, #EC0808 -78.33%, #500101 265%)",
  };

  const inputWrapperClass =
    "relative flex items-center rounded-md border border-[#2A2A2E] bg-input/60 focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/15 transition-all";
  const iconSlotClass = "flex h-11 w-11 shrink-0 items-center justify-center";
  const bareInputClass =
    "w-full !bg-transparent border-0 font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-foreground placeholder:text-muted-foreground/60 !pl-0 pr-4 py-2.5 outline-none focus-visible:ring-0";
  const labelClass =
    "font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-foreground";

  return (
    <ProtectedRoute requireAuth={false}>
      <AuthLayout>
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Heading */}
          <div className="text-center">
            <h1 className="font-sans font-medium text-[40px] leading-[100%] tracking-[-4%] text-foreground">
              Sign Up
            </h1>
            <p className="mt-3 font-sans font-normal text-[16px] leading-[150%] tracking-[-3%] text-muted-foreground">
              Enter your details to create your account
            </p>
          </div>

          <div>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>First Name</FormLabel>
                        <FormControl>
                          <div className={inputWrapperClass}>
                            <span className={iconSlotClass}>
                              <User className="h-4 w-4 text-muted-foreground" />
                            </span>
                            <Input
                              placeholder="Enter your first name"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  sanitizePersonText(e.target.value),
                                )
                              }
                              className={bareInputClass}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>Last Name</FormLabel>
                        <FormControl>
                          <div className={inputWrapperClass}>
                            <span className={iconSlotClass}>
                              <User className="h-4 w-4 text-muted-foreground" />
                            </span>
                            <Input
                              placeholder="Enter your last name"
                              {...field}
                              onChange={(e) =>
                                field.onChange(
                                  sanitizePersonText(e.target.value),
                                )
                              }
                              className={bareInputClass}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Email</FormLabel>
                      <FormControl>
                        <div className={inputWrapperClass}>
                          <span className={iconSlotClass}>
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </span>
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            {...field}
                            className={bareInputClass}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Country</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          handleCountryChange(value);
                          field.onChange(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 w-full min-w-0 !bg-input/60 border-[#2A2A2E] text-foreground focus:ring-primary/15 [&>span]:truncate [&>span]:block">
                            <div className="flex min-w-0 items-center gap-2">
                              {/* <Globe className="h-4 w-4 text-muted-foreground shrink-0" /> */}
                              <SelectValue placeholder="Select country" />
                            </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent
                          side="bottom"
                          avoidCollisions={false}
                          className="max-w-[--radix-select-trigger-width] w-[--radix-select-trigger-width]"
                        >
                          {FALLBACK_COUNTRY_OPTIONS.map((country) => (
                            <SelectItem
                              key={country.name}
                              value={country.name}
                              className="truncate"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <CountryFlag
                                  iso2={(country as { iso2?: string }).iso2}
                                />
                                <span className="truncate">{country.name}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 items-start sm:grid-cols-[minmax(0,150px)_1fr]">
                  <FormField
                    control={form.control}
                    name="country_code"
                    render={({ field }) => {
                      const preferredCountry = form.watch("country");
                      const resolvedCodeCountry = resolveCountryForCode(
                        field.value,
                        preferredCountry,
                      );
                      return (
                        <FormItem>
                          <FormLabel className={labelClass}>Code</FormLabel>
                          <Select
                            value={resolvedCodeCountry?.iso2 ?? field.value ?? ""}
                            onValueChange={(value) => {
                              const matchedCountry =
                                FALLBACK_COUNTRY_OPTIONS.find(
                                  (country) => country.iso2 === value,
                                );
                              if (matchedCountry) {
                                field.onChange(matchedCountry.phone_code);
                                form.setValue("country", matchedCountry.name, {
                                  shouldValidate: true,
                                });
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger className="h-11 w-full min-w-0 !bg-input/60 border-[#2A2A2E] text-foreground focus:ring-primary/15 [&>span]:truncate [&>span]:block">
                                <SelectValue placeholder="Code" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent
                              side="bottom"
                              avoidCollisions={false}
                              className="max-w-[--radix-select-trigger-width] w-[--radix-select-trigger-width]"
                            >
                              {FALLBACK_COUNTRY_OPTIONS.map((country) => (
                                <SelectItem
                                  key={country.iso2}
                                  value={country.iso2}
                                  className="truncate"
                                >
                                  <span className="flex min-w-0 items-center gap-2">
                                    <CountryFlag iso2={country.iso2} />
                                    <span className="truncate">
                                      {country.phone_code} ({country.name})
                                    </span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-red-400 text-xs" />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>
                          Mobile Number
                        </FormLabel>
                        <FormControl>
                          <div className={inputWrapperClass}>
                            <span className={iconSlotClass}>
                              <Phone className="h-4 w-4 text-muted-foreground" />
                            </span>
                            <Input
                              placeholder="Enter 10-digit mobile number"
                              inputMode="numeric"
                              maxLength={10}
                              {...field}
                              value={field.value || ""}
                              onChange={(event) =>
                                field.onChange(
                                  sanitizeDigits(event.target.value, 10),
                                )
                              }
                              className={bareInputClass}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Password</FormLabel>
                      <FormControl>
                        <div className={inputWrapperClass}>
                          <span className={iconSlotClass}>
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          </span>
                          <PasswordInput
                            placeholder="Enter password"
                            autoComplete="new-password"
                            onChange={field.onChange}
                            value={field.value}
                            className="flex-1 min-w-0"
                            inputClassName="w-full !bg-transparent border-0 font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-foreground placeholder:text-muted-foreground/60 !pl-0 pr-11 py-2.5 outline-none"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                      {field.value && (
                        <PasswordRequirements password={field.value} />
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirm_password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>
                        Confirm Password
                      </FormLabel>
                      <FormControl>
                        <div className={inputWrapperClass}>
                          <span className={iconSlotClass}>
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          </span>
                          <PasswordInput
                            placeholder="Confirm password"
                            autoComplete="new-password"
                            onChange={field.onChange}
                            value={field.value}
                            className="flex-1 min-w-0"
                            inputClassName="w-full !bg-transparent border-0 font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-foreground placeholder:text-muted-foreground/60 !pl-0 pr-11 py-2.5 outline-none"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referral_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>
                        Referral Code
                      </FormLabel>
                      <FormControl>
                        <div className={inputWrapperClass}>
                          <span className={iconSlotClass}>
                            <Gift className="h-4 w-4 text-muted-foreground" />
                          </span>
                          <Input
                            placeholder="Enter referral code"
                            {...field}
                            className={bareInputClass}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <button
                  type="submit"
                  disabled={registerMutation.isPending || isLoading}
                  style={primaryButtonGradient}
                  className="
                    w-full py-3.5 rounded-md font-sans font-normal text-[14px] leading-[150%] tracking-[-3%]
                    text-white
                    hover:opacity-90
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all flex items-center justify-center gap-2 cursor-pointer
                  "
                >
                  {registerMutation.isPending || isLoading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </button>
              </form>
            </Form>

            <p className="mt-8 text-center font-sans font-normal text-[14px] leading-[150%] tracking-[-3%] text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-normal text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}
