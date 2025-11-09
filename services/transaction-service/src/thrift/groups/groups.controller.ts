import { Controller, Post, Body, Param, Get, UseGuards, Patch, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GroupsService } from './groups.service';

@UseGuards(AuthGuard('jwt'))
@Controller('groups')
export class GroupsController {
  constructor(private readonly service: GroupsService) {}

  @Post()
  create(@Body() dto: { name: string; ownerUserId: string }) {
    return this.service.create(dto);
  }

  @Post(':id/members')
  addMember(
    @Param('id') groupId: string,
    @Body() dto: { userId: string; role?: string },
  ) {
    return this.service.addMember(groupId, dto);
  }

  @Get(':id/members')
  listMembers(@Param('id') groupId: string) {
    return this.service.listMembers(groupId);
  }

  @Patch(':id/members/:memberId')
  updateMember(
    @Param('id') groupId: string,
    @Param('memberId') memberId: string,
    @Body() dto: { role?: string },
  ) {
    return this.service.updateMember(groupId, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id') groupId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.service.removeMember(groupId, memberId);
  }
}
