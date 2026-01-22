import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth"; // Путь остается прежним

const prisma = new PrismaClient();

/**
 * GET: Список всех карточек для боковой панели
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cards = await prisma.clinicalCard.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        tags: true,
        updatedAt: true,
        updatedByName: true,
        updatedByEmail: true,
      },
      orderBy: [{ title: "asc" }],
    });

    return NextResponse.json(cards);
  } catch (error) {
    console.error("GET pikaohjeet error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST: Создание новой пустой карточки (скелета)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Otsikko puuttuu" }, { status: 400 });
    }

    // Генерация URL-friendly slug
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[äå]/g, 'a')
      .replace(/[ö]/g, 'o')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '') + '-' + Math.floor(Math.random() * 1000); // Добавим рандом, чтобы избежать конфликтов имен

    const newCard = await prisma.clinicalCard.create({
      data: {
        title,
        slug,
        subtitle: "Uusi kliininen ohje",
        updatedByEmail: session.user.email,
        updatedByName: (session.user as any).name || session.user.email,
        isPublished: true,
        // Сразу создаем одну секцию, чтобы конструктор открылся корректно
        sections: {
          create: {
            key: "yleista",
            title: "Yleistä",
            content: "Muokkaa tätä sisältöä klikkaamalla 'Muokkaa' painiketta.",
            order: 10
          }
        },
        // Создаем лог о создании
        revisions: {
          create: {
            action: "create_card",
            editorEmail: session.user.email,
            editorName: (session.user as any).name || session.user.email,
            summary: "Kortti luotu"
          }
        }
      }
    });

    return NextResponse.json(newCard);
  } catch (error: any) {
    console.error("POST pikaohjeet error:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Tämä nimi или slug on jo käytössä" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
