# Calculator drug libraries — project documentation

This document describes the current implementation of the calculator drug libraries in `LaakarinTyopoyta` / `dr.kapustin.fi`.

The goal is to make future development safer, more logical and easier to continue without breaking the existing production site.

## Current branch

```text
db/add-peds-drug-library
```

This branch was developed and deployed step by step through Coolify before merge to `main`.

## Core principles

1. Work in small deployable steps.
2. Keep the site working after each step.
3. Never delete or overwrite existing database data.
4. Add new database structures incrementally.
5. Prefer separate new pages first, then replace old UI after testing.
6. Keep drug library management separate from calculator workflows.
7. User data must be user-scoped: every user sees and edits only their own library records.

## Main pages

### `/calculators`

Existing calculator overview page.

Current tab behavior:

```text
PEDS → /calculators/peds
PCA  → /calculators/pca
Other calculators remain on /calculators
```

PEDS is visually first, PCA second, then other calculators.

This is currently implemented by:

```text
components/CalculatorsTabEnhancer.tsx
```

The component is mounted in:

```text
app/layout.tsx
```

Reason: this was a safer bridge than rewriting the large existing `app/calculators/page.tsx` during active feature work.

Future cleanup should replace this enhancer with native changes in `app/calculators/page.tsx`.

### `/calculators/peds`

New PEDS calculator page with library autofill.

File:

```text
app/calculators/peds/page.tsx
```

Features:

- select indication / disease group;
- filter PEDS drugs by indication;
- select drug;
- autofill calculator fields from the saved drug record;
- fields remain manually editable;
- supports liquid and tablet forms;
- supports `mg` and `IU` units;
- calculates daily dose, total course amount, single dose and packages;
- tablets are rounded to 0.5 tablet;
- warns if tablet rounding changes the calculated dose by at least 10%;
- copy output to clipboard.

Autofilled fields:

```text
form
unit
strength
dosePerKgDay
timesPerDay
defaultDays
packageSize
note
```

Important behavior:

- Indications are primarily loaded from `/api/peds/indications`.
- If needed, indications can be derived from the `indications` array returned by `/api/peds/drugs`.
- This fallback was added because drugs loaded correctly in testing while indication select was initially empty.

### `/calculators/pca`

New improved PCA calculator page.

File:

```text
app/calculators/pca/page.tsx
```

Features:

- uses PCA drug library from `/api/pca-library`;
- drug library management is not inside the calculator anymore;
- default 3 drug rows;
- additional drug rows can be added with `Lisää lääke`;
- additional rows can be removed;
- first 3 rows remain as base rows;
- calculates per-drug total dose and volume;
- calculates total drug volume;
- calculates NaCl volume to add;
- calculates concentration of each drug in the final solution;
- calculates base infusion volume need from `speedMlH × 24 × days`;
- calculates bolus volume as `2 × hourly volume`;
- calculates estimated bolus content for each drug;
- copy output to clipboard.

Current warning checks:

- no drug selected;
- missing or invalid `ad ml`;
- missing or invalid duration;
- missing or invalid infusion speed;
- total drug volume exceeds `ad` volume;
- `ad` volume does not cover base infusion need for selected duration and speed;
- `ad` exceeds cassette volume;
- NaCl amount is very small.

The PCA output is intentionally framed as a calculation, not as a full clinical prescribing instruction.

### `/calculators/peds-library`

Common drug-library management page.

Historical route name says `peds-library`, but current UI title is:

```text
Lääkekirjastot
```

File:

```text
app/calculators/peds-library/page.tsx
```

#### PCA section

Features:

- list PCA drugs;
- add PCA drug;
- delete PCA drug;
- edit PCA drug.

PCA drug fields:

```text
name
strength mg/ml
```

PCA edit page:

```text
/calculators/peds-library/pca/[id]
```

File:

```text
app/calculators/peds-library/pca/[id]/page.tsx
```

#### PEDS section

Features:

- create indication / disease group;
- delete indication;
- create PEDS drug;
- filter PEDS drugs by indication;
- delete PEDS drug;
- edit PEDS drug.

PEDS edit page:

```text
/calculators/peds-library/[id]
```

File:

```text
app/calculators/peds-library/[id]/page.tsx
```

PEDS drug fields:

```text
name
form
unit
strength
dosePerKgDay
timesPerDay
defaultDays
packageSize
note
indicationIds
```

## Sidebar

Sidebar file:

```text
components/Sidebar.tsx
```

Added item below `Laskurit`:

```text
Lääkekirjastot → /calculators/peds-library
```

## Temporary bridge components

### `components/CalculatorsTabEnhancer.tsx`

Purpose:

- reorder `/calculators` tabs;
- make PEDS first;
- make PCA second;
- route PEDS tab click to `/calculators/peds`;
- route PCA tab click to `/calculators/pca`;
- prevent old PCA tab from showing as default view on `/calculators`.

Reason:

`app/calculators/page.tsx` is large and contains many calculators in one client component. This bridge reduced risk during incremental development.

Future cleanup:

- edit `app/calculators/page.tsx` directly;
- remove old internal PEDS block;
- remove old internal PCA block and old PCA library management UI;
- replace PEDS/PCA tabs with normal navigation links;
- delete `components/CalculatorsTabEnhancer.tsx`.

### `components/PcaLibraryEditLinksEnhancer.tsx`

Purpose:

- adds `Muokkaa` links to PCA drug cards in `PCA-lääkekirjasto`;
- resolves PCA drug IDs through `/api/pca-library`;
- routes to `/calculators/peds-library/pca/[id]`.

Reason:

Added as a safe incremental bridge after PCA edit page and PATCH API were implemented.

Future cleanup:

- add the PCA edit `Link` directly into the PCA card JSX in `app/calculators/peds-library/page.tsx`;
- delete `components/PcaLibraryEditLinksEnhancer.tsx`.

## API endpoints

### PCA library API

File:

```text
app/api/pca-library/route.ts
```

Endpoints:

```text
GET    /api/pca-library
POST   /api/pca-library
PATCH  /api/pca-library?id=...
DELETE /api/pca-library?id=...
```

Behavior:

- requires authenticated session;
- user-scoped;
- returns only current user’s PCA drugs;
- creates, updates and deletes only current user’s PCA drugs.

Payload:

```json
{
  "name": "Morfiini",
  "strength": 20
}
```

Validation:

- `name` is required and trimmed;
- `strength` must be a positive number.

### PEDS indications API

File:

```text
app/api/peds/indications/route.ts
```

Endpoints:

```text
GET    /api/peds/indications
POST   /api/peds/indications
DELETE /api/peds/indications?id=...
```

Behavior:

- requires authenticated session;
- user-scoped;
- GET returns current user’s indications;
- POST upserts by current user and name;
- DELETE removes only current user’s indication.

Payload:

```json
{
  "name": "Korvatulehdus"
}
```

### PEDS drugs API

File:

```text
app/api/peds/drugs/route.ts
```

Endpoints:

```text
GET    /api/peds/drugs
GET    /api/peds/drugs?indicationId=...
POST   /api/peds/drugs
PATCH  /api/peds/drugs?id=...
DELETE /api/peds/drugs?id=...
```

Behavior:

- requires authenticated session;
- user-scoped;
- cannot attach a drug to another user’s indication;
- can filter drugs by indication;
- returns drugs with indication data;
- PATCH replaces indication links if `indicationIds` is provided.

Payload example:

```json
{
  "name": "Amoksisilliini",
  "form": "LIQUID",
  "unit": "MG",
  "strength": 50,
  "dosePerKgDay": 40,
  "timesPerDay": 3,
  "defaultDays": 5,
  "packageSize": 100,
  "note": "Optional note",
  "indicationIds": [1, 2]
}
```

Allowed values:

```text
form: LIQUID | TABLET
unit: MG | IU
```

## Database

PEDS migration:

```text
prisma/migrations/20260426083000_add_peds_drug_library/
```

Expected PEDS models:

```text
PedsIndication
PedsDrug
PedsDrugIndication
```

Existing PCA model:

```text
PcaDrug
```

Important rule:

Existing database data must never be cleared or overwritten. Migration work must be additive unless a backup and explicit data migration plan exist.

## Deployment notes

Deployment is handled through Coolify.

After deploy, if static assets or new routes appear stale, restarting the app container has fixed the issue during testing.

Useful server commands:

```bash
docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
docker restart <APP_CONTAINER_ID>
```

The application container is usually the non-Coolify container exposing:

```text
3000/tcp, 3500/tcp
```

Protected route checks:

```bash
curl -I https://dr.kapustin.fi/calculators/pca
curl -I https://dr.kapustin.fi/calculators/peds
curl -I https://dr.kapustin.fi/api/peds/drugs
```

Unauthenticated expected results:

```text
/calculators/pca → 307 to login
/calculators/peds → 307 to login
/api/peds/drugs → 401 Unauthorized
```

After deploy, use browser hard refresh:

```text
Ctrl + F5
```

## Tested working state

Manually tested and confirmed:

```text
/calculators
/calculators/peds
/calculators/pca
/calculators/peds-library
/calculators/peds-library/[id]
/calculators/peds-library/pca/[id]
```

Confirmed behavior:

- PEDS tab is first;
- PCA tab is second;
- PEDS opens new `/calculators/peds`;
- PCA opens new `/calculators/pca`;
- Lääkekirjastot is visible in sidebar below Laskurit;
- PEDS indications load correctly;
- PEDS drugs filter by indication;
- PEDS drug selection autofills calculator;
- PEDS drugs can be added, edited and deleted;
- PCA drugs can be added, edited and deleted;
- PCA calculator loads PCA library drugs;
- PCA calculator supports more than 3 drugs with `Lisää lääke`;
- PCA calculation includes all added rows;
- PCA calculation shows NaCl, total volume, concentrations and bolus calculation;
- PCA warnings work for volume-related problems.

## Recommended cleanup

The feature is functional, but two cleanup tasks should be done later.

### 1. Refactor `/calculators` natively

File:

```text
app/calculators/page.tsx
```

Recommended changes:

- remove old internal PEDS calculator code;
- remove old internal PCA calculator code and old PCA library management block;
- replace PEDS/PCA tabs with native links to `/calculators/peds` and `/calculators/pca`;
- keep remaining calculators on `/calculators`;
- delete `components/CalculatorsTabEnhancer.tsx`.

### 2. Move PCA edit link into JSX

File:

```text
app/calculators/peds-library/page.tsx
```

Recommended changes:

- add normal `Link href={`/calculators/peds-library/pca/${drug.id}`}` directly inside the PCA card;
- delete `components/PcaLibraryEditLinksEnhancer.tsx`.

### 3. Optional route rename

Current route:

```text
/calculators/peds-library
```

Actual meaning:

```text
Lääkekirjastot
```

Optional future route:

```text
/calculators/drug-libraries
```

If renamed, keep a redirect from the old route.

## Known technical debt

- `app/calculators/page.tsx` is still large and contains old PEDS/PCA code.
- `CalculatorsTabEnhancer` is a temporary DOM-level bridge.
- `PcaLibraryEditLinksEnhancer` is a temporary DOM-level bridge.
- The common library route still says `peds-library`, although it manages both PCA and PEDS libraries.
- PCA and PEDS API code styles are not fully unified: PCA uses direct `PrismaClient`, newer PEDS routes use shared `prisma`.

## Suggested future development order

1. Refactor `/calculators` to remove old PEDS/PCA code.
2. Move PCA edit link into JSX and remove enhancer.
3. Consider renaming `/calculators/peds-library` to `/calculators/drug-libraries` with redirect.
4. Add search/filter fields to large drug libraries.
5. Add duplicate prevention or clearer duplicate handling for PCA drug names.
6. Add optional sorting/grouping for PEDS indications.
7. Add export/import of user drug libraries if needed.
8. Add audit metadata or modified timestamp display if clinically useful.

## Clinical safety note

These calculators are technical support tools. They do not replace clinical judgment, local guidelines, medication compatibility checks, renal/hepatic function assessment, sedation monitoring or patient-specific prescribing decisions.
