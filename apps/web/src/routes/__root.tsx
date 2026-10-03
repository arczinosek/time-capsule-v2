import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';

// Loaders receive { queryClient } through context (see createAppRouter).
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="mx-auto min-h-svh max-w-3xl px-4 py-8">
      <header className="mb-8">
        <Link to="/milestones" className="text-2xl font-semibold tracking-tight">
          Time Capsule
        </Link>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
