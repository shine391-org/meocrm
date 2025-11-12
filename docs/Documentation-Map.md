# Documentation Map

| Area | File | Purpose / Notes |
| --- | --- | --- |
| Ops Manual | [AGENTS.md](../AGENTS.md) | Quy trình cho Agents (setup → guardrails → prompts → PR checklist). |
| Overview | [docs/README.md](./README.md) | Hướng dẫn đọc docset + chuẩn lỗi hệ thống. |
| Map | [docs/Documentation-Map.md](./Documentation-Map.md) | (File hiện tại) Sơ đồ liên kết toàn bộ tài liệu. |
| Business Logic | [docs/01_BUSINESS_LOGIC.md](./01_BUSINESS_LOGIC.md) | Quy tắc nghiệp vụ (Lead Priority, Commission, Refund, Debt, Shipping...). |
| Implementation Plan | [docs/02_IMPLEMENTATION_PLAN.md](./02_IMPLEMENTATION_PLAN.md) | Ưu tiên feature và phụ thuộc. |
| Data Schema | [docs/03_DATABASE_SCHEMA.md](./03_DATABASE_SCHEMA.md) | Data dictionary, ERD, PII, soft delete/purge. |
| API Reference | [docs/04_API_REFERENCE.md](./04_API_REFERENCE.md) | REST endpoints + components schemas. |
| Integrations | [docs/integration/README.md](./integration/README.md) | Chuẩn REST/Webhook/MCP/WS, events, Telegram/Zalo lưu ý. |
| Settings & Feature Flags | [docs/settings/README.md](./settings/README.md) | Precedence Default→Plan→Tenant→Branch→Role→User→Object, JSON schema, kill-switch. |
| Architecture | [docs/architecture/README.md](./architecture/README.md) | High-level diagram + sequence (Auth, Multi-tenant request, Order→Commission→Payout). |
| Testing | [docs/testing/Strategy-&-Coverage.md](./testing/Strategy-&-Coverage.md) | Target coverage ≥80%, golden E2E, Jest skeleton instructions. |
| Environment | [docs/ENVIRONMENT.md](./ENVIRONMENT.md) | Local setup, ports, Prisma workflows, rollback/seed cautions. |
| Troubleshooting | [docs/06_TROUBLESHOOTING.md](./06_TROUBLESHOOTING.md) | Các lỗi môi trường phổ biến. |
| Code Review | [docs/code-review/coderabbit-final-followups.md](./code-review/coderabbit-final-followups.md) | Checklist + MEOW context for CodeRabbit 'Final Follow-ups' branch. |
| Agent Supplements | [docs/agents/jules-guide.md](./agents/jules-guide.md) | Ghi chú riêng cho Jules/triage. |
