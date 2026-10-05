import { Link } from '@tanstack/react-router';
import { MAX_MILESTONE_MEDIA, type MilestoneResponse } from '@time-capsule/shared';
import { useTranslation } from 'react-i18next';
import { IconEdit } from '~/components/icons/action-icons';
import { Markdown } from '~/components/markdown';
import { PageHeading } from '~/components/page-heading';
import { Button } from '~/components/ui/button';
import { familyMemberKindIcons } from '~/features/family-members/kind-icons';
import { LocationOnMap } from '~/features/locations/location-on-map';
import { MediaSection } from '~/features/media/media-section';
import { useLanguage } from '~/i18n';
import { formatDate } from '~/lib/dates';
import { CategorySeal } from './category-seal';
import { DeleteMilestoneButton } from './delete-milestone-button';

export function MilestoneDetail({
  milestone,
  onDeleted,
}: {
  milestone: MilestoneResponse;
  onDeleted: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { description } = milestone;
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <PageHeading
        title={milestone.title}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link
                to="/milestones/$milestoneId/edit"
                params={{ milestoneId: milestone.id }}
              >
                <IconEdit />
                {t('common.edit')}
              </Link>
            </Button>
            <DeleteMilestoneButton milestone={milestone} onDeleted={onDeleted} />
          </>
        }
      >
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <CategorySeal category={milestone.category} className="size-7" />
          <time dateTime={milestone.date}>
            {formatDate(milestone.date, language)}
          </time>
          {milestone.category && (
            <span className="font-heading tracking-wide text-brass-ink">
              {` · ${t(`category.${milestone.category}`)}`}
            </span>
          )}
        </p>
      </PageHeading>
      {description ? (
        <Markdown dropCap>{description}</Markdown>
      ) : (
        <p className="text-muted-foreground">{t('milestones.noDescription')}</p>
      )}
      <hr className="chronicle-divider" />
      {milestone.familyMembers.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg text-primary">{t('milestones.participants')}</h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {milestone.familyMembers.map((familyMember) => {
              const KindIcon = familyMemberKindIcons[familyMember.kind];
              return (
                <li key={familyMember.id} className="flex items-center gap-1.5">
                  <KindIcon className="size-4 text-brass-ink" />
                  <Link
                    to="/family-members/$familyMemberId"
                    params={{ familyMemberId: familyMember.id }}
                    className="underline-offset-4 hover:underline"
                  >
                    {familyMember.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {milestone.location && (
        <section className="space-y-2">
          <h2 className="text-lg text-primary">{t('milestones.where')}</h2>
          {milestone.place && (
            <p>
              <Link
                to="/places/$placeId"
                params={{ placeId: milestone.place.id }}
                className="font-medium underline-offset-4 hover:underline"
              >
                {milestone.place.name}
              </Link>
            </p>
          )}
          <LocationOnMap location={milestone.location} />
        </section>
      )}
      <MediaSection
        target={{ type: 'milestone', id: milestone.id }}
        media={milestone.media}
        max={MAX_MILESTONE_MEDIA}
        label={milestone.title}
      />
    </article>
  );
}
