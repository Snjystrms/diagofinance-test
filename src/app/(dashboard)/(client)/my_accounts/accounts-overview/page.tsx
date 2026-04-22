'use client';

import { useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  SquareStack, 
  ArrowRight,
  Diamond,
  Plus,
  Circle,
  Layers
} from 'lucide-react';
import { ApiErrorState } from '@/components/errors/api-error-state';
import { ClientCardGridSkeleton } from '@/components/loading/client-page-skeletons';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { accountTypesApi, type AccountType } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

// Helper function to get icon for account type
const getAccountIcon = (accountName: string) => {
  const name = accountName.toLowerCase();
  if (name.includes('exclusive')) return Diamond;
  if (name.includes('cent')) return Circle;
  if (name.includes('shares')) return Layers;
  if (name.includes('plus')) return Plus;
  return SquareStack;
};

// Helper function to get minimum deposit based on account type name
const getMinimumDeposit = (accountName: string): string => {
  const name = accountName.toLowerCase();
  if (name.includes('exclusive')) return '$500';
  if (name.includes('standard plus')) return '$200';
  if (name.includes('standard')) return '$50';
  if (name.includes('cent')) return '$10';
  if (name.includes('shares')) return '$1000';
  return '$100'; // Default
};

export default function AccountsOverviewPage() {
  const { token } = useAuth();
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  const fetchAccountTypes = useCallback(async () => {
    if (!token) {
      setError('Authentication required');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await accountTypesApi.getActive(token);
      if (response.success && response.data) {
        setAccountTypes(response.data);
      } else {
        setError('Unable to load account types');
      }
    } catch (error) {
      console.error('Error fetching account types:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAccountTypes();
  }, [fetchAccountTypes]);

  return (
    <ProtectedRoute>
      <div className="min-h-full w-full p-4 lg:p-6 xl:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-foreground mb-1">
              Accounts Overview
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl">
              Let&apos;s have a look at the account types.
            </p>
          </div>
        </div>

        {/* Error State */}
        {error ? (
          <ApiErrorState
            error={error}
            audience="client"
            resource="account types"
            action="load"
            variant="inline"
            className="mb-6"
            onRetry={fetchAccountTypes}
          />
        ) : null}

        {/* Loading State */}
        {isLoading && (
          <ClientCardGridSkeleton />
        )}

        {/* Account Types Grid */}
        {!isLoading && !error && accountTypes.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {accountTypes.map((accountType) => {
              const Icon = getAccountIcon(accountType.name);
              const minimumDeposit = getMinimumDeposit(accountType.name);

              return (
                <Card key={accountType.id} className="flex flex-col">
                  <CardHeader className="bg-primary/10 dark:bg-primary/20 px-6 py-4 rounded-t-xl">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-semibold">{accountType.name}</h3>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 px-6 py-6 space-y-4">
                    {/* Minimum Deposit */}
                    <div className="pb-2 border-b">
                      <div className="text-sm text-muted-foreground">Minimum Deposit</div>
                      <div className="text-xl font-bold">{minimumDeposit}</div>
                    </div>

                    {/* Account Details */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">Spread From:</span>
                        <span className="text-sm font-medium">{accountType.spread_from}</span>
                      </div>
                      
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">Maximum Leverage:</span>
                        <span className="text-sm font-medium">{accountType.maximum_leverage}</span>
                      </div>

                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">Base Currency:</span>
                        <span className="text-sm font-medium">{accountType.base_currency}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 space-y-2 border-t">
                      <Button
                        variant="outline"
                        className="w-full"
                        asChild
                      >
                        <Link href={`/my_accounts/open-trading-account?mode=demo&type=${encodeURIComponent(accountType.name)}`}>
                          Create Demo Account
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        className="w-full"
                        asChild
                      >
                        <Link href={`/my_accounts/open-trading-account?mode=live&type=${encodeURIComponent(accountType.name)}`}>
                          Create Live Account
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && accountTypes.length === 0 && (
          <div className="text-center py-12">
            <SquareStack className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Account Types Available</h3>
            <p className="text-muted-foreground">
              There are no account types available at the moment.
            </p>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}


