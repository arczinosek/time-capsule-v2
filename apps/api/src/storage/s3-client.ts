import { S3Client } from '@aws-sdk/client-s3';
import type { Env } from '../config/env.js';

/** The client the api talks to storage with (HeadObject, DeleteObject): S3_ENDPOINT. */
export const S3_CLIENT = Symbol('S3_CLIENT');

/**
 * The client that only signs URLs for the browser: S3_PUBLIC_ENDPOINT (or S3_ENDPOINT).
 * Signing is local work, so it never connects to that host itself.
 */
export const S3_PRESIGN_CLIENT = Symbol('S3_PRESIGN_CLIENT');

type S3Env = Pick<
  Env,
  | 'S3_REGION'
  | 'S3_FORCE_PATH_STYLE'
  | 'S3_ACCESS_KEY_ID'
  | 'S3_SECRET_ACCESS_KEY'
>;

/** Both clients, and the real-storage e2e probe, are built here. `endpoint` unset = AWS. */
export function createS3Client(
  env: S3Env,
  endpoint: string | undefined,
): S3Client {
  const {
    S3_ACCESS_KEY_ID: accessKeyId,
    S3_SECRET_ACCESS_KEY: secretAccessKey,
  } = env;
  return new S3Client({
    region: env.S3_REGION,
    endpoint,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials:
      accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined,
    // Only the checksums S3 requires: no CRC32 headers or query parameters on presigned
    // requests, which non-AWS servers may not accept.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}
