'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { COUNTRIES } from '@/lib/countries';
import { registerSchema, type RegisterFormData } from '@/lib/validations';
import { useAuthMutations } from '@/hooks/use-auth-mutations';
import {
  ValidatedFormField,
  ValidatedPasswordField,
  ValidatedTextField,
  sanitizeDigits,
  sanitizePersonText,
} from '@/components/forms/validated-fields';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProtectedRoute } from '@/components/protected-route';
import { Spinner } from '@/components/ui/spinner';
import { AuthLayout } from '@/app/(auth)/_components/auth-layout';
import { Check, X } from 'lucide-react';

function PasswordRequirements({ password }: { password: string }) {
  const requirements = useMemo(() => [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
    { label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ], []);

  return (
    <ul className="space-y-1 mt-1.5">
      {requirements.map((req) => {
        const met = req.test(password);
        return (
          <li
            key={req.label}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              met ? 'text-emerald-500' : 'text-muted-foreground/60'
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
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: {
      first_name: '',
      last_name: '',
      country_code: '',
      email: '',
      mobile: '',
      country: '',
      password: '',
      confirm_password: '',
      referral_code: '',
    },
  });

  const handleCountryChange = (selectedCountry: string) => {
    const countryData = COUNTRIES.find((country) => country.name === selectedCountry);
    if (!countryData) return;

    form.setValue('country', selectedCountry, { shouldValidate: true });
    form.setValue('country_code', countryData.code, { shouldValidate: true });
  };

  useEffect(() => {
    const ibCode = searchParams.get('ib');
    const referralCode = searchParams.get('referral_code');
    const nextReferralCode = ibCode || referralCode || '';

    if (!nextReferralCode) {
      return;
    }

    form.setValue('referral_code', nextReferralCode, { shouldDirty: false, shouldValidate: true });
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

  return (
    <ProtectedRoute requireAuth={false}>
      <AuthLayout>
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-foreground">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Card with gold border accent */}
        <div
          className="rounded-xl border border-primary/20 bg-card overflow-hidden"
          style={{ boxShadow: '0 0 0 1px color-mix(in srgb, var(--color-primary) 8%, transparent), 0 24px 60px rgba(0,0,0,0.4)' }}
        >
          {/* Gold top bar accent */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          <div className="px-8 pt-7 pb-2">
            <h3 className="text-foreground font-semibold text-lg">Register</h3>
            <p className="text-muted-foreground text-sm mt-0.5">
              Enter your details to create your account
            </p>
          </div>

          <div className="px-8 pb-8 pt-4">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <ValidatedTextField
                  control={form.control}
                  name="first_name"
                  label="First Name"
                  transformValue={sanitizePersonText}
                  inputProps={{ placeholder: 'Enter your first name', className: 'h-10 bg-input border-primary/20 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/15' }}
                />

                <ValidatedTextField
                  control={form.control}
                  name="last_name"
                  label="Last Name"
                  transformValue={sanitizePersonText}
                  inputProps={{ placeholder: 'Enter your last name', className: 'h-10 bg-input border-primary/20 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/15' }}
                />

                <ValidatedTextField
                  control={form.control}
                  name="email"
                  label="Email"
                  inputProps={{ type: 'email', placeholder: 'Enter your email', className: 'h-10 bg-input border-primary/20 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/15' }}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
<FormLabel className="text-foreground/70 text-sm">Country</FormLabel>
                       <Select
                         onValueChange={(value) => {
                           handleCountryChange(value);
                           field.onChange(value);
                         }}
                         value={field.value}
                       >
                         <FormControl>
                           <SelectTrigger className="h-10 w-full bg-input border-primary/20 text-foreground focus:ring-primary/15">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent side="bottom" avoidCollisions={false}>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.name} value={country.name}>
                              {country.name}
                               {/* ({country.code}) */}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 items-start sm:grid-cols-2">
                  <ValidatedFormField
                    control={form.control}
                    name="country_code"
                    label="Country Code"
                    renderControl={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          const matchedCountry = COUNTRIES.find((country) => country.code === value);
                          if (matchedCountry) {
                            form.setValue('country', matchedCountry.name, { shouldValidate: true });
                          }
                        }}
                      >
<SelectTrigger className="h-10 w-full bg-input border-primary/20 text-foreground focus:ring-primary/15">
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

                  <ValidatedFormField
                    control={form.control}
                    name="mobile"
                    label="Mobile Number"
                    renderControl={({ field }) => (
                      <Input
                        placeholder="Enter 10-digit mobile number"
                        inputMode="numeric"
                        maxLength={10}
                        className="h-10 bg-input border-primary/20 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/15"
                        {...field}
                        value={field.value || ''}
                        onChange={(event) => field.onChange(sanitizeDigits(event.target.value, 10))}
                      />
                    )}
                  />
                </div>

                <ValidatedPasswordField
                  control={form.control}
                  name="password"
                  label="Password"
                  inputProps={{ placeholder: 'Enter password', className: 'bg-input border-primary/20 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/15' }}
                />
                {form.watch('password') && (
                  <PasswordRequirements password={form.watch('password')} />
                )}

                <ValidatedPasswordField
                  control={form.control}
                  name="confirm_password"
                  label="Confirm Password"
                  inputProps={{ placeholder: 'Confirm password', className: 'bg-input border-primary/20 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/15' }}
                />

                <ValidatedTextField
                  control={form.control}
                  name="referral_code"
                  label="Referral Code"
                  inputProps={{ placeholder: 'Enter referral code', className: 'h-10 bg-input border-primary/20 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/15' }}
                />

                <button
                  type="submit"
                  disabled={registerMutation.isPending || isLoading}
                  className="
                    w-full py-3 rounded-lg text-sm font-bold tracking-wide
                    bg-primary text-primary-foreground
                    hover:bg-primary/90
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all flex items-center justify-center gap-2
                    shadow-[0_0_20px_color-mix(in_srgb,var(--color-primary)_20%,transparent)]
                  "
                >
                  {registerMutation.isPending || isLoading ? (
                    <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creating account...
                    </>
                  ) : (
                    'Create account'
                  )}
                </button>
              </form>
            </Form>
          </div>

          {/* Gold bottom bar accent */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}