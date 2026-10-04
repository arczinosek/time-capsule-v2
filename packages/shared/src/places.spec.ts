import {
  createPlaceRequestSchema,
  placeDetailResponseSchema,
  placeResponseSchema,
  updatePlaceRequestSchema,
} from './places.js';

describe('place schemas', () => {
  describe('createPlaceRequestSchema', () => {
    it('accepts a place without a location and trims the name', () => {
      expect(createPlaceRequestSchema.parse({ name: '  Grandma’s house ' })).toEqual({
        name: 'Grandma’s house',
      });
    });

    it('accepts a description and a location, or null for either', () => {
      const request = { name: 'Lake', description: 'Cold **water**.', locationId: 3 };

      expect(createPlaceRequestSchema.parse(request)).toEqual(request);
      expect(
        createPlaceRequestSchema.safeParse({
          name: 'Lake',
          description: null,
          locationId: null,
        }).success,
      ).toBe(true);
    });

    it('rejects a blank name with the place-name key', () => {
      expect(
        createPlaceRequestSchema.safeParse({ name: '' }).error?.issues[0]?.message,
      ).toBe('validation.placeName.required');
    });

    it('rejects a description over 65,535 UTF-8 bytes', () => {
      expect(
        createPlaceRequestSchema.safeParse({
          name: 'Lake',
          description: 'ą'.repeat(32_768),
        }).error?.issues[0]?.message,
      ).toBe('validation.description.tooLong');
    });

    it.each([0, -1, 1.5, '3'])('rejects locationId %j', (locationId) => {
      expect(
        createPlaceRequestSchema.safeParse({ name: 'Lake', locationId }).success,
      ).toBe(false);
    });
  });

  describe('updatePlaceRequestSchema', () => {
    it('accepts clearing the location only', () => {
      expect(updatePlaceRequestSchema.parse({ locationId: null })).toEqual({
        locationId: null,
      });
    });

    it('rejects an empty update with the at-least-one-field key', () => {
      expect(
        updatePlaceRequestSchema.safeParse({}).error?.issues[0]?.message,
      ).toBe('validation.atLeastOneField');
    });
  });

  describe('placeResponseSchema', () => {
    const place = {
      id: 1,
      name: 'Home',
      description: null,
      location: { id: 2, name: 'Kraków', latitude: 50.061698, longitude: 19.937206 },
      createdAt: '2024-05-01T10:00:00.000Z',
      updatedAt: '2024-05-01T10:00:00.000Z',
    };

    it('accepts a place with and without a location', () => {
      expect(placeResponseSchema.parse(place)).toEqual(place);
      expect(placeResponseSchema.parse({ ...place, location: null }).location).toBeNull();
    });

    it('requires the milestones on the detail', () => {
      expect(placeDetailResponseSchema.safeParse(place).success).toBe(false);

      const expectedDetail = {
        ...place,
        milestones: [
          { id: 4, date: '2024-05-01', title: 'Moved in', category: 'home_and_places' },
        ],
      };
      expect(placeDetailResponseSchema.parse(expectedDetail)).toEqual(expectedDetail);
    });
  });
});
