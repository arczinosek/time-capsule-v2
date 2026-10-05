import { useTranslation } from 'react-i18next';

export const yearHeadingId = (year: string) => `year-${year}`;

/**
 * Jumps to a year of the timeline: scrolls its section into view and focuses its heading.
 * Plain anchors whose click never changes the URL: a hash change (or <Link hash>) is a router
 * navigation, which re-runs the /milestones loader and refetches the list.
 */
export function YearNav({ years }: { years: string[] }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('timeline.yearNav')} className="border-b border-brass pb-2">
      <ol role="list" className="flex snap-x gap-1 overflow-x-auto">
        {years.map((year) => (
          <li key={year} className="snap-start">
            <a
              href={`#${yearHeadingId(year)}`}
              className="inline-flex min-h-10 min-w-12 items-center justify-center rounded-sm px-2 font-heading tracking-wide text-primary tabular hover:bg-accent"
              onClick={(event) => {
                event.preventDefault();
                const heading = document.getElementById(yearHeadingId(year));
                if (!heading) return;
                // Smoothness comes from CSS scroll-behavior (off under reduced motion).
                (heading.closest('section') ?? heading).scrollIntoView({
                  block: 'start',
                });
                heading.focus({ preventScroll: true });
              }}
            >
              {year}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
