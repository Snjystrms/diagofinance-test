'use client';

import { History, RefreshCw } from 'lucide-react';

import { ApiErrorState } from '@/components/errors/api-error-state';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

import { LivePositionsTable } from './_components/live-positions-table';
import { TradeHistoryFilters } from './_components/trade-history-filters';
import { TradeHistoryTable } from './_components/trade-history-table';
import { useTradeHistory } from './_hooks/use-trade-history';

export default function AllTradesPage() {
  const { token } = useAuth();
  const {
    accounts,
    error,
    fromDt,
    isLoadingAccounts,
    isLoadingPositions,
    isLoadingTrades,
    login,
    perPage,
    positions,
    positionsError,
    refreshAll,
    rows,
    setFromDt,
    setLogin,
    setToDt,
    toDt,
    total,
    totalPages,
    handlePerPageChange,
  } = useTradeHistory(token);

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h1 className="flex items-center gap-2 text-3xl font-semibold text-foreground">
                <History className="h-6 w-6 text-primary" />
                All Trades
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground">
                Trade history from your MT5 account.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => void refreshAll()}
              disabled={(isLoadingTrades || isLoadingPositions) || !login.trim()}
            >
              <RefreshCw
                className={cn('mr-2 h-4 w-4', (isLoadingTrades || isLoadingPositions) && 'animate-spin')}
              />
              Refresh
            </Button>
          </div>

          <TradeHistoryFilters
            accounts={accounts}
            fromDt={fromDt}
            isLoadingAccounts={isLoadingAccounts}
            isLoadingTrades={isLoadingTrades}
            login={login}
            onFromDateChange={setFromDt}
            onLoginChange={setLogin}
            onPerPageChange={handlePerPageChange}
            onToDateChange={setToDt}
            perPage={perPage}
            toDt={toDt}
          />

          {error ? (
            <ApiErrorState
              error={typeof error === 'string' ? undefined : error}
              message={typeof error === 'string' ? error : undefined}
              audience="client"
              resource="trade history"
              action="load"
            />
          ) : null}

          <LivePositionsTable
            error={positionsError}
            isLoading={isLoadingPositions}
            rows={positions}
          />

          <TradeHistoryTable
            isLoading={isLoadingTrades}
            rows={rows}
            total={total}
            totalPages={totalPages}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
