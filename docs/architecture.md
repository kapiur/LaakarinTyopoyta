# Architecture Overview

## Purpose

LaakarinTyopoyta is an authenticated internal physician workspace. The system is designed around three priorities:

1. practical workflow support for clinicians;
2. privacy-aware AI assistance;
3. stable production operation for active users.

## High-level structure

```text
Browser UI
  -> Next.js App Router pages
  -> API routes
  -> Privacy / safety layers
  -> AI routing / provider logic
  -> Prisma
  -> PostgreSQL
```

## Core domains

### 1. Users and authentication

- NextAuth credentials authentication
- user roles: `ADMIN`, `USER`
- per-user UI language
- forced password-change support
- production users are real and active

Main files:

- [lib/auth.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/auth.ts)
- [middleware.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/middleware.ts)
- [prisma/schema.prisma](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/prisma/schema.prisma)

Important boundary:

- user account identity data such as `User.email` and `User.name` is first-party system data
- patient / third-party clinical text is privacy-gateway data
- these must not be treated as the same thing

The anonymization system is designed to protect patient and third-party clinical text before AI processing, not to rewrite core account identity records in the application database.

### 2. Templates (`malli`)

Structured text templates for physician documentation.

- categories and templates are stored in the database
- templates support dynamic fields and conditional logic
- there is an AI-assisted template workflow

Related docs:

- [templates-interactive-fields.md](templates-interactive-fields.md)

### 3. Clinical quick guides (`pikaohjeet-v2`)

This area currently mixes:

- published clinical cards
- personal notes
- admin editing for clinical cards
- AI-assisted clinical card creation
- a supervised agent integration

Important distinction:

- `clinical-manager` is the controlled admin editing surface for clinical cards
- the main `pikaohjeet-v2` screen is a broader reading and note workflow

### 4. AI tools

`/ai-tools` stores reusable prompt-driven tools.

Current state:

- platform credentials exist
- per-user AI profile exists
- multi-provider support is partially implemented
- some routes still call OpenAI directly as an interim state

### 5. AI agent

The agent is supervised and intentionally limited.

Current design goals:

- no auto-save
- no silent mutation of templates, cards, or settings
- clinical advice requires evidence
- reference-style clinical help can work in restricted mode
- audit logging must not store raw sensitive text

See [agent-architecture.md](agent-architecture.md).

### 6. Clinical evidence configuration

The system includes:

- user clinical settings
- clinical source registry
- user source preferences
- evidence-aware agent behavior

This is the backbone for country-scoped clinical responses.

### 7. Medicines and support modules

There are supporting modules for:

- medicines / substances
- links
- calculators
- pediatric medication utilities

Some of these are production-grade, some are still experimental.

## Database shape

Main model groups in [prisma/schema.prisma](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/prisma/schema.prisma):

- `User`, `Category`, `Template`
- `AiTool`, `UserAiProfile`, `AiProviderCredential`
- `UserClinicalSettings`, `ClinicalSource`, `UserClinicalSourcePreference`
- `ClinicalCard`, `ClinicalSection`, `ClinicalField`, `ClinicalRule`, `ClinicalRevision`
- `Substance`, `Medicine`, `Package`
- `LinkCategory`, `QuickLink`
- `AiRunAuditLog`

## Current architectural realities

Some parts are intentionally transitional:

- direct OpenAI routes still exist
- some older endpoints are still present for legacy reasons
- `pikaohjeet-v2` still stores some state in internal tags that should eventually become explicit schema fields
- a few schema-related workarounds were originally made under GitHub connector limitations and should be normalized over time

## Non-negotiable project rules

- production data must be preserved
- changes should be deployed branch-first
- database changes should be additive
- the agent must stay supervised
- privacy and evidence gates are part of the architecture, not optional extras
