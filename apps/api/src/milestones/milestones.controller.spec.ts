import { createMock, type DeepMocked } from '@golevelup/ts-vitest';
import type { MediaResponse, MilestoneResponse } from '@time-capsule/shared';
import { MediaService, type MediaRow } from '../media/media.service.js';
import { MilestonesController } from './milestones.controller.js';
import { MilestonesService, type MilestoneRow } from './milestones.service.js';

describe('MilestonesController', () => {
  const milestone: MilestoneRow = {
    id: 1,
    date: '2024-05-01',
    title: 'First steps',
    description: null,
    category: null,
    familyMembers: [{ id: 3, name: 'Ada', kind: 'human' }],
    locationId: null,
    location: null,
    place: null,
    media: [],
    createdAt: new Date('2024-05-01T10:00:00.000Z'),
    updatedAt: new Date('2024-05-02T08:30:00.000Z'),
  };

  const expectedResponse: MilestoneResponse = {
    id: 1,
    date: '2024-05-01',
    title: 'First steps',
    description: null,
    category: null,
    familyMembers: [{ id: 3, name: 'Ada', kind: 'human' }],
    location: null,
    place: null,
    media: [],
    createdAt: '2024-05-01T10:00:00.000Z',
    updatedAt: '2024-05-02T08:30:00.000Z',
  };

  const mediaRow: MediaRow = {
    id: 6,
    storageKey: 'media/2f1c',
    contentType: 'image/jpeg',
    sizeBytes: 2048,
    status: 'ready',
    createdAt: new Date('2024-05-03T09:00:00.000Z'),
    url: 'http://storage.test/time-capsule-media/media/2f1c?X-Amz-Signature=abc',
  };

  const expectedMediaResponse: MediaResponse = {
    id: 6,
    url: 'http://storage.test/time-capsule-media/media/2f1c?X-Amz-Signature=abc',
    contentType: 'image/jpeg',
    sizeBytes: 2048,
    createdAt: '2024-05-03T09:00:00.000Z',
  };

  let serviceMock: DeepMocked<MilestonesService>;
  let mediaServiceMock: DeepMocked<MediaService>;
  let controller: MilestonesController;

  beforeEach(() => {
    serviceMock = createMock<MilestonesService>();
    mediaServiceMock = createMock<MediaService>();
    controller = new MilestonesController(serviceMock, mediaServiceMock);
  });

  it('lists milestones', async () => {
    serviceMock.findAll.mockResolvedValue([milestone]);

    await expect(controller.findAll()).resolves.toEqual([expectedResponse]);
  });

  it('gets one milestone', async () => {
    serviceMock.findOne.mockResolvedValue(milestone);

    await expect(controller.findOne(1)).resolves.toEqual(expectedResponse);

    expect(serviceMock.findOne).toHaveBeenCalledWith(1);
  });

  it('creates a milestone', async () => {
    const request = { date: '2024-05-01', title: 'First steps' };
    serviceMock.create.mockResolvedValue(milestone);

    await expect(controller.create(request)).resolves.toEqual(expectedResponse);

    expect(serviceMock.create).toHaveBeenCalledWith(request);
  });

  it('creates a milestone with participants', async () => {
    const request = {
      date: '2024-05-01',
      title: 'First steps',
      familyMemberIds: [3],
    };
    serviceMock.create.mockResolvedValue(milestone);

    await expect(controller.create(request)).resolves.toEqual(expectedResponse);

    expect(serviceMock.create).toHaveBeenCalledWith(request);
  });

  it('updates the participants only', async () => {
    const request = { familyMemberIds: [] };
    const expectedUpdated = { ...expectedResponse, familyMembers: [] };
    serviceMock.update.mockResolvedValue({ ...milestone, familyMembers: [] });

    await expect(controller.update(1, request)).resolves.toEqual(
      expectedUpdated,
    );

    expect(serviceMock.update).toHaveBeenCalledWith(1, request);
  });

  it('updates a milestone', async () => {
    const request = { title: 'Renamed' };
    const expectedUpdated = { ...expectedResponse, title: 'Renamed' };
    serviceMock.update.mockResolvedValue({ ...milestone, ...request });

    await expect(controller.update(1, request)).resolves.toEqual(
      expectedUpdated,
    );

    expect(serviceMock.update).toHaveBeenCalledWith(1, request);
  });

  it('maps the category', async () => {
    const expectedWithCategory = {
      ...expectedResponse,
      category: 'travels_and_adventures',
    };
    serviceMock.findOne.mockResolvedValue({
      ...milestone,
      category: 'travels_and_adventures',
    });

    await expect(controller.findOne(1)).resolves.toEqual(expectedWithCategory);
  });

  it('maps the location and its derived place', async () => {
    const location = {
      id: 4,
      name: 'Kraków',
      latitude: 50.061698,
      longitude: 19.937206,
    };
    const place = { id: 5, name: 'Home' };
    const expectedWithLocation = {
      ...expectedResponse,
      location: { ...location },
      place: { ...place },
    };
    serviceMock.findOne.mockResolvedValue({
      ...milestone,
      locationId: 4,
      location,
      place,
    });

    await expect(controller.findOne(1)).resolves.toEqual(expectedWithLocation);
  });

  it('maps the photos without their storage keys', async () => {
    const expectedWithMedia = {
      ...expectedResponse,
      media: [expectedMediaResponse],
    };
    serviceMock.findOne.mockResolvedValue({ ...milestone, media: [mediaRow] });

    await expect(controller.findOne(1)).resolves.toEqual(expectedWithMedia);
  });

  it('creates a milestone at a location', async () => {
    const request = { date: '2024-05-01', title: 'First steps', locationId: 4 };
    serviceMock.create.mockResolvedValue(milestone);

    await controller.create(request);

    expect(serviceMock.create).toHaveBeenCalledWith(request);
  });

  it('replaces the photos and answers the new ordered set', async () => {
    const request = { mediaIds: [6], baseMediaIds: [5] };
    mediaServiceMock.replaceOwnerMedia.mockResolvedValue([mediaRow]);

    await expect(controller.replaceMedia(1, request)).resolves.toEqual([
      expectedMediaResponse,
    ]);

    expect(mediaServiceMock.replaceOwnerMedia).toHaveBeenCalledWith(
      { type: 'milestone', id: 1 },
      request,
    );
  });

  it('removes a milestone', async () => {
    await controller.remove(1);

    expect(serviceMock.remove).toHaveBeenCalledWith(1);
  });

  it('removes a missing milestone without error', async () => {
    serviceMock.remove.mockResolvedValue(0);

    await expect(controller.remove(1)).resolves.toBeUndefined();
  });
});
