import { createEngravedIcon } from './engraved-icon';

// One per family member kind (mapped in features/family-members/kind-icons.ts).

/** A bust: a human. */
export const IconBust = createEngravedIcon('IconBust', (hatch) => (
  <>
    <circle cx="12" cy="7.8" r="4" />
    <path d="M4 21c0-4.6 3.6-8.2 8-8.2s8 3.6 8 8.2z" fill={hatch} />
  </>
));

/** A paw: an animal. */
export const IconPaw = createEngravedIcon('IconPaw', (hatch) => (
  <>
    <path d="M12 12.6c-3 0-6 3.2-6 5.7 0 1.6 1.5 2.6 3 2.1l3-1 3 1c1.5.5 3-.5 3-2.1 0-2.5-3-5.7-6-5.7z" fill={hatch} />
    <ellipse cx="5.8" cy="10" rx="1.8" ry="2.3" />
    <ellipse cx="9.4" cy="5.6" rx="1.8" ry="2.4" />
    <ellipse cx="14.6" cy="5.6" rx="1.8" ry="2.4" />
    <ellipse cx="18.2" cy="10" rx="1.8" ry="2.3" />
  </>
));
