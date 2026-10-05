import { createEngravedIcon } from './engraved-icon';

// Actions and small signs. Geometry after Lucide (ISC), redrawn as ink outlines with hatching.

/** A serifed plus: create. */
export const IconAdd = createEngravedIcon('IconAdd', (hatch) => (
  <>
    <path d="M12 4.5v15M4.5 12h15" />
    <path d="M10.4 4.5h3.2M10.4 19.5h3.2M4.5 10.4v3.2M19.5 10.4v3.2" strokeWidth={1.2} />
    <path d="M12 9.8 14.2 12 12 14.2 9.8 12z" fill={hatch} strokeWidth={1} />
  </>
));

/** A pen nib: edit. */
export const IconEdit = createEngravedIcon('IconEdit', (hatch) => (
  <g transform="rotate(40 12 12)">
    <path d="M8.2 3h7.6l1.4 7.2L12 21.5 6.8 10.2z" />
    <path d="M8.2 3h7.6l.6 3.2H7.6z" fill={hatch} />
    <path d="M12 21.5v-8.3" />
    <circle cx="12" cy="11.6" r="1.3" />
  </g>
));

/** A lidded urn: delete. */
export const IconDelete = createEngravedIcon('IconDelete', (hatch) => (
  <>
    <path d="M12 2.8v1.6" />
    <path d="M8.2 6.2a3.8 1.8 0 0 1 7.6 0z" />
    <path d="M6.8 7.2h10.4" />
    <path d="M8 7.2c-2.2 2.4-2.2 5.8 0 8.6l.9 3.7h6.2l.9-3.7c2.2-2.8 2.2-6.2 0-8.6z" />
    <path d="M7.1 12c.3 1.3.8 2.6 1.6 3.8h6.6c.8-1.2 1.3-2.5 1.6-3.8z" fill={hatch} stroke="none" />
    <path d="M7.3 9.2c-2 0-2.2 3 0 3.2M16.7 9.2c2 0 2.2 3 0 3.2" strokeWidth={1.2} />
    <path d="M7.5 21.2h9" />
  </>
));

/** A manicule (☜): back. */
export const IconBack = createEngravedIcon('IconBack', (hatch) => (
  <>
    <path d="M18.5 8.2h-4.3c-.8 0-1.6.3-2.2.8L10.6 10H3.4a1.4 1.4 0 0 0 0 2.8h6.9" />
    <path d="M10.3 12.8H9a1.3 1.3 0 0 0 0 2.6h1.6M10.6 15.4H9.8a1.3 1.3 0 0 0 0 2.6h1.3M11.1 18H10.6a1.2 1.2 0 0 0 0 2.4h4.2c2 0 3.7-1.2 3.7-3.2V8.2" />
    <path d="M18.5 7.2h2.6v12.6h-2.6z" fill={hatch} />
  </>
));

/** A flourished chevron: previous. */
export const IconPrev = createEngravedIcon('IconPrev', (hatch) => (
  <>
    <path d="M15 5 8 12l7 7" />
    <path d="M15 5c1.4-1.2 3.2-.6 3 .9-.1.8-.9 1.1-1.5.8M15 19c1.4 1.2 3.2.6 3-.9-.1-.8-.9-1.1-1.5-.8" strokeWidth={1.1} />
    <path d="M8 12l2.2-1.6v3.2z" fill={hatch} strokeWidth={1} />
  </>
));

/** A flourished chevron: next. */
export const IconNext = createEngravedIcon('IconNext', (hatch) => (
  <g transform="matrix(-1 0 0 1 24 0)">
    <path d="M15 5 8 12l7 7" />
    <path d="M15 5c1.4-1.2 3.2-.6 3 .9-.1.8-.9 1.1-1.5.8M15 19c1.4 1.2 3.2.6 3-.9-.1-.8-.9-1.1-1.5-.8" strokeWidth={1.1} />
    <path d="M8 12l2.2-1.6v3.2z" fill={hatch} strokeWidth={1} />
  </g>
));

/** A serifed X: close. */
export const IconClose = createEngravedIcon('IconClose', (hatch) => (
  <>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    <path d="M4.9 8.1l3.2-3.2M15.9 19.1l3.2-3.2M15.9 4.9l3.2 3.2M4.9 15.9l3.2 3.2" strokeWidth={1.2} />
    <path d="M12 10.4 13.6 12 12 13.6 10.4 12z" fill={hatch} strokeWidth={0.8} />
  </>
));

/** A framed landscape: a photo. */
export const IconPhoto = createEngravedIcon('IconPhoto', (hatch) => (
  <>
    <rect x="3" y="4" width="18" height="16" rx="0.8" />
    <rect x="5.5" y="6.5" width="13" height="11" strokeWidth={1} />
    <path d="M5.5 17.5l4.3-5 3 3.2 2-2.1 3.7 3.9z" fill={hatch} strokeWidth={1.1} />
    <circle cx="15" cy="9.6" r="1.3" strokeWidth={1.1} />
  </>
));

/** An hourglass: loading. */
export const IconHourglass = createEngravedIcon('IconHourglass', (hatch) => (
  <>
    <path d="M5.5 3h13M5.5 21h13" />
    <path d="M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9" />
    <path d="M8.6 20.6c.6-2.8 3.4-4 3.4-4.8 0 .8 2.8 2 3.4 4.8z" fill={hatch} stroke="none" />
    <path d="M9 7.2h6c-.9 1.4-3 2.4-3 3.4 0-1-2.1-2-3-3.4z" fill={hatch} stroke="none" />
  </>
));

/** A compass rose: a location (a point on the map). */
export const IconCompass = createEngravedIcon('IconCompass', (hatch) => (
  <>
    <circle cx="12" cy="12" r="9" strokeWidth={1.2} />
    <path d="M12 3.5l2 6.5 6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2z" />
    <path d="M12 3.5l2 6.5h-2zM20.5 12l-6.5 2v-2zM12 20.5l-2-6.5h2zM3.5 12l6.5-2v2z" fill={hatch} stroke="none" />
  </>
));

/** A fleuron (❧): the seal of a milestone without a category, and the divider. */
export const IconFleuron = createEngravedIcon('IconFleuron', (hatch) => (
  <>
    <path d="M12 19.5c-5-3-7.8-6.8-6-10.4 1.4-2.8 4.8-2.8 6 0 1.2-2.8 4.6-2.8 6 0 1.8 3.6-1 7.4-6 10.4z" fill={hatch} />
    <path d="M12 19.5c0 1.4.9 2 2 2" />
    <path d="M12 9.1v6" strokeWidth={1.1} />
  </>
));
