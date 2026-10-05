import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConflictErrorFilter } from './common/conflict-error.filter.js';
import { FieldValidationErrorFilter } from './common/field-validation-error.filter.js';
import { NotFoundErrorFilter } from './common/not-found-error.filter.js';
import { validateEnv } from './config/env.js';
import { DatabaseModule } from './database/database.module.js';
import { FamilyMembersModule } from './family-members/family-members.module.js';
import { LocationsModule } from './locations/locations.module.js';
import { MediaModule } from './media/media.module.js';
import { MilestonesModule } from './milestones/milestones.module.js';
import { PlacesModule } from './places/places.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    FamilyMembersModule,
    LocationsModule,
    MediaModule,
    MilestonesModule,
    PlacesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: NotFoundErrorFilter },
    { provide: APP_FILTER, useClass: FieldValidationErrorFilter },
    { provide: APP_FILTER, useClass: ConflictErrorFilter },
  ],
})
export class AppModule {}
