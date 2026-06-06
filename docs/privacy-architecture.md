# Privacy Architecture

## Purpose

This document describes the current privacy and anonymization architecture for AI-facing text in LaakarinTyopoyta.

The privacy layer exists to reduce the risk of sending patient or third-party clinical identifiers to external AI providers, and to reduce the risk of returning or persisting those identifiers after AI processing.

It is not a promise of perfect de-identification. It is a layered mitigation system.

## Core boundary

The most important boundary in this subsystem is:

- `patient / third-party clinical text` is privacy-gateway data
- `authenticated user account identity` is not

Examples of first-party account identity data:

- `User.email`
- `User.name`
- future account identity fields stored as part of normal account management

Examples of privacy-gateway data:

- pasted patient notes
- free-text clinical examples
- AI profile example text
- agent conversation content
- AI tool free-text input
- clinical builder source text

This distinction is intentional. The anonymization system is designed to protect AI-facing clinical text, not to rewrite the application's own core account records.

## High-level flow

```text
User text or structured payload
  -> privacy gateway
    -> mode selection
    -> primary sanitization
    -> residual scan
    -> allow / warn / block decision
  -> external AI call (if allowed)
  -> output sanitization
  -> output residual scan
  -> safe response to UI
  -> minimized persistence where needed
```

The privacy layer is designed to work before, during, and after AI generation rather than only on the initial input.

## Main building blocks

### 1. Primary text anonymizer

Main file:

- [lib/privacy/anonymizePatientText.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/privacy/anonymizePatientText.ts)

This is the core text-level sanitization engine. It:

- detects identifier-like spans
- replaces them with placeholders such as `[NAME]`, `[PHONE]`, `[ADDRESS]`
- supports multiple sanitization modes
- supports multiple locale packs

### 2. Privacy gateway

Main files:

- [lib/privacy/gateway/index.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/privacy/gateway/index.ts)
- [lib/privacy/gateway/types.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/privacy/gateway/types.ts)
- [lib/privacy/gateway/classifyInput.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/privacy/gateway/classifyInput.ts)
- [lib/privacy/gateway/sanitizePayload.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/privacy/gateway/sanitizePayload.ts)
- [lib/privacy/gateway/residualScan.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/privacy/gateway/residualScan.ts)
- [lib/privacy/gateway/decision.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/privacy/gateway/decision.ts)

The gateway is the shared orchestration layer. It:

- normalizes privacy handling for route inputs
- runs primary sanitization per field
- runs a stricter residual scan on already sanitized output
- returns privacy metadata
- decides whether the payload should be allowed, warned, or blocked

Returned privacy state includes:

- `findingTypes`
- `residualFindingTypes`
- `decision`
- `severity`
- `blocked`
- `localeKeys`

### 3. Structured payload sanitizer

Main file:

- [lib/privacy/structured/sanitizeJsonValue.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/privacy/structured/sanitizeJsonValue.ts)

This exists because many AI routes do not send a single plain text blob. They send nested objects, arrays, excerpts, summaries, and JSON-like payloads.

Instead of doing:

```text
JSON.stringify -> anonymize -> JSON.parse
```

the system now sanitizes leaf values while preserving structure.

### 4. Locale packs

Main files:

- [lib/privacy/packs/index.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/privacy/packs/index.ts)
- [lib/privacy/packs/fi.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/privacy/packs/fi.ts)
- [lib/privacy/packs/ru.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/privacy/packs/ru.ts)
- [lib/privacy/packs/en.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/privacy/packs/en.ts)

The locale-pack layer exists so that country- or language-specific patterns do not have to be hardcoded into one monolithic detector.

Current supported locale keys:

- `fi`
- `ru`
- `en`

Current design intention:

- Finnish, Russian, and English formats are supported now
- future countries should be added by adding new locale packs rather than rewriting the core anonymizer

## Privacy modes

The privacy gateway uses lifecycle-aware modes rather than one universal sanitization rule.

Current gateway modes:

- `transientClinicalChat`
- `generalText`
- `clinicalTransform`
- `clinicalBuilder`
- `persistentStorage`
- `persistentSample`
- `templateSyntax`

### Why these modes exist

Different text lifecycles need different strictness.

Examples:

- transient chat text can preserve more clinical usability
- reusable builder content should be stricter
- anything stored in the database should be stricter still
- template syntax may need selective handling so the template language is not broken

### Mode intent

`transientClinicalChat`
- for short-lived clinical interaction
- aims to preserve usefulness while removing obvious identifiers

`generalText`
- for non-clinical or mixed general-purpose text
- default when no more specific mode is chosen

`clinicalTransform`
- for note cleaning, rewriting, or transformation flows
- stricter than transient chat

`clinicalBuilder`
- for longer reusable clinical drafting flows
- uses stricter handling appropriate for source text that may be turned into reusable output

`persistentStorage`
- for text that may be stored
- strongest practical route-level input/output mode

`persistentSample`
- for stored or reusable user writing samples
- strict and storage-oriented

`templateSyntax`
- special case where literal text may need privacy handling but template structure must not be broken

## Detection model

The current detector stack is hybrid rather than purely regex-based.

It combines:

- direct pattern matching
- locale-aware terms and formats
- patient-context words
- relationship/context terms
- address handling
- route-level residual checks
- output-side blocking or sanitization

Current coverage includes:

- names in common explicit contexts
- HETU-like Finnish identifiers
- phone numbers
- email addresses
- date-of-birth style expressions
- address-like expressions
- patient IDs in supported patterns
- mixed FI/RU/EN phrasing

The system also avoids re-triggering on its own internal placeholders like:

- `[NAME]`
- `[ADDRESS]`
- `[PHONE]`
- `[DATE_OF_BIRTH]`

This matters because already sanitized text must not be treated as fresh raw PII on the second pass.

## Residual scan and decision model

Primary sanitization is not trusted blindly.

After a field is sanitized, the gateway runs a residual scan on the sanitized result. This creates the final route-level privacy decision:

- `allow`
- `warn`
- `block`

This design exists to catch cases where:

- primary sanitization missed something
- a mixed-language pattern slipped through
- output still contains risky identifier fragments

## Output privacy controls

The privacy layer also runs on AI output, not just input.

That means a route may:

1. sanitize or block the input,
2. still make the AI call,
3. then sanitize or block the AI response before returning it.

This matters because the model may:

- echo patient data,
- reconstruct details from context,
- or return a response that still contains identifiers after transformation.

## Current route coverage

The main AI surfaces now use the shared privacy flow.

Current route coverage includes:

- [app/api/chat/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/chat/route.ts)
- [app/api/agent/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/agent/route.ts)
- [app/api/ai-tools/refine/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/ai-tools/refine/route.ts)
- [app/api/ai-tools/prompt-assistant/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/ai-tools/prompt-assistant/route.ts)
- [app/api/templates/ai/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/templates/ai/route.ts)
- [app/api/profile/ai/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/profile/ai/route.ts)
- [app/api/profile/ai/analyze-style/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/profile/ai/analyze-style/route.ts)
- [app/api/pikaohjeet-v2/ai/clean-note/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/pikaohjeet-v2/ai/clean-note/route.ts)
- [app/api/pikaohjeet-v2/ai/extract-clinical-chunk/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/pikaohjeet-v2/ai/extract-clinical-chunk/route.ts)
- [app/api/pikaohjeet-v2/ai/synthesize-clinical-card/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/pikaohjeet-v2/ai/synthesize-clinical-card/route.ts)
- [app/api/pikaohjeet-v2/ai/create-clinical-card/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/pikaohjeet-v2/ai/create-clinical-card/route.ts)

The system is much more unified than before, but should still be treated as an actively maintained safety layer rather than a finished endpoint-freeze.

## Persistence rules

Privacy is not only about what is sent to AI providers. It is also about what remains in the database.

Current persistence rules include:

- raw patient text should not be stored in AI logs
- anonymized profile samples are stored only through explicit opt-in
- long-lived profile material is sanitized in stricter modes
- stored style-derived content is minimized and shortened rather than kept as large free-text blocks
- user sample retention is limited

The current stored sample limit is enforced in:

- [app/api/profile/ai/analyze-style/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/profile/ai/analyze-style/route.ts)

and the current limit is:

- `12` stored anonymized samples per profile

## User-facing posture

The UI intentionally avoids claiming perfect safety.

Current product stance:

- the system performs automatic privacy scanning
- the system may sanitize or block risky content
- manual review is still required

This is reflected in:

- [components/PrivacyNotice.tsx](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/components/PrivacyNotice.tsx)

## Known limitations

This system is substantially stronger than the original route-by-route anonymization, but it still has limits.

Known limitations:

- it is heuristic, not a guarantee of complete de-identification
- quasi-identifier risk is only partially covered
- name detection can still be improved, especially for Finnish names outside explicit contexts
- route-level regressions remain possible when new AI surfaces are introduced
- direct medical organizations, locations, and mixed-language narratives still need continued regression testing

## Next likely enhancement

The next natural privacy-quality enhancement is a Finnish name intelligence layer based on DVV-backed name data plus scoring and allowlists.

That should be added as a detector-quality layer, not as a universal raw blacklist.
