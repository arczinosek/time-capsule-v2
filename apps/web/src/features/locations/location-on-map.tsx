import type { LocationSummary } from '@time-capsule/shared';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '~/i18n';
import { formatCoordinates, osmLink } from './coordinates';
import { LocationPreview } from './lazy-maps';

/** A location on a detail page: its name, coordinates, a link to OSM and a small map. */
export function LocationOnMap({ location }: { location: LocationSummary }) {
  const { t } = useTranslation();
  const language = useLanguage();
  return (
    <div className="space-y-2">
      <p className="text-sm">
        <span className="font-medium">{location.name}</span>
        <span className="text-muted-foreground">
          {' · '}
          {formatCoordinates(location.latitude, location.longitude, language)}
          {' · '}
        </span>
        <a
          href={osmLink(location.latitude, location.longitude)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
        >
          {t('map.openInOsm')}
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>
      </p>
      <LocationPreview
        name={location.name}
        latitude={location.latitude}
        longitude={location.longitude}
      />
    </div>
  );
}
