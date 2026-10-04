import { fallbackErrorMap } from './messages.js';
import {
  createMilestoneRequestSchema,
  MILESTONE_CATEGORIES,
  milestoneResponseSchema,
  milestoneSummarySchema,
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
          category: 'life_and_memory',
        }),
      ).toEqual({
        date: '2024-05-01',
        title: 'First steps',
        description: 'Wobbly but proud.',
        category: 'life_and_memory',
      });
    });

    it('allows the description and category to be omitted', () => {
      expect(
        createMilestoneRequestSchema.safeParse({ date: '2024-05-01', title: 'Birth' })
          .success,
      ).toBe(true);
    });

    it.each(['2024-13-01', '01.05.2024', '2024-05-01T10:00:00Z', ''])(
      'rejects invalid date %j with the date key',
      (date) => {
        const result = createMilestoneRequestSchema.safeParse({
          date,
          title: 'Birth',
        });

        expect(result.error?.issues[0]?.message).toBe('validation.date.invalid');
      },
    );

    it('rejects a blank title with the required key', () => {
      const result = createMilestoneRequestSchema.safeParse({
        date: '2024-05-01',
        title: '   ',
      });

      expect(result.error?.issues[0]?.message).toBe('validation.title.required');
    });

    it('rejects a title longer than 255 characters with the too-long key', () => {
      const result = createMilestoneRequestSchema.safeParse({
        date: '2024-05-01',
        title: 'a'.repeat(256),
      });

      expect(result.error?.issues[0]?.message).toBe('validation.title.tooLong');
    });

    it('rejects a description over 65,535 UTF-8 bytes', () => {
      const result = createMilestoneRequestSchema.safeParse({
        date: '2024-05-01',
        title: 'Birth',
        description: 'ą'.repeat(32_768),
      });

      expect(result.error?.issues[0]?.message).toBe(
        'validation.description.tooLong',
      );
    });

    it.each(MILESTONE_CATEGORIES)('accepts category %s', (category) => {
      expect(
        createMilestoneRequestSchema.safeParse({
          date: '2024-05-01',
          title: 'Birth',
          category,
        }).success,
      ).toBe(true);
    });

    it('accepts a null category', () => {
      expect(
        createMilestoneRequestSchema.parse({
          date: '2024-05-01',
          title: 'Birth',
          category: null,
        }).category,
      ).toBeNull();
    });

    it('rejects an unknown category with the category key', () => {
      const result = createMilestoneRequestSchema.safeParse({
        date: '2024-05-01',
        title: 'Birth',
        category: 'Travel',
      });

      expect(result.error?.issues[0]?.message).toBe(
        'validation.category.invalid',
      );
    });

    it('accepts the participants', () => {
      expect(
        createMilestoneRequestSchema.parse({
          date: '2024-05-01',
          title: 'Birth',
          familyMemberIds: [1, 2],
        }).familyMemberIds,
      ).toEqual([1, 2]);
    });

    it.each([[[0]], [[1.5]], [['1']], [3]])(
      'rejects familyMemberIds %j',
      (familyMemberIds) => {
        expect(
          createMilestoneRequestSchema.safeParse({
            date: '2024-05-01',
            title: 'Birth',
            familyMemberIds,
          }).success,
        ).toBe(false);
      },
    );

    it('reports an issue without its own key as validation.invalid with the fallback map', () => {
      const result = createMilestoneRequestSchema.safeParse(
        { date: '2024-05-01', title: 42 },
        { error: fallbackErrorMap },
      );

      expect(result.error?.issues[0]?.message).toBe('validation.invalid');
    });
  });

  describe('updateMilestoneRequestSchema', () => {
    it('accepts a partial update', () => {
      expect(updateMilestoneRequestSchema.parse({ title: 'Renamed' })).toEqual({
        title: 'Renamed',
      });
    });

    it('accepts clearing the category', () => {
      expect(updateMilestoneRequestSchema.parse({ category: null })).toEqual({
        category: null,
      });
    });

    it('accepts an update of the participants only, including clearing them', () => {
      expect(updateMilestoneRequestSchema.parse({ familyMemberIds: [] })).toEqual({
        familyMemberIds: [],
      });
    });

    it('leaves the participants out when they are not sent (no default clears them)', () => {
      expect(
        updateMilestoneRequestSchema.parse({ title: 'Renamed' }),
      ).not.toHaveProperty('familyMemberIds');
    });

    it('rejects an empty update with the at-least-one-field key', () => {
      expect(
        updateMilestoneRequestSchema.safeParse({}).error?.issues[0]?.message,
      ).toBe('validation.atLeastOneField');
    });
  });

  describe('milestoneResponseSchema', () => {
    const milestone = {
      id: 1,
      date: '2024-05-01',
      title: 'First steps',
      description: null,
      category: null,
      familyMembers: [],
      createdAt: '2024-05-01T10:00:00.000Z',
      updatedAt: '2024-05-01T10:00:00.000Z',
    };

    it('accepts a milestone as the api serializes it', () => {
      expect(milestoneResponseSchema.parse(milestone)).toEqual(milestone);
    });

    it('accepts a milestone with a category', () => {
      const expectedMilestone = { ...milestone, category: 'travels_and_adventures' };

      expect(milestoneResponseSchema.parse(expectedMilestone)).toEqual(
        expectedMilestone,
      );
    });

    it('requires the category key (null when unset)', () => {
      const { category: _category, ...withoutCategory } = milestone;

      expect(milestoneResponseSchema.safeParse(withoutCategory).success).toBe(
        false,
      );
    });

    it('accepts the participants', () => {
      const expectedMilestone = {
        ...milestone,
        familyMembers: [
          { id: 1, name: 'Ada', kind: 'human' },
          { id: 2, name: 'Burek', kind: 'animal' },
        ],
      };

      expect(milestoneResponseSchema.parse(expectedMilestone)).toEqual(
        expectedMilestone,
      );
    });

    it('requires the participants (empty when there are none)', () => {
      const { familyMembers: _familyMembers, ...withoutFamilyMembers } =
        milestone;

      expect(
        milestoneResponseSchema.safeParse(withoutFamilyMembers).success,
      ).toBe(false);
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

describe('milestoneSummarySchema', () => {
  it('keeps id, date, title and category', () => {
    expect(
      milestoneSummarySchema.parse({
        id: 1,
        date: '2024-05-01',
        title: 'First steps',
        description: 'dropped',
        category: null,
        familyMembers: [],
      }),
    ).toEqual({ id: 1, date: '2024-05-01', title: 'First steps', category: null });
  });
});
