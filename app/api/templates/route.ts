import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

// Хелпер для получения сессии и проверки прав
async function getAuthSession() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return null;
  return session;
}

export async function GET() {
  const session = await getAuthSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const currentUserId = parseInt((session.user as any).id);

    const categories = await prisma.category.findMany({
      where: {
        userId: currentUserId
      },
      include: {
        templates: true,
      },
      orderBy: {
        name: 'asc'
      }
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET Templates Error:", error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, content, author, categoryName } = body;
    const currentUserId = parseInt((session.user as any).id);

    // 1. Находим или создаем категорию ДЛЯ КОНКРЕТНОГО пользователя
    let category = await prisma.category.findFirst({
      where: { 
        name: categoryName,
        userId: currentUserId
      }
    });

    if (!category) {
      category = await prisma.category.create({
        data: { 
          name: categoryName,
          userId: currentUserId
        }
      });
    }

    // 2. Создаем шаблон, привязанный к пользователю и категории
    const template = await prisma.template.create({
      data: {
        title,
        content,
        author,
        categoryId: category.id,
        userId: currentUserId
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("POST Template Error:", error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getAuthSession();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const currentUserId = parseInt((session.user as any).id);

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // Проверяем, что шаблон принадлежит именно этому пользователю перед удалением
    const template = await prisma.template.findFirst({
      where: {
        id: parseInt(id),
        userId: currentUserId
      }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found or access denied' }, { status: 403 });
    }

    await prisma.template.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Template Error:", error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
