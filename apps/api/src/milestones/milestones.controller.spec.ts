import { createMock, type DeepMocked } from '@golevelup/ts-vitest';
import type { MilestoneResponse } from '@time-capsule/shared';
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
    createdAt: '2024-05-01T10:00:00.000Z',
    updatedAt: '2024-05-02T08:30:00.000Z',
  };

  let serviceMock: DeepMocked<MilestonesService>;
  let controller: MilestonesController;

  beforeEach(() => {
    serviceMock = createMock<MilestonesService>();
    controller = new MilestonesController(serviceMock);
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
    serviceMock.update.mockResolvedValue({ ...milestone, familyMembers: [] });

    await expect(controller.update(1, request)).resolves.toEqual({
      ...expectedResponse,
      familyMembers: [],
    });

    expect(serviceMock.update).toHaveBeenCalledWith(1, request);
  });

  it('updates a milestone', async () => {
    const request = { title: 'Renamed' };
    serviceMock.update.mockResolvedValue({ ...milestone, ...request });

    await expect(controller.update(1, request)).resolves.toEqual({
      ...expectedResponse,
      ...request,
    });

    expect(serviceMock.update).toHaveBeenCalledWith(1, request);
  });

  it('maps the category', async () => {
    serviceMock.findOne.mockResolvedValue({
      ...milestone,
      category: 'travels_and_adventures',
    });

    await expect(controller.findOne(1)).resolves.toEqual({
      ...expectedResponse,
      category: 'travels_and_adventures',
    });
  });

  it('removes a milestone', async () => {
    await controller.remove(1);

    expect(serviceMock.remove).toHaveBeenCalledWith(1);
  });

  it('removes a missing milestone without error', async () => {
    await expect(controller.remove(1)).resolves.toBeUndefined();
  });
});
