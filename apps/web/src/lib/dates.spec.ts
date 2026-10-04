import { formatDate } from './dates';

describe('formatDate', () => {
  it.each([
    ['2024-05-01', '1 May 2024'],
    ['1999-12-31', '31 December 1999'],
    ['2024-01-01', '1 January 2024'],
  ])('formats %s in English as %s', (isoDate, expectedText) => {
    expect(formatDate(isoDate, 'en')).toBe(expectedText);
  });

  it.each([
    ['2024-05-01', '1 maja 2024'],
    ['1999-12-31', '31 grudnia 1999'],
    ['2024-01-01', '1 stycznia 2024'],
  ])('formats %s in Polish as %s', (isoDate, expectedText) => {
    expect(formatDate(isoDate, 'pl')).toBe(expectedText);
  });

  // dates.ts builds its formatters at import, so the module is imported again after the
  // timezone is stubbed. Honolulu (UTC-10) catches a formatter without timeZone: 'UTC';
  // Warsaw (UTC+1/+2) catches parsing the date as local midnight.
  describe.each(['Pacific/Honolulu', 'Europe/Warsaw'])('in %s', (timeZone) => {
    let formatInZone: typeof formatDate;

    beforeEach(async () => {
      vi.stubEnv('TZ', timeZone);
      vi.resetModules();
      ({ formatDate: formatInZone } = await import('./dates'));
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('runs in that timezone', () => {
      expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(timeZone);
    });

    it('never shifts the date by a day', () => {
      expect(formatInZone('2024-01-01', 'en')).toBe('1 January 2024');
      expect(formatInZone('2024-12-31', 'pl')).toBe('31 grudnia 2024');
    });
  });
});
