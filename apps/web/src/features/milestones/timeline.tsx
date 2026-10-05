import type { MilestoneResponse } from '@time-capsule/shared';
import { useTranslation } from 'react-i18next';
import { groupByYear } from './group-by-year';
import { TimelineEntry } from './timeline-entry';
import { YearNav, yearHeadingId } from './year-nav';

/**
 * The chronicle: milestones in the api's order (newest first), one section per year with a
 * sticky heading, each year a rail of entries. The year nav appears from two years on.
 */
export function Timeline({ milestones }: { milestones: MilestoneResponse[] }) {
  const { t } = useTranslation();

  if (milestones.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">{t('milestones.empty')}</p>
        <hr className="chronicle-divider mx-auto max-w-xs" />
      </div>
    );
  }

  const groups = groupByYear(milestones);
  return (
    <div className="space-y-4">
      {groups.length > 1 && <YearNav years={groups.map(({ year }) => year)} />}
      {groups.map(({ year, items }) => (
        <section key={year} aria-labelledby={yearHeadingId(year)} className="scroll-mt-2">
          {/* Language-neutral ids; focusable so the year nav can move focus here. */}
          <h2 id={yearHeadingId(year)} tabIndex={-1} className="timeline-year outline-none">
            {year}
          </h2>
          {/* role="list": Safari/VoiceOver drops list semantics under list-style: none. */}
          <ol role="list" className="timeline">
            {items.map((milestone) => (
              <li key={milestone.id}>
                <TimelineEntry milestone={milestone} />
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
