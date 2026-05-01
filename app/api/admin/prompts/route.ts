import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin-auth';

const prisma = new PrismaClient();

// GET: Получение всех промптов
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const prompts = await prisma.adminPrompt.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(prompts);
  } catch (error) {
    return NextResponse.json({ error: 'Haku epäonnistui' }, { status: 500 });
  }
}

// POST: Создание нового промпта
export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { label, content } = await req.json();
    const newPrompt = await prisma.adminPrompt.create({
      data: { label, content }
    });
    return NextResponse.json(newPrompt);
  } catch (error) {
    return NextResponse.json({ error: 'Luominen epäonnistui' }, { status: 500 });
  }
}

// PUT: Обновление существующего промпта
export async function PUT(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id, label, content } = await req.json();
    const updatedPrompt = await prisma.adminPrompt.update({
      where: { id },
      data: { label, content }
    });
    return NextResponse.json(updatedPrompt);
  } catch (error) {
    return NextResponse.json({ error: 'Päivitys epäonnistui' }, { status: 500 });
  }
}

// DELETE: Удаление промпта
export async function DELETE(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await req.json();
    await prisma.adminPrompt.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Poisto epäonnistui' }, { status: 500 });
  }
}
