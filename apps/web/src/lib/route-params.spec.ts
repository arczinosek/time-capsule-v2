import { toPositiveInt } from './route-params';

describe('toPositiveInt', () => {
  it('parses a positive integer', () => {
    expect(toPositiveInt('42')).toBe(42);
  });

  it.each(['0', '-1', '01', '1.5', 'abc', '', '1e3'])('rejects %j', (value) => {
    expect(toPositiveInt(value)).toBe(false);
  });
});
