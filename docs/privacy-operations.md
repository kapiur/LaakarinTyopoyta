# Privacy Operations

## Purpose

This document describes how to operate, review, and extend the privacy subsystem safely in day-to-day development.

Use this together with:

- [privacy-architecture.md](privacy-architecture.md)
- [security-and-privacy.md](security-and-privacy.md)

## Operational rules

### 1. Treat privacy as an architecture layer, not a helper

When adding or changing an AI route:

- do not wire raw free-text directly into an external AI request
- do not assume another layer already sanitized it
- do not add a one-off regex patch in the route if the pattern belongs in the shared privacy layer

Default expectation:

- new AI-facing free-text should go through the privacy gateway

### 2. Preserve the account-identity boundary

Do not run patient-text anonymization blindly over first-party account data such as:

- `User.email`
- `User.name`
- future account identity/profile keys used for normal account management

Do apply privacy controls to:

- AI-facing free-text profile fields
- pasted examples
- clinical notes
- agent and chat content

### 3. Prefer stricter modes when text may live longer

If you are unsure which privacy mode to choose, bias toward the stricter lifecycle mode when the text:

- will be stored,
- will be reused later,
- will become reusable prompt content,
- or will become part of a structured generated artifact.

### 4. Never trust AI output by default

If a route transforms or generates clinical text, output privacy handling is part of the route design, not optional polish.

### 5. Keep persistence minimal

For new persistence behavior:

- do not store raw patient text
- minimize stored anonymized text
- prefer opt-in over default-on for long-lived user examples
- think about retention before expanding storage volume

## Current tests and checks

Useful commands:

```bash
npm run test:privacy
npm run test:templates
npm run build
```

Use `npm run test:privacy` when:

- changing detection rules
- changing locale packs
- changing placeholder behavior
- changing gateway allow/warn/block logic
- changing structured payload sanitization

## Manual review checklist for privacy-related changes

Before merging privacy-sensitive work:

1. verify the route still works for safe non-PII input
2. verify obvious PII is sanitized or blocked
3. verify already sanitized placeholders do not trigger false blocks
4. verify mixed-language FI/RU/EN cases if patterns were touched
5. verify structured JSON payloads are still structurally valid
6. run `npm run test:privacy`
7. run `npm run build`
8. deploy the feature branch before merging to `main`

## Current storage behavior for AI profile samples

Current behavior:

- saving anonymized samples is explicit opt-in
- the checkbox is off by default in the UI
- the system retains only a limited number of stored samples
- the user can clear stored samples from the settings UI

Relevant files:

- [app/api/profile/ai/analyze-style/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/profile/ai/analyze-style/route.ts)
- [app/api/profile/ai/samples/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/profile/ai/samples/route.ts)
- [components/AiProfileSettingsCard.tsx](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/components/AiProfileSettingsCard.tsx)

Current retention rule:

- keep the `12` most recent anonymized samples
- delete older samples automatically after new saves

## How to document new privacy patterns

When adding a new privacy capability, update all relevant layers:

1. implementation
2. tests
3. developer docs
4. user-facing UI copy if user behavior changes

At minimum, update:

- [privacy-architecture.md](privacy-architecture.md) for structural changes
- [security-and-privacy.md](security-and-privacy.md) for policy changes
- route-specific docs if behavior materially changes

## Recommended workflow for new privacy work

1. branch from `main`
2. implement the smallest coherent privacy step
3. run privacy tests
4. run build
5. deploy the branch in Coolify
6. manually test the risky route
7. merge to `main`
8. deploy `main`

This project has active production users. Privacy fixes should move steadily, but not casually.

## Suggested remaining backlog

Good next privacy items:

- expand route-level regression corpus
- add stronger quasi-identifier risk heuristics
- add DVV-based Finnish name intelligence with scoring and allowlists
- continue reviewing legacy or low-visibility endpoints
- extend operations guidance if future providers or ingestion surfaces are added
