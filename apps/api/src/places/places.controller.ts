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
  createPlaceRequestSchema,
  updatePlaceRequestSchema,
  type CreatePlaceRequest,
  type PlaceDetailResponse,
  type PlaceResponse,
  type UpdatePlaceRequest,
} from '@time-capsule/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { toPlaceDetailResponse, toPlaceResponse } from './place.mapper.js';
import { PlacesService } from './places.service.js';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  async findAll(): Promise<PlaceResponse[]> {
    const places = await this.placesService.findAll();

    return places.map(toPlaceResponse);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PlaceDetailResponse> {
    return toPlaceDetailResponse(await this.placesService.findOne(id));
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createPlaceRequestSchema))
    request: CreatePlaceRequest,
  ): Promise<PlaceDetailResponse> {
    return toPlaceDetailResponse(await this.placesService.create(request));
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updatePlaceRequestSchema))
    request: UpdatePlaceRequest,
  ): Promise<PlaceDetailResponse> {
    return toPlaceDetailResponse(await this.placesService.update(id, request));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.placesService.remove(id);
  }
}
