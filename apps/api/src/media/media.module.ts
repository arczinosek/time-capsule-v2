import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';

// MediaService reads the owner tables itself and never calls their services, so the owner
// modules can import this one without a cycle.
@Module({
  imports: [StorageModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
