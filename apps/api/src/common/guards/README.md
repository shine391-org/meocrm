# OrganizationGuard

Guard to ensure authenticated users belong to an organization and provide easy access to `organizationId`.

## Purpose

This guard eliminates DRY violations by centralizing organization validation logic. Instead of extracting `user.organizationId` in every controller method, use `@OrganizationId()` decorator.

## Usage

### Basic Usage

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../common/guards';
import { OrganizationId } from '../common/decorators';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class SuppliersController {
  @Get()
  async findAll(@OrganizationId() organizationId: string) {
    // organizationId is automatically extracted and validated
    return this.service.findAll(organizationId);
  }
}
```

### Before (with DRY violation)

```typescript
@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  @Get()
  async findAll(@CurrentUser() user: User) {
    // Repeated in every method
    return this.service.findAll(user.organizationId);
  }

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateDto) {
    // Repeated again
    return this.service.create(user.organizationId, dto);
  }
}
```

### After (DRY compliant)

```typescript
@Controller('suppliers')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class SuppliersController {
  @Get()
  async findAll(@OrganizationId() organizationId: string) {
    return this.service.findAll(organizationId);
  }

  @Post()
  async create(@OrganizationId() organizationId: string, @Body() dto: CreateDto) {
    return this.service.create(organizationId, dto);
  }
}
```

## Features

- ✅ Validates user is authenticated (requires JwtAuthGuard)
- ✅ Validates user has an organizationId
- ✅ Throws ForbiddenException if validation fails
- ✅ Makes organizationId available via `@OrganizationId()` decorator
- ✅ Reduces code duplication across controllers

## Files

- **Guard**: `src/common/guards/organization.guard.ts`
- **Decorator**: `src/common/decorators/organization-id.decorator.ts`
- **Exports**: `src/common/guards/index.ts`, `src/common/decorators/index.ts`
