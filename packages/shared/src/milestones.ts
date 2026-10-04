import { z } from 'zod';
import { descriptionSchema, idSchema, isoDateSchema } from './common.js';
import { messages } from './messages.js';

// Wire slugs (also the MySQL enum values, see apps/api/src/database/schema.ts). The web shows
// them through the `category.<slug>` i18n keys. Changing this list needs a migration.
export const MILESTONE_CATEGORIES = [
  'life_and_memory',
  'relationships_and_marriage',
  'education_and_career',
  'home_and_places',
  'travels_and_adventures',
  'holidays_and_celebrations',
  'stories_and_anecdotes',
] as const;

export const milestoneCategorySchema = z.enum(MILESTONE_CATEGORIES, {
  error: messages.categoryInvalid,
});

export type MilestoneCategory = z.infer<typeof milestoneCategorySchema>;

export const createMilestoneRequestSchema = z.object({
  date: isoDateSchema,
  title: z
    .string()
    .trim()
    .min(1, messages.titleRequired)
    .max(255, messages.titleTooLong),
  description: descriptionSchema.nullish(),
  category: milestoneCategorySchema.nullish(),
});

export const updateMilestoneRequestSchema = createMilestoneRequestSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    error: messages.atLeastOneField,
  });

export const milestoneResponseSchema = z.object({
  id: idSchema,
  date: isoDateSchema,
  title: z.string(),
  description: z.string().nullable(),
  category: milestoneCategorySchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type CreateMilestoneRequest = z.infer<typeof createMilestoneRequestSchema>;
export type UpdateMilestoneRequest = z.infer<typeof updateMilestoneRequestSchema>;
export type MilestoneResponse = z.infer<typeof milestoneResponseSchema>;
