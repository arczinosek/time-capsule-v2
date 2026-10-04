import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
  ZoomControl,
} from 'react-leaflet';
import { useLanguage } from '~/i18n';
import { roundCoordinate, type Point } from './coordinates';

// The real Leaflet maps. Heavy and browser-only, so nothing imports this file directly:
// lazy-maps.tsx loads it in its own chunk (Leaflet and its CSS stay out of the entry bundle),
// and the web tests replace it with a stub (src/test/setup.ts).

// Built explicitly: L.Icon.Default finds its images through a CSS url, which breaks once Vite
// hashes the asset names.
const markerIcon = L.icon({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIconRetinaUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

// OSM's own tiles, no a/b/c subdomains (their tile policy asks for the single host).
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
// Poland, as a whole, when there is no point yet.
const DEFAULT_CENTER: L.LatLngTuple = [52.07, 19.48];
const DEFAULT_ZOOM = 5;
const POINT_ZOOM = 13;

/** Tiles, translated zoom buttons and attribution: what every map here shows. */
function BaseLayers({ zoom }: { zoom: boolean }) {
  const { t } = useTranslation();
  const language = useLanguage();
  return (
    <>
      <TileLayer url={TILE_URL} maxZoom={19} attribution={t('map.attribution')} />
      {/* Leaflet's titles are English and set once: re-create the control per language. */}
      {zoom && (
        <ZoomControl
          key={language}
          zoomInTitle={t('map.zoomIn')}
          zoomOutTitle={t('map.zoomOut')}
        />
      )}
    </>
  );
}

function PointMarker({
  point,
  onMove,
}: {
  point: Point;
  onMove?: (point: Point) => void;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  // A preview's marker is decoration: the frame's aria-label already names the place, so it
  // gets no tab stop, no button role (Leaflet's keyboard default) and an empty alt.
  const editable = onMove !== undefined;
  return (
    <Marker
      // alt is read once: re-create the marker per language.
      key={language}
      position={[point.latitude, point.longitude]}
      icon={markerIcon}
      alt={editable ? t('map.marker') : ''}
      interactive={editable}
      keyboard={editable}
      draggable={editable}
      eventHandlers={
        onMove && {
          dragend: (event) => {
            onMove(toPoint((event.target as L.Marker).getLatLng()));
          },
        }
      }
    />
  );
}

function toPoint(latLng: L.LatLng): Point {
  // wrap(): a click on a world copy east or west of the first still gives -180..180.
  const wrapped = latLng.wrap();
  return {
    latitude: roundCoordinate(wrapped.lat),
    longitude: roundCoordinate(wrapped.lng),
  };
}

/** Sets the point on a click or tap. */
function ClickToPick({ onChange }: { onChange: (point: Point) => void }) {
  useMapEvents({ click: (event) => onChange(toPoint(event.latlng)) });
  return null;
}

/** MapContainer reads center and zoom once: follow a point typed into the form fields. */
function FollowPoint({ point }: { point: Point | null }) {
  const map = useMap();
  const latitude = point?.latitude;
  const longitude = point?.longitude;
  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return;
    const latLng = L.latLng(latitude, longitude);
    if (!map.getBounds().contains(latLng)) {
      map.setView(latLng, Math.max(map.getZoom(), POINT_ZOOM));
    }
  }, [map, latitude, longitude]);
  return null;
}

/** Click or tap to set the point; the marker can be dragged. */
export function LocationPickerMap({
  value,
  onChange,
}: {
  value: Point | null;
  onChange: (point: Point) => void;
}) {
  return (
    <MapContainer
      className="size-full"
      center={value ? [value.latitude, value.longitude] : DEFAULT_CENTER}
      zoom={value ? POINT_ZOOM : DEFAULT_ZOOM}
      // The page scrolls past the map; zoom with the buttons or a pinch.
      scrollWheelZoom={false}
      zoomControl={false}
    >
      <BaseLayers zoom />
      <ClickToPick onChange={onChange} />
      <FollowPoint point={value} />
      {value && <PointMarker point={value} onMove={onChange} />}
    </MapContainer>
  );
}

/** Read-only: no gestures, so a finger scrolling the page never gets caught by the map. */
export function LocationPreviewMap({ latitude, longitude }: Point) {
  return (
    <MapContainer
      className="size-full"
      center={[latitude, longitude]}
      zoom={POINT_ZOOM}
      zoomControl={false}
      dragging={false}
      touchZoom={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      boxZoom={false}
      keyboard={false}
    >
      <BaseLayers zoom={false} />
      <FollowPoint point={{ latitude, longitude }} />
      <PointMarker point={{ latitude, longitude }} />
    </MapContainer>
  );
}
