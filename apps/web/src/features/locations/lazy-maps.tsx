import { lazy, Suspense, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Point } from './coordinates';

// The only entry to the maps: Leaflet loads in its own chunk on the first page that shows one.

const LocationPickerMap = lazy(() =>
  import('./location-map').then((module) => ({
    default: module.LocationPickerMap,
  })),
);

const LocationPreviewMap = lazy(() =>
  import('./location-map').then((module) => ({
    default: module.LocationPreviewMap,
  })),
);

/**
 * `isolate` gives the map its own stacking context: Leaflet's panes (z-index 400) and controls
 * (1000) then stay under dialogs and their overlays (z-50).
 */
function MapFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="relative isolate z-0 h-64 w-full overflow-hidden rounded-lg border bg-muted"
    >
      <Suspense fallback={<div className="size-full animate-pulse bg-muted" />}>
        {children}
      </Suspense>
    </div>
  );
}

/** Click or tap the map to set the point. The coordinate fields stay the accessible way in. */
export function LocationPicker({
  value,
  onChange,
}: {
  value: Point | null;
  onChange: (point: Point) => void;
}) {
  const { t } = useTranslation();
  return (
    <MapFrame label={t('map.picker')}>
      <LocationPickerMap value={value} onChange={onChange} />
    </MapFrame>
  );
}

/** A small read-only map of one point. */
export function LocationPreview({
  name,
  latitude,
  longitude,
}: Point & { name: string }) {
  const { t } = useTranslation();
  return (
    <MapFrame label={t('map.preview', { name })}>
      <LocationPreviewMap latitude={latitude} longitude={longitude} />
    </MapFrame>
  );
}
