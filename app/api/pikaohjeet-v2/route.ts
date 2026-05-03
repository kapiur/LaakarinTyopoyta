import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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
        environment: true,
        audience: true,
        updatedAt: true,
        updatedByName: true,
        updatedByEmail: true,
        sections: {
          select: { id: true },
        },
      },
      orderBy: [{ title: "asc" }],
    });

    return NextResponse.json(
      cards.map((card) => ({
        id: String(card.id),
        legacyId: card.id,
        slug: card.slug,
        title: card.title,
        description: card.subtitle,
        type: "CLINICAL",
        status: "LEGACY_IMPORTED",
        visibility: "PUBLIC",
        sourceStatus: "NOT_CHECKED",
        tags: card.tags,
        environment: card.environment,
        audience: card.audience,
        updatedAt: card.updatedAt,
        updatedByName: card.updatedByName,
        updatedByEmail: card.updatedByEmail,
        sectionCount: card.sections.length,
      }))
    );
  } catch (error) {
    console.error("GET pikaohjeet-v2 error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
