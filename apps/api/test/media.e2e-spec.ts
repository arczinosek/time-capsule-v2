import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import {
  createMediaResponseSchema,
  familyMemberDetailResponseSchema,
  mediaResponseSchema,
  milestoneResponseSchema,
  validationErrorBodySchema,
  type MediaTarget,
} from '@time-capsule/shared';
import { eq, inArray, sql } from 'drizzle-orm';
import { AppModule } from './../src/app.module.js';
import { DRIZZLE, type Database } from './../src/database/database.types.js';
import { media } from './../src/database/schema.js';
import { StorageService } from './../src/storage/storage.service.js';
import { FakeStorageService } from './support/fake-storage.js';

// Storage is the in-memory fake: no RustFS needed (test/storage.e2e-spec.ts covers the real
// one). Other e2e files share the database and run in parallel: no global counts.
describe('Media (e2e, fake storage)', () => {
  let app: INestApplication<App>;
  let db: Database;
  const storage = new FakeStorageService();
  const milestoneIds: number[] = [];
  const familyMemberIds: number[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StorageService)
      .useValue(storage)
      .compile();

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();
    // Listening (not just init): supertest then reuses the address instead of binding the
    // server once per request, which the 12 concurrent uploads below would trip over.
    await app.listen(0, '127.0.0.1');
    db = app.get<Database>(DRIZZLE);
  });

  afterAll(async () => {
    for (const id of milestoneIds) {
      await request(app.getHttpServer()).delete(`/milestones/${id}`);
    }
    for (const id of familyMemberIds) {
      await request(app.getHttpServer()).delete(`/family-members/${id}`);
    }
    await app.close();
  });

  const server = () => app.getHttpServer();

  async function createMilestone(): Promise<MediaTarget> {
    const res = await request(server())
      .post('/milestones')
      .send({ date: '2024-05-01', title: 'Photos' })
      .expect(201);
    const { id } = milestoneResponseSchema.parse(res.body);
    milestoneIds.push(id);
    return { type: 'milestone', id };
  }

  async function createFamilyMember(): Promise<MediaTarget> {
    const res = await request(server())
      .post('/family-members')
      .send({ name: 'Ada', kind: 'human' })
      .expect(201);
    const { id } = familyMemberDetailResponseSchema.parse(res.body);
    familyMemberIds.push(id);
    return { type: 'family_member', id };
  }

  const ownerPath = (target: MediaTarget) =>
    target.type === 'milestone'
      ? `/milestones/${target.id}`
      : `/family-members/${target.id}`;

  /** POST /media: a pending upload. */
  async function reserve(target: MediaTarget) {
    const res = await request(server())
      .post('/media')
      .send({ target, contentType: 'image/png', size: 67 })
      .expect(201);
    return createMediaResponseSchema.parse(res.body);
  }

  /** POST /media, the browser's upload, then confirm: a ready photo. */
  async function upload(target: MediaTarget) {
    const { mediaId, fields } = await reserve(target);
    storage.put(fields.key!, { size: 67, contentType: 'image/png' });
    const res = await request(server())
      .post(`/media/${mediaId}/confirm`)
      .expect(200);
    return mediaResponseSchema.parse(res.body);
  }

  async function mediaIdsOf(target: MediaTarget): Promise<number[]> {
    const res = await request(server()).get(ownerPath(target)).expect(200);
    const owner =
      target.type === 'milestone'
        ? milestoneResponseSchema.parse(res.body)
        : familyMemberDetailResponseSchema.parse(res.body);
    return owner.media.map(({ id }) => id);
  }

  /** PUT /<owner>/:id/media; `baseMediaIds` is what the client last saw. */
  function putMedia(
    target: MediaTarget,
    mediaIds: unknown,
    baseMediaIds: number[],
  ) {
    return request(server())
      .put(`${ownerPath(target)}/media`)
      .send({ mediaIds, baseMediaIds });
  }

  function fieldErrorsOf(res: request.Response) {
    expect(res.status).toBe(400);
    return validationErrorBodySchema.parse(res.body).errors.fieldErrors;
  }

  async function exists(mediaId: number): Promise<boolean> {
    const rows = await db.select().from(media).where(eq(media.id, mediaId));
    return rows.length > 0;
  }

  it('uploads, confirms and shows a photo on its milestone and in the library', async () => {
    const milestone = await createMilestone();
    const { mediaId, url, fields } = await reserve(milestone);

    expect(url).toBe('http://storage.test/time-capsule-media');
    expect(fields).toMatchObject({ 'Content-Type': 'image/png' });
    expect(fields.key).toMatch(/^media\/[0-9a-f-]{36}$/);
    // Pending: hidden everywhere until confirmed.
    expect(await mediaIdsOf(milestone)).toEqual([]);

    storage.put(fields.key!, { size: 67, contentType: 'image/png' });
    const confirmed = mediaResponseSchema.parse(
      (await request(server()).post(`/media/${mediaId}/confirm`).expect(200))
        .body,
    );

    expect(confirmed).toMatchObject({
      id: mediaId,
      contentType: 'image/png',
      sizeBytes: 67,
    });
    expect(await mediaIdsOf(milestone)).toEqual([mediaId]);
    // Confirming again is harmless.
    await request(server()).post(`/media/${mediaId}/confirm`).expect(200);

    const library = mediaResponseSchema
      .array()
      .parse((await request(server()).get('/media').expect(200)).body);
    expect(library).toContainEqual(confirmed);
  });

  it.each([
    ['no object', undefined],
    ['another size', { size: 68, contentType: 'image/png' }],
    ['another type', { size: 67, contentType: 'image/gif' }],
    ['a type outside the allowlist', { size: 67, contentType: 'text/html' }],
  ])(
    'rejects a confirm with %s, and deletes the row and the object',
    async (_case, stored) => {
      const milestone = await createMilestone();
      const { mediaId, fields } = await reserve(milestone);
      if (stored) storage.put(fields.key!, stored);

      const res = await request(server()).post(`/media/${mediaId}/confirm`);

      expect(fieldErrorsOf(res)).toEqual({
        file: ['validation.media.uploadInvalid'],
      });
      expect(await exists(mediaId)).toBe(false);
      expect(storage.deleted).toContain(fields.key);
      await request(server()).post(`/media/${mediaId}/confirm`).expect(404);
    },
  );

  it('answers 404 and deletes the object when the row vanishes during the confirm', async () => {
    const milestone = await createMilestone();
    const { mediaId, fields } = await reserve(milestone);
    storage.put(fields.key!, { size: 67, contentType: 'image/png' });
    // The media is deleted (DELETE /media/:id, or with its owner) while confirm checks storage.
    vi.spyOn(storage, 'head').mockImplementationOnce(async () => {
      await db.delete(media).where(eq(media.id, mediaId));
      return { size: 67, contentType: 'image/png' };
    });

    await request(server()).post(`/media/${mediaId}/confirm`).expect(404);

    expect(await exists(mediaId)).toBe(false);
    expect(storage.deleted).toContain(fields.key);
  });

  it('caps a milestone at 10 uploads under concurrency, pending ones included', async () => {
    const milestone = await createMilestone();

    const responses = await Promise.all(
      Array.from({ length: 12 }, () =>
        request(server())
          .post('/media')
          .send({ target: milestone, contentType: 'image/jpeg', size: 1000 }),
      ),
    );
    const statuses = responses.map(({ status }) => status);

    expect(statuses.filter((status) => status === 201)).toHaveLength(10);
    expect(statuses.filter((status) => status === 409)).toHaveLength(2);
    expect(responses.find(({ status }) => status === 409)?.body).toEqual({
      statusCode: 409,
      message: 'validation.media.capMilestone',
      error: 'Conflict',
    });
  });

  it('answers 404 for a missing owner or media, and 400 with keys for a bad body', async () => {
    await request(server())
      .post('/media')
      .send({
        target: { type: 'milestone', id: 2_000_000_000 },
        contentType: 'image/png',
        size: 1,
      })
      .expect(404);
    await request(server()).post('/media/2000000000/confirm').expect(404);
    await putMedia({ type: 'family_member', id: 2_000_000_000 }, [], []).expect(
      404,
    );

    const res = await request(server())
      .post('/media')
      .send({
        target: { type: 'place', id: 1 },
        contentType: 'application/pdf',
        size: 21 * 1024 * 1024,
      });

    expect(fieldErrorsOf(res)).toEqual({
      target: ['validation.media.targetInvalid'],
      contentType: ['validation.media.contentTypeInvalid'],
      size: ['validation.media.tooLarge'],
    });
  });

  it('replaces and reorders the photos; the PUT order is the gallery order', async () => {
    const milestone = await createMilestone();
    const a = await upload(milestone);
    const b = await upload(milestone);
    const c = await upload(milestone);

    expect(await mediaIdsOf(milestone)).toEqual([a.id, b.id, c.id]);

    const res = await putMedia(
      milestone,
      [c.id, a.id, b.id],
      [a.id, b.id, c.id],
    ).expect(200);

    expect(
      mediaResponseSchema
        .array()
        .parse(res.body)
        .map(({ id }) => id),
    ).toEqual([c.id, a.id, b.id]);
    expect(await mediaIdsOf(milestone)).toEqual([c.id, a.id, b.id]);
  });

  it('answers 409 and changes nothing when the base is stale', async () => {
    const milestone = await createMilestone();
    const a = await upload(milestone);
    // Confirmed in another tab after this client last saw [a].
    const b = await upload(milestone);

    for (const staleBase of [
      [a.id],
      [b.id, a.id],
      [a.id, b.id, 2_000_000_000],
    ]) {
      const res = await putMedia(milestone, [a.id], staleBase).expect(409);

      expect(res.body).toEqual({
        statusCode: 409,
        message: 'validation.media.stale',
        error: 'Conflict',
      });
    }
    expect(await mediaIdsOf(milestone)).toEqual([a.id, b.id]);
    expect(await exists(b.id)).toBe(true);

    await putMedia(milestone, [a.id], [a.id, b.id]).expect(200);
    expect(await exists(b.id)).toBe(false);
  });

  it('deletes a photo unlinked from its only owner, row and object', async () => {
    const milestone = await createMilestone();
    const a = await upload(milestone);
    const b = await upload(milestone);
    const [{ storageKey }] = await db
      .select({ storageKey: media.storageKey })
      .from(media)
      .where(eq(media.id, b.id));

    await putMedia(milestone, [a.id], [a.id, b.id]).expect(200);

    expect(await mediaIdsOf(milestone)).toEqual([a.id]);
    expect(await exists(b.id)).toBe(false);
    expect(storage.deleted).toContain(storageKey);
  });

  it('keeps a photo unlinked from one owner while another still links it', async () => {
    const milestone = await createMilestone();
    const familyMember = await createFamilyMember();
    const photo = await upload(milestone);

    await putMedia(familyMember, [photo.id], []).expect(200);
    await putMedia(milestone, [], [photo.id]).expect(200);

    expect(await mediaIdsOf(milestone)).toEqual([]);
    expect(await mediaIdsOf(familyMember)).toEqual([photo.id]);
    expect(await exists(photo.id)).toBe(true);

    await putMedia(familyMember, [], [photo.id]).expect(200);

    expect(await exists(photo.id)).toBe(false);
  });

  it('rejects unknown, pending and duplicate ids, and more than the cap', async () => {
    const milestone = await createMilestone();
    const familyMember = await createFamilyMember();
    const ready = await upload(milestone);
    const pending = await reserve(milestone);

    expect(
      fieldErrorsOf(
        await putMedia(milestone, [ready.id, 2_000_000_000], [ready.id]),
      ),
    ).toEqual({ mediaIds: ['validation.media.notFound'] });
    expect(
      fieldErrorsOf(await putMedia(milestone, [pending.mediaId], [ready.id])),
    ).toEqual({
      mediaIds: ['validation.media.notReady'],
    });
    expect(
      fieldErrorsOf(
        await putMedia(milestone, [ready.id, ready.id], [ready.id]),
      ),
    ).toEqual({
      mediaIds: ['validation.media.duplicate'],
    });
    expect(
      fieldErrorsOf(
        await putMedia(
          milestone,
          Array.from({ length: 11 }, (_, i) => i + 1),
          [ready.id],
        ),
      ),
    ).toEqual({ mediaIds: ['validation.media.capMilestone'] });
    expect(
      fieldErrorsOf(
        await putMedia(
          familyMember,
          Array.from({ length: 101 }, (_, i) => i + 1),
          [],
        ),
      ),
    ).toEqual({ mediaIds: ['validation.media.capFamilyMember'] });
    // Nothing changed.
    expect(await mediaIdsOf(milestone)).toEqual([ready.id]);
  });

  it('leaves uploads in flight alone, and counts them against the cap', async () => {
    const milestone = await createMilestone();
    const other = await createMilestone();
    const ready = await upload(milestone);
    const pending = await reserve(milestone);

    // Clearing the set doesn't cancel the upload in flight, which isn't in the base either.
    await putMedia(milestone, [], [ready.id]).expect(200);
    storage.put(pending.fields.key!, { size: 67, contentType: 'image/png' });
    await request(server())
      .post(`/media/${pending.mediaId}/confirm`)
      .expect(200);
    expect(await mediaIdsOf(milestone)).toEqual([pending.mediaId]);
    expect(await exists(ready.id)).toBe(false);

    // 9 uploads in flight on `other`: linking 2 ready photos would make 11.
    const photos = [await upload(milestone), await upload(milestone)];
    for (let i = 0; i < 9; i++) await reserve(other);
    const res = await putMedia(
      other,
      photos.map(({ id }) => id),
      [],
    ).expect(409);

    expect(res.body).toMatchObject({
      message: 'validation.media.capMilestone',
    });
    await putMedia(other, [photos[0]!.id], []).expect(200);
  });

  it('deletes the photos linked nowhere else with their owner', async () => {
    const milestone = await createMilestone();
    const familyMember = await createFamilyMember();
    const onlyHere = await upload(milestone);
    const shared = await upload(milestone);
    await putMedia(familyMember, [shared.id], []).expect(200);

    await request(server()).delete(ownerPath(milestone)).expect(204);

    expect(await exists(onlyHere.id)).toBe(false);
    expect(await exists(shared.id)).toBe(true);
    expect(await mediaIdsOf(familyMember)).toEqual([shared.id]);

    await request(server()).delete(ownerPath(familyMember)).expect(204);

    expect(await exists(shared.id)).toBe(false);
  });

  it('deletes a photo everywhere, idempotently', async () => {
    const milestone = await createMilestone();
    const familyMember = await createFamilyMember();
    const photo = await upload(milestone);
    await putMedia(familyMember, [photo.id], []).expect(200);

    await request(server()).delete(`/media/${photo.id}`).expect(204);
    await request(server()).delete(`/media/${photo.id}`).expect(204);

    expect(await mediaIdsOf(milestone)).toEqual([]);
    expect(await mediaIdsOf(familyMember)).toEqual([]);
  });

  it('purges uploads left pending for more than a day on the next upload', async () => {
    const milestone = await createMilestone();
    const stale = await reserve(milestone);
    const fresh = await reserve(milestone);
    await db
      .update(media)
      .set({ createdAt: sql`now() - interval 25 hour` })
      .where(eq(media.id, stale.mediaId));

    await reserve(milestone);

    expect(await exists(stale.mediaId)).toBe(false);
    expect(storage.deleted).toContain(stale.fields.key);
    expect(await exists(fresh.mediaId)).toBe(true);
  });

  it('never sends a storage key or an upload status as a response field', async () => {
    const milestone = await createMilestone();
    const familyMember = await createFamilyMember();
    const bodies: unknown[] = [];
    const send = async (test: request.Test) => {
      const res = await test;
      bodies.push(res.body);
      return res;
    };

    const reserved = createMediaResponseSchema.parse(
      (
        await send(
          request(server())
            .post('/media')
            .send({ target: milestone, contentType: 'image/png', size: 67 }),
        )
      ).body,
    );
    storage.put(reserved.fields.key!, { size: 67, contentType: 'image/png' });
    await send(request(server()).post(`/media/${reserved.mediaId}/confirm`));
    // Another upload stays pending.
    const pending = createMediaResponseSchema.parse(
      (
        await send(
          request(server())
            .post('/media')
            .send({ target: milestone, contentType: 'image/png', size: 67 }),
        )
      ).body,
    );
    const id = reserved.mediaId;
    await send(
      request(server())
        .put(`${ownerPath(familyMember)}/media`)
        .send({ mediaIds: [id], baseMediaIds: [] }),
    );
    await send(
      request(server())
        .put(`${ownerPath(milestone)}/media`)
        .send({ mediaIds: [id], baseMediaIds: [id] }),
    );
    for (const path of [
      ownerPath(milestone),
      ownerPath(familyMember),
      '/milestones',
      '/family-members',
      '/media',
    ]) {
      await send(request(server()).get(path));
    }

    const storageKeys = (
      await db
        .select({ storageKey: media.storageKey })
        .from(media)
        .where(inArray(media.id, [id, pending.mediaId]))
    ).map(({ storageKey }) => storageKey);
    // Every [path, value] pair of a JSON body, the root included.
    const entriesOf = (
      value: unknown,
      path: string[] = [],
    ): [string[], unknown][] => [
      [path, value],
      ...(value !== null && typeof value === 'object'
        ? Object.entries(value).flatMap(([key, child]) =>
            entriesOf(child, [...path, key]),
          )
        : []),
    ];
    const entries = bodies.flatMap((body) => entriesOf(body));
    const keyEntries = entries.filter(
      ([, value]) => typeof value === 'string' && storageKeys.includes(value),
    );

    expect(storageKeys).toHaveLength(2);
    expect(entries.length).toBeGreaterThan(20);
    // Only the presigned POST carries a key, as the form field storage requires.
    expect(keyEntries.map(([path]) => path.join('.'))).toEqual([
      'fields.key',
      'fields.key',
    ]);
    for (const [path] of entries) {
      expect(path.at(-1) ?? '').not.toMatch(/^(storage_?key|status)$/i);
    }
  });
});
