# RU Guideline Cache Workflow

This workflow exists because the Russian Ministry of Health guideline API may respond differently depending on the runtime and network path:

- laptop PowerShell requests can succeed
- Node/Axios requests from a server or container can return `451`

The reliable path is therefore:

1. fetch the RU guideline snapshot locally on a workstation
2. copy the JSON snapshot to the Coolify host
3. copy the JSON into the application container
4. import the snapshot into `GuidelineDocument`

## 1. Local fetch on Windows

Run from the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\fetch-guideline-cache-ru.ps1 -All -PageSize 50 -MaxPages 20 -Output .\tmp\ru-guideline-cache.json
```

Expected successful tail output:

```text
[guideline-cache:ru:fetch] file written
[guideline-cache:ru:fetch] total available in registry: 730
[guideline-cache:ru:fetch] processed: 730
[guideline-cache:ru:fetch] cached ready: 730
[guideline-cache:ru:fetch] failed/partial: 0
```

The script writes UTF-8 JSON without BOM.

## 2. Copy snapshot to the Coolify host

Example:

```powershell
scp ".\tmp\ru-guideline-cache.json" root@<COOLIFY_HOST>:/tmp/ru-guideline-cache.json
```

## 3. Copy snapshot into the application container

Find the running app container:

```bash
docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Image}}"
```

Create the target directory if needed:

```bash
docker exec <container_id> sh -lc 'mkdir -p /app/tmp'
```

Copy the snapshot:

```bash
docker cp /tmp/ru-guideline-cache.json <container_id>:/app/tmp/ru-guideline-cache.json
```

Verify:

```bash
docker exec <container_id> ls -lh /app/tmp/ru-guideline-cache.json
```

## 4. Import into the database

Run inside the app container:

```bash
docker exec -it <container_id> sh -lc 'cd /app && npm run guidelines:import:ru -- --input=/app/tmp/ru-guideline-cache.json'
```

The importer tolerates a UTF-8 BOM if one appears in the file.

Expected successful tail output:

```text
[guideline-cache:ru:import] imported 730/730
[guideline-cache:ru:import] done
[guideline-cache:ru:import] imported total: 730
[guideline-cache:ru:import] ready: 730
[guideline-cache:ru:import] partial: 0
```

## 5. Verify records in the database

Example Prisma-based check from the host:

```bash
docker exec -it <container_id> sh -lc "cd /app && node -e 'const { PrismaClient } = require(\"@prisma/client\"); const prisma = new PrismaClient(); prisma.\$queryRawUnsafe(\"select country, \\\"sourceId\\\", \\\"syncStatus\\\", count(*)::int as count from \\\"GuidelineDocument\\\" group by country, \\\"sourceId\\\", \\\"syncStatus\\\" order by country, \\\"sourceId\\\", \\\"syncStatus\\\"\").then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.\$disconnect())'"
```

Expected result:

```json
[
  {
    "country": "RU",
    "sourceId": "ru-minzdrav-clinical-recommendations",
    "syncStatus": "ready",
    "count": 730
  }
]
```
