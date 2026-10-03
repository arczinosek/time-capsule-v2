import type { QueryClient } from '@tanstack/react-query';
import { createRouter, type RouterHistory } from '@tanstack/react-router';
import { NotFound, RouteError, RoutePending } from '~/components/route-states';
import { routeTree } from './routeTree.gen';

// One factory for the app (browser history) and for tests (memory history).
export function createAppRouter({
  queryClient,
  history,
}: {
  queryClient: QueryClient;
  history?: RouterHistory;
}) {
  return createRouter({
    routeTree,
    history,
    context: { queryClient },
    defaultPendingComponent: RoutePending,
    defaultErrorComponent: RouteError,
    // Unknown URLs, and ids rejected by a route's params.parse.
    defaultNotFoundComponent: () => <NotFound message="Page not found." />,
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;

declare module '@tanstack/react-router' {
  interface Register {
    router: AppRouter;
  }
}
