import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import {
  locationResponseSchema,
  milestoneResponseSchema,
  placeDetailResponseSchema,
  placeResponseSchema,
  validationErrorBodySchema,
  type CreatePlaceRequest,
} from '@time-capsule/shared';
import { AppModule } from './../src/app.module.js';

// Other e2e files share the database and run in parallel: unique names, no counts.
const unique = (name: string) =>
  `${name} ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe('PlacesController (e2e)', () => {
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

  async function createLocation(name: string, latitude = 50.061698) {
    const res = await request(app.getHttpServer())
      .post('/locations')
      .send({ name: unique(name), latitude, longitude: 19.937206 })
      .expect(201);
    const {
      id,
      latitude: storedLatitude,
      longitude,
      name: storedName,
    } = locationResponseSchema.parse(res.body);
    locationIds.push(id);
    return { id, name: storedName, latitude: storedLatitude, longitude };
  }

  async function createPlace(body: CreatePlaceRequest) {
    const res = await request(app.getHttpServer())
      .post('/places')
      .send(body)
      .expect(201);
    const place = placeDetailResponseSchema.parse(res.body);
    placeIds.push(place.id);
    return place;
  }

  async function createMilestone(body: object) {
    const res = await request(app.getHttpServer())
      .post('/milestones')
      .send({ date: '2024-06-01', title: unique('Visit'), ...body })
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

  async function fieldErrorsOf(res: request.Response) {
    expect(res.status).toBe(400);
    const body = validationErrorBodySchema.parse(res.body);
    expect(body.message).toBe('validation.failed');
    return body.errors.fieldErrors;
  }

  it('creates a place without a location, and with one', async () => {
    const server = app.getHttpServer();
    const location = await createLocation('Kraków');

    const plain = await createPlace({ name: unique('Somewhere') });
    expect(plain).toMatchObject({
      description: null,
      location: null,
      milestones: [],
    });

    const name = unique('Home');
    const home = await createPlace({
      name: `  ${name} `,
      description: 'Where we **grew up**.',
      locationId: location.id,
    });
    expect(home).toMatchObject({
      name,
      description: 'Where we **grew up**.',
      location,
      milestones: [],
    });

    await request(server)
      .get('/places')
      .expect(200)
      .expect((res) => {
        const list = placeResponseSchema.array().parse(res.body);
        const { milestones: _milestones, ...expectedHome } = home;
        expect(list).toContainEqual(expectedHome);
        // The list has no milestones. Checked on the raw body: parse() strips unknown keys.
        const rawHome = (res.body as Array<Record<string, unknown>>).find(
          (row) => row.id === home.id,
        );
        expect(rawHome).not.toHaveProperty('milestones');
      });

    // Clearing the location.
    await request(server)
      .patch(`/places/${home.id}`)
      .send({ locationId: null })
      .expect(200)
      .expect((res) =>
        expect(placeDetailResponseSchema.parse(res.body).location).toBeNull(),
      );
  });

  it('rejects a location that another place owns, or that does not exist', async () => {
    const server = app.getHttpServer();
    const location = await createLocation('Lake');
    const cabin = await createPlace({
      name: unique('Cabin'),
      locationId: location.id,
    });

    expect(
      await fieldErrorsOf(
        await request(server)
          .post('/places')
          .send({ name: unique('Tent'), locationId: location.id }),
      ),
    ).toEqual({ locationId: ['validation.location.taken'] });
    expect(
      await fieldErrorsOf(
        await request(server)
          .post('/places')
          .send({ name: unique('Tent'), locationId: 999_999_999 }),
      ),
    ).toEqual({ locationId: ['validation.location.notFound'] });

    // A place may keep (re-send) its own location.
    await request(server)
      .patch(`/places/${cabin.id}`)
      .send({ name: 'Cabin, renamed', locationId: location.id })
      .expect(200);

    const other = await createPlace({ name: unique('Tent') });
    expect(
      await fieldErrorsOf(
        await request(server)
          .patch(`/places/${other.id}`)
          .send({ locationId: location.id }),
      ),
    ).toEqual({ locationId: ['validation.location.taken'] });
  });

  it('derives a milestone place from its location, which follows edits and moves', async () => {
    const server = app.getHttpServer();
    const location = await createLocation('Garden');
    const elsewhere = await createLocation('Forest', 49.3);
    const garden = await createPlace({
      name: unique('Garden'),
      locationId: location.id,
    });
    const milestone = await createMilestone({
      locationId: location.id,
      category: 'home_and_places',
    });

    expect(milestone).toMatchObject({
      location,
      place: { id: garden.id, name: garden.name },
    });
    await request(server)
      .get(`/places/${garden.id}`)
      .expect(200)
      .expect((res) =>
        expect(placeDetailResponseSchema.parse(res.body).milestones).toEqual([
          {
            id: milestone.id,
            date: '2024-06-01',
            title: milestone.title,
            category: 'home_and_places',
          },
        ]),
      );

    // Editing the coordinates moves the milestone: it is the same location row.
    await request(server)
      .patch(`/locations/${location.id}`)
      .send({ latitude: 50.5 })
      .expect(200);
    expect((await getMilestone(milestone.id)).location).toEqual({
      ...location,
      latitude: 50.5,
    });

    // Moving the place to another location: the milestone keeps its location, loses the place.
    await request(server)
      .patch(`/places/${garden.id}`)
      .send({ locationId: elsewhere.id })
      .expect(200)
      .expect((res) =>
        expect(placeDetailResponseSchema.parse(res.body).milestones).toEqual(
          [],
        ),
      );
    expect(await getMilestone(milestone.id)).toMatchObject({
      location: { id: location.id },
      place: null,
    });

    // Back on the place's location, then the place is deleted: the location stays.
    await request(server)
      .patch(`/milestones/${milestone.id}`)
      .send({ locationId: elsewhere.id })
      .expect(200)
      .expect((res) =>
        expect(milestoneResponseSchema.parse(res.body).place).toEqual({
          id: garden.id,
          name: garden.name,
        }),
      );
    await request(server).delete(`/places/${garden.id}`).expect(204);
    expect(await getMilestone(milestone.id)).toMatchObject({
      location: elsewhere,
      place: null,
    });
    await request(server)
      .get(`/locations/${elsewhere.id}`)
      .expect(200)
      .expect((res) =>
        expect(locationResponseSchema.parse(res.body).place).toBeNull(),
      );
    // Idempotent: deleting it again still answers 204.
    await request(server).delete(`/places/${garden.id}`).expect(204);
  });

  it('answers 404 for a missing place', async () => {
    const server = app.getHttpServer();

    await request(server)
      .get('/places/999999999')
      .expect(404)
      .expect((res) =>
        expect(res.body).toMatchObject({
          statusCode: 404,
          message: 'Place 999999999 not found',
        }),
      );
    await request(server)
      .patch('/places/999999999')
      .send({ name: 'Nowhere' })
      .expect(404);
  });

  it('rejects an invalid body with i18n keys per field', async () => {
    const res = await request(app.getHttpServer())
      .post('/places')
      .send({ name: '', description: 'ą'.repeat(32_768) });

    expect(await fieldErrorsOf(res)).toEqual({
      name: ['validation.placeName.required'],
      description: ['validation.description.tooLong'],
    });
  });
});
