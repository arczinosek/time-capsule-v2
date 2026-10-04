import { Link } from '@tanstack/react-router';
import type { PlaceResponse } from '@time-capsule/shared';
import { useTranslation } from 'react-i18next';

export function PlaceList({ places }: { places: PlaceResponse[] }) {
  const { t } = useTranslation();

  if (places.length === 0) {
    return <p className="text-muted-foreground">{t('places.empty')}</p>;
  }
  return (
    <ul className="divide-y rounded-xl border">
      {places.map((place) => (
        <li key={place.id} className="space-y-0.5 px-4 py-3">
          <Link
            to="/places/$placeId"
            params={{ placeId: place.id }}
            className="font-medium hover:underline"
          >
            {place.name}
          </Link>
          <p className="text-sm text-muted-foreground">
            {place.location?.name ?? t('places.noLocation')}
          </p>
        </li>
      ))}
    </ul>
  );
}
