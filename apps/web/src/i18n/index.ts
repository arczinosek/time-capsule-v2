import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { en } from './locales/en';
import { pl } from './locales/pl';

// The web's only i18n entry point. Importing it has no side effects: main.tsx (and the test
// setup) call initI18n once.

export const LANGUAGES = ['en', 'pl'] as const;
export type Language = (typeof LANGUAGES)[number];

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((language) => language === value);
}

/** Intl locale per UI language. en-GB writes day-first dates ("1 May 2024") for every EN user. */
export const INTL_LOCALES: Record<Language, string> = { en: 'en-GB', pl: 'pl-PL' };

const STORAGE_KEY = 'time-capsule.language';

/** The stored choice when there is a valid one, else Polish for a Polish browser, else English. */
export function detectLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(stored)) return stored;
  } catch {
    // Storage blocked (private mode, disabled site data): fall back to the browser.
  }
  return navigator.language.toLowerCase().startsWith('pl') ? 'pl' : 'en';
}

/** Switches the UI language and remembers it. Not i18next's changeLanguage, which doesn't persist. */
export async function setLanguage(language: Language): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Not persisted; the switch still applies to this page.
  }
  await i18n.changeLanguage(language);
}

export function initI18n(language: Language): void {
  if (i18n.isInitialized) return;

  // Also fires during init, so <html lang> and the title match from the first render.
  i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
    document.title = i18n.t('app.name');
  });

  // Resources are bundled, so init and changeLanguage finish synchronously and never suspend.
  void i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, pl: { translation: pl } },
    lng: language,
    fallbackLng: 'en',
    supportedLngs: LANGUAGES,
    // Flat keys that contain dots, and verbatim fallback texts that may contain ':'.
    keySeparator: false,
    nsSeparator: false,
    // React escapes; i18next escaping would render "A & B" as "A &amp; B".
    interpolation: { escapeValue: false },
  });
}

/** The active language. Call it once at the top of a component, never inside .map or callbacks. */
export function useLanguage(): Language {
  const { i18n: instance } = useTranslation();
  return isLanguage(instance.resolvedLanguage) ? instance.resolvedLanguage : 'en';
}

/**
 * Translates a message that came from the api, the shared schemas or a form: i18n keys become
 * text in the active language, any other string (e.g. a Nest message) is shown verbatim.
 */
export function useTranslateMessage(): (message: string) => string {
  const { t } = useTranslation();
  return (message) => t(message, { defaultValue: message });
}

// Here rather than in a .d.ts: tsconfig.test.json only includes specs and src/test.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
    keySeparator: false;
    nsSeparator: false;
  }
}
