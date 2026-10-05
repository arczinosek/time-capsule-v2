import type { MilestoneCategory } from '@time-capsule/shared';
import { IconFleuron } from '~/components/icons/action-icons';
import { cn } from '~/lib/utils';
import { categoryIcons } from './categories';

/** A wax seal with the category's glyph (a fleuron without one). Decorative: the label is text. */
export function CategorySeal({
  category,
  className,
}: {
  category: MilestoneCategory | null;
  className?: string;
}) {
  const Icon = category ? categoryIcons[category] : IconFleuron;
  return (
    <span className={cn('seal', className)} aria-hidden="true">
      <Icon className="size-4" />
    </span>
  );
}
