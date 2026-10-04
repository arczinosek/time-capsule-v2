import type { Point } from '~/features/locations/coordinates';

// Stands in for the Leaflet maps (features/locations/location-map.tsx) in every web test:
// jsdom can't lay out tiles. Installed by setup.ts. Test-only text, so no translation.

export const STUB_POINT: Point = { latitude: 50.061698, longitude: 19.937206 };

export function LocationPickerMap({
  value,
  onChange,
}: {
  value: Point | null;
  onChange: (point: Point) => void;
}) {
  return (
    <div
      data-testid="location-picker-map"
      data-point={value ? `${value.latitude},${value.longitude}` : ''}
    >
      <button type="button" onClick={() => onChange(STUB_POINT)}>
        Pick a point (map stub)
      </button>
    </div>
  );
}

export function LocationPreviewMap({ latitude, longitude }: Point) {
  return (
    <div data-testid="location-preview-map" data-point={`${latitude},${longitude}`} />
  );
}
