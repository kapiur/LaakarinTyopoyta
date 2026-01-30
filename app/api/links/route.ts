import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

const prisma = new PrismaClient();

/**
 * GET: Список всех категорий и ссылок (общих и персональных)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // В вашей схеме User.id - это Int. Next-auth обычно хранит id как string в session.user.id
    const currentUserId = (session.user as any).id ? parseInt((session.user as any).id) : null;

    const categories = await prisma.linkCategory.findMany({
      where: {
        OR: [
          { userId: null }, // Общие
          { userId: currentUserId || -1 } // Свои
        ]
      },
      include: {
        links: {
          where: {
            OR: [
              { userId: null },
              { userId: currentUserId || -1 }
            ]
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("GET links error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST: Создание категории или ссылки
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = (session.user as any).id ? parseInt((session.user as any).id) : null;
    const body = await req.json();
    const { type, name, title, url, categoryId, isPersonal } = body;

    // Создание категории
    if (type === "category") {
      if (!name) return NextResponse.json({ error: "Nimi puuttuu" }, { status: 400 });
      
      const category = await prisma.linkCategory.create({
        data: {
          name,
          userId: isPersonal ? currentUserId : null
        }
      });
      return NextResponse.json(category);
    }

    // Создание ссылки
    if (!title || !url || !categoryId) {
      return NextResponse.json({ error: "Tiedot puuttuvat" }, { status: 400 });
    }

    const link = await prisma.quickLink.create({
      data: {
        title,
        url,
        categoryId: parseInt(categoryId),
        userId: isPersonal ? currentUserId : null
      }
    });

    return NextResponse.json(link);
  } catch (error) {
    console.error("POST links error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
