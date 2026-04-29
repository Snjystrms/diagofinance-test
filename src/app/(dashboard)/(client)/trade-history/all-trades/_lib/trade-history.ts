import type { UserMT5TradesHistoryItem } from '@/lib/api';

export const createDefaultFromDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 2);
  return date;
};

export const createDefaultToDate = () => new Date();

export const toIsoDateTime = (value: Date | undefined, boundary: 'start' | 'end') => {
  if (!value) return undefined;

  const date = new Date(value);
  date.setHours(
    boundary === 'start' ? 0 : 23,
    boundary === 'start' ? 0 : 59,
    boundary === 'start' ? 0 : 59,
    boundary === 'start' ? 0 : 999
  );

  return date.toISOString();
};

export const formatTradeNumber = (value?: number | null, max = 8) => {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: max });
};

export type TradeRow = UserMT5TradesHistoryItem & {
  rowId: string;
  normalizedType: 'order' | 'deal' | 'other';
};

export const mapTradeRows = (items: UserMT5TradesHistoryItem[]): TradeRow[] =>
  items.map((item, index) => {
    const type = String(item.type || '').toLowerCase();

    return {
      ...item,
      rowId: `${item.mt5_ticket ?? item.order ?? item.deal ?? index}-${index}`,
      normalizedType: type === 'order' ? 'order' : type === 'deal' ? 'deal' : 'other',
    };
  });
