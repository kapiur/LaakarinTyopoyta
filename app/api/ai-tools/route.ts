import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { DEFAULT_AI_TOOL_METADATA } from '../../../lib/ai/toolMetadata';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

const ALLOWED_ICONS = new Set(['FileText', 'ListChecks', 'Languages', 'Scissors', 'FlaskConical']);

function slugifyKey(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function makeUserToolKey(userId: number, rawKey: string) {
  const key = slugifyKey(rawKey) || 'oma-tyokalu';
  return `user-${userId}-${key}`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number((session?.user as any)?.id);

    const userTools = Number.isFinite(userId)
      ? await prisma.aiTool.findMany({
          where: {
            scope: 'USER',
            userId,
            isActive: true,
          },
          orderBy: [
            { order: 'asc' },
            { createdAt: 'asc' },
          ],
          select: {
            key: true,
            label: true,
            description: true,
            icon: true,
          },
        })
      : [];

    return NextResponse.json({
      tools: [
        ...DEFAULT_AI_TOOL_METADATA,
        ...userTools.map((tool) => ({
          key: tool.key,
          label: tool.label,
          description: tool.description ?? '',
          icon: tool.icon ?? 'FileText',
        })),
      ],
    });
  } catch (error) {
    console.error('AI tools API error:', error);

    return NextResponse.json({
      tools: DEFAULT_AI_TOOL_METADATA,
    });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = Number((session?.user as any)?.id);

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const label = typeof body.label === 'string' ? body.label.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const icon = typeof body.icon === 'string' && ALLOWED_ICONS.has(body.icon) ? body.icon : 'FileText';
    const order = Number.isFinite(Number(body.order)) ? Number(body.order) : 100;
    const rawKey = typeof body.key === 'string' && body.key.trim() ? body.key : label;

    if (!label) {
      return NextResponse.json({ error: 'label is required' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const baseKey = makeUserToolKey(userId, rawKey);
    let key = baseKey;
    let suffix = 2;

    while (await prisma.aiTool.findFirst({ where: { userId, key } })) {
      key = `${baseKey}-${suffix}`;
      suffix += 1;
    }

    const tool = await prisma.aiTool.create({
      data: {
        key,
        label,
        description,
        icon,
        prompt,
        scope: 'USER',
        userId,
        isActive: true,
        order,
      },
      select: {
        key: true,
        label: true,
        description: true,
        icon: true,
      },
    });

    return NextResponse.json({ tool }, { status: 201 });
  } catch (error) {
    console.error('Create AI tool error:', error);
    return NextResponse.json({ error: 'AI tool creation failed' }, { status: 500 });
  }
}
