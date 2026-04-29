'use client';

import { useCallback, useEffect, useState } from 'react';
import { parseAsInteger, useQueryState } from 'nuqs';

import {
  userMT5AccountsApi,
  type UserMT5AccountListItem,
} from '@/lib/api';

import {
  createDefaultFromDate,
  createDefaultToDate,
  mapTradeRows,
  toIsoDateTime,
  type TradeRow,
} from '../_lib/trade-history';

export const useTradeHistory = (token: string | null | undefined) => {
  const [accounts, setAccounts] = useState<UserMT5AccountListItem[]>([]);
  const [login, setLogin] = useState('');
  const [fromDt, setFromDt] = useState<Date | undefined>(createDefaultFromDate);
  const [toDt, setToDt] = useState<Date | undefined>(createDefaultToDate);
  const [rows, setRows] = useState<TradeRow[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
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
        setLogin((current) => current || mt5Accounts[0]?.mt5_id || '');
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

  useEffect(() => {
    if (!isLoadingAccounts && login) {
      void refreshTrades();
    }
  }, [isLoadingAccounts, login, refreshTrades]);

  const handlePerPageChange = (value: number) => {
    void setPerPage(value);
    void setPage(1);
  };

  return {
    accounts,
    error,
    fromDt,
    isLoadingAccounts,
    isLoadingTrades,
    login,
    perPage,
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
