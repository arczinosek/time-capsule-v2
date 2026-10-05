import { z } from 'zod';
import { idSchema } from './common.js';
import { messages } from './messages.js';

// Media: a shared library of photos in S3-compatible storage. The browser uploads straight to
// storage with a presigned POST (POST /media), then confirms (POST /media/:id/confirm). An owner
// (a milestone or a family member) links media in a chosen order; PUT /<owner>/:id/media
// replaces that ordered set, guarded by the set the client last saw. A leaf module: zod, common.ts and messages.ts only.

/** Images only. Also the MySQL enum values (apps/api/src/database/schema.ts). */
export const MEDIA_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

/** Who media can belong to. Wire slugs: English snake_case. */
export const MEDIA_TARGET_TYPES = ['milestone', 'family_member'] as const;

/** 20 MB: the largest original the api presigns an upload for. */
export const MAX_MEDIA_SIZE_BYTES = 20 * 1024 * 1024;

/** Photos per milestone, uploads in flight included. */
export const MAX_MILESTONE_MEDIA = 10;

/** Photos per family member, uploads in flight included. */
export const MAX_FAMILY_MEMBER_MEDIA = 100;

export type MediaContentType = (typeof MEDIA_CONTENT_TYPES)[number];

export const mediaContentTypeSchema = z.enum(MEDIA_CONTENT_TYPES, {
  error: messages.mediaContentTypeInvalid,
});

export const mediaTargetSchema = z.object({
  type: z.enum(MEDIA_TARGET_TYPES, { error: messages.mediaTargetInvalid }),
  id: idSchema,
});

export type MediaTarget = z.infer<typeof mediaTargetSchema>;

/** POST /media: reserve a slot on the owner and get a presigned upload. */
export const createMediaRequestSchema = z.object({
  target: mediaTargetSchema,
  contentType: mediaContentTypeSchema,
  /** The file's size in bytes; confirm requires the stored object to match it exactly. */
  size: z
    .number()
    .int()
    .min(1, messages.mediaEmpty)
    .max(MAX_MEDIA_SIZE_BYTES, messages.mediaTooLarge),
});

/**
 * The presigned POST. The browser sends exactly `fields` (in order), then the file as `file`,
 * as multipart/form-data to `url`: storage rejects any field the policy doesn't list.
 */
export const createMediaResponseSchema = z.object({
  mediaId: idSchema,
  url: z.url(),
  fields: z.record(z.string(), z.string()),
});

/** A ready photo. `url` is a time-limited read URL; the storage key is never sent. */
export const mediaResponseSchema = z.object({
  id: idSchema,
  url: z.url(),
  contentType: mediaContentTypeSchema,
  sizeBytes: z.number().int().positive(),
  createdAt: z.iso.datetime(),
});

const uniqueIds = [
  (ids: number[]) => new Set(ids).size === ids.length,
  { error: messages.mediaDuplicate },
] as const;

/**
 * The owner's ready media ids, in gallery order, as the client last saw them. The api answers
 * 409 `mediaStale` when they no longer match, so a PUT built from a stale view never unlinks
 * (and deletes) a photo the client didn't show.
 */
const baseMediaIdsSchema = z.array(idSchema);

/** PUT /milestones/:id/media: the milestone's photos, in gallery order. */
export const updateMilestoneMediaRequestSchema = z.object({
  mediaIds: z
    .array(idSchema)
    .max(MAX_MILESTONE_MEDIA, messages.mediaCapMilestone)
    .refine(...uniqueIds),
  baseMediaIds: baseMediaIdsSchema,
});

/** PUT /family-members/:id/media: the family member's photos, in gallery order. */
export const updateFamilyMemberMediaRequestSchema = z.object({
  mediaIds: z
    .array(idSchema)
    .max(MAX_FAMILY_MEMBER_MEDIA, messages.mediaCapFamilyMember)
    .refine(...uniqueIds),
  baseMediaIds: baseMediaIdsSchema,
});

export type CreateMediaRequest = z.infer<typeof createMediaRequestSchema>;
export type CreateMediaResponse = z.infer<typeof createMediaResponseSchema>;
export type MediaResponse = z.infer<typeof mediaResponseSchema>;
export type UpdateMilestoneMediaRequest = z.infer<
  typeof updateMilestoneMediaRequestSchema
>;
export type UpdateFamilyMemberMediaRequest = z.infer<
  typeof updateFamilyMemberMediaRequestSchema
>;
