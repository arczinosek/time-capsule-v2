import { createMock, type DeepMocked } from '@golevelup/ts-vitest';
import type { CreateMediaResponse, MediaResponse } from '@time-capsule/shared';
import { MediaController } from './media.controller.js';
import { MediaService, type MediaRow } from './media.service.js';

describe('MediaController', () => {
  const row: MediaRow = {
    id: 4,
    storageKey: 'media/2f1c',
    contentType: 'image/png',
    sizeBytes: 1024,
    status: 'ready',
    createdAt: new Date('2024-05-01T10:00:00.000Z'),
    url: 'http://storage.test/time-capsule-media/media/2f1c?X-Amz-Signature=abc',
  };

  const expectedResponse: MediaResponse = {
    id: 4,
    url: 'http://storage.test/time-capsule-media/media/2f1c?X-Amz-Signature=abc',
    contentType: 'image/png',
    sizeBytes: 1024,
    createdAt: '2024-05-01T10:00:00.000Z',
  };

  let serviceMock: DeepMocked<MediaService>;
  let controller: MediaController;

  beforeEach(() => {
    serviceMock = createMock<MediaService>();
    controller = new MediaController(serviceMock);
  });

  it('lists the library without storage keys or statuses', async () => {
    serviceMock.findLibrary.mockResolvedValue([row]);

    await expect(controller.findAll()).resolves.toEqual([expectedResponse]);
  });

  it('answers an upload request with the presigned POST', async () => {
    const request = {
      target: { type: 'milestone' as const, id: 1 },
      contentType: 'image/png' as const,
      size: 1024,
    };
    // More than the service's type promises: the controller must pick its fields, so a
    // storage key or status the service might carry never reaches the response.
    const created = {
      mediaId: 4,
      url: 'http://storage.test/time-capsule-media',
      fields: { key: 'media/2f1c', 'Content-Type': 'image/png' },
      storageKey: 'media/2f1c',
      status: 'pending',
    };
    const expectedResponse: CreateMediaResponse = {
      mediaId: 4,
      url: 'http://storage.test/time-capsule-media',
      fields: { key: 'media/2f1c', 'Content-Type': 'image/png' },
    };
    serviceMock.create.mockResolvedValue(created);

    await expect(controller.create(request)).resolves.toStrictEqual(
      expectedResponse,
    );

    expect(serviceMock.create).toHaveBeenCalledWith(request);
  });

  it('confirms an upload', async () => {
    serviceMock.confirm.mockResolvedValue(row);

    await expect(controller.confirm(4)).resolves.toEqual(expectedResponse);

    expect(serviceMock.confirm).toHaveBeenCalledWith(4);
  });

  it('removes media, also when it is already gone', async () => {
    serviceMock.remove.mockResolvedValue(0);

    await expect(controller.remove(4)).resolves.toBeUndefined();

    expect(serviceMock.remove).toHaveBeenCalledWith(4);
  });
});
