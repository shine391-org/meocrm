# Archived Agent Manual (Legacy)

This copy is kept only for historical reference. The actively maintained operating guide for Claude/Jules now lives in the project root at `AGENTS.md`, which mirrors the optimized documentation layout described in `DOCS_OPTIMIZATION_PROPOSAL.md` and `docs/00_START_HERE.md`.

## Where to Look Today
- `AGENTS.md` – canonical workflow (plan → implement → Jules CI/CD → merge), service-specific rules, and checklists.
- `docs/00_START_HERE.md` – context-loading playbook for each task type.
- `docs/essential/01_BUSINESS_LOGIC.md`, `03_DATABASE_SCHEMA.md`, `ENVIRONMENT.md` – business rules, schema, and environment details.
- `WORKFLOW-SIMPLE.md` + `ROADMAP.md` – day-to-day flow and current task status.

## Legacy Summary
- Solo-agent workflow labelled "Option 3" (Claude builds, Jules validates).
- Onboarding steps (`./setup-jules-vm.sh`, env copies) and references to pre-optimization doc paths.
- Testing requirements: run `pnpm -w test`, target ≥80% coverage, golden E2E (login → create product → POS order → verify stock decrease).
- Guardrails: multi-tenant filters, `{code,message,traceId}` error format, settings-driven values, OrganizationGuard usage.
- Coordination guidance: use MEOW (Mission, Evidence, Output, Warnings) template for prompts/PR comments.

## Why Archived?
- The legacy file duplicated content that now lives in `AGENTS.md`, `WORKFLOW-SIMPLE.md`, and the reorganized `docs/` tree.
- Keeping a lightweight stub prevents agents from loading stale guidance while still acknowledging the previous workflow reference.

> If you landed here via an old link, switch to `AGENTS.md` in the repository root before continuing any work.

