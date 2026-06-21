# LaakarinTyopoyta

LaakarinTyopoyta is a Next.js + Prisma + PostgreSQL clinical workspace for physicians. It combines structured text templates, clinical quick guides, AI-assisted drafting, privacy-preserving text processing, calculators, links, and selected medication utilities in one authenticated internal application.

The project is used by real production users. Data preservation and cautious rollout discipline are mandatory.

The product should evolve as a personal physician desktop. Users should be able to decide which tools they need, which modules stay visible, and how their own workspace is arranged wherever that is practical and safe.

## Tech stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Prisma
- PostgreSQL
- NextAuth credentials authentication
- OpenAI-compatible multi-provider AI runtime with OpenAI, Google Gemini, YandexGPT, and DeepSeek

## Main product areas

- `/` dashboard with AI text tool and chat
- `/malli` text templates and template agent workflow
- `/pikaohjeet-v2` clinical quick guides and personal notes
- `/pikaohjeet-v2/clinical-manager` admin editing surface for clinical cards
- `/pikaohjeet-v2/clinical-builder` AI-assisted clinical card builder
- `/ai-tools` admin/user AI tool prompt management
- `/agent` supervised AI agent MVP
- `/links` shared quick links
- `/calculators` clinical calculators
- `/medicines` experimental medication area
- `/settings` user, admin, AI, and clinical-source settings

## Local development

Requirements:

- Node.js 18+
- npm
- PostgreSQL

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Build locally:

```bash
npm run build
```

Useful commands:

```bash
npm run test:privacy
npm run test:templates
npx prisma generate
```

## Environment variables

Minimum expected environment variables:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `OPENAI_API_KEY`
- `AI_CREDENTIAL_ENCRYPTION_KEY`

Optional provider-specific variables used when platform credentials are configured through environment variables:

- `GEMINI_API_KEY`
- `YANDEX_API_KEY`
- `YANDEX_CLOUD_FOLDER_ID`
- `DEEPSEEK_API_KEY`

Notes:

- `OPENAI_API_KEY` is still required in current production because some routes and defaults still assume OpenAI availability.
- `GEMINI_API_KEY`, `YANDEX_API_KEY`, and `DEEPSEEK_API_KEY` are optional unless those providers are used as platform-level fallbacks.
- `YANDEX_CLOUD_FOLDER_ID` is required when YandexGPT is used through environment-backed platform credentials.
- `AI_CREDENTIAL_ENCRYPTION_KEY` protects stored provider credentials. Do not rotate it casually in production.

## Deployment model

Production is deployed through Coolify with a Dockerfile-based build.

Current deployment rules:

1. Work from a fresh branch created from `main`.
2. Deploy that branch in Coolify.
3. Verify the branch deployment manually.
4. Merge into `main`.
5. Deploy `main`.
6. Run `npx prisma migrate deploy` manually after deployment when schema changes are included.

See [docs/deployment-coolify.md](docs/deployment-coolify.md) for the operational checklist.

## Safety rules for contributors

- Never change production data destructively without explicit approval.
- Prefer additive database changes only.
- Do not log raw patient text, prompts, or AI responses containing sensitive clinical content.
- The agent must remain supervised: no automatic save, no silent data mutation.
- Keep `main` stable. Use branch deploys first.

## Documentation

- [docs/architecture.md](docs/architecture.md)
- [docs/deployment-coolify.md](docs/deployment-coolify.md)
- [docs/agent-architecture.md](docs/agent-architecture.md)
- [docs/security-and-privacy.md](docs/security-and-privacy.md)
- [docs/ai-providers-and-credentials.md](docs/ai-providers-and-credentials.md)
- [docs/personalization-and-settings.md](docs/personalization-and-settings.md)
- [docs/privacy-architecture.md](docs/privacy-architecture.md)
- [docs/privacy-operations.md](docs/privacy-operations.md)
- [docs/agent-roadmap.md](docs/agent-roadmap.md)
- [docs/templates-interactive-fields.md](docs/templates-interactive-fields.md)

## Current known cleanup items

These items are known but not yet fully normalized:

- `/api/setup` is legacy and should be removed.
- `/api/categories` appears to be legacy.
- `/api/medicines` should follow authenticated access rules consistently.
- Some AI settings/access tables are still partially handled outside the ideal Prisma model shape.
- `pikaohjeet-v2` metadata still uses internal tags for some state that should eventually move to explicit schema fields.
