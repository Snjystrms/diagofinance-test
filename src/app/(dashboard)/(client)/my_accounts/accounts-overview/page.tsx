'use client';

import { BarChart3, SquareStack } from 'lucide-react';

import { AccountTypeCardGrid } from '@/components/accounts/account-type-card-grid';
import { ApiErrorState } from '@/components/errors/api-error-state';
import { ClientCardGridSkeleton } from '@/components/loading/client-page-skeletons';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/contexts/auth-context';
import { useActiveAccountTypes } from '@/hooks/use-active-account-types';

export default function AccountsOverviewPage() {
  const { token } = useAuth();
  const {
    data: accountTypes = [],
    isLoading,
    error,
    refetch,
  } = useActiveAccountTypes({ token });

  return (
    <ProtectedRoute>
      <div className="min-h-full w-full p-4 lg:p-6 xl:p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="space-y-2">
            <h1 className="mb-1 flex items-center gap-2 text-3xl font-semibold text-foreground">
              <BarChart3 className="h-6 w-6 text-primary" />
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
            onRetry={() => {
              void refetch();
            }}
          />
        ) : null}

        {/* Loading State */}
        {isLoading && (
          <ClientCardGridSkeleton />
        )}

        {/* Account Types Grid */}
        {!isLoading && !error && accountTypes.length > 0 && (
          <AccountTypeCardGrid accountTypes={accountTypes} />
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


