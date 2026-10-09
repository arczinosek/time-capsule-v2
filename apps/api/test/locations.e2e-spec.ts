import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import {
  locationResponseSchema,
  milestoneResponseSchema,
  placeDetailResponseSchema,
  validationErrorBodySchema,
  type CreateLocationRequest,
} from '@time-capsule/shared';
import { AppModule } from './../src/app.module.js';

// Other e2e files share the database and run in parallel: unique names, no counts.
const unique = (name: string) =>
  `${name} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe('LocationsController (e2e)', () => {
  let app: INestApplication<App>;
  const milestoneIds: number[] = [];
  const placeIds: number[] = [];
  const locationIds: number[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();

    await app.init();
  });

  afterAll(async () => {
    const server = app.getHttpServer();

    for (const id of milestoneIds) {
      await request(server).delete(`/milestones/${id}`);
    }

    for (const id of placeIds) {
      await request(server).delete(`/places/${id}`);
    }

    for (const id of locationIds) {
      await request(server).delete(`/locations/${id}`);
    }

    await app.close();
  });

  async function create(body: CreateLocationRequest) {
    const res = await request(app.getHttpServer())
      .post('/locations')
      .send(body)
      .expect(201);

    const location = locationResponseSchema.parse(res.body);

    locationIds.push(location.id);

    return location;
  }

  it('runs a full CRUD roundtrip with exact and negative coordinates', async () => {
    const server = app.getHttpServer();
    const name = unique('Sydney Opera House');

    const location = await create({
      name: `  ${name}  `,
      latitude: -33.856784,
      longitude: 151.215297,
    });

    expect(location).toMatchObject({
      name,
      latitude: -33.856784,
      longitude: 151.215297,
      place: null,
    });

    await request(server)
      .get(`/locations/${location.id}`)
      .expect(200)
      .expect((res) =>
        expect(locationResponseSchema.parse(res.body)).toEqual(location),
      );

    await request(server)
      .get('/locations')
      .expect(200)
      .expect((res) =>
        expect(locationResponseSchema.array().parse(res.body)).toContainEqual(
          location,
        ),
      );

    await request(server)
      .patch(`/locations/${location.id}`)
      .send({ latitude: 52.2297, longitude: -21.0122 })
      .expect(200)
      .expect((res) =>
        expect(locationResponseSchema.parse(res.body)).toMatchObject({
          name,
          latitude: 52.2297,
          longitude: -21.0122,
        }),
      );

    await request(server).delete(`/locations/${location.id}`).expect(204);
    await request(server)
      .get(`/locations/${location.id}`)
      .expect(404)
      .expect((res) =>
        expect(res.body).toMatchObject({
          statusCode: 404,
          message: `Location ${location.id} not found`,
        }),
      );
    // Idempotent: deleting it again still answers 204.
    await request(server).delete(`/locations/${location.id}`).expect(204);
  });

  it('accepts the extreme coordinates', async () => {
    const location = await create({
      name: unique('Corner'),
      latitude: -90,
      longitude: 180,
    });

    expect(location).toMatchObject({ latitude: -90, longitude: 180 });
  });

  it('rejects an invalid body with i18n keys per field', async () => {
    const res = await request(app.getHttpServer())
      .post('/locations')
      .send({ name: ' ', latitude: 90.5, longitude: '19.9' })
      .expect(400);

    expect(validationErrorBodySchema.parse(res.body)).toEqual({
      message: 'validation.failed',
      errors: {
        formErrors: [],
        fieldErrors: {
          name: ['validation.placeName.required'],
          latitude: ['validation.latitude.invalid'],
          longitude: ['validation.longitude.invalid'],
        },
      },
    });
  });

  it('answers 404 when patching a missing location', async () => {
    await request(app.getHttpServer())
      .patch('/locations/999999999')
      .send({ name: 'Nowhere' })
      .expect(404);
  });

  it('rejects a non-numeric id', async () => {
    await request(app.getHttpServer()).get('/locations/abc').expect(400);
  });

  it('can always be deleted: its place and milestones lose it', async () => {
    const server = app.getHttpServer();
    const location = await create({
      name: unique('Lake'),
      latitude: 54.1,
      longitude: 21.6,
    });
    const placeRes = await request(server)
      .post('/places')
      .send({ name: unique('Cabin'), locationId: location.id })
      .expect(201);
    const place = placeDetailResponseSchema.parse(placeRes.body);
    placeIds.push(place.id);
    const milestoneRes = await request(server)
      .post('/milestones')
      .send({
        date: '2024-07-01',
        title: unique('Swim'),
        locationId: location.id,
      })
      .expect(201);
    const milestone = milestoneResponseSchema.parse(milestoneRes.body);
    milestoneIds.push(milestone.id);

    // The back-reference: the location knows its place.
    await request(server)
      .get(`/locations/${location.id}`)
      .expect(200)
      .expect((res) =>
        expect(locationResponseSchema.parse(res.body).place).toEqual({
          id: place.id,
          name: place.name,
        }),
      );
    expect(milestone.place).toEqual({ id: place.id, name: place.name });

    await request(server).delete(`/locations/${location.id}`).expect(204);

    await request(server)
      .get(`/places/${place.id}`)
      .expect(200)
      .expect((res) =>
        expect(placeDetailResponseSchema.parse(res.body)).toMatchObject({
          location: null,
          milestones: [],
        }),
      );
    await request(server)
      .get(`/milestones/${milestone.id}`)
      .expect(200)
      .expect((res) =>
        expect(milestoneResponseSchema.parse(res.body)).toMatchObject({
          location: null,
          place: null,
        }),
      );
  });
});
