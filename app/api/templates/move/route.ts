import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

const prisma = new PrismaClient();

async function getCurrentUserId() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return null;
  return parseInt((session.user as any).id);
}

export async function PATCH(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const templateId = Number(body.templateId);
    const categoryId = Number(body.categoryId);

    if (!templateId || !categoryId) {
      return NextResponse.json({ error: 'templateId and categoryId are required' }, { status: 400 });
    }

    const [template, category] = await Promise.all([
      prisma.template.findFirst({ where: { id: templateId, userId } }),
      prisma.category.findFirst({ where: { id: categoryId, userId } }),
    ]);

    if (!template) {
      return NextResponse.json({ error: 'Mallia ei löytynyt' }, { status: 404 });
    }

    if (!category) {
      return NextResponse.json({ error: 'Kategoriaa ei löytynyt' }, { status: 404 });
    }

    const updatedTemplate = await prisma.template.update({
      where: { id: templateId },
      data: { categoryId },
    });

    return NextResponse.json(updatedTemplate);
  } catch (error: any) {
    console.error('PATCH Move Template Error:', error);
    return NextResponse.json({ error: 'Mallin siirto epäonnistui: ' + error.message }, { status: 500 });
  }
}
