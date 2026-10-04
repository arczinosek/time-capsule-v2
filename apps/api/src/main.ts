import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();
  // Express's default 100 kB would answer 413 for a description within the 65,535-byte TEXT
  // limit once JSON escaping (quotes, newlines) has inflated it. Nest skips its own parser then.
  app.useBodyParser('json', { limit: '256kb' });

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }) });

  await app.listen(config.get('PORT', { infer: true }));
}

await bootstrap();
