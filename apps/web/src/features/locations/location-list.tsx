import { Link } from '@tanstack/react-router';
import type { LocationResponse } from '@time-capsule/shared';
import { useTranslation } from 'react-i18next';
import { IconEdit } from '~/components/icons/action-icons';
import { Button } from '~/components/ui/button';
import { useLanguage } from '~/i18n';
import { formatCoordinates } from './coordinates';
import { DeleteLocationButton } from './delete-location-button';

export function LocationList({ locations }: { locations: LocationResponse[] }) {
  const { t } = useTranslation();
  const language = useLanguage();

  if (locations.length === 0) {
    return <p className="text-muted-foreground">{t('locations.empty')}</p>;
  }
  return (
    <ul className="divide-y rounded-sm bg-card shadow-parchment ring-1 ring-border">
      {locations.map((location) => (
        <li
          key={location.id}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
        >
          <div className="min-w-0 space-y-0.5">
            {/* No detail page: a location is its name and point, edited in place. */}
            <Link
              to="/locations/$locationId/edit"
              params={{ locationId: location.id }}
              className="font-medium underline-offset-4 hover:underline"
            >
              {location.name}
            </Link>
            <p className="text-sm text-muted-foreground">
              {formatCoordinates(location.latitude, location.longitude, language)}
            </p>
            {location.place && (
              <p className="text-sm">
                {t('locations.place')}{' '}
                <Link
                  to="/places/$placeId"
                  params={{ placeId: location.place.id }}
                  className="underline-offset-4 hover:underline"
                >
                  {location.place.name}
                </Link>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link
                to="/locations/$locationId/edit"
                params={{ locationId: location.id }}
                aria-label={t('locations.editLabel', { name: location.name })}
              >
                <IconEdit />
                {t('common.edit')}
              </Link>
            </Button>
            <DeleteLocationButton location={location} />
          </div>
        </li>
      ))}
    </ul>
  );
}
