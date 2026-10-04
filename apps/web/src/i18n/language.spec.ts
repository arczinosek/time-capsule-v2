import i18n from 'i18next';
import { detectLanguage, setLanguage } from './index';

const STORAGE_KEY = 'time-capsule.language';

describe('detectLanguage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prefers the stored choice', () => {
    localStorage.setItem(STORAGE_KEY, 'pl');
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US');

    expect(detectLanguage()).toBe('pl');
  });

  it('ignores a stored value that is not a supported language', () => {
    localStorage.setItem(STORAGE_KEY, 'de');
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('pl-PL');

    expect(detectLanguage()).toBe('pl');
  });

  it.each([
    ['pl-PL', 'pl'],
    ['pl', 'pl'],
    ['PL', 'pl'],
    ['en-US', 'en'],
    ['de-DE', 'en'],
  ])('follows the browser language %s on a first visit', (browser, expectedLanguage) => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(browser);

    expect(detectLanguage()).toBe(expectedLanguage);
  });

  it('falls back to the browser language when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('pl-PL');

    expect(detectLanguage()).toBe('pl');
  });
});

describe('setLanguage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('switches, persists the choice and updates <html lang> and the title', async () => {
    await setLanguage('pl');

    expect(i18n.resolvedLanguage).toBe('pl');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('pl');
    expect(document.documentElement).toHaveAttribute('lang', 'pl');
    expect(document.title).toBe('Kapsuła czasu');
  });

  it('still switches when storage throws', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

    await setLanguage('pl');

    expect(i18n.resolvedLanguage).toBe('pl');
  });
});
