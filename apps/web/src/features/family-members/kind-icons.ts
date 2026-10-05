import type { FamilyMemberKind } from '@time-capsule/shared';
import type { EngravedIcon } from '~/components/icons/engraved-icon';
import { IconBust, IconPaw } from '~/components/icons/family-member-kind-icons';

/** The glyph of each kind, shown next to the `familyMemberKind.<slug>` text (never alone). */
export const familyMemberKindIcons = {
  human: IconBust,
  animal: IconPaw,
} satisfies Record<FamilyMemberKind, EngravedIcon>;
