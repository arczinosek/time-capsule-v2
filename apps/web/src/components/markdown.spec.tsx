import { render, screen } from '@testing-library/react';
import { Markdown } from './markdown';

describe('Markdown', () => {
  it('renders emphasis, lists and headings one level down', async () => {
    render(<Markdown>{'# Title\n\n**proud**\n\n- one\n- two'}</Markdown>);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Title' }),
    ).toBeInTheDocument();
    expect(screen.getByText('proud', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  // Same classes on the loading fallback and on the rendered output.
  it('applies the prose styles and the className', () => {
    const { container } = render(<Markdown className="extra">{'**x**'}</Markdown>);

    expect(container.firstChild).toHaveClass('chronicle-prose', 'extra');
  });

  it('never renders raw HTML', async () => {
    const { container } = render(
      <Markdown>{'<b>bold</b> <script>alert(1)</script> text\n\n# done'}</Markdown>,
    );

    await screen.findByRole('heading', { name: 'done' });
    expect(container.querySelector('b')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });

  it('escapes text instead of interpreting it', async () => {
    render(<Markdown>{'# A & B <i>'}</Markdown>);

    expect(
      await screen.findByRole('heading', { name: 'A & B' }),
    ).toBeInTheDocument();
  });

  it('neutralises javascript: links', async () => {
    render(<Markdown>{'[click](javascript:alert(1))'}</Markdown>);

    const link = await screen.findByText('click', { selector: 'a' });
    expect(link.getAttribute('href') ?? '').not.toMatch(/javascript:/i);
  });

  it.each([
    'https://example.com',
    'http://example.com',
    '//example.com/page',
    'https:example.com',
  ])(
    'opens the external link %s in a new tab without passing the opener or referrer',
    async (href) => {
      render(<Markdown>{`[site](${href})`}</Markdown>);

      const link = await screen.findByRole('link', { name: 'site' });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow');
    },
  );

  it('keeps relative and in-page links in the same tab', async () => {
    render(<Markdown>{'[here](/milestones) [there](#top)'}</Markdown>);

    for (const name of ['here', 'there']) {
      const link = await screen.findByRole('link', { name });
      expect(link).not.toHaveAttribute('target');
      expect(link).not.toHaveAttribute('rel');
    }
  });

  it('drops images', async () => {
    const { container } = render(
      <Markdown>{'![a cat](https://example.com/cat.png)\n\n# done'}</Markdown>,
    );

    await screen.findByRole('heading', { name: 'done' });
    expect(container.querySelector('img')).toBeNull();
  });
});
