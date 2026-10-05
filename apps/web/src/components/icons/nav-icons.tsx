import { createEngravedIcon } from './engraved-icon';

// The main navigation: the chronicle, the family, places. Geometry after Lucide (ISC),
// redrawn as ink outlines with hatched shading.

/** An unrolled scroll: the chronicle (timeline). */
export const IconChronicle = createEngravedIcon('IconChronicle', (hatch) => (
  <>
    <path d="M19 17V5a2 2 0 0 0-2-2H4" />
    <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
    <path d="M10 18v1a2 2 0 0 1-2 2h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1z" fill={hatch} stroke="none" />
    <path d="M10 8h5.5M10 11h6M10 14h4" strokeWidth={1.1} />
  </>
));

/** Two busts: the family. */
export const IconFamily = createEngravedIcon('IconFamily', (hatch) => (
  <>
    <circle cx="16.5" cy="7.5" r="2.6" />
    <path d="M15.6 13.4A5 5 0 0 1 21.5 18.3V20h-4.2" />
    <circle cx="9" cy="8.2" r="3.3" />
    <path d="M2.5 20.2c0-3.7 2.9-6.6 6.5-6.6s6.5 2.9 6.5 6.6z" fill={hatch} />
  </>
));

/** A castle tower: places. */
export const IconPlaces = createEngravedIcon('IconPlaces', (hatch) => (
  <>
    <path d="M6.5 21V9.5h11V21" />
    <path d="M5 9.5V4h2.6v2h2.5V4h3.8v2h2.5V4H19v5.5z" fill={hatch} />
    <path d="M10 21v-3.6a2 2 0 0 1 4 0V21" />
    <path d="M12 11.5v2.2" />
    <path d="M3 21h18" />
  </>
));
