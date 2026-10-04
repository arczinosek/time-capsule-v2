import { z } from 'zod';
import { idSchema, placeNameSchema } from './common.js';
import { messages } from './messages.js';
import { placeSummarySchema } from './summaries.js';

// Locations: a named point on the map. A place (places.ts) may own one location; milestones
// point at a location and get the owning place through it.

// One key per coordinate covers a missing value, a non-number and the range. The api stores
// 6 decimals (MySQL DECIMAL(9,6)) and rounds anything finer.
export const latitudeSchema = z
  .number({ error: messages.latitudeInvalid })
  .min(-90, messages.latitudeInvalid)
  .max(90, messages.latitudeInvalid);

export const longitudeSchema = z
  .number({ error: messages.longitudeInvalid })
  .min(-180, messages.longitudeInvalid)
  .max(180, messages.longitudeInvalid);

export const createLocationRequestSchema = z.object({
  name: placeNameSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

export const updateLocationRequestSchema = createLocationRequestSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    error: messages.atLeastOneField,
  });

export const locationResponseSchema = z.object({
  id: idSchema,
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  /** The place that owns this location, if any (at most one). */
  place: placeSummarySchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type CreateLocationRequest = z.infer<typeof createLocationRequestSchema>;
export type UpdateLocationRequest = z.infer<typeof updateLocationRequestSchema>;
export type LocationResponse = z.infer<typeof locationResponseSchema>;
