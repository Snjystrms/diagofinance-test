'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { SerialNumberCell } from '@/components/data-table/serial-number-cell';
import { cn } from '@/lib/utils';

import { formatTradeNumber, type TradeRow } from '../_lib/trade-history';

const getTypeClasses = (type: TradeRow['normalizedType']) =>
  type === 'deal'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-sky-200 bg-sky-50 text-sky-700';

const getProfitClasses = (profit: number | null) => {
  if (typeof profit === 'number' && profit > 0) return 'text-emerald-600';
  if (typeof profit === 'number' && profit < 0) return 'text-red-600';
  return 'text-muted-foreground';
};

export const tradeHistoryColumns: ColumnDef<TradeRow>[] = [
        {
        id: "sr_no",
        header: "Sr. No.",
        cell: ({ row, table }) => <SerialNumberCell row={row} table={table} />,
        enableSorting: false,
      },
  {
    id: 'type',
    header: 'Type',
    cell: ({ row }) => (
      <Badge variant="outline" className={cn('capitalize', getTypeClasses(row.original.normalizedType))}>
        {row.original.type || '-'}
      </Badge>
    ),
  },
{
    id: 'time',
    header: 'Time (IST)',
    accessorKey: 'time_ist',
    meta: { mobileHidden: true },
  },
  {
    id: 'symbol',
    header: 'Symbol',
    accessorKey: 'symbol',
    cell: ({ row }) => row.original.symbol || '-',
  },
{
    id: 'side',
    header: 'Side',
    accessorKey: 'side',
    meta: { mobileHidden: true },
    cell: ({ row }) => row.original.side || '-',
  },
{
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    meta: { mobileHidden: true },
    cell: ({ row }) => row.original.status || '-',
  },
{
    id: 'tickets',
    header: 'Deal / Order / Position',
    meta: { mobileHidden: true },
    cell: ({ row }) => (
      <div className="space-y-1 text-xs">
        <div>Deal: {row.original.deal ?? '-'}</div>
        <div>Order: {row.original.order ?? '-'}</div>
        <div>Position: {row.original.position ?? '-'}</div>
      </div>
    ),
  },
  {
    id: 'price',
    header: 'Price',
    cell: ({ row }) => formatTradeNumber(row.original.price, 5),
  },
  {
    id: 'volume',
    header: 'Volume/Lots',
    cell: ({ row }) => formatTradeNumber(row.original.volume, 2),
  },
  {
    id: 'profit',
    header: 'Profit',
    cell: ({ row }) => (
      <span className={cn('font-semibold', getProfitClasses(row.original.profit))}>
        {formatTradeNumber(row.original.profit, 2)}
      </span>
    ),
  },
{
    id: 'comment',
    header: 'Comment',
    accessorKey: 'comment',
    meta: { mobileHidden: true },
    cell: ({ row }) => row.original.comment || '-',
  },
  {
    id: 'mt5_ticket',
    header: 'MT5 Ticket',
    accessorKey: 'mt5_ticket',
    meta: { mobileHidden: true },
    cell: ({ row }) => row.original.mt5_ticket ?? '-',
  },
];


