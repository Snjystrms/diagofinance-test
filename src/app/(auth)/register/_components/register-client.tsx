'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { COUNTRIES } from '@/lib/countries';
import { registerSchema, type RegisterFormData } from '@/lib/validations';
import { useAuthMutations } from '@/hooks/use-auth-mutations';
import { Button } from '@/components/ui/button';
import {
  ValidatedFormField,
  ValidatedPasswordField,
  ValidatedTextField,
  sanitizeDigits,
  sanitizePersonText,
} from '@/components/forms/validated-fields';
import { Input } from '@/components/ui/input';
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
      <div className="min-h-screen flex">
        <div className="hidden lg:flex lg:w-2/5 relative bg-background">
          <Image
            src="/loginbackground.png"
            alt="Register background"
            fill
            priority
            className="object-contain"
          />
        </div>

        <div className="flex-1 flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
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
                    <ValidatedTextField
                      control={form.control}
                      name="first_name"
                      label="First Name"
                      transformValue={sanitizePersonText}
                      inputProps={{ placeholder: 'Enter your first name', className: 'h-10' }}
                    />

                    <ValidatedTextField
                      control={form.control}
                      name="last_name"
                      label="Last Name"
                      transformValue={sanitizePersonText}
                      inputProps={{ placeholder: 'Enter your last name', className: 'h-10' }}
                    />

                    <ValidatedTextField
                      control={form.control}
                      name="email"
                      label="Email"
                      inputProps={{ type: 'email', placeholder: 'Enter your email', className: 'h-10' }}
                    />

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
                            <SelectContent side="bottom" avoidCollisions={false}>
                              {COUNTRIES.map((country) => (
                                <SelectItem key={country.name} value={country.name}>
                                  {country.name} ({country.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
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
                            <SelectTrigger className="h-10 w-full">
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
                            className="h-10"
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
                      inputProps={{ placeholder: 'Enter password' }}
                    />

                    <ValidatedPasswordField
                      control={form.control}
                      name="confirm_password"
                      label="Confirm Password"
                      inputProps={{ placeholder: 'Confirm password' }}
                    />

                    <ValidatedTextField
                      control={form.control}
                      name="referral_code"
                      label="Referral Code"
                      inputProps={{ placeholder: 'Enter referral code', className: 'h-10' }}
                    />

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
