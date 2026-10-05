import { createMock, type DeepMocked } from '@golevelup/ts-vitest';
import type {
  FamilyMemberDetailResponse,
  FamilyMemberResponse,
  MediaResponse,
} from '@time-capsule/shared';
import type { FamilyMember } from '../database/schema.js';
import { MediaService, type MediaRow } from '../media/media.service.js';
import { FamilyMembersController } from './family-members.controller.js';
import {
  FamilyMembersService,
  type FamilyMemberDetailRow,
} from './family-members.service.js';

describe('FamilyMembersController', () => {
  const familyMember: FamilyMember = {
    id: 2,
    name: 'Ola',
    kind: 'human',
    description: 'Loves **horses**.',
    birthDate: '1990-03-01',
    deathDate: null,
    motherId: 1,
    fatherId: null,
    createdAt: new Date('2024-05-01T10:00:00.000Z'),
    updatedAt: new Date('2024-05-02T08:30:00.000Z'),
  };

  const detailRow: FamilyMemberDetailRow = {
    ...familyMember,
    mother: { id: 1, name: 'Anna', kind: 'human' },
    father: null,
    children: [{ id: 5, name: 'Burek', kind: 'animal' }],
    milestones: [
      {
        id: 9,
        date: '1990-06-01',
        title: 'Christening',
        category: 'holidays_and_celebrations',
      },
    ],
    media: [],
  };

  const expectedResponse: FamilyMemberResponse = {
    id: 2,
    name: 'Ola',
    kind: 'human',
    description: 'Loves **horses**.',
    birthDate: '1990-03-01',
    deathDate: null,
    motherId: 1,
    fatherId: null,
    createdAt: '2024-05-01T10:00:00.000Z',
    updatedAt: '2024-05-02T08:30:00.000Z',
  };

  const expectedDetailResponse: FamilyMemberDetailResponse = {
    ...expectedResponse,
    mother: { id: 1, name: 'Anna', kind: 'human' },
    father: null,
    children: [{ id: 5, name: 'Burek', kind: 'animal' }],
    milestones: [
      {
        id: 9,
        date: '1990-06-01',
        title: 'Christening',
        category: 'holidays_and_celebrations',
      },
    ],
    media: [],
  };

  const mediaRow: MediaRow = {
    id: 6,
    storageKey: 'media/2f1c',
    contentType: 'image/webp',
    sizeBytes: 2048,
    status: 'ready',
    createdAt: new Date('2024-05-03T09:00:00.000Z'),
    url: 'http://storage.test/time-capsule-media/media/2f1c?X-Amz-Signature=abc',
  };

  const expectedMediaResponse: MediaResponse = {
    id: 6,
    url: 'http://storage.test/time-capsule-media/media/2f1c?X-Amz-Signature=abc',
    contentType: 'image/webp',
    sizeBytes: 2048,
    createdAt: '2024-05-03T09:00:00.000Z',
  };

  let serviceMock: DeepMocked<FamilyMembersService>;
  let mediaServiceMock: DeepMocked<MediaService>;
  let controller: FamilyMembersController;

  beforeEach(() => {
    serviceMock = createMock<FamilyMembersService>();
    mediaServiceMock = createMock<MediaService>();
    controller = new FamilyMembersController(serviceMock, mediaServiceMock);
  });

  it('lists family members without their relations', async () => {
    serviceMock.findAll.mockResolvedValue([familyMember]);

    await expect(controller.findAll()).resolves.toEqual([expectedResponse]);
  });

  it('gets one family member with parents, children and milestones', async () => {
    serviceMock.findOne.mockResolvedValue(detailRow);

    await expect(controller.findOne(2)).resolves.toEqual(
      expectedDetailResponse,
    );

    expect(serviceMock.findOne).toHaveBeenCalledWith(2);
  });

  it('creates a family member and answers with the detail', async () => {
    const request = { name: 'Ola', kind: 'human' as const, motherId: 1 };
    serviceMock.create.mockResolvedValue(detailRow);

    await expect(controller.create(request)).resolves.toEqual(
      expectedDetailResponse,
    );

    expect(serviceMock.create).toHaveBeenCalledWith(request);
  });

  it('updates a family member and answers with the detail', async () => {
    const request = { deathDate: '2024-01-01' };
    serviceMock.update.mockResolvedValue({ ...detailRow, ...request });

    await expect(controller.update(2, request)).resolves.toEqual({
      ...expectedDetailResponse,
      ...request,
    });

    expect(serviceMock.update).toHaveBeenCalledWith(2, request);
  });

  it('maps the photos on the detail', async () => {
    const expectedWithMedia = {
      ...expectedDetailResponse,
      media: [expectedMediaResponse],
    };
    serviceMock.findOne.mockResolvedValue({ ...detailRow, media: [mediaRow] });

    await expect(controller.findOne(2)).resolves.toEqual(expectedWithMedia);
  });

  it('replaces the photos and answers the new ordered set', async () => {
    const request = { mediaIds: [6], baseMediaIds: [5] };
    mediaServiceMock.replaceOwnerMedia.mockResolvedValue([mediaRow]);

    await expect(controller.replaceMedia(2, request)).resolves.toEqual([
      expectedMediaResponse,
    ]);

    expect(mediaServiceMock.replaceOwnerMedia).toHaveBeenCalledWith(
      { type: 'family_member', id: 2 },
      request,
    );
  });

  it('removes a family member', async () => {
    await controller.remove(2);

    expect(serviceMock.remove).toHaveBeenCalledWith(2);
  });

  it('removes a missing family member without error', async () => {
    serviceMock.remove.mockResolvedValue(0);

    await expect(controller.remove(2)).resolves.toBeUndefined();
  });
});
