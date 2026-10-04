import {
  descriptionSchema,
  idSchema,
  isoDateSchema,
  TEXT_MAX_BYTES,
  utf8ByteLength,
} from './common.js';

describe('common schemas', () => {
  describe('utf8ByteLength', () => {
    it.each([
      ['', 0],
      ['abc', 3],
      ['ą', 2],
      ['€', 3],
      ['😀', 4],
      ['\uD800', 3], // a lone surrogate is encoded as U+FFFD
      ['Łódź 😀', 12],
    ])('counts %j as %i bytes', (value, expectedBytes) => {
      expect(utf8ByteLength(value)).toBe(expectedBytes);
    });
  });

  describe('descriptionSchema', () => {
    it('is sized for a MySQL TEXT column', () => {
      expect(TEXT_MAX_BYTES).toBe(65_535);
    });

    it.each([
      ['65,535 ASCII bytes', 'a'.repeat(65_535)],
      ['65,535 bytes of mixed text', 'ą'.repeat(32_767) + 'a'],
    ])('accepts %s', (_name, value) => {
      expect(descriptionSchema.safeParse(value).success).toBe(true);
    });

    it.each([
      ['65,536 ASCII bytes', 'a'.repeat(65_536)],
      ['65,536 bytes of two-byte characters', 'ą'.repeat(32_768)],
    ])('rejects %s with the too-long key', (_name, value) => {
      const result = descriptionSchema.safeParse(value);

      expect(result.error?.issues[0]?.message).toBe(
        'validation.description.tooLong',
      );
    });
  });

  describe('isoDateSchema', () => {
    it('rejects a non-date with the date key', () => {
      expect(isoDateSchema.safeParse('yesterday').error?.issues[0]?.message).toBe(
        'validation.date.invalid',
      );
    });
  });

  describe('idSchema', () => {
    it.each([0, -1, 1.5])('rejects %j', (id) => {
      expect(idSchema.safeParse(id).success).toBe(false);
    });
  });
});
