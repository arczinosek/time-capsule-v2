import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import {
  familyMemberDetailResponseSchema,
  milestoneResponseSchema,
  validationErrorBodySchema,
} from '@time-capsule/shared';
import { AppModule } from './../src/app.module.js';

describe('MilestonesController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs a full CRUD roundtrip', async () => {
    const server = app.getHttpServer();

    const created = await request(server)
      .post('/milestones')
      .send({ date: '2024-05-01', title: 'First steps' })
      .expect(201);

    // Every response must match the shared contract as serialized (ISO timestamps).
    const milestone = milestoneResponseSchema.parse(created.body);

    expect(milestone).toMatchObject({
      date: '2024-05-01',
      title: 'First steps',
      description: null,
      category: null,
      familyMembers: [],
    });

    const { id } = milestone;

    await request(server)
      .get(`/milestones/${id}`)
      .expect(200)
      .expect((res) =>
        expect(milestoneResponseSchema.parse(res.body)).toEqual(milestone),
      );

    await request(server)
      .get('/milestones')
      .expect(200)
      .expect((res) =>
        expect(milestoneResponseSchema.array().parse(res.body)).toContainEqual(
          milestone,
        ),
      );

    await request(server)
      .patch(`/milestones/${id}`)
      .send({ description: 'Three steps to the sofa.' })
      .expect(200)
      .expect((res) =>
        expect(milestoneResponseSchema.parse(res.body)).toMatchObject({
          id,
          title: 'First steps',
          description: 'Three steps to the sofa.',
        }),
      );

    await request(server).delete(`/milestones/${id}`).expect(204);
    await request(server)
      .get(`/milestones/${id}`)
      .expect(404)
      .expect((res) =>
        expect(res.body).toMatchObject({
          statusCode: 404,
          message: `Milestone ${id} not found`,
        }),
      );
    // Idempotent: deleting it again still answers 204.
    await request(server).delete(`/milestones/${id}`).expect(204);
  });

  it('rejects an invalid body with i18n keys per field', async () => {
    const res = await request(app.getHttpServer())
      .post('/milestones')
      .send({ date: 'yesterday', title: '' })
      .expect(400);

    const body = validationErrorBodySchema.parse(res.body);

    expect(body).toEqual({
      message: 'validation.failed',
      errors: {
        formErrors: [],
        fieldErrors: {
          date: ['validation.date.invalid'],
          title: ['validation.title.required'],
        },
      },
    });
  });

  it('reports a value of the wrong type with the fallback key', async () => {
    const res = await request(app.getHttpServer())
      .post('/milestones')
      .send({ date: '2024-05-01', title: 42 })
      .expect(400);

    expect(
      validationErrorBodySchema.parse(res.body).errors.fieldErrors,
    ).toEqual({ title: ['validation.invalid'] });
  });

  it('stores, changes and clears the category', async () => {
    const server = app.getHttpServer();

    const created = await request(server)
      .post('/milestones')
      .send({
        date: '2024-06-01',
        title: 'Seaside trip',
        category: 'travels_and_adventures',
      })
      .expect(201);
    const { id, category } = milestoneResponseSchema.parse(created.body);

    try {
      expect(category).toBe('travels_and_adventures');

      await request(server)
        .get(`/milestones/${id}`)
        .expect(200)
        .expect((res) =>
          expect(milestoneResponseSchema.parse(res.body).category).toBe(
            'travels_and_adventures',
          ),
        );

      await request(server)
        .patch(`/milestones/${id}`)
        .send({ category: 'holidays_and_celebrations' })
        .expect(200)
        .expect((res) =>
          expect(milestoneResponseSchema.parse(res.body).category).toBe(
            'holidays_and_celebrations',
          ),
        );

      await request(server)
        .patch(`/milestones/${id}`)
        .send({ category: null })
        .expect(200)
        .expect((res) =>
          expect(milestoneResponseSchema.parse(res.body).category).toBeNull(),
        );
    } finally {
      await request(server).delete(`/milestones/${id}`).expect(204);
    }
  });

  it('rejects an unknown category', async () => {
    const res = await request(app.getHttpServer())
      .post('/milestones')
      .send({ date: '2024-06-01', title: 'Trip', category: 'travel' })
      .expect(400);

    expect(
      validationErrorBodySchema.parse(res.body).errors.fieldErrors,
    ).toEqual({ category: ['validation.category.invalid'] });
  });

  it('rejects a description over 65,535 UTF-8 bytes', async () => {
    const res = await request(app.getHttpServer())
      .post('/milestones')
      .send({
        date: '2024-06-01',
        title: 'Long',
        description: 'ą'.repeat(32_768),
      })
      .expect(400);

    expect(
      validationErrorBodySchema.parse(res.body).errors.fieldErrors,
    ).toEqual({ description: ['validation.description.tooLong'] });
  });

  it('stores a description of exactly 65,535 UTF-8 bytes (a full MySQL TEXT)', async () => {
    const server = app.getHttpServer();
    const expectedDescription = 'ą'.repeat(32_767) + 'a';

    const created = await request(server)
      .post('/milestones')
      .send({
        date: '2024-06-01',
        title: 'Long',
        description: expectedDescription,
      })
      .expect(201);
    const { id } = milestoneResponseSchema.parse(created.body);

    try {
      await request(server)
        .get(`/milestones/${id}`)
        .expect(200)
        .expect((res) =>
          expect(milestoneResponseSchema.parse(res.body).description).toBe(
            expectedDescription,
          ),
        );
    } finally {
      await request(server).delete(`/milestones/${id}`).expect(204);
    }
  });

  it('rejects a non-numeric id', async () => {
    await request(app.getHttpServer()).get('/milestones/abc').expect(400);
  });

  describe('participants', () => {
    // Other e2e files share the database and run in parallel: unique names, no counts.
    const unique = (name: string) =>
      `${name} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const familyMemberIds: number[] = [];
    const milestoneIds: number[] = [];

    afterAll(async () => {
      const server = app.getHttpServer();
      for (const id of milestoneIds) {
        await request(server).delete(`/milestones/${id}`);
      }
      for (const id of familyMemberIds) {
        await request(server).delete(`/family-members/${id}`);
      }
    });

    async function createFamilyMember(name: string) {
      const res = await request(app.getHttpServer())
        .post('/family-members')
        .send({ name: unique(name), kind: 'human' })
        .expect(201);
      const {
        id,
        name: storedName,
        kind,
      } = familyMemberDetailResponseSchema.parse(res.body);
      familyMemberIds.push(id);
      return { id, name: storedName, kind };
    }

    async function createMilestone(body: object) {
      const res = await request(app.getHttpServer())
        .post('/milestones')
        .send({ date: '2024-06-01', title: unique('Party'), ...body })
        .expect(201);
      const milestone = milestoneResponseSchema.parse(res.body);
      milestoneIds.push(milestone.id);
      return milestone;
    }

    async function getMilestone(id: number) {
      const res = await request(app.getHttpServer())
        .get(`/milestones/${id}`)
        .expect(200);
      return milestoneResponseSchema.parse(res.body);
    }

    it('stores the participants sorted by name and lists the milestone on their page', async () => {
      const zofia = await createFamilyMember('Zofia');
      const adam = await createFamilyMember('Adam');

      const milestone = await createMilestone({
        category: 'holidays_and_celebrations',
        // Out of name order, and a duplicate: stored once, answered sorted.
        familyMemberIds: [zofia.id, adam.id, zofia.id],
      });

      expect(milestone.familyMembers).toEqual([adam, zofia]);
      expect((await getMilestone(milestone.id)).familyMembers).toEqual([
        adam,
        zofia,
      ]);
      await request(app.getHttpServer())
        .get(`/family-members/${adam.id}`)
        .expect(200)
        .expect((res) =>
          expect(
            familyMemberDetailResponseSchema.parse(res.body).milestones,
          ).toEqual([
            {
              id: milestone.id,
              date: '2024-06-01',
              title: milestone.title,
              category: 'holidays_and_celebrations',
            },
          ]),
        );
      await request(app.getHttpServer())
        .get('/milestones')
        .expect(200)
        .expect((res) =>
          expect(
            milestoneResponseSchema
              .array()
              .parse(res.body)
              .find(({ id }) => id === milestone.id)?.familyMembers,
          ).toEqual([adam, zofia]),
        );
    });

    it('replaces the set on a PATCH of the participants only, and clears it with []', async () => {
      const server = app.getHttpServer();
      const anna = await createFamilyMember('Anna');
      const jan = await createFamilyMember('Jan');
      const milestone = await createMilestone({ familyMemberIds: [anna.id] });

      await request(server)
        .patch(`/milestones/${milestone.id}`)
        .send({ familyMemberIds: [jan.id] })
        .expect(200)
        .expect((res) =>
          expect(milestoneResponseSchema.parse(res.body)).toMatchObject({
            title: milestone.title,
            familyMembers: [jan],
          }),
        );

      // A PATCH without the key leaves the participants alone.
      await request(server)
        .patch(`/milestones/${milestone.id}`)
        .send({ description: 'Cake.' })
        .expect(200)
        .expect((res) =>
          expect(milestoneResponseSchema.parse(res.body).familyMembers).toEqual(
            [jan],
          ),
        );

      await request(server)
        .patch(`/milestones/${milestone.id}`)
        .send({ familyMemberIds: [] })
        .expect(200)
        .expect((res) =>
          expect(milestoneResponseSchema.parse(res.body).familyMembers).toEqual(
            [],
          ),
        );
    });

    it('rejects an unknown participant on familyMemberIds and writes nothing', async () => {
      const server = app.getHttpServer();
      const anna = await createFamilyMember('Anna');
      const jan = await createFamilyMember('Jan');
      const milestone = await createMilestone({ familyMemberIds: [anna.id] });
      const expectedFieldErrors = {
        familyMemberIds: ['validation.familyMember.notFound'],
      };

      const patched = await request(server)
        .patch(`/milestones/${milestone.id}`)
        .send({ title: 'Renamed', familyMemberIds: [jan.id, 999_999_999] })
        .expect(400);

      expect(
        validationErrorBodySchema.parse(patched.body).errors.fieldErrors,
      ).toEqual(expectedFieldErrors);
      // Rolled back: neither the title nor the participants changed.
      expect(await getMilestone(milestone.id)).toMatchObject({
        title: milestone.title,
        familyMembers: [anna],
      });

      const title = unique('Never stored');
      const created = await request(server)
        .post('/milestones')
        .send({ date: '2024-06-01', title, familyMemberIds: [999_999_999] })
        .expect(400);

      expect(
        validationErrorBodySchema.parse(created.body).errors.fieldErrors,
      ).toEqual(expectedFieldErrors);
      await request(server)
        .get('/milestones')
        .expect(200)
        .expect((res) =>
          expect(
            milestoneResponseSchema
              .array()
              .parse(res.body)
              .map((m) => m.title),
          ).not.toContain(title),
        );
    });

    it('drops the link when either side is deleted', async () => {
      const server = app.getHttpServer();
      const anna = await createFamilyMember('Anna');
      const jan = await createFamilyMember('Jan');
      const milestone = await createMilestone({
        familyMemberIds: [anna.id, jan.id],
      });

      await request(server).delete(`/family-members/${anna.id}`).expect(204);

      expect((await getMilestone(milestone.id)).familyMembers).toEqual([jan]);

      await request(server).delete(`/milestones/${milestone.id}`).expect(204);
      await request(server)
        .get(`/family-members/${jan.id}`)
        .expect(200)
        .expect((res) =>
          expect(
            familyMemberDetailResponseSchema.parse(res.body).milestones,
          ).toEqual([]),
        );
    });

    it('rejects a malformed participant id', async () => {
      const res = await request(app.getHttpServer())
        .post('/milestones')
        .send({ date: '2024-06-01', title: 'Party', familyMemberIds: [0] })
        .expect(400);

      expect(
        validationErrorBodySchema.parse(res.body).errors.fieldErrors,
      ).toEqual({ familyMemberIds: ['validation.invalid'] });
    });
  });
});
