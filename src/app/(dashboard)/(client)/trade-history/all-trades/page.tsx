'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarIcon,
  History,
  Loader2,
  RefreshCw,
  Search,
  WalletCards,
} from 'lucide-react';

import { AppDataTable } from '@/components/app-data-table';
import { ApiErrorState } from '@/components/errors/api-error-state';
import { ProtectedRoute } from '@/components/protected-route';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth-context';
import { formatDateTimeInIST } from '@/lib/formatters';
import {
  mt5SdkApi,
  userMT5AccountsApi,
  type Mt5SdkPosition,
  type Mt5SdkPositionsResponse,
  type Mt5SdkTradeHistoryResponse,
  type Mt5SdkTradeRecord,
  type UserMT5AccountListItem,
} from '@/lib/api';
import { cn } from '@/lib/utils';

type TradeRow = Mt5SdkTradeRecord & {
  rowId: string;
};

type HistoryView = 'trades' | 'balance';

const actionLabels: Record<number, string> = {
  0: 'Buy',
  1: 'Sell',
  2: 'Balance',
  3: 'Credit',
  4: 'Charge',
  5: 'Correction',
  6: 'Bonus',
  7: 'Commission',
  8: 'Agent',
  9: 'Interest',
  10: 'Buy Canceled',
  11: 'Sell Canceled',
  12: 'Dividend',
  13: 'Dividend Franked',
  14: 'Tax',
};

const entryLabels: Record<number, string> = {
  0: 'In',
  1: 'Out',
  2: 'In/Out',
  3: 'Out By',
};

const orderStateLabels: Record<number, string> = {
  0: 'Started',
  1: 'Placed',
  2: 'Canceled',
  3: 'Partial',
  4: 'Filled',
  5: 'Rejected',
  6: 'Expired',
  7: 'Request Add',
  8: 'Request Modify',
  9: 'Request Cancel',
};

const orderTypeLabels: Record<number, string> = {
  0: 'Buy',
  1: 'Sell',
  2: 'Buy Limit',
  3: 'Sell Limit',
  4: 'Buy Stop',
  5: 'Sell Stop',
  6: 'Buy Stop Limit',
  7: 'Sell Stop Limit',
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const formatNumber = (value?: number | string | null, maximumFractionDigits = 5) => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const numericValue = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return numericValue.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
};

const formatProfit = (value?: number | string | null) => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const numericValue = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  return numericValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatMt5Timestamp = (seconds?: number, milliseconds?: number) => {
  const timestamp = isFiniteNumber(milliseconds)
    ? milliseconds
    : isFiniteNumber(seconds)
      ? seconds * 1000
      : null;

  if (!timestamp) {
    return '-';
  }

  return formatDateTimeInIST(timestamp);
};

const getTradeTimestamp = (record: Mt5SdkTradeRecord) =>
  formatMt5Timestamp(
    record.Time ?? record.TimeDone ?? record.TimeSetup,
    record.TimeMsc ?? record.TimeDoneMsc ?? record.TimeSetupMsc
  );

const createDefaultFromDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
};

const createDefaultToDate = () => new Date();

const toIsoDateTime = (value: Date | undefined, boundary: 'start' | 'end') => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  date.setHours(boundary === 'start' ? 0 : 23, boundary === 'start' ? 0 : 59, boundary === 'start' ? 0 : 59, boundary === 'start' ? 0 : 999);

  return date.toISOString();
};

const formatSide = (record: Mt5SdkTradeRecord) => {
  if (record.record_type === 'order' && record.Type !== undefined) {
    return orderTypeLabels[record.Type] ?? `Type ${record.Type}`;
  }

  if (record.Action !== undefined) {
    return actionLabels[record.Action] ?? `Action ${record.Action}`;
  }

  return '-';
};

const formatStatus = (record: Mt5SdkTradeRecord) => {
  if (record.record_type === 'order') {
    return record.State !== undefined ? orderStateLabels[record.State] ?? `State ${record.State}` : '-';
  }

  return record.Entry !== undefined ? entryLabels[record.Entry] ?? `Entry ${record.Entry}` : '-';
};

const isTradeActivityRecord = (record: Mt5SdkTradeRecord) =>
  record.record_type === 'order' || record.Action === 0 || record.Action === 1;

const isBalanceActivityRecord = (record: Mt5SdkTradeRecord) =>
  record.record_type === 'deal' && !isTradeActivityRecord(record);

const getBalanceAmount = (record: Mt5SdkTradeRecord) => {
  for (const value of [record.Profit, record.ProfitRaw, record.Commission, record.Fee, record.Storage]) {
    if (isFiniteNumber(value)) {
      return value;
    }
  }

  return undefined;
};

const getTradeVolume = (record: Mt5SdkTradeRecord) => {
  if (record.volume !== undefined && record.volume !== null) {
    return record.volume;
  }

  if (record.Volume !== undefined && record.Volume !== null) {
    return record.Volume;
  }

  return undefined;
};

const getPositionVolume = (position: Mt5SdkPosition) => {
  if (position.volume !== undefined && position.volume !== null) {
    return position.volume;
  }

  if (position.Volume !== undefined && position.Volume !== null) {
    return position.Volume;
  }

  return undefined;
};

const recordBadgeClassName = (recordType: string) =>
  recordType === 'deal'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
    : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300';

const sideIcon = (label: string) => {
  const normalizedLabel = label.toLowerCase();
  if (normalizedLabel.includes('sell') || normalizedLabel.includes('out')) {
    return <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />;
  }

  if (normalizedLabel.includes('buy') || normalizedLabel.includes('in')) {
    return <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />;
  }

  return <WalletCards className="h-3.5 w-3.5 text-muted-foreground" />;
};

export default function AllTradesPage() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState<UserMT5AccountListItem[]>([]);
  const [login, setLogin] = useState('');
  const [fromDt, setFromDt] = useState<Date | undefined>(createDefaultFromDate);
  const [toDt, setToDt] = useState<Date | undefined>(createDefaultToDate);
  const [historyView, setHistoryView] = useState<HistoryView>('trades');
  const [positionsData, setPositionsData] = useState<Mt5SdkPositionsResponse | null>(null);
  const [historyData, setHistoryData] = useState<Mt5SdkTradeHistoryResponse | null>(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  useEffect(() => {
    let isActive = true;

    const fetchAccounts = async () => {
      if (!token) {
        setIsLoadingAccounts(false);
        return;
      }

      try {
        setIsLoadingAccounts(true);
        const response = await userMT5AccountsApi.list(token);
        const mt5Accounts = response.data?.mt5_accounts ?? [];

        if (!isActive) {
          return;
        }

        setAccounts(mt5Accounts);
        setLogin((currentLogin) => currentLogin || mt5Accounts[0]?.mt5_id || '');
      } catch (fetchError) {
        console.error('Failed to load MT5 accounts:', fetchError);
        if (isActive) {
          setError('We could not load your linked MT5 accounts. You can still enter an MT5 login manually.');
        }
      } finally {
        if (isActive) {
          setIsLoadingAccounts(false);
        }
      }
    };

    fetchAccounts();

    return () => {
      isActive = false;
    };
  }, [token]);

  const fetchTradeData = useCallback(async () => {
    const normalizedLogin = login.trim();
    if (!normalizedLogin) {
      setError('Enter an MT5 login to load trade history');
      return;
    }

    try {
      setIsLoadingTrades(true);
      setError(null);

      const [positionsResponse, historyResponse] = await Promise.all([
        mt5SdkApi.getPositions(normalizedLogin, token),
        mt5SdkApi.getTradeHistory(
          {
            login: normalizedLogin,
            from_dt: toIsoDateTime(fromDt, 'start'),
            to_dt: toIsoDateTime(toDt, 'end'),
          },
          token
        ),
      ]);

      setPositionsData(positionsResponse);
      setHistoryData(historyResponse);
    } catch (fetchError) {
      console.error('Failed to load trade history:', fetchError);
      setError(fetchError);
      setPositionsData(null);
      setHistoryData(null);
    } finally {
      setIsLoadingTrades(false);
    }
  }, [fromDt, login, toDt, token]);

  useEffect(() => {
    if (!isLoadingAccounts && login) {
      fetchTradeData();
    }
  }, [fetchTradeData, isLoadingAccounts, login]);

  const tradeRows = useMemo<TradeRow[]>(
    () =>
      (historyData?.items ?? []).map((record, index) => ({
        ...record,
        rowId: `${record.record_type}-${record.Deal ?? record.Order ?? record.PositionID ?? index}`,
      })),
    [historyData]
  );
  const tradeActivityRows = useMemo(
    () => tradeRows.filter(isTradeActivityRecord),
    [tradeRows]
  );
  const balanceRows = useMemo(
    () => tradeRows.filter(isBalanceActivityRecord),
    [tradeRows]
  );

  const openPositions = positionsData?.items ?? [];
  const tradeDealCount = tradeActivityRows.filter((record) => record.record_type === 'deal').length;
  const orderCount = tradeActivityRows.filter((record) => record.record_type === 'order').length;
  const floatingProfit = openPositions.reduce((total, position) => total + (position.Profit ?? 0), 0);
  const realizedProfit = tradeActivityRows.reduce((total, record) => total + (record.Profit ?? 0), 0);
  const balanceNet = balanceRows.reduce((total, record) => total + (getBalanceAmount(record) ?? 0), 0);

  const tradeColumns = useMemo<ColumnDef<TradeRow>[]>(
    () => [
      {
        id: 'record_type',
        header: 'Type',
        accessorKey: 'record_type',
        cell: ({ row }) => (
          <Badge variant="outline" className={cn('capitalize', recordBadgeClassName(row.original.record_type))}>
            {row.original.record_type}
          </Badge>
        ),
      },
      {
        id: 'time',
        header: 'Time',
        cell: ({ row }) => (
          <div className="flex min-w-44 items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>{getTradeTimestamp(row.original)}</span>
          </div>
        ),
      },
      {
        id: 'symbol',
        header: 'Symbol',
        accessorKey: 'Symbol',
        cell: ({ row }) => (
          <span className="font-medium">{row.original.Symbol || '-'}</span>
        ),
      },
      {
        id: 'side',
        header: 'Side',
        cell: ({ row }) => {
          const label = formatSide(row.original);
          return (
            <div className="flex items-center gap-2">
              {sideIcon(label)}
              <span>{label}</span>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => formatStatus(row.original),
      },
      {
        id: 'ticket',
        header: 'Deal / Order',
        cell: ({ row }) => (
          <div className="space-y-1 text-xs">
            <div>Deal: {row.original.Deal ?? '-'}</div>
            <div>Order: {row.original.Order ?? '-'}</div>
          </div>
        ),
      },
      {
        id: 'position',
        header: 'Position',
        accessorKey: 'PositionID',
        cell: ({ row }) => row.original.PositionID ?? '-',
      },
      {
        id: 'price',
        header: 'Price',
        cell: ({ row }) => formatNumber(row.original.Price ?? row.original.PriceCurrent ?? row.original.PricePosition),
      },
      {
        id: 'volume',
        header: 'Volume',
        cell: ({ row }) => formatNumber(getTradeVolume(row.original), 2),
      },
      {
        id: 'profit',
        header: 'Profit',
        cell: ({ row }) => {
          const profit = row.original.Profit ?? 0;
          return (
            <span className={cn('font-semibold', profit > 0 ? 'text-emerald-600' : profit < 0 ? 'text-red-600' : 'text-muted-foreground')}>
              {formatProfit(row.original.Profit)}
            </span>
          );
        },
      },
      {
        id: 'comment',
        header: 'Comment',
        accessorKey: 'Comment',
        cell: ({ row }) => (
          <span className="block max-w-52 truncate text-muted-foreground">
            {row.original.Comment || '-'}
          </span>
        ),
      },
    ],
    []
  );

  const balanceColumns = useMemo<ColumnDef<TradeRow>[]>(
    () => [
      {
        id: 'time',
        header: 'Time',
        cell: ({ row }) => (
          <div className="flex min-w-44 items-center gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>{getTradeTimestamp(row.original)}</span>
          </div>
        ),
      },
      {
        id: 'activity',
        header: 'Activity',
        cell: ({ row }) => {
          const label = formatSide(row.original);
          return (
            <div className="flex items-center gap-2">
              {sideIcon(label)}
              <span>{label}</span>
            </div>
          );
        },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => formatStatus(row.original),
      },
      {
        id: 'ticket',
        header: 'Deal / Order',
        cell: ({ row }) => (
          <div className="space-y-1 text-xs">
            <div>Deal: {row.original.Deal ?? '-'}</div>
            <div>Order: {row.original.Order ?? '-'}</div>
          </div>
        ),
      },
      {
        id: 'amount',
        header: 'Amount',
        cell: ({ row }) => {
          const amount = getBalanceAmount(row.original) ?? 0;
          return (
            <span
              className={cn(
                'font-semibold',
                amount > 0 ? 'text-emerald-600' : amount < 0 ? 'text-red-600' : 'text-muted-foreground'
              )}
            >
              {formatProfit(getBalanceAmount(row.original))}
            </span>
          );
        },
      },
      {
        id: 'comment',
        header: 'Comment',
        accessorKey: 'Comment',
        cell: ({ row }) => (
          <span className="block max-w-80 truncate text-muted-foreground">
            {row.original.Comment || '-'}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-foreground">All Trades</h1>
              <p className="max-w-2xl text-base text-muted-foreground">
                Review open MT5 positions and historical deal/order records for a selected trading login.
              </p>
            </div>
            <Button variant="outline" onClick={fetchTradeData} disabled={isLoadingTrades || !login.trim()}>
              <RefreshCw className={cn('mr-2 h-4 w-4', isLoadingTrades && 'animate-spin')} />
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5" />
                Filters
              </CardTitle>
              <CardDescription>
                Choose a trading account and date range to review open positions and past activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {accounts.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="linked-mt5-login">Linked Account</Label>
                    <Select value={login} onValueChange={setLogin} disabled={isLoadingAccounts || isLoadingTrades}>
                      <SelectTrigger id="linked-mt5-login" className="w-full">
                        <SelectValue placeholder="Select MT5 login" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.mt5_id}>
                            {account.mt5_id} - {account.account_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="mt5-login">MT5 Login</Label>
                  {accounts.length > 0 ? (
                    <Input
                      id="mt5-login"
                      inputMode="numeric"
                      value={login}
                      onChange={(event) => setLogin(event.target.value)}
                      placeholder="Enter login, e.g. 111096"
                      disabled={isLoadingTrades}
                    />
                  ) : (
                    <Input
                      id="mt5-login"
                      inputMode="numeric"
                      value={login}
                      onChange={(event) => setLogin(event.target.value)}
                      placeholder={isLoadingAccounts ? 'Loading accounts...' : 'Enter login, e.g. 111096'}
                      disabled={isLoadingTrades}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>From Date</Label>
                  <DatePickerButton
                    date={fromDt}
                    onSelect={setFromDt}
                    placeholder="Select start date"
                    disabled={isLoadingTrades}
                  />
                </div>

                <div className="space-y-2">
                  <Label>To Date</Label>
                  <DatePickerButton
                    date={toDt}
                    onSelect={setToDt}
                    placeholder="Select end date"
                    disabled={isLoadingTrades}
                  />
                </div>

                <div className="flex items-end">
                  <Button className="w-full" onClick={fetchTradeData} disabled={isLoadingTrades || !login.trim()}>
                    {isLoadingTrades ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <History className="mr-2 h-4 w-4" />
                    )}
                    Load Trades
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {error ? (
            <ApiErrorState
              error={typeof error === 'string' ? undefined : error}
              message={typeof error === 'string' ? error : undefined}
              audience="client"
              resource="trade history"
              action="load"
            />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard title="Open Positions" value={openPositions.length} />
            <MetricCard
              title="Trade Records"
              value={tradeActivityRows.length}
              description={`${tradeDealCount} deals, ${orderCount} orders`}
            />
            <MetricCard
              title="Balance Records"
              value={balanceRows.length}
              description={balanceRows.length > 0 ? `Net ${formatProfit(balanceNet)}` : 'No balance activity'}
              tone={balanceNet > 0 ? 'positive' : balanceNet < 0 ? 'negative' : 'neutral'}
            />
            <MetricCard title="Floating P/L" value={formatProfit(floatingProfit)} tone={floatingProfit >= 0 ? 'positive' : 'negative'} />
            <MetricCard title="Trade P/L" value={formatProfit(realizedProfit)} tone={realizedProfit >= 0 ? 'positive' : 'negative'} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Open Positions</CardTitle>
              <CardDescription>
                {positionsData ? `Login ${positionsData.login} has ${positionsData.count} open position${positionsData.count === 1 ? '' : 's'}.` : 'Current MT5 positions will appear here after loading.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTrades ? (
                <LoadingRows />
              ) : openPositions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>Open Price</TableHead>
                      <TableHead>Current Price</TableHead>
                      <TableHead>SL / TP</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openPositions.map((position) => (
                      <TableRow key={position.Position}>
                        <TableCell className="font-medium">{position.Position}</TableCell>
                        <TableCell>{position.Symbol}</TableCell>
                        <TableCell>{position.Action !== undefined ? actionLabels[position.Action] ?? `Action ${position.Action}` : '-'}</TableCell>
                        <TableCell>{formatNumber(getPositionVolume(position), 2)}</TableCell>
                        <TableCell>{formatNumber(position.PriceOpen)}</TableCell>
                        <TableCell>{formatNumber(position.PriceCurrent)}</TableCell>
                        <TableCell>{formatNumber(position.PriceSL)} / {formatNumber(position.PriceTP)}</TableCell>
                        <TableCell>
                          <span className={cn('font-semibold', (position.Profit ?? 0) > 0 ? 'text-emerald-600' : (position.Profit ?? 0) < 0 ? 'text-red-600' : 'text-muted-foreground')}>
                            {formatProfit(position.Profit)}
                          </span>
                        </TableCell>
                        <TableCell>{formatMt5Timestamp(position.TimeCreate, position.TimeCreateMsc)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title="No open positions" description="This login currently has no open MT5 positions." />
              )}
            </CardContent>
          </Card>

          <Tabs
            value={historyView}
            onValueChange={(value) => setHistoryView(value as HistoryView)}
            className="space-y-0"
          >
            <Card>
              <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <CardTitle>History</CardTitle>
                  <CardDescription>
                    {historyData
                      ? `Showing ${historyData.count} records for login ${historyData.login}. Orders and buy/sell deals stay in Trades, while balance-style entries are separated under Balance Activity.`
                      : 'Switch between trade activity and balance activity returned by the MT5 history API.'}
                  </CardDescription>
                </div>
                <TabsList>
                  <TabsTrigger value="trades">Trades</TabsTrigger>
                  <TabsTrigger value="balance">Balance Activity</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                <TabsContent value="trades" className="mt-0">
                  {isLoadingTrades ? (
                    <LoadingRows />
                  ) : tradeActivityRows.length > 0 ? (
                    <AppDataTable<TradeRow>
                      data={tradeActivityRows}
                      columns={tradeColumns}
                      getRowId={(row) => row.rowId}
                    />
                  ) : (
                    <EmptyState
                      title="No trade activity"
                      description="Only buy/sell deals and order records appear here. Adjust the date filters to load trade activity."
                    />
                  )}
                </TabsContent>

                <TabsContent value="balance" className="mt-0">
                  {isLoadingTrades ? (
                    <LoadingRows />
                  ) : balanceRows.length > 0 ? (
                    <AppDataTable<TradeRow>
                      data={balanceRows}
                      columns={balanceColumns}
                      getRowId={(row) => row.rowId}
                    />
                  ) : (
                    <EmptyState
                      title="No balance activity"
                      description="Balance, credit, commission, and other non-trade deal entries will appear here when available."
                    />
                  )}
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function DatePickerButton({
  date,
  onSelect,
  placeholder,
  disabled,
}: {
  date?: Date;
  onSelect: (date: Date | undefined) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-9 w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'MMM dd, yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            onSelect(selectedDate);
            setOpen(false);
          }}
          captionLayout="dropdown"
          initialFocus
        />
        {date && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onSelect(undefined);
                setOpen(false);
              }}
            >
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function MetricCard({
  title,
  value,
  description,
  tone = 'neutral',
}: {
  title: string;
  value: string | number;
  description?: string;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div
          className={cn(
            'mt-2 text-2xl font-semibold',
            tone === 'positive' && 'text-emerald-600',
            tone === 'negative' && 'text-red-600'
          )}
        >
          {value}
        </div>
        {description && <div className="mt-1 text-xs text-muted-foreground">{description}</div>}
      </CardContent>
    </Card>
  );
}

function LoadingRows() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      Loading trade data...
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed py-12 text-center">
      <History className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
