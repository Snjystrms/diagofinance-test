'use client';

import { ApiRequestError } from '@/lib/api-core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: (failureCount, error) => {
              if (error instanceof ApiRequestError && error.status === 401) return false;
              return failureCount < 1;
            },
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: (failureCount, error) => {
              if (error instanceof ApiRequestError && error.status === 401) return false;
              return failureCount < 1;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <DevtoolsLoader />
      )}
    </QueryClientProvider>
  );
}

function DevtoolsLoader() {
  const [Devtools, setDevtools] = useState<React.ComponentType<{ initialIsOpen?: boolean }> | null>(null);

  useEffect(() => {
    import('@tanstack/react-query-devtools').then((m) => {
      setDevtools(() => m.ReactQueryDevtools);
    });
  }, []);

  return Devtools ? <Devtools initialIsOpen={false} /> : null;
}
