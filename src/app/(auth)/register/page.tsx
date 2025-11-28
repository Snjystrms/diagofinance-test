'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { registerSchema, type RegisterFormData } from '@/lib/validations';

// NOTE: we're keeping imports like useAuthMutations / Spinner etc. for UI state,
// but we're not doing any API logic beyond calling mutateAsync.
import { useAuthMutations } from '@/hooks/use-auth-mutations';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { PasswordInput } from '@/components/password-input';
import { PasswordInput } from '@/components/password-input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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

import Link from 'next/link';
import Image from 'next/image';

// Country list with country codes
const COUNTRIES = [
  { name: 'United States', code: '+1' },
  { name: 'India', code: '+91' },
  { name: 'United Kingdom', code: '+44' },
  { name: 'Australia', code: '+61' },
  { name: 'Canada', code: '+1' },
  { name: 'Germany', code: '+49' },
  { name: 'France', code: '+33' },
  { name: 'Japan', code: '+81' },
  { name: 'China', code: '+86' },
  { name: 'Brazil', code: '+55' },
  { name: 'Russia', code: '+7' },
  { name: 'South Korea', code: '+82' },
  { name: 'Italy', code: '+39' },
  { name: 'Spain', code: '+34' },
  { name: 'Mexico', code: '+52' },
  { name: 'Indonesia', code: '+62' },
  { name: 'Turkey', code: '+90' },
  { name: 'Saudi Arabia', code: '+966' },
  { name: 'United Arab Emirates', code: '+971' },
  { name: 'South Africa', code: '+27' },
] as const;

export default function RegisterPage() {
  const { registerMutation } = useAuthMutations();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
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

  // live watches for inline hints / validation feedback
  const email = form.watch('email') || '';
  const mobile = form.watch('mobile') || '';
  const password = form.watch('password') || '';
  const confirmPassword = form.watch('confirm_password') || '';
  const country = form.watch('country') || '';
  const countryCode = form.watch('country_code') || '';

  // password strength checklist
  const pwLen = password.length >= 8;
  const pwUpper = /[A-Z]/.test(password);
  const pwLower = /[a-z]/.test(password);
  const pwNum = /\d/.test(password);
  const pwSpecial = /[^A-Za-z0-9]/.test(password);

  // mobile validation - only digits, exactly 10 digits
  const mobileDigitsOnly = /^\d*$/.test(mobile);
  const mobileLenOk = mobile.length === 10;

  // Handle country selection - auto-fill country code
  const handleCountryChange = (selectedCountry: string) => {
    const countryData = COUNTRIES.find((c) => c.name === selectedCountry);
    if (countryData) {
      form.setValue('country', selectedCountry);
      form.setValue('country_code', countryData.code);
    }
  };


  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      // Transform the data to match the API format
      const apiData = {
        first_name: data.first_name,
        last_name: data.last_name,
        country_code: data.country_code,
        email: data.email,
        country: data.country,
        mobile: data.mobile,
        password: data.password,
        confirm_password: data.confirm_password,
        referral_code: data.referral_code,
      };
      await registerMutation.mutateAsync(apiData);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute requireAuth={false}>
      <div className="min-h-screen flex">
        {/* Left side - Background / Brand side */}
        <div className="hidden lg:flex lg:w-2/5 relative bg-background">
          <Image
            src="/loginbackground.png"
            alt="Register background"
            fill
            priority
            className="object-contain"
          />
        </div>

        {/* Right side - Register Form */}
        <div className="flex-1 flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            {/* Header copy */}
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-foreground">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-medium text-primary hover:text-primary/80"
                >
                  Sign in
                </Link>
              </p>
            </div>

            {/* Card container */}
            <Card>
              <CardHeader>
                <CardTitle>Register</CardTitle>
                <CardDescription>
                  Enter your details to create your account
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    {/* First Name */}
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your first name"
                              {...field}
                              className="h-10"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Last Name */}
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your last name"
                              {...field}
                              className="h-10"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Email with inline hint */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter your email"
                              {...field}
                              className="h-10"
                            />
                          </FormControl>
                          <FormMessage />
                          {email && !form.formState.errors.email ? (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              Looks like a valid email.
                            </p>
                          ) : email ? (
                            <FormDescription className="text-destructive">
                              Please enter a valid email address
                              (e.g., name@example.com).
                            </FormDescription>
                          ) : (
                            <FormDescription>
                              e.g., name@example.com
                            </FormDescription>
                          )}
                        </FormItem>
                      )}
                    />

                    {/* Country selection - moved after email */}
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              handleCountryChange(value);
                              field.onChange(value);
                            }}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-10 w-full">
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {COUNTRIES.map((country) => (
                                <SelectItem key={country.name} value={country.name}>
                                  {country.name} ({country.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                          {country && (
                            <FormDescription>
                              Country code {countryCode} will be automatically applied
                            </FormDescription>
                          )}
                        </FormItem>
                      )}
                    />

                    {/* Country Code (read-only, auto-filled) + Mobile Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                      {/* Country Code - read-only, auto-filled */}
                      <FormField
                        control={form.control}
                        name="country_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country Code</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="+1"
                                readOnly
                                className="h-10 bg-muted cursor-not-allowed"
                                value={field.value || countryCode || ''}
                                onChange={() => {}} // Prevent changes
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                              />
                            </FormControl>
                            <FormMessage />
                            {!country && (
                              <FormDescription>
                                Select a country first
                              </FormDescription>
                            )}
                            {country && countryCode && (
                              <FormDescription className="text-green-600 dark:text-green-400">
                                Auto-filled from selected country
                              </FormDescription>
                            )}
                          </FormItem>
                        )}
                      />

                      {/* Mobile with live feedback - numbers only, max 10 digits */}
                      <FormField
                        control={form.control}
                        name="mobile"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mobile Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter 10-digit mobile number"
                                inputMode="numeric"
                                maxLength={10}
                                className="h-10"
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Remove any non-digit characters
                                  const digitsOnly = value.replace(/\D/g, '');
                                  // Limit to 10 digits
                                  const limited = digitsOnly.slice(0, 10);
                                  field.onChange(limited);
                                }}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                            {mobile ? (
                              !mobileDigitsOnly ? (
                                <p className="text-xs text-destructive mt-1">
                                  Only numbers are allowed
                                </p>
                              ) : !mobileLenOk ? (
                                <p className="text-xs text-destructive mt-1">
                                  Mobile number must be exactly 10 digits
                                </p>
                              ) : (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  Mobile number looks good.
                                </p>
                              )
                            ) : (
                              <FormDescription>
                                Enter 10 digits only (numbers)
                              </FormDescription>
                            )}
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Password with checklist */}
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <PasswordInput
                              placeholder="Enter password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                          <ul className="mt-1 space-y-1 text-xs">
                            <li
                              className={
                                pwLen
                                  ? 'text-green-600'
                                  : 'text-muted-foreground'
                              }
                            >
                              • At least 8 characters
                            </li>
                            <li
                              className={
                                pwUpper
                                  ? 'text-green-600'
                                  : 'text-muted-foreground'
                              }
                            >
                              • At least 1 uppercase letter
                            </li>
                            <li
                              className={
                                pwLower
                                  ? 'text-green-600'
                                  : 'text-muted-foreground'
                              }
                            >
                              • At least 1 lowercase letter
                            </li>
                            <li
                              className={
                                pwNum
                                  ? 'text-green-600'
                                  : 'text-muted-foreground'
                              }
                            >
                              • At least 1 number
                            </li>
                            <li
                              className={
                                pwSpecial
                                  ? 'text-green-600'
                                  : 'text-muted-foreground'
                              }
                            >
                              • At least 1 special character
                            </li>
                          </ul>
                        </FormItem>
                      )}
                    />

                    {/* Confirm Password with match hint */}
                    <FormField
                      control={form.control}
                      name="confirm_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <PasswordInput
                              placeholder="Confirm password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                          {confirmPassword && (
                            <p
                              className={`text-xs mt-1 ${
                                confirmPassword === password
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {confirmPassword === password
                                ? 'Passwords match.'
                                : 'Passwords do not match.'}
                            </p>
                          )}
                        </FormItem>
                      )}
                    />

                    {/* Referral Code (moved to bottom) */}
                    <FormField
                      control={form.control}
                      name="referral_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Referral Code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter referral code"
                              {...field}
                              className="h-10"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Submit button with loading state */}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending || isLoading}
                    >
                      {registerMutation.isPending || isLoading ? (
                        <>
                          <Spinner size="sm" className="mr-2" />
                          Creating account...
                        </>
                      ) : (
                        'Create account'
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}