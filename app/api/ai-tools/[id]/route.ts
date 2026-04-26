import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

const ALLOWED_ICONS = new Set(['FileText', 'ListChecks', 'Languages', 'Scissors', 'FlaskConical']);

type RouteContext = {
  params: {
    id: string;
  };
};

function getUserId(session: Awaited<ReturnType<typeof getServerSession>>) {
  const userId = Number((session?.user as any)?.id);
  return Number.isFinite(userId) ? userId : null;
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingTool = await prisma.aiTool.findFirst({
      where: {
        id: params.id,
        userId,
        scope: 'USER',
      },
    });

    if (!existingTool) {
      return NextResponse.json({ error: 'AI tool not found' }, { status: 404 });
    }

    const body = await req.json();
    const data: {
      label?: string;
      description?: string;
      icon?: string;
      prompt?: string;
      isActive?: boolean;
      order?: number;
    } = {};

    if (typeof body.label === 'string') {
      const label = body.label.trim();
      if (!label) {
        return NextResponse.json({ error: 'label cannot be empty' }, { status: 400 });
      }
      data.label = label;
    }

    if (typeof body.description === 'string') {
      data.description = body.description.trim();
    }

    if (typeof body.icon === 'string') {
      data.icon = ALLOWED_ICONS.has(body.icon) ? body.icon : 'FileText';
    }

    if (typeof body.prompt === 'string') {
      const prompt = body.prompt.trim();
      if (!prompt) {
        return NextResponse.json({ error: 'prompt cannot be empty' }, { status: 400 });
      }
      data.prompt = prompt;
    }

    if (typeof body.isActive === 'boolean') {
      data.isActive = body.isActive;
    }

    if (body.order !== undefined && Number.isFinite(Number(body.order))) {
      data.order = Number(body.order);
    }

    const tool = await prisma.aiTool.update({
      where: {
        id: existingTool.id,
      },
      data,
      select: {
        id: true,
        key: true,
        label: true,
        description: true,
        icon: true,
        prompt: true,
        isActive: true,
        order: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ tool });
  } catch (error) {
    console.error('Update AI tool error:', error);
    return NextResponse.json({ error: 'AI tool update failed' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingTool = await prisma.aiTool.findFirst({
      where: {
        id: params.id,
        userId,
        scope: 'USER',
      },
    });

    if (!existingTool) {
      return NextResponse.json({ error: 'AI tool not found' }, { status: 404 });
    }

    await prisma.aiTool.delete({
      where: {
        id: existingTool.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Delete AI tool error:', error);
    return NextResponse.json({ error: 'AI tool delete failed' }, { status: 500 });
  }
}
