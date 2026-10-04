import { lazy, Suspense } from 'react';
import { cn } from '~/lib/utils';

// react-markdown loads in its own chunk, on the first page that shows Markdown.
const MarkdownRenderer = lazy(() =>
  import('./markdown-renderer').then((module) => ({
    default: module.MarkdownRenderer,
  })),
);

/** Renders user-written Markdown safely. The only way to show Markdown in the app. */
export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
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
