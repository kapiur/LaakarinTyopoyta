import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

// GET: Получение всех доступных ссылок и категорий
export async function GET() {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id ? parseInt(session.user.id) : null;

  try {
    const categories = await prisma.linkCategory.findMany({
      where: {
        OR: [
          { userId: null },
          { userId: currentUserId || -1 }
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Создание ссылки или категории
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const body = await req.json();
  const { type, name, title, url, categoryId, isPersonal } = body;

  try {
    // Создание категории
    if (type === "category") {
      const category = await prisma.linkCategory.create({
        data: {
          name,
          userId: isPersonal ? userId : null
        }
      });
      return NextResponse.json(category);
    }

    // Создание ссылки
    const link = await prisma.quickLink.create({
      data: {
        title,
        url,
        categoryId: parseInt(categoryId),
        userId: isPersonal ? userId : null
      }
    });
    return NextResponse.json(link);
  } catch (error) {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
