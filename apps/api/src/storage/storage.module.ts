import type { S3Client } from '@aws-sdk/client-s3';
import { Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import { createS3Client, S3_CLIENT, S3_PRESIGN_CLIENT } from './s3-client.js';
import { StorageService } from './storage.service.js';

function s3Env(config: ConfigService<Env, true>) {
  return {
    S3_REGION: config.get('S3_REGION', { infer: true }),
    S3_FORCE_PATH_STYLE: config.get('S3_FORCE_PATH_STYLE', { infer: true }),
    S3_ACCESS_KEY_ID: config.get('S3_ACCESS_KEY_ID', { infer: true }),
    S3_SECRET_ACCESS_KEY: config.get('S3_SECRET_ACCESS_KEY', { infer: true }),
  };
}

@Module({
  providers: [
    { provide: Logger, useValue: new Logger(StorageModule.name) },
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        createS3Client(
          s3Env(config),
          config.get('S3_ENDPOINT', { infer: true }),
        ),
    },
    {
      provide: S3_PRESIGN_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        createS3Client(
          s3Env(config),
          config.get('S3_PUBLIC_ENDPOINT', { infer: true }) ??
            config.get('S3_ENDPOINT', { infer: true }),
        ),
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule implements OnApplicationShutdown {
  constructor(
    @Inject(S3_CLIENT) private readonly client: S3Client,
    @Inject(S3_PRESIGN_CLIENT) private readonly presignClient: S3Client,
  ) {}

  // Closes the clients' keep-alive sockets, so the process (and e2e workers) can exit.
  onApplicationShutdown(): void {
    this.client.destroy();
    this.presignClient.destroy();
  }
}
