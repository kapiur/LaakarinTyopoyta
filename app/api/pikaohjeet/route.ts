import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";

const prisma = new PrismaClient();

// GET /api/pikaohjeet  -> список карточек (для навигации)
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
