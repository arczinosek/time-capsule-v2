import { toPlainExcerpt } from './markdown-excerpt';

describe('toPlainExcerpt', () => {
  it('returns short plain text unchanged', () => {
    expect(toPlainExcerpt('Wobbly but proud.')).toBe('Wobbly but proud.');
  });

  it('drops emphasis and keeps the words', () => {
    expect(toPlainExcerpt('**Wobbly** but _proud_, ***very*** ~~not~~ so.')).toBe(
      'Wobbly but proud, very not so.',
    );
  });

  it('keeps underscores inside words', () => {
    expect(toPlainExcerpt('see file_name_here')).toBe('see file_name_here');
  });

  it('strips headings, quotes, lists, rules, code, links, images and HTML', () => {
    const markdown = [
      '# The beach',
      '',
      '> We were *proud*.',
      '',
      '- sand',
      '1. sea',
      '',
      '---',
      '',
      'Read [the story](https://example.com) and `code`.',
      '```js',
      'run()',
      '```',
      '![Ada on the sand](https://example.com/a.png) <b>bold</b>',
    ].join('\n');

    expect(toPlainExcerpt(markdown)).toBe(
      'The beach We were proud. sand sea Read the story and code. run() Ada on the sand bold',
    );
  });

  it('collapses whitespace', () => {
    expect(toPlainExcerpt('  one\n\n\ttwo   three  ')).toBe('one two three');
  });

  it('cuts long text at a word boundary, within the limit, with an ellipsis', () => {
    const text = 'Łukasz walked to the river and back again, '.repeat(10);

    const excerpt = toPlainExcerpt(text, 50);

    expect(excerpt).toBe('Łukasz walked to the river and back again, Łukasz…');
    expect(excerpt.length).toBeLessThanOrEqual(50);
  });

  it('defaults to 180 characters', () => {
    const excerpt = toPlainExcerpt('word '.repeat(100));

    expect(excerpt.length).toBeLessThanOrEqual(180);
    expect(excerpt.endsWith('word…')).toBe(true);
  });

  it('cuts a single overlong word mid-word', () => {
    expect(toPlainExcerpt('a'.repeat(30), 10)).toBe(`${'a'.repeat(9)}…`);
  });

  it.each([
    ['unmatched underscores', ' _a'.repeat(21_000)],
    ['unmatched asterisks', '*a '.repeat(21_000)],
    ['unmatched strikethrough', '~~a '.repeat(16_000)],
    ['unclosed tags', '<a'.repeat(32_000)],
  ])('stays fast on a ~60 kB story of %s', (_name, markdown) => {
    const started = performance.now();

    const excerpt = toPlainExcerpt(markdown);

    expect(performance.now() - started).toBeLessThan(100);
    expect(excerpt.length).toBeLessThanOrEqual(180);
  });
});
