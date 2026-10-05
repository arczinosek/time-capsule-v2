import type { MilestoneCategory } from '@time-capsule/shared';
import {
  IconCandle,
  IconGoblet,
  IconHouse,
  IconOpenBook,
  IconQuill,
  IconRings,
  IconShip,
} from '~/components/icons/category-icons';
import type { EngravedIcon } from '~/components/icons/engraved-icon';

/** The seal glyph of each category. Text labels stay `category.<slug>` (colour/icon never alone). */
export const categoryIcons = {
  life_and_memory: IconCandle,
  relationships_and_marriage: IconRings,
  education_and_career: IconQuill,
  home_and_places: IconHouse,
  travels_and_adventures: IconShip,
  holidays_and_celebrations: IconGoblet,
  stories_and_anecdotes: IconOpenBook,
} satisfies Record<MilestoneCategory, EngravedIcon>;
