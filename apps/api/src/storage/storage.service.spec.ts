import {
  HeadObjectCommand,
  NotFound,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { createMock, type DeepMocked } from '@golevelup/ts-vitest';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { createS3Client } from './s3-client.js';
import { StorageService } from './storage.service.js';

const env = {
  S3_REGION: 'us-east-1',
  S3_FORCE_PATH_STYLE: true,
  S3_ACCESS_KEY_ID: 'test-key',
  S3_SECRET_ACCESS_KEY: 'test-secret',
};

describe('StorageService', () => {
  let client: DeepMocked<S3Client>;
  let presignClient: S3Client;
  let service: StorageService;

  beforeEach(() => {
    client = createMock<S3Client>();
    // A real client: signing is offline, and the signatures are what's under test.
    presignClient = createS3Client(env, 'http://s3.public.test:9000');
    service = new StorageService(
      client,
      presignClient,
      new ConfigService<Env, true>({ S3_BUCKET: 'time-capsule-media' }),
    );
  });

  afterEach(() => {
    presignClient.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('createUpload', () => {
    it('presigns a POST to the public endpoint with the size range and the exact type', async () => {
      const upload = await service.createUpload('media/abc', 'image/png');
      const policy = JSON.parse(
        Buffer.from(upload.fields.Policy!, 'base64').toString('utf8'),
      ) as { expiration: string; conditions: unknown[] };

      expect(upload.url).toBe('http://s3.public.test:9000/time-capsule-media');
      expect(policy.conditions).toContainEqual([
        'content-length-range',
        1,
        20_971_520,
      ]);
      expect(policy.conditions).toContainEqual([
        'eq',
        '$Content-Type',
        'image/png',
      ]);
      expect(Date.parse(policy.expiration) - Date.now()).toBeGreaterThan(
        595_000,
      );
      expect(Date.parse(policy.expiration) - Date.now()).toBeLessThanOrEqual(
        600_000,
      );
    });

    it('returns exactly the SDK fields plus Content-Type: the browser sends nothing else', async () => {
      const upload = await service.createUpload('media/abc', 'image/png');
      const expectedFields = [
        'bucket',
        'X-Amz-Algorithm',
        'X-Amz-Credential',
        'X-Amz-Date',
        'key',
        'Policy',
        'X-Amz-Signature',
        'Content-Type',
      ];

      expect(Object.keys(upload.fields).toSorted()).toEqual(
        expectedFields.toSorted(),
      );
      expect(upload.fields).toMatchObject({
        key: 'media/abc',
        'Content-Type': 'image/png',
      });
    });
  });

  describe('getReadUrl', () => {
    async function urlAt(isoTime: string) {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(isoTime));
      return service.getReadUrl('media/abc', 'image/png');
    }

    it('gives the same URL within an hour and a new one in the next hour', async () => {
      const at1005 = await urlAt('2026-10-04T10:05:00Z');
      const at1055 = await urlAt('2026-10-04T10:55:00Z');
      const at1101 = await urlAt('2026-10-04T11:01:00Z');

      expect(at1055).toBe(at1005);
      expect(at1101).not.toBe(at1005);
    });

    it('signs for two hours from the start of the hour, with the type and cache overrides', async () => {
      const url = new URL(await urlAt('2026-10-04T10:05:00Z'));

      expect(url.origin).toBe('http://s3.public.test:9000');
      expect(url.pathname).toBe('/time-capsule-media/media/abc');
      expect(url.searchParams.get('X-Amz-Date')).toBe('20261004T100000Z');
      expect(url.searchParams.get('X-Amz-Expires')).toBe('7200');
      expect(url.searchParams.get('response-content-type')).toBe('image/png');
      expect(url.searchParams.get('response-cache-control')).toBe(
        'private, max-age=3600',
      );
      expect(url.searchParams.has('x-amz-checksum-mode')).toBe(false);
    });
  });

  describe('head', () => {
    it('returns the size and type of the stored object', async () => {
      // send() is overloaded; its mock is typed after the callback form, which returns void.
      client.send.mockImplementation(() =>
        Promise.resolve({ ContentLength: 67, ContentType: 'image/png' }),
      );

      await expect(service.head('media/abc')).resolves.toEqual({
        size: 67,
        contentType: 'image/png',
      });
      expect(client.send).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
    });

    it('returns null when there is no object', async () => {
      client.send.mockRejectedValue(
        new NotFound({
          message: 'NotFound',
          $metadata: { httpStatusCode: 404 },
        }),
      );

      await expect(service.head('media/abc')).resolves.toBeNull();
    });

    it('rethrows any other error', async () => {
      const error = new S3ServiceException({
        name: 'AccessDenied',
        $fault: 'client',
        $metadata: { httpStatusCode: 403 },
      });
      client.send.mockRejectedValue(error);

      await expect(service.head('media/abc')).rejects.toBe(error);
    });
  });

  it('deleteMany logs failures and never throws', async () => {
    const warn = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});
    client.send.mockRejectedValue(new Error('storage down'));

    await expect(
      service.deleteMany(['media/a', 'media/b']),
    ).resolves.toBeUndefined();

    expect(client.send).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
