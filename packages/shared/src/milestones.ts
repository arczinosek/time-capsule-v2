import { z } from 'zod';

export const createMilestoneRequestSchema = z.object({
  date: z.iso.date('Enter a valid date'),
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(255, 'Title must be at most 255 characters'),
  description: z.string().nullish(),
});

export const updateMilestoneRequestSchema = createMilestoneRequestSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const milestoneResponseSchema = z.object({
  id: z.number().int().positive(),
  date: z.iso.date(),
  title: z.string(),
  description: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type CreateMilestoneRequest = z.infer<typeof createMilestoneRequestSchema>;
export type UpdateMilestoneRequest = z.infer<typeof updateMilestoneRequestSchema>;
export type MilestoneResponse = z.infer<typeof milestoneResponseSchema>;
