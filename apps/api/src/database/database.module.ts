import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import type { Env } from '../config/env.js';
import { DRIZZLE } from './database.types.js';
import * as schema from './schema.js';

const MYSQL_POOL = Symbol('MYSQL_POOL');

@Global()
@Module({
  providers: [
    {
      provide: MYSQL_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        mysql.createPool(config.get('DATABASE_URL', { infer: true })),
    },
    {
      provide: DRIZZLE,
      inject: [MYSQL_POOL],
      useFactory: (pool: mysql.Pool) =>
        drizzle(pool, { schema, mode: 'default' }),
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(MYSQL_POOL) private readonly pool: mysql.Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
