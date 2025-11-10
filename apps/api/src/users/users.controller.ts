import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create new user for current organization' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  create(@CurrentUser() user: any, @Body() dto: CreateUserDto) {
    return this.usersService.create(dto, user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List organization users' })
  @ApiResponse({ status: 200, description: 'Paginated users list' })
  findAll(@CurrentUser() user: any, @Query() query: ListUsersDto) {
    return this.usersService.findAll(user.organizationId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.findOne(id, user.organizationId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto, user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove user from organization' })
  @ApiResponse({ status: 200, description: 'User removed' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.remove(id, user.organizationId, user.id);
  }
}
