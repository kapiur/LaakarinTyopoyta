# Security and Privacy

## Why this matters

This project handles physician workflows and may receive sensitive clinical text. Privacy and safety are not optional implementation details; they are core system requirements.

## Authentication and access

- the app uses credentials-based NextAuth authentication
- users have roles (`ADMIN`, `USER`)
- many admin surfaces are role-restricted
- production includes active real users

Because of that:

- do not make broad access changes casually
- do not expose experimental or legacy endpoints publicly without explicit review

## Privacy posture

The project already contains a privacy/anonymization layer for AI requests.

For the current implementation shape, see:

- [privacy-architecture.md](privacy-architecture.md)
- [privacy-operations.md](privacy-operations.md)

Key principles:

- sensitive text should be sanitized server-side before external AI calls
- raw patient text should not be logged
- audit metadata is allowed; clinical content logging is not
- AI behavior must remain supervised
- long-lived AI profile storage should use stricter storage sanitization than transient chat flows
- anonymized writing samples should be stored only through explicit user opt-in
- persisted profile samples and AI-derived style summaries should be kept minimized rather than stored as large raw text blocks

Important boundary:

- patient or third-party clinical text is the target of anonymization
- first-party account identity data for the authenticated site user is not
- current examples of first-party account identity include `User.email` and `User.name`
- future account/profile identity fields should follow the same rule unless they are explicitly copied into AI-facing free-text areas

That means:

- do not run patient-text anonymization over core account identity records just because they are personal data
- do run privacy controls on AI-facing free-text fields, even when they belong to a logged-in user profile
- keep a clear separation between `account identity storage` and `AI free-text / clinical text processing`

Useful commands:

```bash
npm run test:privacy
```

## AI-specific security rules

- do not store API keys in plain text
- do not return full secrets to the frontend
- do not log secrets
- keep `AI_CREDENTIAL_ENCRYPTION_KEY` stable unless credential recreation is planned
- personal user credentials and admin-managed platform credentials must both go through the same encryption layer before database storage
- YandexGPT requires `projectId` or folder ID metadata in addition to the secret, but that metadata still should be handled carefully and consistently

Current supported providers in the user-facing provider selector are:

- `OpenAI`
- `Google Gemini`
- `YandexGPT`

For the current provider and credential model, see:

- [ai-providers-and-credentials.md](ai-providers-and-credentials.md)

## Clinical safety rules

- no patient-specific recommendations without evidence
- no auto-save from the agent
- no silent state mutation based on AI output
- unsupported claims should be flagged rather than trusted

## Database safety rules

Because the system has active users and production data is critical:

- prefer additive migrations only
- avoid destructive migrations
- do not drop or rename production structures casually
- do not reset data
- prepare rollback thinking before risky schema changes

Operational rule:

```bash
npx prisma migrate deploy
```

is run manually after deployment when schema changes are included.

## Known cleanup targets

These items should be treated carefully:

- `/api/setup` is legacy and should be removed
- `/api/categories` appears to be legacy
- `/api/medicines` should be aligned with authenticated access rules
- experimental medicine-note collaboration rules are not fully finalized

## Practical review checklist

Before merging sensitive changes:

1. verify access control
2. verify no raw sensitive text is newly logged
3. run privacy tests
4. run build
5. branch deploy first
6. verify the branch in Coolify before touching `main`
