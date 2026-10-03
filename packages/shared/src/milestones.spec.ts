import {
  createMilestoneRequestSchema,
  milestoneResponseSchema,
  updateMilestoneRequestSchema,
} from './milestones.js';

describe('milestone schemas', () => {
  describe('createMilestoneRequestSchema', () => {
    it('accepts a valid milestone and trims the title', () => {
      expect(
        createMilestoneRequestSchema.parse({
          date: '2024-05-01',
          title: '  First steps  ',
          description: 'Wobbly but proud.',
        }),
      ).toEqual({
        date: '2024-05-01',
        title: 'First steps',
        description: 'Wobbly but proud.',
      });
    });

    it('allows the description to be omitted', () => {
      expect(
        createMilestoneRequestSchema.safeParse({ date: '2024-05-01', title: 'Birth' })
          .success,
      ).toBe(true);
    });

    it.each(['2024-13-01', '01.05.2024', '2024-05-01T10:00:00Z', ''])(
      'rejects invalid date %j',
      (date) => {
        expect(
          createMilestoneRequestSchema.safeParse({ date, title: 'Birth' }).success,
        ).toBe(false);
      },
    );

    it('rejects a blank title', () => {
      const result = createMilestoneRequestSchema.safeParse({
        date: '2024-05-01',
        title: '   ',
      });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe('Title is required');
    });

    it('rejects a title longer than 255 characters', () => {
      expect(
        createMilestoneRequestSchema.safeParse({
          date: '2024-05-01',
          title: 'a'.repeat(256),
        }).success,
      ).toBe(false);
    });
  });

  describe('updateMilestoneRequestSchema', () => {
    it('accepts a partial update', () => {
      expect(updateMilestoneRequestSchema.parse({ title: 'Renamed' })).toEqual({
        title: 'Renamed',
      });
    });

    it('rejects an empty update', () => {
      expect(updateMilestoneRequestSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('milestoneResponseSchema', () => {
    const milestone = {
      id: 1,
      date: '2024-05-01',
      title: 'First steps',
      description: null,
      createdAt: '2024-05-01T10:00:00.000Z',
      updatedAt: '2024-05-01T10:00:00.000Z',
    };

    it('accepts a milestone as the api serializes it', () => {
      expect(milestoneResponseSchema.parse(milestone)).toEqual(milestone);
    });

    it('rejects Date timestamps: the wire format is ISO strings', () => {
      expect(
        milestoneResponseSchema.safeParse({
          ...milestone,
          createdAt: new Date(),
        }).success,
      ).toBe(false);
    });
  });
});
