import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAX_MEDIA_SIZE_BYTES } from '@time-capsule/shared';
import type { Env } from '../config/env.js';
import { S3_CLIENT, S3_PRESIGN_CLIENT } from './s3-client.js';

/**
 * How long a presigned upload is valid. Keep it at or under 900: RustFS rejects a POST whose
 * X-Amz-Date is more than 15 minutes from its clock, whatever the policy's expiration says.
 */
export const UPLOAD_URL_TTL_SECONDS = 600;

/** Read URLs are signed at the start of the hour and valid for two: at least one hour left. */
export const READ_URL_TTL_SECONDS = 7200;

export type PresignedUpload = { url: string; fields: Record<string, string> };

export type StoredObject = { size: number; contentType: string | undefined };

function floorToHour(time: number): Date {
  const date = new Date(time);
  date.setUTCMinutes(0, 0, 0);
  return date;
}

/** The only code that talks to S3. Keys and URLs never leave the api except as signed URLs. */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly bucket: string;

  constructor(
    @Inject(S3_CLIENT) private readonly client: S3Client,
    @Inject(S3_PRESIGN_CLIENT) private readonly presignClient: S3Client,
    config: ConfigService<Env, true>,
  ) {
    this.bucket = config.get('S3_BUCKET', { infer: true });
  }

  /**
   * A presigned POST for one object. AWS and RustFS enforce the policy (size range, exact
   * Content-Type, expiry), but correctness rests on the HeadObject check in confirm. Every
   * form field must be in the policy: never add `success_action_status` or `x-amz-meta-*`
   * here without a matching condition, or storage answers 403.
   */
  createUpload(key: string, contentType: string): Promise<PresignedUpload> {
    return createPresignedPost(this.presignClient, {
      Bucket: this.bucket,
      Key: key,
      Conditions: [
        ['content-length-range', 1, MAX_MEDIA_SIZE_BYTES],
        ['eq', '$Content-Type', contentType],
      ],
      Fields: { 'Content-Type': contentType },
      Expires: UPLOAD_URL_TTL_SECONDS,
    });
  }

  /** The stored object's size and type, or null when there is none. */
  async head(key: string): Promise<StoredObject | null> {
    try {
      const object = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        size: object.ContentLength ?? 0,
        contentType: object.ContentType,
      };
    } catch (error) {
      if (
        error instanceof NotFound ||
        (error instanceof S3ServiceException &&
          error.$metadata.httpStatusCode === 404)
      ) {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  /** Best-effort cleanup after a commit: logs failures, never throws. */
  async deleteMany(keys: string[]): Promise<void> {
    const results = await Promise.allSettled(
      keys.map((key) => this.delete(key)),
    );

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(
          `Could not delete ${keys[index]} from storage: ${String(result.reason)}`,
        );
      }
    });
  }

  /**
   * A presigned GET. Signed at the start of the current hour, so every request within the
   * hour gets the same URL and the browser's cache keeps working; valid for 1–2 hours.
   */
  getReadUrl(key: string, contentType: string): Promise<string> {
    return getSignedUrl(
      this.presignClient,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentType: contentType,
        ResponseCacheControl: 'private, max-age=3600',
      }),
      { signingDate: floorToHour(Date.now()), expiresIn: READ_URL_TTL_SECONDS },
    );
  }
}
