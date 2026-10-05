import {
  createFamilyMemberRequestSchema,
  familyMemberDetailResponseSchema,
  familyMemberResponseSchema,
  updateFamilyMemberRequestSchema,
} from './family-members.js';
import { fallbackErrorMap } from './messages.js';

describe('family member schemas', () => {
  describe('createFamilyMemberRequestSchema', () => {
    it('accepts a minimal family member and trims the name', () => {
      expect(
        createFamilyMemberRequestSchema.parse({ name: '  Ada  ', kind: 'human' }),
      ).toEqual({ name: 'Ada', kind: 'human' });
    });

    it('accepts every field', () => {
      const request = {
        name: 'Burek',
        kind: 'animal',
        description: 'A good **dog**.',
        birthDate: '2015-04-01',
        deathDate: '2024-02-01',
        motherId: 1,
        fatherId: 2,
      };

      expect(createFamilyMemberRequestSchema.parse(request)).toEqual(request);
    });

    it('accepts null for every optional field', () => {
      expect(
        createFamilyMemberRequestSchema.safeParse({
          name: 'Ada',
          kind: 'human',
          description: null,
          birthDate: null,
          deathDate: null,
          motherId: null,
          fatherId: null,
        }).success,
      ).toBe(true);
    });

    it('rejects a blank name with the required key', () => {
      const result = createFamilyMemberRequestSchema.safeParse({
        name: '   ',
        kind: 'human',
      });

      expect(result.error?.issues[0]?.message).toBe('validation.name.required');
    });

    it('accepts a name of 255 characters and rejects 256 with the too-long key', () => {
      expect(
        createFamilyMemberRequestSchema.safeParse({
          name: 'a'.repeat(255),
          kind: 'human',
        }).success,
      ).toBe(true);
      expect(
        createFamilyMemberRequestSchema.safeParse({
          name: 'a'.repeat(256),
          kind: 'human',
        }).error?.issues[0]?.message,
      ).toBe('validation.name.tooLong');
    });

    it.each([undefined, 'robot', 'Human'])(
      'rejects kind %j with the kind key',
      (kind) => {
        const result = createFamilyMemberRequestSchema.safeParse({
          name: 'Ada',
          kind,
        });

        expect(result.error?.issues[0]?.message).toBe(
          'validation.familyMemberKind.invalid',
        );
      },
    );

    it('rejects an invalid date with the date key', () => {
      const result = createFamilyMemberRequestSchema.safeParse({
        name: 'Ada',
        kind: 'human',
        birthDate: '01.05.1950',
      });

      expect(result.error?.issues[0]).toMatchObject({
        path: ['birthDate'],
        message: 'validation.date.invalid',
      });
    });

    it('rejects a death date before the birth date on deathDate', () => {
      const result = createFamilyMemberRequestSchema.safeParse({
        name: 'Ada',
        kind: 'human',
        birthDate: '1950-05-03',
        deathDate: '1950-05-02',
      });

      expect(result.error?.issues).toEqual([
        expect.objectContaining({
          path: ['deathDate'],
          message: 'validation.deathDate.beforeBirth',
        }),
      ]);
    });

    it.each([
      ['equal dates', { birthDate: '1950-05-03', deathDate: '1950-05-03' }],
      ['a death date alone', { deathDate: '1950-05-03' }],
      ['a birth date alone', { birthDate: '1950-05-03' }],
    ])('accepts %s', (_name, dates) => {
      expect(
        createFamilyMemberRequestSchema.safeParse({
          name: 'Ada',
          kind: 'human',
          ...dates,
        }).success,
      ).toBe(true);
    });

    it('rejects the same mother and father on fatherId', () => {
      const result = createFamilyMemberRequestSchema.safeParse({
        name: 'Ada',
        kind: 'human',
        motherId: 3,
        fatherId: 3,
      });

      expect(result.error?.issues).toEqual([
        expect.objectContaining({
          path: ['fatherId'],
          message: 'validation.parents.same',
        }),
      ]);
    });

    it('accepts both parents unknown', () => {
      expect(
        createFamilyMemberRequestSchema.safeParse({
          name: 'Ada',
          kind: 'human',
          motherId: null,
          fatherId: null,
        }).success,
      ).toBe(true);
    });

    it.each([0, -1, 1.5])('rejects parent id %j', (motherId) => {
      expect(
        createFamilyMemberRequestSchema.safeParse({
          name: 'Ada',
          kind: 'human',
          motherId,
        }).success,
      ).toBe(false);
    });

    it('reports an issue without its own key as validation.invalid with the fallback map', () => {
      const result = createFamilyMemberRequestSchema.safeParse(
        { name: 'Ada', kind: 'human', motherId: '3' },
        { error: fallbackErrorMap },
      );

      expect(result.error?.issues[0]?.message).toBe('validation.invalid');
    });
  });

  describe('updateFamilyMemberRequestSchema', () => {
    it('accepts a single field', () => {
      expect(
        updateFamilyMemberRequestSchema.parse({ deathDate: '2020-02-01' }),
      ).toEqual({ deathDate: '2020-02-01' });
    });

    it('accepts clearing a parent', () => {
      expect(updateFamilyMemberRequestSchema.parse({ motherId: null })).toEqual({
        motherId: null,
      });
    });

    it('rejects an empty update with the at-least-one-field key', () => {
      expect(
        updateFamilyMemberRequestSchema.safeParse({}).error?.issues[0]?.message,
      ).toBe('validation.atLeastOneField');
    });

    it('applies the cross-field rules to the fields it carries', () => {
      const result = updateFamilyMemberRequestSchema.safeParse({
        birthDate: '2000-01-02',
        deathDate: '2000-01-01',
        motherId: 4,
        fatherId: 4,
      });

      expect(result.error?.issues.map((issue) => issue.message)).toEqual([
        'validation.deathDate.beforeBirth',
        'validation.parents.same',
      ]);
    });
  });

  describe('familyMemberResponseSchema', () => {
    const familyMember = {
      id: 1,
      name: 'Ada',
      kind: 'human',
      description: null,
      birthDate: '1950-05-03',
      deathDate: null,
      motherId: null,
      fatherId: 2,
      createdAt: '2024-05-01T10:00:00.000Z',
      updatedAt: '2024-05-01T10:00:00.000Z',
    };

    it('accepts a family member as the api serializes it', () => {
      expect(familyMemberResponseSchema.parse(familyMember)).toEqual(familyMember);
    });

    it('rejects Date timestamps: the wire format is ISO strings', () => {
      expect(
        familyMemberResponseSchema.safeParse({
          ...familyMember,
          createdAt: new Date(),
        }).success,
      ).toBe(false);
    });

    it('parses the detail with parents, children and milestones', () => {
      const expectedDetail = {
        ...familyMember,
        mother: null,
        father: { id: 2, name: 'Jan', kind: 'human' },
        children: [{ id: 5, name: 'Burek', kind: 'animal' }],
        milestones: [
          {
            id: 9,
            date: '2024-05-01',
            title: 'Christening',
            category: 'holidays_and_celebrations',
          },
        ],
        media: [],
      };

      expect(familyMemberDetailResponseSchema.parse(expectedDetail)).toEqual(
        expectedDetail,
      );
    });

    it('requires the relations on the detail', () => {
      expect(familyMemberDetailResponseSchema.safeParse(familyMember).success).toBe(
        false,
      );
    });
  });
});
