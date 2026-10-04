import { z } from 'zod';
import { descriptionSchema, idSchema, isoDateSchema } from './common.js';
import { messages, type MessageKey } from './messages.js';
import { milestoneSummarySchema } from './milestones.js';
import {
  FAMILY_MEMBER_KINDS,
  familyMemberSummarySchema,
} from './summaries.js';

// Family members: humans and animals (pets are family too), with optional parents.
// Imports milestones.ts one way only; milestones.ts uses the summary from summaries.ts.

export const familyMemberKindSchema = z.enum(FAMILY_MEMBER_KINDS, {
  error: messages.familyMemberKindInvalid,
});

/**
 * The fields without their cross-field rules. zod throws on .partial()/.pick()/.omit() of a
 * refined object (and on .extend() over its keys), so the request schemas and the web form all
 * start from this one and add the refinements below.
 */
export const familyMemberFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, messages.nameRequired)
    .max(255, messages.nameTooLong),
  kind: familyMemberKindSchema,
  description: descriptionSchema.nullish(),
  birthDate: isoDateSchema.nullish(),
  deathDate: isoDateSchema.nullish(),
  motherId: idSchema.nullish(),
  fatherId: idSchema.nullish(),
});

/** A `.refine(...tuple)` argument list: the check, and where its key lands. */
type Refinement<T> = [
  check: (value: T) => boolean,
  params: { path: string[]; error: MessageKey },
];

/** Both dates are `YYYY-MM-DD`, so comparing the strings compares the dates. */
export const deathAfterBirth: Refinement<{
  birthDate?: string | null;
  deathDate?: string | null;
}> = [
  ({ birthDate, deathDate }) => !birthDate || !deathDate || deathDate >= birthDate,
  { path: ['deathDate'], error: messages.deathBeforeBirth },
];

export const distinctParents: Refinement<{
  motherId?: number | null;
  fatherId?: number | null;
}> = [
  ({ motherId, fatherId }) => motherId == null || motherId !== fatherId,
  { path: ['fatherId'], error: messages.sameParents },
];

export const createFamilyMemberRequestSchema = familyMemberFieldsSchema
  .refine(...deathAfterBirth)
  .refine(...distinctParents);

// The api checks the same rules again against the stored row: a PATCH may send one date only.
export const updateFamilyMemberRequestSchema = familyMemberFieldsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    error: messages.atLeastOneField,
  })
  .refine(...deathAfterBirth)
  .refine(...distinctParents);

export const familyMemberResponseSchema = z.object({
  id: idSchema,
  name: z.string(),
  kind: familyMemberKindSchema,
  description: z.string().nullable(),
  birthDate: isoDateSchema.nullable(),
  deathDate: isoDateSchema.nullable(),
  motherId: idSchema.nullable(),
  fatherId: idSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

/** GET /family-members/:id, and the answer to POST and PATCH. */
export const familyMemberDetailResponseSchema = familyMemberResponseSchema.extend({
  mother: familyMemberSummarySchema.nullable(),
  father: familyMemberSummarySchema.nullable(),
  /** Sorted by birth date, then name. */
  children: z.array(familyMemberSummarySchema),
  /** Sorted by date, oldest first. */
  milestones: z.array(milestoneSummarySchema),
});

export type CreateFamilyMemberRequest = z.infer<
  typeof createFamilyMemberRequestSchema
>;
export type UpdateFamilyMemberRequest = z.infer<
  typeof updateFamilyMemberRequestSchema
>;
export type FamilyMemberResponse = z.infer<typeof familyMemberResponseSchema>;
export type FamilyMemberDetailResponse = z.infer<
  typeof familyMemberDetailResponseSchema
>;
