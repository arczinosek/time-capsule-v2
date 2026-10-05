import { Link } from '@tanstack/react-router';
import {
  MAX_FAMILY_MEMBER_MEDIA,
  type FamilyMemberDetailResponse,
  type FamilyMemberSummary,
} from '@time-capsule/shared';
import { useTranslation } from 'react-i18next';
import { IconEdit } from '~/components/icons/action-icons';
import { Markdown } from '~/components/markdown';
import { PageHeading } from '~/components/page-heading';
import { Button } from '~/components/ui/button';
import { MediaSection } from '~/features/media/media-section';
import { useLanguage } from '~/i18n';
import { formatDate } from '~/lib/dates';
import { DeleteFamilyMemberButton } from './delete-family-member-button';
import { familyMemberKindIcons } from './kind-icons';
import { LifeDates } from './life-dates';

function FamilyMemberLink({ familyMember }: { familyMember: FamilyMemberSummary }) {
  return (
    <Link
      to="/family-members/$familyMemberId"
      params={{ familyMemberId: familyMember.id }}
      className="underline-offset-4 hover:underline"
    >
      {familyMember.name}
    </Link>
  );
}

export function FamilyMemberDetail({
  familyMember,
  onDeleted,
}: {
  familyMember: FamilyMemberDetailResponse;
  onDeleted: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { description } = familyMember;
  const KindIcon = familyMemberKindIcons[familyMember.kind];
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <PageHeading
        title={familyMember.name}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link
                to="/family-members/$familyMemberId/edit"
                params={{ familyMemberId: familyMember.id }}
              >
                <IconEdit />
                {t('common.edit')}
              </Link>
            </Button>
            <DeleteFamilyMemberButton
              familyMember={familyMember}
              onDeleted={onDeleted}
            />
          </>
        }
      >
        <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
          <KindIcon className="size-4 text-brass-ink" />
          {t(`familyMemberKind.${familyMember.kind}`)}
          {(familyMember.birthDate || familyMember.deathDate) && ' · '}
          <LifeDates
            birthDate={familyMember.birthDate}
            deathDate={familyMember.deathDate}
          />
        </p>
      </PageHeading>
      {description ? (
        <Markdown dropCap>{description}</Markdown>
      ) : (
        <p className="text-muted-foreground">{t('familyMembers.noDescription')}</p>
      )}
      <hr className="chronicle-divider" />
      <section className="space-y-2">
        <h2 className="text-lg text-primary">{t('familyMembers.parents')}</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="text-muted-foreground">{t('familyMembers.mother')}</dt>
          <dd>
            {familyMember.mother ? (
              <FamilyMemberLink familyMember={familyMember.mother} />
            ) : (
              t('familyMembers.unknownMother')
            )}
          </dd>
          <dt className="text-muted-foreground">{t('familyMembers.father')}</dt>
          <dd>
            {familyMember.father ? (
              <FamilyMemberLink familyMember={familyMember.father} />
            ) : (
              t('familyMembers.unknownFather')
            )}
          </dd>
        </dl>
      </section>
      <section className="space-y-2">
        <h2 className="text-lg text-primary">{t('familyMembers.children')}</h2>
        {familyMember.children.length > 0 ? (
          <ul className="list-disc space-y-1 pl-5">
            {familyMember.children.map((child) => (
              <li key={child.id}>
                <FamilyMemberLink familyMember={child} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t('familyMembers.noChildren')}</p>
        )}
      </section>
      <section className="space-y-2">
        <h2 className="text-lg text-primary">{t('familyMembers.milestones')}</h2>
        {familyMember.milestones.length > 0 ? (
          <ul className="space-y-1">
            {familyMember.milestones.map((milestone) => (
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
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            {t('familyMembers.noMilestones')}
          </p>
        )}
      </section>
      <MediaSection
        target={{ type: 'family_member', id: familyMember.id }}
        media={familyMember.media}
        max={MAX_FAMILY_MEMBER_MEDIA}
        label={familyMember.name}
      />
    </article>
  );
}
