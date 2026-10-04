import { INTL_LOCALES, type Language } from '~/i18n';

const options: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
};

const formats: Record<Language, Intl.DateTimeFormat> = {
  en: new Intl.DateTimeFormat(INTL_LOCALES.en, options),
  pl: new Intl.DateTimeFormat(INTL_LOCALES.pl, options),
};

/**
 * The api's `YYYY-MM-DD` as text: '1 May 2024' / '1 maja 2024'. Read as UTC midnight and
 * formatted in UTC, so it never shifts a day with the viewer's timezone. Keep the raw value in
 * `<time dateTime>`.
 */
export function formatDate(isoDate: string, language: Language): string {
  return formats[language].format(new Date(`${isoDate}T00:00:00Z`));
}
