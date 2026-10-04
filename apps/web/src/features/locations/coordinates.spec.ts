import {
  formatCoordinates,
  osmLink,
  parseCoordinate,
  roundCoordinate,
} from './coordinates';

describe('parseCoordinate', () => {
  it.each([
    ['50.061698', 50.061698],
    ['50,061698', 50.061698],
    ['  -33,8567 ', -33.8567],
    ['+19', 19],
    ['0', 0],
    ['.5', 0.5],
  ])('reads %j as %d', (input, expectedValue) => {
    expect(parseCoordinate(input)).toBe(expectedValue);
  });

  it.each(['', ' ', 'abc', '1,2,3', '50.1.2', '1e3', '50°', '0x10'])(
    'reads %j as NaN',
    (input) => {
      expect(parseCoordinate(input)).toBeNaN();
    },
  );
});

describe('roundCoordinate', () => {
  it('keeps the 6 decimals the api stores', () => {
    expect(roundCoordinate(50.06169849999)).toBe(50.061698);
    expect(roundCoordinate(-19.9372066)).toBe(-19.937207);
  });
});

describe('formatCoordinates', () => {
  it('writes decimal points in English', () => {
    expect(formatCoordinates(50.061698, 19.937206, 'en')).toBe(
      '50.061698°, 19.937206°',
    );
    expect(formatCoordinates(-33.856784, 151.2, 'en')).toBe(
      '-33.856784°, 151.2°',
    );
  });

  it('writes decimal commas and a semicolon in Polish', () => {
    expect(formatCoordinates(50.061698, 19.937206, 'pl')).toBe(
      '50,061698°; 19,937206°',
    );
    expect(formatCoordinates(-33.856784, 151.2, 'pl')).toBe(
      '-33,856784°; 151,2°',
    );
  });
});

describe('osmLink', () => {
  it('points openstreetmap.org at the point with a marker', () => {
    expect(osmLink(50.061698, -19.937206)).toBe(
      'https://www.openstreetmap.org/?mlat=50.061698&mlon=-19.937206#map=16/50.061698/-19.937206',
    );
  });
});
