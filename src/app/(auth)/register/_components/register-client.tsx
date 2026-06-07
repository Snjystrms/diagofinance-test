'use client';

import { useEffect, useState } from 'react';
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
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-white/40">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-[#FFB800] hover:text-[#FFB800]/80 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Card with gold border accent */}
        <div
          className="rounded-xl border border-[#FFB800]/20 bg-[#0f0f0f] overflow-hidden"
          style={{ boxShadow: '0 0 0 1px rgba(255,184,0,0.08), 0 24px 60px rgba(0,0,0,0.6)' }}
        >
          {/* Gold top bar accent */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#FFB800]/60 to-transparent" />

          <div className="px-8 pt-7 pb-2">
            <h3 className="text-white font-semibold text-lg">Register</h3>
            <p className="text-white/40 text-sm mt-0.5">
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
                  inputProps={{ placeholder: 'Enter your first name', className: 'h-10 bg-[#1a1a1a] border-[#FFB800]/20 text-white placeholder:text-white/20 focus:border-[#FFB800]/50 focus:ring-1 focus:ring-[#FFB800]/15' }}
                />

                <ValidatedTextField
                  control={form.control}
                  name="last_name"
                  label="Last Name"
                  transformValue={sanitizePersonText}
                  inputProps={{ placeholder: 'Enter your last name', className: 'h-10 bg-[#1a1a1a] border-[#FFB800]/20 text-white placeholder:text-white/20 focus:border-[#FFB800]/50 focus:ring-1 focus:ring-[#FFB800]/15' }}
                />

                <ValidatedTextField
                  control={form.control}
                  name="email"
                  label="Email"
                  inputProps={{ type: 'email', placeholder: 'Enter your email', className: 'h-10 bg-[#1a1a1a] border-[#FFB800]/20 text-white placeholder:text-white/20 focus:border-[#FFB800]/50 focus:ring-1 focus:ring-[#FFB800]/15' }}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/70 text-sm">Country</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          handleCountryChange(value);
                          field.onChange(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 w-full bg-[#1a1a1a] border-[#FFB800]/20 text-white focus:ring-[#FFB800]/15">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent side="bottom" avoidCollisions={false}>
                          {COUNTRIES.map((country) => (
                            <SelectItem key={country.name} value={country.name}>
                              {country.name} ({country.code})
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
                        <SelectTrigger className="h-10 w-full bg-[#1a1a1a] border-[#FFB800]/20 text-white focus:ring-[#FFB800]/15">
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
                        className="h-10 bg-[#1a1a1a] border-[#FFB800]/20 text-white placeholder:text-white/20 focus:border-[#FFB800]/50 focus:ring-1 focus:ring-[#FFB800]/15"
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
                  inputProps={{ placeholder: 'Enter password', className: 'bg-[#1a1a1a] border-[#FFB800]/20 text-white placeholder:text-white/20 focus:border-[#FFB800]/50 focus:ring-1 focus:ring-[#FFB800]/15' }}
                />

                <ValidatedPasswordField
                  control={form.control}
                  name="confirm_password"
                  label="Confirm Password"
                  inputProps={{ placeholder: 'Confirm password', className: 'bg-[#1a1a1a] border-[#FFB800]/20 text-white placeholder:text-white/20 focus:border-[#FFB800]/50 focus:ring-1 focus:ring-[#FFB800]/15' }}
                />

                <ValidatedTextField
                  control={form.control}
                  name="referral_code"
                  label="Referral Code"
                  inputProps={{ placeholder: 'Enter referral code', className: 'h-10 bg-[#1a1a1a] border-[#FFB800]/20 text-white placeholder:text-white/20 focus:border-[#FFB800]/50 focus:ring-1 focus:ring-[#FFB800]/15' }}
                />

                <button
                  type="submit"
                  disabled={registerMutation.isPending || isLoading}
                  className="
                    w-full py-3 rounded-lg text-sm font-bold tracking-wide
                    bg-[#FFB800] text-black
                    hover:bg-[#FFB800]/90
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all flex items-center justify-center gap-2
                    shadow-[0_0_20px_rgba(255,184,0,0.2)]
                  "
                >
                  {registerMutation.isPending || isLoading ? (
                    <>
                      <Spinner size="sm" className="border-black/40" />
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
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[#FFB800]/30 to-transparent" />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}