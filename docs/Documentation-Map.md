# Documentation Map

| Area | File | Purpose / Notes |
| --- | --- | --- |
| **🚀 Agent Start** | **[AGENTS-QUICKSTART.md](../AGENTS-QUICKSTART.md)** | **NEW! 15-min onboarding cho Jules/Claude/Gemini. Đọc đầu tiên!** |
| Ops Manual | [AGENTS.md](../AGENTS.md) | Quy trình cho Agents (setup → coordination → PR checklist). Section 5 = workflow. |
| Overview | [docs/README.md](./README.md) | Hướng dẫn đọc docset + chuẩn lỗi hệ thống. |
| Map | [docs/Documentation-Map.md](./Documentation-Map.md) | (File hiện tại) Sơ đồ liên kết toàn bộ tài liệu. |
| **Roadmap** | **[ROADMAP.md](../ROADMAP.md)** | **187 tasks breakdown, tiến độ 30%, timeline 3-4 tuần, critical path.** |
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
| ~~Agent Supplements~~ | ~~[docs/agents/jules-guide.md](./agents/jules-guide.md)~~ | ⚠️ **DEPRECATED** - Replaced by AGENTS-QUICKSTART.md. Archive on 2025-12-01. |
