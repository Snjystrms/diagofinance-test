'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { SerialNumberCell } from '@/components/data-table/serial-number-cell';
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

// Convert time to IST by adding 4:30 hours
const convertToIST = (timeString: string | null | undefined) => {
  if (!timeString) return '-';
  
  try {
    // Parse the incoming time string
    const date = new Date(timeString);
    
    // Add 4 hours and 30 minutes (270 minutes = 16200000 milliseconds)
    date.setTime(date.getTime() + (4.5 * 60 * 60 * 1000));
    
    // Format the date as a readable string
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch (error) {
    console.error('Error converting time to IST:', error);
    return timeString;
  }
};

export const livePositionsColumns: ColumnDef<PositionRow>[] = [
  {
    id: "sr_no",
    header: "Sr. No.",
    cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
    enableSorting: false,
  },
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
    meta: { mobileHidden: true },
    cell: ({ row }) => convertToIST(row.original.time_ist),
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
    meta: { mobileHidden: true },
  },
{
    id: 'price_open',
    header: 'Open Price',
    meta: { mobileHidden: true },
    cell: ({ row }) => formatTradeNumber(row.original.price_open, 5),
  },
  {
    id: 'price_current',
    header: 'Current Price',
    meta: { mobileHidden: true },
    cell: ({ row }) => formatTradeNumber(row.original.price_current, 5),
  },
  {
    id: 'volume',
    header: 'Volume/Lots',
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
    meta: { mobileHidden: true },
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
    meta: { mobileHidden: true },
    cell: ({ row }) => row.original.comment || '-',
  },
];


