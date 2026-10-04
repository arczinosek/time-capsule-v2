import { createMock, type DeepMocked } from '@golevelup/ts-vitest';
import type { PlaceDetailResponse, PlaceResponse } from '@time-capsule/shared';
import { PlacesController } from './places.controller.js';
import {
  PlacesService,
  type PlaceDetailRow,
  type PlaceRow,
} from './places.service.js';

describe('PlacesController', () => {
  const location = {
    id: 4,
    name: 'Kraków',
    latitude: 50.061698,
    longitude: 19.937206,
  };

  const place: PlaceRow = {
    id: 2,
    name: 'Home',
    description: 'Where we **grew up**.',
    locationId: 4,
    location,
    createdAt: new Date('2024-05-01T10:00:00.000Z'),
    updatedAt: new Date('2024-05-02T08:30:00.000Z'),
  };

  const detailRow: PlaceDetailRow = {
    ...place,
    milestones: [
      {
        id: 9,
        date: '1990-06-01',
        title: 'Moved in',
        category: 'home_and_places',
      },
    ],
  };

  const expectedResponse: PlaceResponse = {
    id: 2,
    name: 'Home',
    description: 'Where we **grew up**.',
    location,
    createdAt: '2024-05-01T10:00:00.000Z',
    updatedAt: '2024-05-02T08:30:00.000Z',
  };

  const expectedDetailResponse: PlaceDetailResponse = {
    ...expectedResponse,
    milestones: [
      {
        id: 9,
        date: '1990-06-01',
        title: 'Moved in',
        category: 'home_and_places',
      },
    ],
  };

  let serviceMock: DeepMocked<PlacesService>;
  let controller: PlacesController;

  beforeEach(() => {
    serviceMock = createMock<PlacesService>();
    controller = new PlacesController(serviceMock);
  });

  it('lists places with their location, or null without one', async () => {
    serviceMock.findAll.mockResolvedValue([
      place,
      { ...place, id: 3, locationId: null, location: null },
    ]);

    await expect(controller.findAll()).resolves.toEqual([
      expectedResponse,
      { ...expectedResponse, id: 3, location: null },
    ]);
  });

  it('gets one place with the milestones on its location', async () => {
    serviceMock.findOne.mockResolvedValue(detailRow);

    await expect(controller.findOne(2)).resolves.toEqual(
      expectedDetailResponse,
    );

    expect(serviceMock.findOne).toHaveBeenCalledWith(2);
  });

  it('creates a place and answers with the detail', async () => {
    const request = { name: 'Home', locationId: 4 };
    serviceMock.create.mockResolvedValue(detailRow);

    await expect(controller.create(request)).resolves.toEqual(
      expectedDetailResponse,
    );

    expect(serviceMock.create).toHaveBeenCalledWith(request);
  });

  it('updates a place and answers with the detail', async () => {
    const request = { locationId: null };
    serviceMock.update.mockResolvedValue({
      ...detailRow,
      locationId: null,
      location: null,
      milestones: [],
    });

    await expect(controller.update(2, request)).resolves.toEqual({
      ...expectedDetailResponse,
      location: null,
      milestones: [],
    });

    expect(serviceMock.update).toHaveBeenCalledWith(2, request);
  });

  it('removes a place', async () => {
    await controller.remove(2);

    expect(serviceMock.remove).toHaveBeenCalledWith(2);
  });

  it('removes a missing place without error', async () => {
    serviceMock.remove.mockResolvedValue(0);

    await expect(controller.remove(2)).resolves.toBeUndefined();
  });
});
