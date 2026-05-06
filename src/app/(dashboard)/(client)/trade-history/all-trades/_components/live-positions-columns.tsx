'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { formatTradeNumber, type PositionRow } from '../_lib/trade-history';

const getSideClasses = (side: PositionRow['side']) =>
  side === 'buy'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : side === 'sell'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-slate-200 bg-slate-50 text-slate-700';

const getProfitClasses = (profit: number | null) => {
  if (typeof profit === 'number' && profit > 0) return 'text-emerald-600';
  if (typeof profit === 'number' && profit < 0) return 'text-red-600';
  return 'text-muted-foreground';
};

export const livePositionsColumns: ColumnDef<PositionRow>[] = [
  {
    id: 'side',
    header: 'Side',
    cell: ({ row }) => (
      <Badge variant="outline" className={cn('capitalize', getSideClasses(row.original.side))}>
        {row.original.side}
      </Badge>
    ),
  },
  {
    id: 'time',
    header: 'Opened (IST)',
    accessorKey: 'time_ist',
  },
  {
    id: 'symbol',
    header: 'Symbol',
    accessorKey: 'symbol',
  },
  {
    id: 'position',
    header: 'Position',
    accessorKey: 'position',
  },
  {
    id: 'price_open',
    header: 'Open Price',
    cell: ({ row }) => formatTradeNumber(row.original.price_open, 5),
  },
  {
    id: 'price_current',
    header: 'Current Price',
    cell: ({ row }) => formatTradeNumber(row.original.price_current, 5),
  },
  {
    id: 'volume',
    header: 'Volume',
    cell: ({ row }) => formatTradeNumber(row.original.volume, 2),
  },
  {
    id: 'profit',
    header: 'Floating P/L',
    cell: ({ row }) => (
      <span className={cn('font-semibold', getProfitClasses(row.original.profit))}>
        {formatTradeNumber(row.original.profit, 2)}
      </span>
    ),
  },
  {
    id: 'sl_tp',
    header: 'SL / TP',
    cell: ({ row }) => (
      <div className="space-y-1 text-xs">
        <div>SL: {formatTradeNumber(row.original.price_sl, 5)}</div>
        <div>TP: {formatTradeNumber(row.original.price_tp, 5)}</div>
      </div>
    ),
  },
  {
    id: 'comment',
    header: 'Comment',
    accessorKey: 'comment',
    cell: ({ row }) => row.original.comment || '-',
  },
];
