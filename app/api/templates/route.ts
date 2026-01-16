import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

const prisma = new PrismaClient();

// ПОЛУЧЕНИЕ КАТЕГОРИЙ И ШАБЛОНОВ
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id);
    
    // Загружаем категории вместе с вложенными шаблонами для текущего юзера
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

// СОЗДАНИЕ ИЛИ ОБНОВЛЕНИЕ ШАБЛОНА
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, content, categoryName, author, id } = await req.json();
    const userId = parseInt((session.user as any).id);

    // 1. Сначала разбираемся с категорией
    let category = await prisma.category.findFirst({
      where: { name: categoryName, userId: userId }
    });

    if (!category) {
      category = await prisma.category.create({
        data: { name: categoryName, userId: userId }
      });
    }

    // 2. Если есть ID, обновляем существующий шаблон, если нет — создаем новый
    if (id) {
      const updatedTemplate = await prisma.template.update({
        where: { id: parseInt(id), userId: userId },
        data: { title, content, author, categoryId: category.id }
      });
      return NextResponse.json(updatedTemplate);
    } else {
      const newTemplate = await prisma.template.create({
        data: {
          title,
          content,
          author: author || "Doc",
          categoryId: category.id,
          userId: userId
        }
      });
      return NextResponse.json(newTemplate);
    }
  } catch (error) {
    console.error("POST Template Error:", error);
    return NextResponse.json({ error: "Tallennus epäonnistui" }, { status: 500 });
  }
}

// УДАЛЕНИЕ ШАБЛОНА ИЛИ КАТЕГОРИИ
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
      await prisma.category.deleteMany({
        where: { id: parseInt(id), userId: userId }
      });
    } else {
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
