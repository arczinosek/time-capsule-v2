import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { IconCompass } from '~/components/icons/action-icons';
import { IconPlaces } from '~/components/icons/nav-icons';

const linkClass =
  'inline-flex min-h-10 items-center gap-1.5 border-b-2 border-transparent px-3 font-heading text-sm tracking-wide text-muted-foreground hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:text-primary';

/** Places | Locations, on top of both lists (the main navigation's "Places" covers both). */
export function PlacesSubnav() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('places.subnav')} className="border-b border-brass">
      <ul className="flex gap-1">
        <li>
          <Link to="/places" className={linkClass}>
            <IconPlaces className="size-4" />
            {t('places.title')}
          </Link>
        </li>
        <li>
          <Link to="/locations" className={linkClass}>
            <IconCompass className="size-4" />
            {t('locations.title')}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
