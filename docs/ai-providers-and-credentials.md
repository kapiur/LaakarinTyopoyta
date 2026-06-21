# AI Providers and Credentials

## Purpose

The AI layer now supports a small, explicit provider set instead of an open-ended list in the UI. The current supported providers are:

- `OpenAI`
- `Google Gemini`
- `YandexGPT`
- `DeepSeek`

The project uses one OpenAI-compatible runtime path for all four providers where practical, while still preserving provider-specific settings such as base URL and Yandex project or folder ID.

## Supported credential sources

The system can resolve credentials from three places:

1. `env`
2. `platform`
3. `user`

This is exposed to users through credential mode choices such as:

- platform-only
- user-only
- automatic fallback

The exact UI copy may evolve, but the resolution model stays the same.

## Platform credentials

Admin-managed platform credentials are stored in `AiProviderCredential`.

They can contain:

- encrypted API secret
- provider
- optional base URL override
- optional default model
- optional `projectId` for YandexGPT

Admin routes:

- [app/api/admin/ai-providers/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/admin/ai-providers/route.ts)
- [app/api/admin/ai-providers/[id]/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/admin/ai-providers/[id]/route.ts)
- [app/api/admin/ai-providers/[id]/test/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/admin/ai-providers/[id]/test/route.ts)

## Personal user credentials

Users can store their own provider credentials in `UserAiCredential`.

They are managed through:

- [app/api/profile/ai-credentials/route.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/app/api/profile/ai-credentials/route.ts)
- [components/AiProviderSettingsCard.tsx](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/components/AiProviderSettingsCard.tsx)

Users can:

- save a personal API key
- replace it
- delete it
- choose provider-specific defaults

The frontend never receives the full stored secret back. It only receives a preview string.

## Encryption rules

Stored platform and user credentials are encrypted before writing to the database.

Required environment variable:

- `AI_CREDENTIAL_ENCRYPTION_KEY`

Operational rule:

- do not rotate `AI_CREDENTIAL_ENCRYPTION_KEY` casually in production
- if rotation is unavoidable, plan for credential recreation

The encryption helpers live in the security layer and are shared by both admin and user credential flows.

## Provider-specific notes

### OpenAI

- default model: `gpt-5.4`
- no extra provider metadata required

### Google Gemini

- default models currently include `gemini-2.5-flash` and `gemini-2.5-pro`
- runtime uses Google's OpenAI-compatible endpoint
- a Gemini key must be saved while `Google Gemini` is the selected provider

### YandexGPT

- current models include `yandexgpt/latest`, `yandexgpt-lite/latest`, and `yandexgpt/rc`
- runtime uses Yandex's OpenAI-compatible endpoint
- Yandex requires an additional `projectId` or folder ID
- the runtime builds the provider model into `gpt://<projectId>/<model>` when needed

This means Yandex is not just "another API key field". It needs both:

- API key
- folder or project ID

### DeepSeek

- default models currently include `deepseek-v4-flash` and `deepseek-v4-pro`
- runtime uses DeepSeek's OpenAI-compatible endpoint
- no extra provider metadata is required beyond the API key
- environment fallback uses `DEEPSEEK_API_KEY`

## Environment fallbacks

The provider resolver can use environment variables as platform fallbacks:

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `YANDEX_API_KEY`
- `YANDEX_CLOUD_FOLDER_ID`
- `DEEPSEEK_API_KEY`

These are especially useful in environments where admin-managed platform credentials are not yet stored in the database.

## Runtime flow

The provider runtime is centered around:

- [lib/ai/modelRegistry.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/ai/modelRegistry.ts)
- [lib/ai/credentials/resolveAiCredential.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/ai/credentials/resolveAiCredential.ts)
- [lib/ai/runAiCompletion.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/ai/runAiCompletion.ts)
- [lib/ai/providers/openai.ts](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/lib/ai/providers/openai.ts)

The current supported providers all run through the OpenAI-compatible provider path.

## Current scope

This project intentionally supports only four providers in the user-facing dropdown for now:

- OpenAI
- Google Gemini
- YandexGPT
- DeepSeek

Other providers should not be reintroduced in the UI until they have:

- real runtime support
- tested credential handling
- clear deployment and support expectations

## Deployment notes

When shipping schema changes for provider credentials, remember the manual migration step:

```bash
npx prisma migrate deploy
```

Relevant recent migration for provider metadata:

- [prisma/migrations/20260607150000_ai_provider_project_id/migration.sql](/C:/Users/kapus/Documents/Codex/2026-06-06/github-plugin-github-openai-curated-github/work/LaakarinTyopoyta/prisma/migrations/20260607150000_ai_provider_project_id/migration.sql)
