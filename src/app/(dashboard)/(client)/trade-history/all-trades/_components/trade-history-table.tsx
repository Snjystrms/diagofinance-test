'use client';

import { History, Loader2 } from 'lucide-react';

import { AppDataTable } from '@/components/app-data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import type { TradeRow } from '../_lib/trade-history';
import { tradeHistoryColumns } from './trade-history-columns';

type TradeHistoryTableProps = {
  isLoading: boolean;
  rows: TradeRow[];
  total: number;
  totalPages: number;
};

export function TradeHistoryTable({
  isLoading,
  rows,
  total,
  totalPages,
}: TradeHistoryTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>
          Showing {rows.length} of {total} records
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading trade data...
          </div>
        ) : rows.length > 0 ? (
          <AppDataTable<TradeRow>
            data={rows}
            columns={tradeHistoryColumns}
            pageCount={Math.max(1, totalPages)}
            getRowId={(row) => row.rowId}
          />
        ) : (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <History className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No trade records</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              No data for this login/date range.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
