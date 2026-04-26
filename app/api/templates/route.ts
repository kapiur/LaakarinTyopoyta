import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

const prisma = new PrismaClient();

function normalizeCategoryName(name: unknown) {
  if (typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, ' ');
}

// 1. ПОЛУЧЕНИЕ ВСЕХ КАТЕГОРИЙ И ШАБЛОНОВ ПОЛЬЗОВАТЕЛЯ
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id);

    // Получаем категории вместе с шаблонами, которые принадлежат этому пользователю
    const categories = await prisma.category.findMany({
      where: { userId: userId },
      include: {
        templates: {
          where: { userId: userId },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET Templates Error:", error);
    return NextResponse.json({ error: "Latausvirhe" }, { status: 500 });
  }
}

// 2. СОЗДАНИЕ ИЛИ ОБНОВЛЕНИЕ ШАБЛОНА
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const userId = parseInt((session.user as any).id);
    const { id, title, content, categoryName, author } = body;
    const cleanCategoryName = normalizeCategoryName(categoryName);

    if (!cleanCategoryName) {
      return NextResponse.json({ error: "Kategorian nimi puuttuu" }, { status: 400 });
    }

    // ШАГ 1: Находим или создаем категорию для пользователя.
    // Сравнение без учета регистра и с предварительной нормализацией пробелов
    // предотвращает новые дубли вида "OHJEET", "Ohjeet" и "OHJEET ".
    let category = await prisma.category.findFirst({
      where: {
        name: {
          equals: cleanCategoryName,
          mode: 'insensitive'
        },
        userId: userId
      },
      orderBy: { id: 'asc' }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: cleanCategoryName,
          userId: userId
        }
      });
    }

    // ШАГ 2: Если передан ID — обновляем, если нет — создаем новый шаблон
    if (id) {
      const updatedTemplate = await prisma.template.update({
        where: { id: parseInt(id), userId: userId },
        data: {
          title,
          content,
          author: author || session.user.email || "Nimetön",
          categoryId: category.id
        }
      });
      return NextResponse.json(updatedTemplate);
    } else {
      const newTemplate = await prisma.template.create({
        data: {
          title,
          content,
          author: author || session.user.email || "Nimetön",
          categoryId: category.id,
          userId: userId
        }
      });
      return NextResponse.json(newTemplate);
    }
  } catch (error: any) {
    console.error("POST Template Error:", error);
    return NextResponse.json({ error: "Tallennus epäonnistui: " + error.message }, { status: 500 });
  }
}

// 3. ОБНОВЛЕНИЕ (PUT) — для поддержки метода PUT из фронтенда
export async function PUT(req: Request) {
  return POST(req); // Просто перенаправляем на ту же логику сохранения
}

// 4. УДАЛЕНИЕ ШАБЛОНА ИЛИ КАТЕГОРИИ
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // 'category' или 'template'
    const userId = parseInt((session.user as any).id);

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    if (type === 'category') {
      // Удаляем категорию (благодаря onDelete: Cascade в Prisma, шаблоны удалятся сами)
      await prisma.category.deleteMany({
        where: { id: parseInt(id), userId: userId }
      });
    } else {
      // Удаляем конкретный шаблон
      await prisma.template.deleteMany({
        where: { id: parseInt(id), userId: userId }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Error:", error);
    return NextResponse.json({ error: "Poisto epäonnistui" }, { status: 500 });
  }
}
