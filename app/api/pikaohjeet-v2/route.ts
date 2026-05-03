import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

function normalizeSlug(input: string) {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[äå]/g, "a")
    .replace(/[ö]/g, "o")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return base || `muistilappu-${Date.now()}`;
}

function mapCard(card: any, userId: string) {
  const isPersonal = card.environment === "personal";
  const isOwner = isPersonal && card.updatedByUserId === userId;

  return {
    id: String(card.id),
    legacyId: card.id,
    slug: card.slug,
    title: card.title,
    description: card.subtitle,
    type: isPersonal ? "PERSONAL" : "CLINICAL",
    status: isPersonal ? "NEEDS_REVIEW" : "LEGACY_IMPORTED",
    visibility: isPersonal ? (isOwner ? "PRIVATE" : "SHARED") : "PUBLIC",
    sourceStatus: "NOT_CHECKED",
    tags: card.tags,
    environment: card.environment,
    audience: card.audience,
    updatedAt: card.updatedAt,
    updatedByName: card.updatedByName,
    updatedByEmail: card.updatedByEmail,
    sectionCount: card.sections?.length ?? 0,
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = String((session.user as any).id || "");

    const cards = await prisma.clinicalCard.findMany({
      where: {
        isPublished: true,
        OR: [
          { environment: { not: "personal" } },
          { environment: "personal", updatedByUserId: userId },
        ],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        tags: true,
        environment: true,
        audience: true,
        updatedAt: true,
        updatedByUserId: true,
        updatedByName: true,
        updatedByEmail: true,
        sections: {
          select: { id: true },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    });

    return NextResponse.json(cards.map((card) => mapCard(card, userId)));
  } catch (error) {
    console.error("GET pikaohjeet-v2 error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = String((session.user as any).id || "");
    const body = await req.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : null;
    const sections = Array.isArray(body?.sections) ? body.sections : [];
    const tags = Array.isArray(body?.tags) ? body.tags.filter((tag: any) => typeof tag === "string") : [];

    if (!title) {
      return NextResponse.json({ error: "Otsikko puuttuu" }, { status: 400 });
    }

    if (sections.length === 0) {
      return NextResponse.json({ error: "Sisältö puuttuu" }, { status: 400 });
    }

    const baseSlug = normalizeSlug(title);
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.clinicalCard.findUnique({ where: { slug } })) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    const created = await prisma.clinicalCard.create({
      data: {
        title,
        slug,
        subtitle: description,
        environment: "personal",
        audience: "private",
        tags,
        isPublished: true,
        updatedByUserId: userId,
        updatedByEmail: session.user.email || null,
        updatedByName: (session.user as any).name || session.user.email || null,
        sections: {
          create: sections.map((section: any, index: number) => ({
            key: typeof section.key === "string" && section.key.trim() ? normalizeSlug(section.key).replace(/-/g, "_") : `section_${index + 1}`,
            title: typeof section.title === "string" && section.title.trim() ? section.title.trim() : `Osio ${index + 1}`,
            content: typeof section.content === "string" ? section.content : "",
            order: Number.isFinite(Number(section.order)) ? Number(section.order) : (index + 1) * 10,
          })),
        },
        revisions: {
          create: {
            action: "create_personal_note",
            editorUserId: userId,
            editorEmail: session.user.email || null,
            editorName: (session.user as any).name || session.user.email || null,
            summary: "Oma muistilappu luotu Pikaohjeet v2 -näkymästä",
            payload: body,
          },
        },
      },
      include: {
        sections: { select: { id: true } },
      },
    });

    return NextResponse.json(mapCard(created, userId), { status: 201 });
  } catch (error: any) {
    console.error("POST pikaohjeet-v2 error:", error);
    return NextResponse.json({ error: error?.message || "Tallennusvirhe" }, { status: 500 });
  }
}
