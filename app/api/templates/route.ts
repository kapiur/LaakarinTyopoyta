import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const templates = await prisma.template.findMany({ orderBy: { id: 'desc' } });
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // ПРОВЕРКА: Преобразуем categoryId в число, так как из формы оно может прийти строкой
    const catId = parseInt(body.categoryId);
    
    if (isNaN(catId)) {
      return NextResponse.json({ error: 'Virheellinen osio ID' }, { status: 400 });
    }

    const newTemplate = await prisma.template.create({
      data: {
        title: body.title,
        content: body.content,
        author: 'Dr. Kapustin',
        categoryId: catId, // Используем числовое значение
      },
    });
    return NextResponse.json(newTemplate);
  } catch (error) {
    console.error("Prisma error:", error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

// Новый метод для удаления и редактирования (через query параметры или тело)
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await prisma.template.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const updated = await prisma.template.update({
      where: { id: Number(body.id) },
      data: { title: body.title, category: body.category, content: body.content },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
