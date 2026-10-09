import { Logger, Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { MediaController } from './media.controller.js';
import { MediaService } from './media.service.js';

@Module({
  imports: [StorageModule],
  controllers: [MediaController],
  providers: [
    { provide: Logger, useValue: new Logger(MediaModule.name) },
    MediaService,
  ],
  exports: [MediaService],
})
export class MediaModule {}
