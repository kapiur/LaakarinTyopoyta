# Deployment with Coolify

## Current production model

- deployment source: GitHub repository
- deployment target: Coolify in local network
- build type: Dockerfile
- database: PostgreSQL also deployed in Coolify
- migrations: run manually after deployment

## Branch workflow

The expected release flow is:

1. start from current `main`
2. create a dedicated branch
3. implement and verify locally
4. deploy that branch in Coolify
5. test the branch deployment
6. merge to `main`
7. deploy `main`
8. run migrations manually when needed

This workflow is required because the site has active users and should remain fully functional as much as possible.

## Environment variables

Known production variables:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `OPENAI_API_KEY`
- `AI_CREDENTIAL_ENCRYPTION_KEY`
- `NIXPACKS_NODE_VERSION` may still exist in Coolify settings, but the app now builds through the Dockerfile

Important note:

- `AI_CREDENTIAL_ENCRYPTION_KEY` protects stored provider credentials. Do not rotate it unless you are also recreating encrypted stored credentials.

## Docker build expectations

The Docker build currently does the following:

1. install `openssl`
2. copy `package.json` and `package-lock.json`
3. run `npm ci`
4. copy the repository
5. run `npx prisma generate`
6. run `npm run build`
7. start with `npm start`

Because of earlier deployment failures, the following files must stay committed:

- `package-lock.json`
- `tsconfig.json`
- `next-env.d.ts`

## Manual migration step

After deploying a branch or `main` that includes Prisma schema changes, run:

```bash
npx prisma migrate deploy
```

Recommended follow-up:

```bash
npx prisma generate
```

## Recommended pre-merge checks

Before merging a branch into `main`:

```bash
npx prisma generate
npm run build
npm run test:privacy
npm run test:templates
```

If schema changes were added:

```bash
npx prisma migrate status
```

## Deployment smoke checklist

After branch deploy:

1. login works
2. dashboard loads
3. `/malli` opens
4. `/pikaohjeet-v2` opens
5. `/pikaohjeet-v2/clinical-manager` opens for admin flows
6. AI agent opens where expected
7. no obvious server errors in Coolify logs

After `main` deploy:

1. repeat the core smoke check
2. if schema changed, run `npx prisma migrate deploy`
3. verify one real production workflow end to end

## Incident notes learned during recent work

These issues already happened and are now documented so they are not rediscovered:

- deploys became unstable when `package-lock.json` was missing
- Docker build should use `npm ci`, not `npm install`
- clean Docker builds also require committed `tsconfig.json` and `next-env.d.ts`
- local builds may need a temporary dummy `OPENAI_API_KEY` if a route instantiates the OpenAI client at module import time
