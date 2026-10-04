import ReactMarkdown, { type Components } from 'react-markdown';
import { cn } from '~/lib/utils';

const components: Components = {
  // The page title owns <h1>: shift every Markdown heading down one level.
  h1: 'h2',
  h2: 'h3',
  h3: 'h4',
  h4: 'h5',
  h5: 'h6',
  // `node` is react-markdown's AST node: spreading it onto the DOM makes React warn.
  // External: any http(s): URL, or a protocol-relative one (`//host/...`) that the default
  // urlTransform keeps as well.
  a: ({ node: _node, href, ...props }) => (
    <a
      href={href}
      {...(href && /^(https?:|\/\/)/i.test(href)
        ? { target: '_blank', rel: 'noopener noreferrer nofollow' }
        : {})}
      {...props}
    />
  ),
};

// Loaded lazily through ./markdown.tsx; import that instead.
// - skipHtml: raw HTML in the text is dropped, never rendered (no rehype-raw).
// - img is dropped: photos belong to attachments, and external images would be hotlinked.
// - The default urlTransform stays: it neutralises javascript: and other unsafe URLs.
export function MarkdownRenderer({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn('chronicle-prose', className)}>
      <ReactMarkdown
        skipHtml
        disallowedElements={['img']}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
