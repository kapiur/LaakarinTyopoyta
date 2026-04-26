import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { DEFAULT_AI_TOOL_METADATA } from '../../../lib/ai/toolMetadata';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

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
