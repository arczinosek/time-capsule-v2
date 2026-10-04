import { createMock, type DeepMocked } from '@golevelup/ts-vitest';
import type { LocationResponse } from '@time-capsule/shared';
import { LocationsController } from './locations.controller.js';
import { LocationsService, type LocationRow } from './locations.service.js';

describe('LocationsController', () => {
  const location: LocationRow = {
    id: 1,
    name: 'Kraków, Rynek',
    latitude: 50.061698,
    longitude: 19.937206,
    place: null,
    createdAt: new Date('2024-05-01T10:00:00.000Z'),
    updatedAt: new Date('2024-05-02T08:30:00.000Z'),
  };

  const expectedResponse: LocationResponse = {
    id: 1,
    name: 'Kraków, Rynek',
    latitude: 50.061698,
    longitude: 19.937206,
    place: null,
    createdAt: '2024-05-01T10:00:00.000Z',
    updatedAt: '2024-05-02T08:30:00.000Z',
  };

  let serviceMock: DeepMocked<LocationsService>;
  let controller: LocationsController;

  beforeEach(() => {
    serviceMock = createMock<LocationsService>();
    controller = new LocationsController(serviceMock);
  });

  it('lists locations with the place that owns them', async () => {
    serviceMock.findAll.mockResolvedValue([
      location,
      { ...location, id: 2, place: { id: 7, name: 'Home' } },
    ]);

    await expect(controller.findAll()).resolves.toEqual([
      expectedResponse,
      { ...expectedResponse, id: 2, place: { id: 7, name: 'Home' } },
    ]);
  });

  it('gets one location', async () => {
    serviceMock.findOne.mockResolvedValue(location);

    await expect(controller.findOne(1)).resolves.toEqual(expectedResponse);

    expect(serviceMock.findOne).toHaveBeenCalledWith(1);
  });

  it('creates a location', async () => {
    const request = {
      name: 'Kraków, Rynek',
      latitude: 50.061698,
      longitude: 19.937206,
    };
    serviceMock.create.mockResolvedValue(location);

    await expect(controller.create(request)).resolves.toEqual(expectedResponse);

    expect(serviceMock.create).toHaveBeenCalledWith(request);
  });

  it('updates a location', async () => {
    const request = { latitude: -33.856784 };
    serviceMock.update.mockResolvedValue({ ...location, ...request });

    await expect(controller.update(1, request)).resolves.toEqual({
      ...expectedResponse,
      ...request,
    });

    expect(serviceMock.update).toHaveBeenCalledWith(1, request);
  });

  it('removes a location', async () => {
    await controller.remove(1);

    expect(serviceMock.remove).toHaveBeenCalledWith(1);
  });

  it('removes a missing location without error', async () => {
    serviceMock.remove.mockResolvedValue(0);

    await expect(controller.remove(1)).resolves.toBeUndefined();
  });
});
