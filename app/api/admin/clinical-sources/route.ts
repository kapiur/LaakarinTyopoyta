import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';
import { prisma } from '../../../../lib/prisma';
import { ensureClinicalSourceSeeds } from '../../../../lib/clinical/sources/ensureClinicalSources';
import type { ClinicalSourceTrustLevel, ClinicalSourceType } from '../../../../lib/clinical/sources/sourceRegistry';

const COUNTRIES = new Set(['FI', 'RU']);
const SOURCE_TYPES = new Set<ClinicalSourceType>([
  'national_guideline',
  'medical_reference',
  'public_health_authority',
  'local_instruction',
  'hospital_instruction',
  'drug_database',
  'custom_url',
  'uploaded_document',
]);
const TRUST_LEVELS = new Set<ClinicalSourceTrustLevel>([
  'primary_guideline',
  'official_reference',
  'authority_instruction',
  'local_instruction',
  'supplementary',
  'not_for_clinical_recommendations',
]);

type ClinicalSourceRow = {
  id: string;
  country: string;
  name: string;
  description: string | null;
  sourceType: string;
  trustLevel: string;
  priority: number;
  baseUrl: string | null;
  allowedDomains: unknown;
  language: unknown;
  isEnabled: boolean;
  isOfficial: boolean;
  specialty: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionalString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeCountry(value: unknown) {
  return typeof value === 'string' && COUNTRIES.has(value) ? value : null;
}

function normalizeSourceType(value: unknown): ClinicalSourceType | null {
  return typeof value === 'string' && SOURCE_TYPES.has(value as ClinicalSourceType) ? value as ClinicalSourceType : null;
}

function normalizeTrustLevel(value: unknown): ClinicalSourceTrustLevel | null {
  return typeof value === 'string' && TRUST_LEVELS.has(value as ClinicalSourceTrustLevel) ? value as ClinicalSourceTrustLevel : null;
}

function normalizePriority(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue)) return 100;
  return Math.max(0, Math.min(9999, Math.round(numberValue)));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'source';
}

function createSourceId(country: string, name: string) {
  return `${country.toLowerCase()}-${slugify(name)}-${randomUUID().slice(0, 8)}`;
}

function serializeSource(row: ClinicalSourceRow) {
  return {
    ...row,
    allowedDomains: Array.isArray(row.allowedDomains) ? row.allowedDomains : [],
    language: Array.isArray(row.language) ? row.language : [],
  };
}

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await ensureClinicalSourceSeeds();

    const url = new URL(req.url);
    const country = normalizeCountry(url.searchParams.get('country'));

    const rows = await prisma.$queryRaw<ClinicalSourceRow[]>`
      SELECT "id", "country", "name", "description", "sourceType", "trustLevel", "priority", "baseUrl", "allowedDomains", "language", "isEnabled", "isOfficial", "specialty", "createdAt", "updatedAt"
      FROM "ClinicalSource"
      WHERE (${country}::text IS NULL OR "country" = ${country})
      ORDER BY "country" ASC, "priority" ASC, "name" ASC
    `;

    return NextResponse.json({
      sources: rows.map(serializeSource),
      options: {
        countries: Array.from(COUNTRIES),
        sourceTypes: Array.from(SOURCE_TYPES),
        trustLevels: Array.from(TRUST_LEVELS),
      },
    });
  } catch (error) {
    console.error('Clinical sources loading failed:', error);
    return NextResponse.json({ error: 'Clinical sources loading failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const name = optionalString(body?.name);
    const country = normalizeCountry(body?.country);
    const sourceType = normalizeSourceType(body?.sourceType);
    const trustLevel = normalizeTrustLevel(body?.trustLevel);

    if (!name) return NextResponse.json({ error: 'Source name is required' }, { status: 400 });
    if (!country) return NextResponse.json({ error: 'Unsupported clinical country' }, { status: 400 });
    if (!sourceType) return NextResponse.json({ error: 'Unsupported source type' }, { status: 400 });
    if (!trustLevel) return NextResponse.json({ error: 'Unsupported trust level' }, { status: 400 });

    const id = optionalString(body?.id) ?? createSourceId(country, name);
    const description = optionalString(body?.description);
    const priority = normalizePriority(body?.priority);
    const baseUrl = optionalString(body?.baseUrl);
    const allowedDomains = parseStringList(body?.allowedDomains);
    const language = parseStringList(body?.language);
    const isEnabled = body?.isEnabled !== false;
    const isOfficial = body?.isOfficial === true;
    const specialty = optionalString(body?.specialty);

    await prisma.clinicalSource.upsert({
      where: { id },
      update: {
        country,
        name,
        description,
        sourceType,
        trustLevel,
        priority,
        baseUrl,
        allowedDomains,
        language,
        isEnabled,
        isOfficial,
        specialty,
      },
      create: {
        id,
        country,
        name,
        description,
        sourceType,
        trustLevel,
        priority,
        baseUrl,
        allowedDomains,
        language,
        isEnabled,
        isOfficial,
        specialty,
      },
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error('Clinical source save failed:', error);
    return NextResponse.json({ error: 'Clinical source save failed' }, { status: 500 });
  }
}
