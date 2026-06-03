# AI agent architecture roadmap

This document stores the agreed implementation plan for the future AI agent architecture of dr.kapustin.fi / LaakarinTyopoyta.

## Core principles

- Existing database structures must not be rewritten destructively.
- Existing AI profile, privacy anonymization and /api/chat behaviour must be preserved.
- New database work must be additive: new tables and nullable/defaulted fields only.
- Raw clinical text must pass through the server-side privacy layer before any external AI API request.
- The agent must be supervised: it may analyse, draft and propose actions, but clinically relevant changes are applied only after explicit user confirmation.
- The AI provider/model layer must be independent from agent logic.
- API credentials must be resolved centrally so platform keys can be used now and personal user keys can be added later.

## Target architecture

```text
Frontend -> API layer -> Privacy layer -> Profile layer -> Agent layer -> AI router -> Credential resolver -> Provider adapters -> External AI API
```

## Phase 1 — Safe technical base

1. Audit current AI architecture.
2. Add AI Provider Abstraction Layer.
3. Add Model Registry.
4. Add admin-managed platform provider credentials.
5. Add Credential Resolver.

The first implementation step is provider abstraction only. It must not change database schema or user-facing behaviour.

## Phase 2 — User settings and access policy

1. Add UserAiSettings for default provider/model and agent auto-selection preferences.
2. Add UserAiAccessPolicy for platform/user credential permissions.
3. Add admin UI for AI access management.

## Phase 3 — Agent MVP

1. Add AI Router.
2. Add Agent Privacy Gateway.
3. Add /api/agent MVP.
4. Add Agent Audit Trail.

The MVP agent must not automatically save templates, AI tools or clinical documents.

## Phase 4 — Practical integrations

1. Integrate agent into /malli.
2. Integrate agent into /ai-tools.
3. Add Clinical Text Reviewer mode.
4. Add agent model auto-selection.

## Phase 5 — Multi-provider support

1. Add Custom OpenAI-compatible provider.
2. Add Anthropic adapter.
3. Add Google Gemini adapter.
4. Add Mistral adapter.

## Phase 6 — Personal user API keys

1. Add encrypted UserAiCredential table.
2. Add user settings UI for personal API keys.
3. Enable credentialMode: platform, user, auto.
4. Allow admin to disable platform credentials for selected users.

## Phase 7 — Privacy strengthening

1. Add DVV-based name anonymization as a separate branch.
2. Consider agent-specific anonymization modes.
3. Add advanced privacy reporting.

## Deployment rules

Before each merge:

```bash
npx prisma migrate status
npx prisma generate
npm run build
npm run test:privacy
```

After deployment:

```bash
npx prisma migrate deploy
npx prisma generate
npm run build
npm run test:privacy
```

Database migration rules:

- no destructive migrations;
- no renaming existing columns/tables;
- no deleting existing fields;
- new tables only unless an additive nullable/defaulted field is required;
- API keys must never be stored in plain text;
- API keys must never be logged or returned to frontend in full.

## First branch scope

Branch: feature/ai-provider-abstraction

Scope:

- add provider type definitions;
- add OpenAI provider adapter;
- add runAiCompletion();
- add initial model registry;
- replace direct OpenAI call in /api/chat with runAiCompletion();
- no database changes;
- no UI changes.
