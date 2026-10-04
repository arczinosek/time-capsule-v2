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
  createLocationRequestSchema,
  updateLocationRequestSchema,
  type CreateLocationRequest,
  type LocationResponse,
  type UpdateLocationRequest,
} from '@time-capsule/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { toLocationResponse } from './location.mapper.js';
import { LocationsService } from './locations.service.js';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async findAll(): Promise<LocationResponse[]> {
    const locations = await this.locationsService.findAll();

    return locations.map(toLocationResponse);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<LocationResponse> {
    return toLocationResponse(await this.locationsService.findOne(id));
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createLocationRequestSchema))
    request: CreateLocationRequest,
  ): Promise<LocationResponse> {
    return toLocationResponse(await this.locationsService.create(request));
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateLocationRequestSchema))
    request: UpdateLocationRequest,
  ): Promise<LocationResponse> {
    return toLocationResponse(await this.locationsService.update(id, request));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.locationsService.remove(id);
  }
}
