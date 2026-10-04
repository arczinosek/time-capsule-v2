import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import {
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
});
