import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

const prisma = new PrismaClient();

function normalizeCategoryName(name: unknown) {
  if (typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, ' ');
}

async function getCurrentUserId() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return null;
  return parseInt((session.user as any).id);
}

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const name = normalizeCategoryName(body.name);

    if (!name) {
      return NextResponse.json({ error: 'Kategorian nimi puuttuu' }, { status: 400 });
    }

    const existing = await prisma.category.findFirst({
      where: {
        userId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
      orderBy: { id: 'asc' },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    const category = await prisma.category.create({
      data: { name, userId },
    });

    return NextResponse.json(category);
  } catch (error: any) {
    console.error('POST Template Category Error:', error);
    return NextResponse.json({ error: 'Kategorian luonti epäonnistui: ' + error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const id = Number(body.id);
    const name = normalizeCategoryName(body.name);

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: 'Kategorian nimi puuttuu' }, { status: 400 });
    }

    const category = await prisma.category.findFirst({
      where: { id, userId },
    });

    if (!category) {
      return NextResponse.json({ error: 'Kategoriaa ei löytynyt' }, { status: 404 });
    }

    const existingWithSameName = await prisma.category.findFirst({
      where: {
        userId,
        id: { not: id },
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
      orderBy: { id: 'asc' },
    });

    if (existingWithSameName) {
      return NextResponse.json({
        error: 'Samanniminen kategoria on jo olemassa',
        existingCategoryId: existingWithSameName.id,
      }, { status: 409 });
    }

    const updated = await prisma.category.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('PATCH Template Category Error:', error);
    return NextResponse.json({ error: 'Kategorian päivitys epäonnistui: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get('id'));

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const category = await prisma.category.findFirst({
      where: { id, userId },
      include: {
        templates: {
          select: { id: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Kategoriaa ei löytynyt' }, { status: 404 });
    }

    await prisma.category.deleteMany({
      where: { id, userId },
    });

    return NextResponse.json({
      success: true,
      deletedTemplates: category.templates.length,
    });
  } catch (error: any) {
    console.error('DELETE Template Category Error:', error);
    return NextResponse.json({ error: 'Kategorian poisto epäonnistui: ' + error.message }, { status: 500 });
  }
}
