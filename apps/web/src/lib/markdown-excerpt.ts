/**
 * A plain-text excerpt of user-written Markdown, at most `max` characters (the ellipsis
 * included): no syntax, no HTML, whitespace collapsed, cut at a word boundary. A pure string
 * function, so the timeline never loads react-markdown for its cards.
 */
/**
 * How much of the source is read. Some replacements below are quadratic on pathological input
 * (thousands of unmatched `_`, `*`, `~~` or `<`), and a TEXT column holds up to 64 KB; the
 * excerpt is at most `max` characters, so the start of the text is plenty.
 */
const SOURCE_PREFIX = 2000;

export function toPlainExcerpt(markdown: string, max = 180): string {
  const text = markdown
    .slice(0, Math.max(SOURCE_PREFIX, max * 4))
    // Code: drop fence lines and backticks, keep the code itself.
    .replace(/^\s*(```|~~~).*$/gm, ' ')
    .replace(/`+/g, '')
    // Raw HTML is never rendered, so it never reaches an excerpt either.
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    // Images keep their alt text, links their text.
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Block markers at the start of a line: headings, quotes, list items, rules.
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*(>\s?)+/gm, '')
    .replace(/^\s*([-*+]|\d+[.)])\s+/gm, '')
    .replace(/^\s*([-*_]\s*){3,}$/gm, ' ')
    // Emphasis and strikethrough: keep the words. `_` only around words, not in snake_case.
    .replace(/(\*{1,3}|~~)(?=\S)([\s\S]*?\S)\1/g, '$2')
    .replace(/(^|[^\w])(_{1,3})(?=\S)([\s\S]*?\S)\2(?!\w)/g, '$1$3')
    // Backslash escapes.
    .replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= max) return text;
  // The last space within the first `max` characters ends the last whole word that fits
  // with the ellipsis. A single very long word is cut mid-word rather than dropped.
  const lastSpace = text.slice(0, max).lastIndexOf(' ');
  const atWord =
    lastSpace > max / 2 ? text.slice(0, lastSpace) : text.slice(0, max - 1);
  return `${atWord.replace(/[\s,;:.–—-]+$/, '')}…`;
}
