import type { Mt5SdkPosition, UserMT5TradesHistoryItem } from '@/lib/api-trading-ib';

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

const formatUnixToIst = (value?: number) => {
  if (!value) return '-';

  // Convert Unix timestamp (seconds) to milliseconds
  const timestampMs = value * 1000;
  
  // Add 4.5 hours (4 hours 30 minutes) to get IST from the API's timezone
  // 4.5 hours = 4.5 * 60 * 60 * 1000 milliseconds
  const adjustedTimestamp = timestampMs + (4.5 * 60 * 60 * 1000);

  // Format without timezone conversion (use UTC as base, since we already adjusted)
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(adjustedTimestamp));
};

const getPositionSide = (action?: number) => {
  if (action === 0) return 'buy';
  if (action === 1) return 'sell';
  return 'open';
};

const getPositionVolume = (item: Mt5SdkPosition) => {
  if (typeof item.volume === 'number') return item.volume;
  if (typeof item.Volume === 'number') return item.Volume;
  return null;
};

export type TradeRow = UserMT5TradesHistoryItem & {
  rowId: string;
  normalizedType: 'order' | 'deal' | 'other';
};

export type PositionRow = {
  rowId: string;
  login: number;
  position: number;
  symbol: string;
  side: string;
  time_ist: string;
  price_open: number | null;
  price_current: number | null;
  price_sl: number | null;
  price_tp: number | null;
  volume: number | null;
  profit: number | null;
  comment: string | null;
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

export const mapPositionRows = (items: Mt5SdkPosition[]): PositionRow[] =>
  items.map((item, index) => ({
    rowId: `${item.Position}-${index}`,
    login: item.Login,
    position: item.Position,
    symbol: item.Symbol || '-',
    side: getPositionSide(item.Action),
    time_ist: formatUnixToIst(item.TimeCreate ?? item.TimeUpdate),
    price_open: item.PriceOpen ?? null,
    price_current: item.PriceCurrent ?? null,
    price_sl: item.PriceSL ?? null,
    price_tp: item.PriceTP ?? null,
    volume: getPositionVolume(item),
    profit: item.Profit ?? null,
    comment: item.Comment ?? null,
  }));
