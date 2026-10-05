import {
  createMediaRequestSchema,
  createMediaResponseSchema,
  MAX_FAMILY_MEMBER_MEDIA,
  MAX_MEDIA_SIZE_BYTES,
  MAX_MILESTONE_MEDIA,
  mediaResponseSchema,
  updateFamilyMemberMediaRequestSchema,
  updateMilestoneMediaRequestSchema,
} from './media.js';
import { fallbackErrorMap } from './messages.js';

const range = (count: number) => Array.from({ length: count }, (_, i) => i + 1);

describe('media schemas', () => {
  it('pins the limits', () => {
    expect(MAX_MEDIA_SIZE_BYTES).toBe(20_971_520);
    expect(MAX_MILESTONE_MEDIA).toBe(10);
    expect(MAX_FAMILY_MEMBER_MEDIA).toBe(100);
  });

  describe('createMediaRequestSchema', () => {
    const request = {
      target: { type: 'milestone', id: 1 },
      contentType: 'image/png',
      size: 1024,
    };

    it('accepts an upload for a milestone or a family member', () => {
      expect(createMediaRequestSchema.parse(request)).toEqual(request);
      expect(
        createMediaRequestSchema.safeParse({
          ...request,
          target: { type: 'family_member', id: 2 },
        }).success,
      ).toBe(true);
    });

    it.each(['image/svg+xml', 'application/pdf', ''])(
      'rejects content type %j with the content-type key',
      (contentType) => {
        expect(
          createMediaRequestSchema.safeParse({ ...request, contentType }).error
            ?.issues[0]?.message,
        ).toBe('validation.media.contentTypeInvalid');
      },
    );

    it('rejects an empty file with the empty key', () => {
      expect(
        createMediaRequestSchema.safeParse({ ...request, size: 0 }).error
          ?.issues[0]?.message,
      ).toBe('validation.media.empty');
    });

    it('accepts 20 MB and rejects one byte more with the too-large key', () => {
      expect(
        createMediaRequestSchema.safeParse({
          ...request,
          size: MAX_MEDIA_SIZE_BYTES,
        }).success,
      ).toBe(true);
      expect(
        createMediaRequestSchema.safeParse({
          ...request,
          size: MAX_MEDIA_SIZE_BYTES + 1,
        }).error?.issues[0]?.message,
      ).toBe('validation.media.tooLarge');
    });

    it('rejects a fractional size with the fallback key', () => {
      expect(
        createMediaRequestSchema.safeParse(
          { ...request, size: 1.5 },
          { error: fallbackErrorMap },
        ).error?.issues[0]?.message,
      ).toBe('validation.invalid');
    });

    it('rejects an unknown target type with the target key', () => {
      expect(
        createMediaRequestSchema.safeParse({
          ...request,
          target: { type: 'place', id: 1 },
        }).error?.issues[0],
      ).toMatchObject({
        path: ['target', 'type'],
        message: 'validation.media.targetInvalid',
      });
    });

    it('rejects target id 0', () => {
      expect(
        createMediaRequestSchema.safeParse({
          ...request,
          target: { type: 'milestone', id: 0 },
        }).success,
      ).toBe(false);
    });
  });

  describe('createMediaResponseSchema', () => {
    it('accepts a presigned POST', () => {
      const response = {
        mediaId: 3,
        url: 'http://127.0.0.1:9000/time-capsule-media',
        fields: { key: 'media/abc', 'Content-Type': 'image/png' },
      };

      expect(createMediaResponseSchema.parse(response)).toEqual(response);
    });
  });

  describe('mediaResponseSchema', () => {
    const media = {
      id: 4,
      url: 'http://storage.test/media/4.png',
      contentType: 'image/png',
      sizeBytes: 1024,
      createdAt: '2024-05-01T10:00:00.000Z',
    };

    it('accepts a photo as the api serializes it', () => {
      expect(mediaResponseSchema.parse(media)).toEqual(media);
    });

    it('rejects Date timestamps and a non-URL url', () => {
      expect(
        mediaResponseSchema.safeParse({ ...media, createdAt: new Date() }).success,
      ).toBe(false);
      expect(
        mediaResponseSchema.safeParse({ ...media, url: 'media/4.png' }).success,
      ).toBe(false);
    });

    it('never carries the storage key', () => {
      expect(
        mediaResponseSchema.parse({ ...media, storageKey: 'media/abc' }),
      ).not.toHaveProperty('storageKey');
    });
  });

  describe('update media requests', () => {
    const baseMediaIds = [1, 2];

    it('accepts an ordered set with its base, and an empty one', () => {
      const request = { mediaIds: [3, 1, 2], baseMediaIds };
      const emptyRequest = { mediaIds: [], baseMediaIds: [] };

      expect(updateMilestoneMediaRequestSchema.parse(request)).toEqual(request);
      expect(updateMilestoneMediaRequestSchema.parse(emptyRequest)).toEqual(
        emptyRequest,
      );
      expect(updateFamilyMemberMediaRequestSchema.parse(request)).toEqual(
        request,
      );
    });

    it('rejects a duplicate id with the duplicate key', () => {
      expect(
        updateMilestoneMediaRequestSchema.safeParse({
          mediaIds: [1, 2, 1],
          baseMediaIds,
        }).error?.issues[0]?.message,
      ).toBe('validation.media.duplicate');
    });

    it('caps a milestone at 10 photos', () => {
      expect(
        updateMilestoneMediaRequestSchema.safeParse({
          mediaIds: range(10),
          baseMediaIds,
        }).success,
      ).toBe(true);
      expect(
        updateMilestoneMediaRequestSchema.safeParse({
          mediaIds: range(11),
          baseMediaIds,
        }).error?.issues[0]?.message,
      ).toBe('validation.media.capMilestone');
    });

    it('caps a family member at 100 photos', () => {
      expect(
        updateFamilyMemberMediaRequestSchema.safeParse({
          mediaIds: range(100),
          baseMediaIds,
        }).success,
      ).toBe(true);
      expect(
        updateFamilyMemberMediaRequestSchema.safeParse({
          mediaIds: range(101),
          baseMediaIds,
        }).error?.issues[0]?.message,
      ).toBe('validation.media.capFamilyMember');
    });

    it.each([[[0]], [['1']], [undefined]])('rejects mediaIds %j', (mediaIds) => {
      expect(
        updateMilestoneMediaRequestSchema.safeParse({ mediaIds, baseMediaIds })
          .success,
      ).toBe(false);
    });

    it.each([[[0]], [['1']], [undefined]])(
      'rejects baseMediaIds %j',
      (badBase) => {
        expect(
          updateMilestoneMediaRequestSchema.safeParse({
            mediaIds: [1],
            baseMediaIds: badBase,
          }).error?.issues[0]?.path,
        ).toEqual(['baseMediaIds', ...(badBase ? [0] : [])]);
        expect(
          updateFamilyMemberMediaRequestSchema.safeParse({
            mediaIds: [1],
            baseMediaIds: badBase,
          }).success,
        ).toBe(false);
      },
    );
  });
});
