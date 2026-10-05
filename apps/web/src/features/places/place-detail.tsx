import { Link } from '@tanstack/react-router';
import type { PlaceDetailResponse } from '@time-capsule/shared';
import { useTranslation } from 'react-i18next';
import { IconEdit } from '~/components/icons/action-icons';
import { Markdown } from '~/components/markdown';
import { PageHeading } from '~/components/page-heading';
import { Button } from '~/components/ui/button';
import { LocationOnMap } from '~/features/locations/location-on-map';
import { useLanguage } from '~/i18n';
import { formatDate } from '~/lib/dates';
import { DeletePlaceButton } from './delete-place-button';

export function PlaceDetail({
  place,
  onDeleted,
}: {
  place: PlaceDetailResponse;
  onDeleted: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <PageHeading
        title={place.name}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/places/$placeId/edit" params={{ placeId: place.id }}>
                <IconEdit />
                {t('common.edit')}
              </Link>
            </Button>
            <DeletePlaceButton place={place} onDeleted={onDeleted} />
          </>
        }
      />
      {place.description ? (
        <Markdown dropCap>{place.description}</Markdown>
      ) : (
        <p className="text-muted-foreground">{t('places.noDescription')}</p>
      )}
      <hr className="chronicle-divider" />
      <section className="space-y-2">
        <h2 className="text-lg text-primary">{t('places.form.location')}</h2>
        {place.location ? (
          <LocationOnMap location={place.location} />
        ) : (
          <p className="text-muted-foreground">{t('places.noLocation')}</p>
        )}
      </section>
      <section className="space-y-2">
        <h2 className="text-lg text-primary">{t('places.milestones')}</h2>
        {place.milestones.length > 0 ? (
          <ul className="space-y-1">
            {place.milestones.map((milestone) => (
              <li key={milestone.id}>
                <time
                  dateTime={milestone.date}
                  className="text-sm text-muted-foreground"
                >
                  {formatDate(milestone.date, language)}
                </time>{' '}
                <Link
                  to="/milestones/$milestoneId"
                  params={{ milestoneId: milestone.id }}
                  className="underline-offset-4 hover:underline"
                >
                  {milestone.title}
                </Link>
                {milestone.category && (
                  <span className="text-sm text-brass-ink">
                    {` · ${t(`category.${milestone.category}`)}`}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t('places.noMilestones')}</p>
        )}
      </section>
    </article>
  );
}
