import { z } from 'zod';
import { descriptionSchema, idSchema, placeNameSchema } from './common.js';
import { messages } from './messages.js';
import { milestoneSummarySchema } from './milestones.js';
import { locationSummarySchema } from './summaries.js';

// Places: a named, described spot (a house, a lake) on an optional location. A location
// belongs to at most one place, so a milestone on that location is "at" this place.
// Imports milestones.ts one way only; milestones.ts uses the summaries from summaries.ts.

export const createPlaceRequestSchema = z.object({
  name: placeNameSchema,
  description: descriptionSchema.nullish(),
  /** A location no other place owns (checked by the api), or null for none. */
  locationId: idSchema.nullish(),
});

export const updatePlaceRequestSchema = createPlaceRequestSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    error: messages.atLeastOneField,
  });

export const placeResponseSchema = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string().nullable(),
  location: locationSummarySchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

/** GET /places/:id. */
export const placeDetailResponseSchema = placeResponseSchema.extend({
  /** The milestones on this place's location, oldest first. Empty without a location. */
  milestones: z.array(milestoneSummarySchema),
});

export type CreatePlaceRequest = z.infer<typeof createPlaceRequestSchema>;
export type UpdatePlaceRequest = z.infer<typeof updatePlaceRequestSchema>;
export type PlaceResponse = z.infer<typeof placeResponseSchema>;
export type PlaceDetailResponse = z.infer<typeof placeDetailResponseSchema>;
