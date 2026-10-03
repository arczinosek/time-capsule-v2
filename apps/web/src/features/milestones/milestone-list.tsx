import { Link } from '@tanstack/react-router';
import type { MilestoneResponse } from '@time-capsule/shared';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { DeleteMilestoneButton } from './delete-milestone-button';

export function MilestoneList({
  milestones,
}: {
  milestones: MilestoneResponse[];
}) {
  if (milestones.length === 0) {
    return <p className="text-muted-foreground">No milestones yet.</p>;
  }
  return (
    <ul className="space-y-4">
      {milestones.map((milestone) => (
        <li key={milestone.id}>
          <Card>
            <CardHeader>
              <CardTitle>{milestone.title}</CardTitle>
              <CardDescription>
                {/* The api's YYYY-MM-DD as-is: new Date() would shift it by the timezone. */}
                <time dateTime={milestone.date}>{milestone.date}</time>
              </CardDescription>
              <CardAction className="flex gap-2">
                {/* Distinct accessible names for repeated controls (screen readers, tests). */}
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to="/milestones/$milestoneId/edit"
                    params={{ milestoneId: milestone.id }}
                    aria-label={`Edit ${milestone.title}`}
                  >
                    Edit
                  </Link>
                </Button>
                <DeleteMilestoneButton milestone={milestone} />
              </CardAction>
            </CardHeader>
            {milestone.description && (
              <CardContent className="whitespace-pre-line">
                {milestone.description}
              </CardContent>
            )}
          </Card>
        </li>
      ))}
    </ul>
  );
}
