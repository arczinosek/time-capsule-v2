import { INTL_LOCALES, type Language } from '~/i18n';

// Coordinates as people type and read them. Decimal degrees, 6 decimals (the api's precision).

export type Point = { latitude: number; longitude: number };

/** A coordinate input as a number: accepts `,` or `.` as the decimal mark. NaN when it isn't one. */
export function parseCoordinate(input: string): number {
  const normalized = input.trim().replace(',', '.');
  return /^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(normalized) ? Number(normalized) : Number.NaN;
}

/** Rounded to the 6 decimals the api stores (about 10 cm). */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

const options: Intl.NumberFormatOptions = {
  maximumFractionDigits: 6,
  useGrouping: false,
};

const formats: Record<Language, Intl.NumberFormat> = {
  en: new Intl.NumberFormat(INTL_LOCALES.en, options),
  pl: new Intl.NumberFormat(INTL_LOCALES.pl, options),
};

/**
 * '50.061698°, 19.937206°' / '50,061698°; 19,937206°': signed decimal degrees in the
 * language's number format. Polish writes a decimal comma, so the pair is split by ';'.
 */
export function formatCoordinates(
  latitude: number,
  longitude: number,
  language: Language,
): string {
  const separator = language === 'pl' ? '; ' : ', ';
  const format = formats[language];
  return `${format.format(latitude)}°${separator}${format.format(longitude)}°`;
}

/** The point on openstreetmap.org, with a marker. */
export function osmLink(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
}
