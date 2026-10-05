import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  createMilestoneRequestSchema,
  updateMilestoneMediaRequestSchema,
  updateMilestoneRequestSchema,
  type CreateMilestoneRequest,
  type MediaResponse,
  type MilestoneResponse,
  type UpdateMilestoneMediaRequest,
  type UpdateMilestoneRequest,
} from '@time-capsule/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { toMediaResponse } from '../media/media.mapper.js';
import { MediaService } from '../media/media.service.js';
import { toMilestoneResponse } from './milestone.mapper.js';
import { MilestonesService } from './milestones.service.js';

@Controller('milestones')
export class MilestonesController {
  constructor(
    private readonly milestonesService: MilestonesService,
    private readonly mediaService: MediaService,
  ) {}

  @Get()
  async findAll(): Promise<MilestoneResponse[]> {
    const milestones = await this.milestonesService.findAll();

    return milestones.map(toMilestoneResponse);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MilestoneResponse> {
    return toMilestoneResponse(await this.milestonesService.findOne(id));
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createMilestoneRequestSchema))
    request: CreateMilestoneRequest,
  ): Promise<MilestoneResponse> {
    return toMilestoneResponse(await this.milestonesService.create(request));
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateMilestoneRequestSchema))
    request: UpdateMilestoneRequest,
  ): Promise<MilestoneResponse> {
    return toMilestoneResponse(
      await this.milestonesService.update(id, request),
    );
  }

  /**
   * Replaces the milestone's photos with `mediaIds`, in that order, unless `baseMediaIds`
   * is stale (409); answers the new set.
   */
  @Put(':id/media')
  async replaceMedia(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateMilestoneMediaRequestSchema))
    request: UpdateMilestoneMediaRequest,
  ): Promise<MediaResponse[]> {
    const media = await this.mediaService.replaceOwnerMedia(
      { type: 'milestone', id },
      request,
    );

    return media.map(toMediaResponse);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.milestonesService.remove(id);
  }
}
