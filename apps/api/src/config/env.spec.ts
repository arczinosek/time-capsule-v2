import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { envSchema } from './env.js';

describe('envSchema', () => {
  const env = {
    DATABASE_URL: 'mysql://user:secret@database:3306/time-capsule',
    S3_BUCKET: 'time-capsule-media',
  };

  it('defaults to AWS: no endpoints, us-east-1, virtual-hosted style', () => {
    expect(envSchema.parse(env)).toMatchObject({
      S3_REGION: 'us-east-1',
      S3_FORCE_PATH_STYLE: false,
    });
    expect(envSchema.parse(env).S3_ENDPOINT).toBeUndefined();
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('parses S3_FORCE_PATH_STYLE=%s as %s', (value, expectedValue) => {
    expect(
      envSchema.parse({ ...env, S3_FORCE_PATH_STYLE: value })
        .S3_FORCE_PATH_STYLE,
    ).toBe(expectedValue);
  });

  it.each([{ S3_ACCESS_KEY_ID: 'key' }, { S3_SECRET_ACCESS_KEY: 'secret123' }])(
    'rejects one credential without the other (%j)',
    (credential) => {
      expect(envSchema.safeParse({ ...env, ...credential }).success).toBe(
        false,
      );
    },
  );

  it('requires the bucket', () => {
    expect(
      envSchema.safeParse({ DATABASE_URL: env.DATABASE_URL }).success,
    ).toBe(false);
  });

  it('accepts the values in .env.example', () => {
    const example = parseEnv(
      readFileSync(new URL('../../.env.example', import.meta.url), 'utf8'),
    );
    const expectedStorage = {
      S3_ENDPOINT: 'http://storage:9000',
      S3_PUBLIC_ENDPOINT: 'http://127.0.0.1:9000',
      S3_BUCKET: 'time-capsule-media',
      S3_FORCE_PATH_STYLE: true,
    };

    expect(envSchema.parse(example)).toMatchObject(expectedStorage);
  });
});
