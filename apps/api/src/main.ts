import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }) });

  await app.listen(config.get('PORT', { infer: true }));
}

await bootstrap();
