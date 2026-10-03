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
} from '@nestjs/common';
import {
  createMilestoneRequestSchema,
  updateMilestoneRequestSchema,
  type CreateMilestoneRequest,
  type MilestoneResponse,
  type UpdateMilestoneRequest,
} from '@time-capsule/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { toMilestoneResponse } from './milestone.mapper.js';
import { MilestonesService } from './milestones.service.js';

@Controller('milestones')
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.milestonesService.remove(id);
  }
}
