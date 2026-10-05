import { Link, useRouterState, type LinkProps } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { EngravedIcon } from '~/components/icons/engraved-icon';
import {
  IconChronicle,
  IconFamily,
  IconPlaces,
} from '~/components/icons/nav-icons';

type NavItem = {
  to: LinkProps['to'];
  label: 'nav.chronicle' | 'nav.familyMembers' | 'nav.places';
  icon: EngravedIcon;
  /** Other sections that belong under this item (Link marks only its own path active). */
  alsoActiveOn?: string[];
};

// The top-level sections. Keep it to three or four, so the bottom bar fits 360 px.
const items: NavItem[] = [
  { to: '/milestones', label: 'nav.chronicle', icon: IconChronicle },
  { to: '/family-members', label: 'nav.familyMembers', icon: IconFamily },
  {
    to: '/places',
    label: 'nav.places',
    icon: IconPlaces,
    alsoActiveOn: ['/locations'],
  },
];

const isWithin = (pathname: string, section: string) =>
  pathname === section || pathname.startsWith(`${section}/`);

/**
 * The one main navigation: a bar fixed to the bottom on phones (above the home indicator),
 * inline in the header from md up. A single DOM node for both, so nothing is duplicated.
 * The current item gets aria-current="page" (from Link, or explicitly for `alsoActiveOn`).
 */
export function AppNav() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-brass bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_var(--parchment-shadow)] md:static md:z-auto md:border-0 md:bg-transparent md:pb-0 md:shadow-none"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3 md:flex md:max-w-none md:gap-1">
        {items.map(({ to, label, icon: Icon, alsoActiveOn }) => (
          <li key={label}>
            <Link
              to={to}
              aria-current={
                alsoActiveOn?.some((section) => isWithin(pathname, section))
                  ? 'page'
                  : undefined
              }
              className="relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-2 font-heading text-sm tracking-wide text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-primary aria-[current=page]:before:absolute aria-[current=page]:before:inset-x-4 aria-[current=page]:before:top-0 aria-[current=page]:before:h-0.5 aria-[current=page]:before:bg-primary md:min-h-10 md:flex-row md:gap-2 md:px-3 md:text-base md:aria-[current=page]:before:top-auto md:aria-[current=page]:before:bottom-0"
            >
              <Icon className="size-6 md:size-5" />
              {t(label)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
