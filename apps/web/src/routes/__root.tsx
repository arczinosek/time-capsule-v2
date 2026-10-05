import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { AppNav } from '~/components/app-nav';
import { LanguageSwitcher } from '~/components/language-switcher';

// Loaders receive { queryClient } through context (see createAppRouter).
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
});

function RootLayout() {
  const { t } = useTranslation();
  return (
    <div className="min-h-svh">
      {/* Focuses <main> directly: a hash change would be a router navigation (and a refetch). */}
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-card focus:px-3 focus:py-2 focus:text-primary focus:shadow-parchment"
      >
        {t('nav.skipToContent')}
      </a>
      {/* No transform or filter on the header: either would break the nav's position: fixed. */}
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-x-6 gap-y-2 px-4 pt-4 pb-2">
        <Link
          to="/milestones"
          className="font-heading text-xl tracking-wider text-primary md:text-2xl"
        >
          {t('app.name')}
        </Link>
        <div className="flex items-center gap-4">
          <AppNav />
          <LanguageSwitcher />
        </div>
      </header>
      <hr className="chronicle-divider mx-auto mt-0 max-w-5xl" />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto max-w-5xl px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] outline-none md:pb-12"
      >
        <Outlet />
      </main>
    </div>
  );
}
