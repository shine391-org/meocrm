# MeoCRM Web - Agent Instructions

This document provides context for the `web` service (@meocrm/web). For project-wide instructions, see the root `AGENTS.md`.

## Testing
To run tests specifically for the web service:
```bash
pnpm --filter @meocrm/web test
```

## Architecture & Key Rules
-   **Framework:** [Next.js](https://nextjs.org/) with App Router.
-   **UI Components:** Located in `components/ui`, built with shadcn/ui.
-   **State Management:** Use React Query for server state.
-   **API Communication:** Handled by functions in `lib/api/`.

## Key Documents
-   **API Reference:** `../../docs/04_API_REFERENCE.md` (to understand data sources)