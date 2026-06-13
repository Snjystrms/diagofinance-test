'use client';

import { useQuery } from '@tanstack/react-query';

import { accountTypesApi, type AccountType } from '@/lib/api';

type UseActiveAccountTypesOptions = {
  token?: string | null;
  enabled?: boolean;
};

export function useActiveAccountTypes({
  token,
  enabled = true,
}: UseActiveAccountTypesOptions) {
  return useQuery<AccountType[], Error>({
    queryKey: ['activeAccountTypes', token],
    queryFn: async () => {
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await accountTypesApi.getActive(token);

      if (!response.success) {
        throw new Error(response.message || 'Unable to load account types');
      }

      return response.data?.accountTypes ?? [];
    },
    enabled: Boolean(token) && enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
