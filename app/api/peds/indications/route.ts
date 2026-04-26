import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

function getUserId(session: unknown) {
  const userId = Number((session as any)?.user?.id);
  return Number.isFinite(userId) ? userId : null;
}

function normalizeName(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const indications = await prisma.pedsIndication.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { drugs: true },
        },
      },
    });

    return NextResponse.json({ indications });
  } catch (error) {
    console.error('PEDS indications GET error:', error);
    return NextResponse.json({ error: 'PEDS indications fetch failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const name = normalizeName(body.name);

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (name.length > 80) {
      return NextResponse.json({ error: 'name is too long' }, { status: 400 });
    }

    const indication = await prisma.pedsIndication.upsert({
      where: {
        userId_name: {
          userId,
          name,
        },
      },
      update: {},
      create: {
        name,
        userId,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ indication }, { status: 201 });
  } catch (error) {
    console.error('PEDS indications POST error:', error);
    return NextResponse.json({ error: 'PEDS indication creation failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'valid id is required' }, { status: 400 });
    }

    await prisma.pedsIndication.deleteMany({
      where: {
        id,
        userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PEDS indications DELETE error:', error);
    return NextResponse.json({ error: 'PEDS indication deletion failed' }, { status: 500 });
  }
}
