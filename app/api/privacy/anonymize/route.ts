import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import {
  anonymizePatientText,
  type AnonymizationMode,
} from '../../../../lib/privacy/anonymizePatientText';

const ALLOWED_MODES: AnonymizationMode[] = ['chat', 'profileSample', 'storage'];

function normalizeMode(value: unknown): AnonymizationMode {
  if (typeof value === 'string' && ALLOWED_MODES.includes(value as AnonymizationMode)) {
    return value as AnonymizationMode;
  }

  return 'chat';
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number((session?.user as any)?.id);

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const text = typeof body?.text === 'string' ? body.text : '';
    const mode = normalizeMode(body?.mode);

    const result = anonymizePatientText(text, { mode });

    return NextResponse.json({
      sanitizedText: result.sanitizedText,
      hasFindings: result.hasFindings,
      findingTypes: result.findingTypes,
      findings: result.findings,
      mode,
    });
  } catch (error: any) {
    console.error('Privacy anonymization error:', error.message || error);
    return NextResponse.json({
      error: 'Privacy anonymization failed',
      details: error.message,
    }, { status: 500 });
  }
}
