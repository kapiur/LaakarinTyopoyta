import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = (session.user as any).id ? parseInt((session.user as any).id) : null;

    const categories = await prisma.linkCategory.findMany({
      where: {
        OR: [{ userId: null }, { userId: currentUserId || -1 }]
      },
      include: {
        links: {
          where: {
            OR: [{ userId: null }, { userId: currentUserId || -1 }]
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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentUserId = (session.user as any).id ? parseInt((session.user as any).id) : null;
    const body = await req.json();
    const { type, name, title, url, categoryId, isPersonal } = body;

    if (type === "category") {
      const category = await prisma.linkCategory.create({
        data: { name, userId: isPersonal ? currentUserId : null }
      });
      return NextResponse.json(category);
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
    return NextResponse.json({ error: "Post failed" }, { status: 500 });
  }
}

// PATCH: Перенос ссылки в другую категорию
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { linkId, newCategoryId } = await req.json();
    const updatedLink = await prisma.quickLink.update({
      where: { id: parseInt(linkId) },
      data: { categoryId: parseInt(newCategoryId) }
    });

    return NextResponse.json(updatedLink);
  } catch (error) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
