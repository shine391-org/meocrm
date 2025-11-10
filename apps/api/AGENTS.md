# MeoCRM API - Agent Instructions

This document provides context for the `api` service (@meocrm/api). For project-wide instructions, see the root `AGENTS.md`.

## Testing
To run tests specifically for the API service:
```bash
pnpm --filter @meocrm/api test
```

## Architecture & Key Rules
-   **Framework:** [NestJS](https://nestjs.com/).
-   **Database:** Access is handled via `PrismaService`.
-   **Critical Rule:** All database queries MUST be filtered by `organizationId` to ensure multi-tenancy security.

## Key Documents
-   **API Reference:** `../../docs/04_API_REFERENCE.md`
-   **Database Schema:** `../../docs/03_DATABASE_SCHEMA.md`
-   **Business Logic:** `../../docs/01_BUSINESS_LOGIC.md`