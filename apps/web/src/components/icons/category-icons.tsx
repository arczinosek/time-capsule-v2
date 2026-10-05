import { createEngravedIcon } from './engraved-icon';

// One per milestone category (mapped in features/milestones/categories.ts). Geometry after
// Lucide (ISC), redrawn as ink outlines with hatching.

/** A candle: life and memory. */
export const IconCandle = createEngravedIcon('IconCandle', (hatch) => (
  <>
    <path d="M12 2.8c2 2.4 2 4.4 0 6-2-1.6-2-3.6 0-6z" />
    <path d="M12 8.8v1.4" />
    <path d="M9 10.2h6V19H9z" />
    <path d="M12 10.2h3V19h-3z" fill={hatch} stroke="none" />
    <path d="M5.5 19h13a6.5 2.2 0 0 1-13 0z" />
  </>
));

/** Two rings: relationships and marriage. */
export const IconRings = createEngravedIcon('IconRings', (hatch) => (
  <>
    <circle cx="9" cy="14.5" r="5" />
    <circle cx="15" cy="14.5" r="5" />
    <path d="M9 9.5 7.4 7.4 9 5.3l1.6 2.1z" fill={hatch} />
  </>
));

/** A quill: education and career. */
export const IconQuill = createEngravedIcon('IconQuill', (hatch) => (
  <>
    <path d="M20.5 3c-6.5.3-11.2 5.2-11.6 12.2 7-.6 11.4-5.4 11.6-12.2z" fill={hatch} />
    <path d="M20.5 3 5 20.5" />
    <path d="M3.5 21.5 5 20.5" />
  </>
));

/** A house: home and places. */
export const IconHouse = createEngravedIcon('IconHouse', (hatch) => (
  <>
    <path d="M3 11.2 12 4l9 7.2" />
    <path d="M5 11.5L12 6.1l7 5.4-.1-.6L12 4 5 9.6z" fill={hatch} stroke="none" />
    <path d="M5.5 10v10h13V10" />
    <path d="M10 20v-5.2h4V20" />
    <path d="M15.8 6.2V3.8h2v4" />
  </>
));

/** A ship: travels and adventures. */
export const IconShip = createEngravedIcon('IconShip', (hatch) => (
  <>
    <path d="M3 14.8h18l-3 4.4H6z" fill={hatch} />
    <path d="M12 3v11.8" />
    <path d="M12 4.2l6 8.6h-6z" />
    <path d="M12 6.6 7.2 12.8H12" />
    <path d="M2.5 21.5c1.6 0 1.6-.8 3.2-.8s1.6.8 3.2.8 1.6-.8 3.1-.8 1.6.8 3.2.8 1.6-.8 3.2-.8 1.6.8 3.1.8" strokeWidth={1.1} />
  </>
));

/** A goblet: holidays and celebrations. */
export const IconGoblet = createEngravedIcon('IconGoblet', (hatch) => (
  <>
    <path d="M7 3h10c0 5-2 8.2-5 8.2S7 8 7 3z" />
    <path d="M7.4 6h9.2c-.6 3-2.2 5.2-4.6 5.2S8 9 7.4 6z" fill={hatch} stroke="none" />
    <path d="M12 11.2v6.6" />
    <path d="M8 21c0-1.8 1.8-3.2 4-3.2s4 1.4 4 3.2z" />
  </>
));

/** An open book: stories and anecdotes. */
export const IconOpenBook = createEngravedIcon('IconOpenBook', (hatch) => (
  <>
    <path d="M3 4.5v13.8c4 0 7 .5 9 2V6.3c-2-1.4-5-1.8-9-1.8z" fill={hatch} />
    <path d="M12 6.3c2-1.4 5-1.8 9-1.8v13.8c-4 0-7 .5-9 2" />
    <path d="M14.5 9.2c1.5-.6 3-.8 4.5-.8M14.5 12.2c1.5-.6 3-.8 4.5-.8M14.5 15.2c1.5-.6 3-.8 4.5-.8" strokeWidth={1} />
  </>
));
