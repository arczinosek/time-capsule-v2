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
  createFamilyMemberRequestSchema,
  updateFamilyMemberRequestSchema,
  type CreateFamilyMemberRequest,
  type FamilyMemberDetailResponse,
  type FamilyMemberResponse,
  type UpdateFamilyMemberRequest,
} from '@time-capsule/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  toFamilyMemberDetailResponse,
  toFamilyMemberResponse,
} from './family-member.mapper.js';
import { FamilyMembersService } from './family-members.service.js';

@Controller('family-members')
export class FamilyMembersController {
  constructor(private readonly familyMembersService: FamilyMembersService) {}

  @Get()
  async findAll(): Promise<FamilyMemberResponse[]> {
    const familyMembers = await this.familyMembersService.findAll();

    return familyMembers.map(toFamilyMemberResponse);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<FamilyMemberDetailResponse> {
    return toFamilyMemberDetailResponse(
      await this.familyMembersService.findOne(id),
    );
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createFamilyMemberRequestSchema))
    request: CreateFamilyMemberRequest,
  ): Promise<FamilyMemberDetailResponse> {
    return toFamilyMemberDetailResponse(
      await this.familyMembersService.create(request),
    );
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(updateFamilyMemberRequestSchema))
    request: UpdateFamilyMemberRequest,
  ): Promise<FamilyMemberDetailResponse> {
    return toFamilyMemberDetailResponse(
      await this.familyMembersService.update(id, request),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.familyMembersService.remove(id);
  }
}
