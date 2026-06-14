'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';

/** Client providers: TanStack Query cache + Sonner toasts (calm, on-brand). */
export const Providers = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--color-paper)',
            color: 'var(--color-ink)',
            border: '0.5px solid var(--color-line)',
          },
        }}
      />
    </QueryClientProvider>
  );
};
