import {
  createLocationRequestSchema,
  locationResponseSchema,
  updateLocationRequestSchema,
} from './locations.js';
import { fallbackErrorMap } from './messages.js';

describe('location schemas', () => {
  describe('createLocationRequestSchema', () => {
    it('accepts a location and trims the name', () => {
      expect(
        createLocationRequestSchema.parse({
          name: '  Kraków, Rynek  ',
          latitude: 50.061698,
          longitude: 19.937206,
        }),
      ).toEqual({ name: 'Kraków, Rynek', latitude: 50.061698, longitude: 19.937206 });
    });

    it.each([
      [-90, -180],
      [90, 180],
      [-33.856784, -151.215297],
    ])('accepts the coordinates %d, %d', (latitude, longitude) => {
      expect(
        createLocationRequestSchema.safeParse({ name: 'Edge', latitude, longitude })
          .success,
      ).toBe(true);
    });

    it('rejects a blank name with the place-name key', () => {
      const result = createLocationRequestSchema.safeParse({
        name: '  ',
        latitude: 0,
        longitude: 0,
      });

      expect(result.error?.issues[0]?.message).toBe('validation.placeName.required');
    });

    it('rejects a name longer than 255 characters', () => {
      const result = createLocationRequestSchema.safeParse({
        name: 'a'.repeat(256),
        latitude: 0,
        longitude: 0,
      });

      expect(result.error?.issues[0]?.message).toBe('validation.placeName.tooLong');
    });

    it.each([90.000001, -90.000001, '52.1', undefined, Number.NaN])(
      'rejects latitude %j with the latitude key',
      (latitude) => {
        const result = createLocationRequestSchema.safeParse(
          { name: 'Somewhere', latitude, longitude: 0 },
          { error: fallbackErrorMap },
        );

        expect(result.error?.issues.map((issue) => issue.message)).toEqual([
          'validation.latitude.invalid',
        ]);
      },
    );

    it.each([180.000001, -180.000001, '19.9', undefined])(
      'rejects longitude %j with the longitude key',
      (longitude) => {
        const result = createLocationRequestSchema.safeParse(
          { name: 'Somewhere', latitude: 0, longitude },
          { error: fallbackErrorMap },
        );

        expect(result.error?.issues.map((issue) => issue.message)).toEqual([
          'validation.longitude.invalid',
        ]);
      },
    );
  });

  describe('updateLocationRequestSchema', () => {
    it('accepts a partial update', () => {
      expect(updateLocationRequestSchema.parse({ latitude: 1.5 })).toEqual({
        latitude: 1.5,
      });
    });

    it('rejects an empty update with the at-least-one-field key', () => {
      expect(
        updateLocationRequestSchema.safeParse({}).error?.issues[0]?.message,
      ).toBe('validation.atLeastOneField');
    });
  });

  describe('locationResponseSchema', () => {
    const location = {
      id: 1,
      name: 'Kraków, Rynek',
      latitude: 50.061698,
      longitude: 19.937206,
      place: null,
      createdAt: '2024-05-01T10:00:00.000Z',
      updatedAt: '2024-05-01T10:00:00.000Z',
    };

    it('accepts a location as the api serializes it, with and without its place', () => {
      expect(locationResponseSchema.parse(location)).toEqual(location);

      const expectedLocation = { ...location, place: { id: 2, name: 'Home' } };
      expect(locationResponseSchema.parse(expectedLocation)).toEqual(
        expectedLocation,
      );
    });

    it('rejects string coordinates and Date timestamps', () => {
      expect(
        locationResponseSchema.safeParse({ ...location, latitude: '50.061698' })
          .success,
      ).toBe(false);
      expect(
        locationResponseSchema.safeParse({ ...location, createdAt: new Date() })
          .success,
      ).toBe(false);
    });
  });
});
