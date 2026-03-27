'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 1,
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
  const [Devtools, setDevtools] = useState<React.ComponentType | null>(null);

  useState(() => {
    import('@tanstack/react-query-devtools').then((m) => {
      setDevtools(() => () => <m.ReactQueryDevtools initialIsOpen={false} />);
    });
  });

  return Devtools ? <Devtools /> : null;
}