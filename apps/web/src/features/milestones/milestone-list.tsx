import { Link } from '@tanstack/react-router';
import type { MilestoneResponse } from '@time-capsule/shared';
import { useTranslation } from 'react-i18next';
import { Markdown } from '~/components/markdown';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { useLanguage } from '~/i18n';
import { formatDate } from '~/lib/dates';
import { DeleteMilestoneButton } from './delete-milestone-button';

export function MilestoneList({
  milestones,
}: {
  milestones: MilestoneResponse[];
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  if (milestones.length === 0) {
    return <p className="text-muted-foreground">{t('milestones.empty')}</p>;
  }
  return (
    <ul className="space-y-4">
      {milestones.map((milestone) => (
        <li key={milestone.id}>
          <Card>
            <CardHeader>
              <CardTitle>
                <Link
                  to="/milestones/$milestoneId"
                  params={{ milestoneId: milestone.id }}
                  className="hover:underline"
                >
                  {milestone.title}
                </Link>
              </CardTitle>
              <CardDescription>
                <time dateTime={milestone.date}>
                  {formatDate(milestone.date, language)}
                </time>
                {milestone.category &&
                  ` · ${t(`category.${milestone.category}`)}`}
              </CardDescription>
              <CardAction className="flex gap-2">
                {/* Distinct accessible names for repeated controls (screen readers, tests). */}
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to="/milestones/$milestoneId/edit"
                    params={{ milestoneId: milestone.id }}
                    aria-label={t('milestones.editLabel', {
                      title: milestone.title,
                    })}
                  >
                    {t('common.edit')}
                  </Link>
                </Button>
                <DeleteMilestoneButton milestone={milestone} />
              </CardAction>
            </CardHeader>
            {milestone.description && (
              <CardContent>
                <Markdown>{milestone.description}</Markdown>
              </CardContent>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}
