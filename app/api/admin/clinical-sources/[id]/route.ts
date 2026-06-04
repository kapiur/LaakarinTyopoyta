import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/admin-auth';
import { prisma } from '../../../../../lib/prisma';
import type { ClinicalSourceTrustLevel, ClinicalSourceType } from '../../../../../lib/clinical/sources/sourceRegistry';

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

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const existing = await prisma.clinicalSource.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: 'Source not found' }, { status: 404 });

    const body = await req.json();
    const name = optionalString(body?.name);
    const country = normalizeCountry(body?.country);
    const sourceType = normalizeSourceType(body?.sourceType);
    const trustLevel = normalizeTrustLevel(body?.trustLevel);

    if (!name) return NextResponse.json({ error: 'Source name is required' }, { status: 400 });
    if (!country) return NextResponse.json({ error: 'Unsupported clinical country' }, { status: 400 });
    if (!sourceType) return NextResponse.json({ error: 'Unsupported source type' }, { status: 400 });
    if (!trustLevel) return NextResponse.json({ error: 'Unsupported trust level' }, { status: 400 });

    await prisma.clinicalSource.update({
      where: { id: params.id },
      data: {
        country,
        name,
        description: optionalString(body?.description),
        sourceType,
        trustLevel,
        priority: normalizePriority(body?.priority),
        baseUrl: optionalString(body?.baseUrl),
        allowedDomains: parseStringList(body?.allowedDomains),
        language: parseStringList(body?.language),
        isEnabled: body?.isEnabled !== false,
        isOfficial: body?.isOfficial === true,
        specialty: optionalString(body?.specialty),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Clinical source update failed:', error);
    return NextResponse.json({ error: 'Clinical source update failed' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await prisma.clinicalSource.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Clinical source delete failed:', error);
    return NextResponse.json({ error: 'Clinical source delete failed' }, { status: 500 });
  }
}
