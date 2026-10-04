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
