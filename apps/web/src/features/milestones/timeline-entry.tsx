import { Link } from '@tanstack/react-router';
import type { MilestoneResponse } from '@time-capsule/shared';
import { useTranslation } from 'react-i18next';
import { IconCompass, IconPhoto } from '~/components/icons/action-icons';
import { IconFamily, IconPlaces } from '~/components/icons/nav-icons';
import { useLanguage } from '~/i18n';
import { formatDate } from '~/lib/dates';
import { toPlainExcerpt } from '~/lib/markdown-excerpt';
import { CategorySeal } from './category-seal';

/** Participants named on a card; the rest are counted. */
const NAMED_FAMILY_MEMBERS = 3;

/**
 * One milestone on the timeline: the seal on the rail, then a card with the date, the title
 * (the card's only link), category, place, participants, a plain excerpt and the photo count.
 * No images: photos are originals of up to 20 MB, and there are no thumbnails.
 * Rendered inside the timeline's <li>.
 */
export function TimelineEntry({ milestone }: { milestone: MilestoneResponse }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const titleId = `milestone-${milestone.id}-title`;
  const where = milestone.place?.name ?? milestone.location?.name;
  const named = milestone.familyMembers
    .slice(0, NAMED_FAMILY_MEMBERS)
    .map((familyMember) => familyMember.name)
    .join(', ');
  const more = milestone.familyMembers.length - NAMED_FAMILY_MEMBERS;
  const excerpt = milestone.description
    ? toPlainExcerpt(milestone.description)
    : '';

  return (
    <>
      <CategorySeal category={milestone.category} />
      <article
        aria-labelledby={titleId}
        className="space-y-2 rounded-sm bg-card p-4 text-base ring-1 ring-border shadow-parchment"
      >
        <header className="space-y-1">
          <p className="flex flex-wrap items-baseline justify-between gap-x-3">
            <time dateTime={milestone.date} className="text-sm text-muted-foreground">
              {formatDate(milestone.date, language)}
            </time>
            {milestone.category && (
              <span className="font-heading text-xs tracking-wide text-brass-ink uppercase">
                {t(`category.${milestone.category}`)}
              </span>
            )}
          </p>
          <h3 id={titleId} className="text-lg leading-snug">
            <Link
              to="/milestones/$milestoneId"
              params={{ milestoneId: milestone.id }}
              className="underline-offset-4 hover:underline"
            >
              {milestone.title}
            </Link>
          </h3>
        </header>
        {excerpt && <p>{excerpt}</p>}
        {(where || named || milestone.media.length > 0) && (
          <ul className="space-y-0.5 text-sm text-muted-foreground">
            {where && (
              <li className="flex items-center gap-1.5">
                {milestone.place ? (
                  <IconPlaces className="size-4 shrink-0" />
                ) : (
                  <IconCompass className="size-4 shrink-0" />
                )}
                <span className="sr-only">{t('milestones.where')}: </span>
                <span>{where}</span>
              </li>
            )}
            {named && (
              <li className="flex items-center gap-1.5">
                <IconFamily className="size-4 shrink-0" />
                <span>
                  {t('timeline.familyMembers', {
                    names:
                      more > 0
                        ? `${named} ${t('timeline.moreFamilyMembers', { count: more })}`
                        : named,
                  })}
                </span>
              </li>
            )}
            {milestone.media.length > 0 && (
              <li className="flex items-center gap-1.5">
                <IconPhoto className="size-4 shrink-0" />
                <span>{t('timeline.photos', { count: milestone.media.length })}</span>
              </li>
            )}
          </ul>
        )}
      </article>
    </>
  );
}
