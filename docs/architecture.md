# Architecture Overview

## Purpose

LaakarinTyopoyta is an authenticated internal physician workspace. The system is designed around three priorities:

1. practical workflow support for clinicians;
2. privacy-aware AI assistance;
3. stable production operation for active users.

There is also a strong product-shaping principle for future work:

- this should behave like a personal physician desktop, not a one-size-fits-all portal;
- users should be able to control which tools are visible to them and, where sensible, the order and layout of those tools;
- personalization should be implemented through explicit per-user preferences rather than hidden UI heuristics.

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
- per-user provider credentials exist
- supported providers are intentionally limited to `OpenAI`, `Google Gemini`, and `YandexGPT`
- the current runtime uses an OpenAI-compatible provider path for those supported providers
- some historical route assumptions still lean on OpenAI defaults even though the provider layer is broader now

Privacy-related implementation details are documented separately in:

- [privacy-architecture.md](privacy-architecture.md)
- [privacy-operations.md](privacy-operations.md)
- [ai-providers-and-credentials.md](ai-providers-and-credentials.md)

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

It now also connects to a higher-level workspace context:

- `practiceCountry` acts as the top-level clinician context
- country defaults can set interface language, clinical country, clinical output language, evidence strictness, and default source preferences
- manual overrides remain possible and are surfaced in settings instead of being hidden

### 7. Medicines and support modules

There are supporting modules for:

- medicines / substances
- links
- calculators
- pediatric medication utilities

Some of these are production-grade, some are still experimental.

The calculator area is now the reference implementation for user-facing personalization:

- calculator definitions live in a registry;
- visibility is stored per user;
- order can be stored per user;
- the catalog page is generated from those per-user preferences.

Other areas now follow the same general direction:

- the sidebar supports per-user visibility and ordering for the main navigation block;
- the links area can inject practice-country default categories while keeping personal and shared content separate;
- the settings page itself is organized into second-level sections instead of one long scroll surface.

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

- some provider assumptions still default toward OpenAI even though runtime support now covers OpenAI, Gemini, and YandexGPT
- some older endpoints are still present for legacy reasons
- `pikaohjeet-v2` still stores some state in internal tags that should eventually become explicit schema fields
- a few schema-related workarounds were originally made under GitHub connector limitations and should be normalized over time

## Non-negotiable project rules

- production data must be preserved
- changes should be deployed branch-first
- database changes should be additive
- the agent must stay supervised
- privacy and evidence gates are part of the architecture, not optional extras
- personalization should prefer explicit user preferences stored in the system over hardcoded universal defaults
