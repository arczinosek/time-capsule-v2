import { z } from 'zod';
import { idSchema } from './common.js';

// Small shapes that one feature embeds in another's responses. A leaf module (zod and
// common.ts only), so feature modules can all import it without an import cycle: a cycle
// between modules with top-level consts throws "Cannot access … before initialization".

// Wire slugs (also the MySQL enum values, see apps/api/src/database/schema.ts). The web shows
// them through the `familyMemberKind.<slug>` i18n keys. Changing this list needs a migration.
export const FAMILY_MEMBER_KINDS = ['human', 'animal'] as const;

export type FamilyMemberKind = (typeof FAMILY_MEMBER_KINDS)[number];

export const familyMemberSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  kind: z.enum(FAMILY_MEMBER_KINDS),
});

export type FamilyMemberSummary = z.infer<typeof familyMemberSummarySchema>;

/** A point on the map. Coordinates are decimal degrees (MySQL DECIMAL(9,6)). */
export const locationSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

export type LocationSummary = z.infer<typeof locationSummarySchema>;

export const placeSummarySchema = z.object({
  id: idSchema,
  name: z.string(),
});

export type PlaceSummary = z.infer<typeof placeSummarySchema>;
