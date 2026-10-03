import { QueryClient } from '@tanstack/react-query';
import { createMemoryHistory } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProviders } from '~/app-providers';
import { createAppRouter } from '~/router';

/**
 * Renders the real app (route tree, loaders, providers) at `path` with a fresh cache.
 * Route components load lazily, so query with findBy* / waitFor.
 */
export function renderRoute(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const router = createAppRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  const user = userEvent.setup();
  const view = render(
    <AppProviders queryClient={queryClient} router={router} />,
  );
  return { ...view, user, router, queryClient };
}
