import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { validateTemplate } from '../../../../lib/templates/validation';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const content = typeof body?.content === 'string' ? body.content : '';

    if (!content.trim()) {
      return NextResponse.json({
        ok: false,
        errors: [{ severity: 'error', message: 'Template content is empty.', code: 'empty_template' }],
        warnings: [],
        fields: [],
        summary: { fieldCount: 0, errorCount: 1, warningCount: 0 },
      });
    }

    return NextResponse.json(validateTemplate(content));
  } catch (error: any) {
    console.error('Template validation failed:', error);
    return NextResponse.json({ error: 'Template validation failed', details: error?.message }, { status: 500 });
  }
}
