import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Получить все шаблоны из базы
export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      orderBy: { id: 'desc' }
    });
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

// Сохранить новый шаблон
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newTemplate = await prisma.template.create({
      data: {
        title: body.title,
        category: body.category,
        content: body.content,
        author: 'Dr. Kapustin', // Позже свяжем с логином
      },
    });
    return NextResponse.json(newTemplate);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
