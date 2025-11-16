# Contributing to MeoCRM

## Development Environment Setup

### Recommended VSCode Settings

While workspace settings are personal preferences and not committed to the repository, here are recommended settings for the team:

```json
{
  // TypeScript & JavaScript
  "typescript.updateImportsOnFileMove.enabled": "always",
  "javascript.updateImportsOnFileMove.enabled": "always",

  // Formatting
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },

  // ESLint
  "eslint.enable": true,
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],

  // Files
  "files.exclude": {
    "**/.git": true,
    "**/.next": true,
    "**/node_modules": true,
    "**/dist": true
  },

  // Editor
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.tabSize": 2,
  "editor.insertSpaces": true
}
```

To apply these settings, create your own `.vscode/settings.json` file locally (it's gitignored).

## Development Workflow

### Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL database
- Redis (optional, for caching)

### Getting Started

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Copy `.env.example` files and configure environment variables
4. Generate Prisma client: `pnpm --filter @meocrm/api run prisma:generate`
5. Run migrations: `pnpm --filter @meocrm/api run prisma:migrate:dev`
6. Start development servers:
   - API: `pnpm --filter @meocrm/api run dev`
   - Web: `pnpm --filter @meocrm/web run dev`

### Code Quality

- Run tests: `pnpm test`
- Run linter: `pnpm lint`
- Run type check: `pnpm tsc --noEmit`
- Build: `pnpm build`

### Commit Guidelines

We follow conventional commit messages:
- `feat:` New features
- `fix:` Bug fixes
- `chore:` Maintenance tasks
- `docs:` Documentation updates
- `refactor:` Code refactoring
- `test:` Test additions or updates

Example: `feat(customers): add birthday validation`

### Testing

- Maintain minimum 80% code coverage
- Write unit tests for services and utilities
- Write E2E tests for API endpoints
- Use safe assertions in tests (avoid brittle exact matches)

### Pull Requests

1. Create a feature branch from `dev`
2. Make your changes with appropriate tests
3. Ensure all tests pass and coverage thresholds are met
4. Submit PR to `dev` branch
5. Ensure CI checks pass

## Architecture

- **apps/api**: NestJS REST API
- **apps/web**: Next.js 14 web application
- **packages/api-client**: Auto-generated TypeScript API client

For more details, see the README.md file.
