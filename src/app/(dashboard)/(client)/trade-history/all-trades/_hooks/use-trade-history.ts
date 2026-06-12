'use client';

import { useCallback, useEffect, useState } from 'react';
import { parseAsInteger, useQueryState } from 'nuqs';

import {
  mt5SdkApi,
  userMT5AccountsApi,
  type UserMT5AccountListItem,
} from '@/lib/api-trading-ib';

import {
  createDefaultFromDate,
  createDefaultToDate,
  mapPositionRows,
  mapTradeRows,
  toIsoDateTime,
  type PositionRow,
  type TradeRow,
} from '../_lib/trade-history';

export const useTradeHistory = (token: string | null | undefined) => {
  const [accounts, setAccounts] = useState<UserMT5AccountListItem[]>([]);
  const [login, setLogin] = useState<string>('');
  const [fromDt, setFromDt] = useState<Date | undefined>(createDefaultFromDate);
  const [toDt, setToDt] = useState<Date | undefined>(createDefaultToDate);
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [rows, setRows] = useState<TradeRow[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState('perPage', parseAsInteger.withDefault(10));

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

        if (!isActive) return;

        setAccounts(mt5Accounts);
        const firstMt5Id = mt5Accounts[0]?.mt5_id;
        setLogin((current) => current || (firstMt5Id != null ? String(firstMt5Id) : ''));
      } catch {
        if (isActive) {
          setError('Failed to load MT5 accounts');
        }
      } finally {
        if (isActive) {
          setIsLoadingAccounts(false);
        }
      }
    };

    void fetchAccounts();

    return () => {
      isActive = false;
    };
  }, [token]);

  const refreshTrades = useCallback(async () => {
    const normalizedLogin = login.trim();
    if (!token || !normalizedLogin) return;

    try {
      setIsLoadingTrades(true);
      setError(null);

      const response = await userMT5AccountsApi.getTradesHistory(
        {
          login: normalizedLogin,
          from_dt: toIsoDateTime(fromDt, 'start'),
          to_dt: toIsoDateTime(toDt, 'end'),
          page,
          per_page: perPage,
        },
        token
      );

      const items = response.data?.items ?? [];
      const pagination = response.data?.pagination;
      const mappedRows = mapTradeRows(items);

      setRows(mappedRows);
      setTotalPages(pagination?.last_page ?? 1);
      setTotal(pagination?.total ?? mappedRows.length);
    } catch (fetchError) {
      setError(fetchError);
      setRows([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setIsLoadingTrades(false);
    }
  }, [fromDt, login, page, perPage, toDt, token]);

  const refreshPositions = useCallback(async () => {
    const normalizedLogin = login.trim();
    if (!token || !normalizedLogin) return;

    try {
      setIsLoadingPositions(true);
      setPositionsError(null);

      const response = await mt5SdkApi.getPositions(normalizedLogin, token);
      setPositions(mapPositionRows(response.items ?? []));
    } catch (fetchError) {
      setPositions([]);
      setPositionsError(fetchError instanceof Error ? fetchError.message : 'Failed to load live positions');
    } finally {
      setIsLoadingPositions(false);
    }
  }, [login, token]);

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([refreshTrades(), refreshPositions()]);
  }, [refreshPositions, refreshTrades]);

  useEffect(() => {
    if (!isLoadingAccounts && login) {
      void refreshTrades();
    }
  }, [isLoadingAccounts, login, refreshTrades]);

  useEffect(() => {
    if (!isLoadingAccounts && login) {
      void refreshPositions();
    }
  }, [isLoadingAccounts, login, refreshPositions]);

  const handlePerPageChange = (value: number) => {
    void setPerPage(value);
    void setPage(1);
  };

  return {
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
    refreshTrades,
    rows,
    setFromDt,
    setLogin,
    setToDt,
    toDt,
    total,
    totalPages,
    handlePerPageChange,
  };
};
