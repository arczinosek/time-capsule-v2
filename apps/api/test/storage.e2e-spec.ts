import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { HeadBucketCommand } from '@aws-sdk/client-s3';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import {
  createMediaResponseSchema,
  mediaResponseSchema,
  milestoneResponseSchema,
  validationErrorBodySchema,
  type CreateMediaResponse,
} from '@time-capsule/shared';
import { eq } from 'drizzle-orm';
import { AppModule } from './../src/app.module.js';
import { validateEnv } from './../src/config/env.js';
import { DRIZZLE, type Database } from './../src/database/database.types.js';
import { media } from './../src/database/schema.js';
import {
  createS3Client,
  S3_PRESIGN_CLIENT,
} from './../src/storage/s3-client.js';
import { StorageService } from './../src/storage/storage.service.js';

// Against the real storage (RustFS from compose.yml, started on the host with
// `docker compose up -d`). Unreachable storage skips this file with a warning; a config error
// (a bad or missing S3_* value, a missing bucket, wrong keys) fails it.

const envFile = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);
const env = validateEnv(process.env); // throws on a config error: never a silent skip

const NETWORK_ERRORS = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ETIMEDOUT',
  'TimeoutError',
  'AbortError',
]);

function isNetworkError(error: unknown): boolean {
  for (let e = error; e instanceof Error; e = e.cause) {
    const code = (e as Error & { code?: unknown }).code;
    if (
      NETWORK_ERRORS.has(e.name) ||
      (typeof code === 'string' && NETWORK_ERRORS.has(code))
    ) {
      return true;
    }
  }
  return false;
}

const probe = createS3Client(env, env.S3_ENDPOINT);
const available = await probe
  .send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }), {
    abortSignal: AbortSignal.timeout(2000),
  })
  .then(
    () => true,
    (error: unknown) => {
      if (isNetworkError(error)) {
        // Straight to stderr: Vitest's default reporter hides console output of a skipped file.
        process.stderr.write(
          `\nWARNING: skipping test/storage.e2e-spec.ts: storage unreachable at ` +
            `${env.S3_ENDPOINT ?? 'AWS'}. Run \`docker compose up -d\` on the host.\n\n`,
        );
        return false;
      }
      // Reachable but refused (NoSuchBucket, 403): a setup error, so fail loudly.
      throw new Error(
        `Storage at ${env.S3_ENDPOINT ?? 'AWS'} refused HeadBucket ${env.S3_BUCKET}. ` +
          'Did storage-init run, and do the S3_* keys match compose.yml?',
        { cause: error },
      );
    },
  )
  .finally(() => probe.destroy());

// A 1×1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

describe.skipIf(!available)('Storage (e2e, RustFS)', () => {
  let app: INestApplication<App>;
  let db: Database;
  let storage: StorageService;
  const milestoneIds: number[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // The dev container can't reach the browser's endpoint (127.0.0.1 on the host), and a
      // signature only works on the host it was made for: sign for the internal one.
      .overrideProvider(S3_PRESIGN_CLIENT)
      .useValue(createS3Client(env, env.S3_ENDPOINT))
      .compile();

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();
    await app.init();
    db = app.get<Database>(DRIZZLE);
    storage = app.get(StorageService);
  });

  afterAll(async () => {
    for (const id of milestoneIds) {
      await request(app.getHttpServer()).delete(`/milestones/${id}`);
    }
    await app.close();
  });

  async function createMilestone(): Promise<number> {
    const res = await request(app.getHttpServer())
      .post('/milestones')
      .send({ date: '2024-05-01', title: 'Storage e2e' })
      .expect(201);
    const { id } = milestoneResponseSchema.parse(res.body);
    milestoneIds.push(id);
    return id;
  }

  async function reserve(milestoneId: number, size: number) {
    const res = await request(app.getHttpServer())
      .post('/media')
      .send({
        target: { type: 'milestone', id: milestoneId },
        contentType: 'image/png',
        size,
      })
      .expect(201);
    return createMediaResponseSchema.parse(res.body);
  }

  /** What the browser does: exactly the presigned fields, in order, then the file. */
  function post(
    { url, fields }: CreateMediaResponse,
    overrides: Record<string, string> = {},
  ) {
    const form = new FormData();
    for (const [name, value] of Object.entries({ ...fields, ...overrides })) {
      form.append(name, value);
    }
    form.append('file', new Blob([PNG], { type: 'image/png' }));
    return fetch(url, { method: 'POST', body: form });
  }

  async function keyOf(mediaId: number): Promise<string> {
    const [row] = await db
      .select({ storageKey: media.storageKey })
      .from(media)
      .where(eq(media.id, mediaId));
    return row!.storageKey;
  }

  async function uploadReady(milestoneId: number) {
    const upload = await reserve(milestoneId, PNG.length);
    expect((await post(upload)).ok).toBe(true);
    await request(app.getHttpServer())
      .post(`/media/${upload.mediaId}/confirm`)
      .expect(200);
    return { mediaId: upload.mediaId, key: await keyOf(upload.mediaId) };
  }

  it('uploads, confirms, and serves the same bytes from a presigned GET', async () => {
    const milestoneId = await createMilestone();
    const upload = await reserve(milestoneId, PNG.length);

    expect((await post(upload)).ok).toBe(true);
    mediaResponseSchema.parse(
      (
        await request(app.getHttpServer())
          .post(`/media/${upload.mediaId}/confirm`)
          .expect(200)
      ).body,
    );
    const milestone = milestoneResponseSchema.parse(
      (await request(app.getHttpServer()).get(`/milestones/${milestoneId}`))
        .body,
    );
    const image = await fetch(milestone.media[0]!.url);

    expect(image.status).toBe(200);
    expect(image.headers.get('content-type')).toBe('image/png');
    expect(Buffer.from(await image.arrayBuffer()).equals(PNG)).toBe(true);
  });

  // Storage may reject these itself, or accept them and leave it to confirm. Either way, no
  // object and no row are left.
  it.each([
    ['a declared size that differs from the file', 100, {}],
    [
      'a forged Content-Type field',
      PNG.length,
      { 'Content-Type': 'image/gif' },
    ],
  ])('never keeps an upload with %s', async (_case, size, overrides) => {
    const milestoneId = await createMilestone();
    const upload = await reserve(milestoneId, size);
    const key = await keyOf(upload.mediaId);

    const stored = await post(upload, overrides);

    if (stored.ok) {
      const res = await request(app.getHttpServer()).post(
        `/media/${upload.mediaId}/confirm`,
      );
      expect(res.status).toBe(400);
      expect(
        validationErrorBodySchema.parse(res.body).errors.fieldErrors.file,
      ).toEqual(['validation.media.uploadInvalid']);
    } else {
      expect(stored.status).toBeGreaterThanOrEqual(400);
      expect(stored.status).toBeLessThan(500);
      await request(app.getHttpServer())
        .post(`/media/${upload.mediaId}/confirm`)
        .expect(400);
    }
    expect(await storage.head(key)).toBeNull();
    expect(
      await db.select().from(media).where(eq(media.id, upload.mediaId)),
    ).toEqual([]);
  });

  it('deletes the object with its milestone', async () => {
    const milestoneId = await createMilestone();
    const { key } = await uploadReady(milestoneId);
    expect(await storage.head(key)).not.toBeNull();

    await request(app.getHttpServer())
      .delete(`/milestones/${milestoneId}`)
      .expect(204);

    expect(await storage.head(key)).toBeNull();
  });

  it('deletes the object with the media', async () => {
    const milestoneId = await createMilestone();
    const { mediaId, key } = await uploadReady(milestoneId);

    await request(app.getHttpServer()).delete(`/media/${mediaId}`).expect(204);

    expect(await storage.head(key)).toBeNull();
  });
});
