import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

const linkClass =
  'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground data-[status=active]:bg-muted data-[status=active]:text-foreground';

/** Places | Locations, on top of both lists. */
export function PlacesSubnav() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('places.subnav')} className="flex gap-1">
      <Link to="/places" className={linkClass}>
        {t('places.title')}
      </Link>
      <Link to="/locations" className={linkClass}>
        {t('locations.title')}
      </Link>
    </nav>
  );
}
