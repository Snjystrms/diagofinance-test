'use client';

import type { ReactNode } from 'react';

import { Activity, Loader2 } from 'lucide-react';

import { AppDataTable } from '@/components/app-data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import type { PositionRow } from '../_lib/trade-history';
import { livePositionsColumns } from './live-positions-columns';

type LivePositionsTableProps = {
  description?: string;
  error?: string | null;
  headerActions?: ReactNode;
  emptyDescription?: string;
  emptyTitle?: string;
  isLoading: boolean;
  loadingLabel?: string;
  rows: PositionRow[];
  title?: string;
};

export function LivePositionsTable({
  description = 'Currently open MT5 positions for the selected account',
  error,
  headerActions,
  emptyDescription = 'This MT5 account does not have any live positions right now.',
  emptyTitle = 'No open positions',
  isLoading,
  loadingLabel = 'Loading open positions...',
  rows,
  title = 'Live Positions',
}: LivePositionsTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {headerActions ? <div className="w-full sm:w-auto">{headerActions}</div> : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {loadingLabel}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <Activity className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Unable to load live positions</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{error}</p>
          </div>
        ) : rows.length > 0 ? (
          <AppDataTable<PositionRow>
            data={rows}
            columns={livePositionsColumns}
            pageCount={1}
            getRowId={(row) => row.rowId}
          />
        ) : (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <Activity className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">{emptyTitle}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{emptyDescription}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
