import { Link } from '@tanstack/react-router';
import type { MilestoneResponse } from '@time-capsule/shared';
import { useTranslation } from 'react-i18next';
import { Markdown } from '~/components/markdown';
import { Button } from '~/components/ui/button';
import { useLanguage } from '~/i18n';
import { formatDate } from '~/lib/dates';
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
  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{milestone.title}</h1>
        <p className="text-sm text-muted-foreground">
          <time dateTime={milestone.date}>
            {formatDate(milestone.date, language)}
          </time>
          {milestone.category && ` · ${t(`category.${milestone.category}`)}`}
        </p>
      </header>
      {milestone.description ? (
        <Markdown>{milestone.description}</Markdown>
      ) : (
        <p className="text-muted-foreground">{t('milestones.noDescription')}</p>
      )}
      {milestone.familyMembers.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">
            {t('milestones.participants')}
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {milestone.familyMembers.map((familyMember) => (
              <li key={familyMember.id}>
                <Link
                  to="/family-members/$familyMemberId"
                  params={{ familyMemberId: familyMember.id }}
                  className="underline-offset-4 hover:underline"
                >
                  {familyMember.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link
            to="/milestones/$milestoneId/edit"
            params={{ milestoneId: milestone.id }}
          >
            {t('common.edit')}
          </Link>
        </Button>
        <DeleteMilestoneButton milestone={milestone} onDeleted={onDeleted} />
      </div>
    </article>
  );
}
