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

  it('rejects an invalid body with the shared validation error body', async () => {
    const res = await request(app.getHttpServer())
      .post('/milestones')
      .send({ date: 'yesterday', title: '' })
      .expect(400);

    const body = validationErrorBodySchema.parse(res.body);

    expect(Object.keys(body.errors.fieldErrors)).toEqual(
      expect.arrayContaining(['date', 'title']),
    );
  });

  it('rejects a non-numeric id', async () => {
    await request(app.getHttpServer()).get('/milestones/abc').expect(400);
  });
});
