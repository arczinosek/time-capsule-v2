import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import type { AppRouter } from './router';

// Everything main.tsx renders, shared with src/test/render-route.tsx so tests run the real app.
export function AppProviders({
  queryClient,
  router,
}: {
  queryClient: QueryClient;
  router: AppRouter;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
