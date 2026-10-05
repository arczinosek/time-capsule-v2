import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  createMediaRequestSchema,
  type CreateMediaRequest,
  type CreateMediaResponse,
  type MediaResponse,
} from '@time-capsule/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { toMediaResponse } from './media.mapper.js';
import { MediaService } from './media.service.js';

// The library and uploads. Linking media to an owner is PUT /<owner>/:id/media, in the
// owner's controller.
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  async findAll(): Promise<MediaResponse[]> {
    const media = await this.mediaService.findLibrary();

    return media.map(toMediaResponse);
  }

  /** Reserves a slot on the owner and answers the presigned POST for the browser. */
  @Post()
  async create(
    @Body(new ZodValidationPipe(createMediaRequestSchema))
    request: CreateMediaRequest,
  ): Promise<CreateMediaResponse> {
    const { mediaId, url, fields } = await this.mediaService.create(request);

    return { mediaId, url, fields };
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(@Param('id', ParseIntPipe) id: number): Promise<MediaResponse> {
    return toMediaResponse(await this.mediaService.confirm(id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.mediaService.remove(id);
  }
}
