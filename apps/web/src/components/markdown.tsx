import { lazy, Suspense } from 'react';
import { cn } from '~/lib/utils';

// react-markdown loads in its own chunk, on the first page that shows Markdown.
const MarkdownRenderer = lazy(() =>
  import('./markdown-renderer').then((module) => ({
    default: module.MarkdownRenderer,
  })),
);

/** Stories at least this long open with an illuminated initial (`dropCap`). */
const DROP_CAP_MIN_LENGTH = 120;

/**
 * Renders user-written Markdown safely. The only way to show Markdown in the app. `dropCap`
 * (detail pages) gives a long enough story a drop cap; short texts would look top-heavy.
 */
export function Markdown({
  children,
  className: classNameProp,
  dropCap = false,
}: {
  children: string;
  className?: string;
  dropCap?: boolean;
}) {
  const className = cn(
    dropCap && children.length >= DROP_CAP_MIN_LENGTH && 'drop-cap',
    classNameProp,
  );
  return (
    <Suspense
      // Until the chunk arrives, the raw text (never an empty gap), styled like the result.
      fallback={
        <div className={cn('chronicle-prose whitespace-pre-line', className)}>
          {children}
        </div>
      }
    >
      <MarkdownRenderer className={className}>{children}</MarkdownRenderer>
    </Suspense>
  );
}
