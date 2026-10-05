import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { FamilyMembersController } from './family-members.controller.js';
import { FamilyMembersService } from './family-members.service.js';

@Module({
  imports: [MediaModule],
  controllers: [FamilyMembersController],
  providers: [FamilyMembersService],
})
export class FamilyMembersModule {}
