import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { NotFoundErrorFilter } from './common/not-found-error.filter.js';
import { validateEnv } from './config/env.js';
import { DatabaseModule } from './database/database.module.js';
import { MilestonesModule } from './milestones/milestones.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    MilestonesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: NotFoundErrorFilter },
  ],
})
export class AppModule {}
