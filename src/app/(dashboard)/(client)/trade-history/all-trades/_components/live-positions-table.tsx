'use client';

import { Activity, Loader2 } from 'lucide-react';

import { AppDataTable } from '@/components/app-data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import type { PositionRow } from '../_lib/trade-history';
import { livePositionsColumns } from './live-positions-columns';

type LivePositionsTableProps = {
  error?: string | null;
  isLoading: boolean;
  rows: PositionRow[];
};

export function LivePositionsTable({ error, isLoading, rows }: LivePositionsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Positions</CardTitle>
        <CardDescription>Currently open MT5 positions for the selected account</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading open positions...
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
            <h3 className="text-lg font-semibold">No open positions</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              This MT5 account does not have any live positions right now.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
