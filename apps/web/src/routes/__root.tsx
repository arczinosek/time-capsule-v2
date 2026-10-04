import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '~/components/language-switcher';

// Loaders receive { queryClient } through context (see createAppRouter).
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
});

function RootLayout() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto min-h-svh max-w-3xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link to="/milestones" className="text-2xl font-semibold tracking-tight">
          {t('app.name')}
        </Link>
        <LanguageSwitcher />
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
