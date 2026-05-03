import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

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

  return base || `section-${Date.now()}`;
}

function mapSectionKind(title: string, key: string) {
  const haystack = `${title} ${key}`.toLowerCase();
  if (haystack.includes("tarkista") || haystack.includes("heti") || haystack.includes("päivyst")) return "WARNING";
  if (haystack.includes("kriteer") || haystack.includes("raja") || haystack.includes("diagnos")) return "CRITERIA";
  if (haystack.includes("toimi") || haystack.includes("suunnitel") || haystack.includes("hoito")) return "ACTIONS";
  if (haystack.includes("potilaskertom") || haystack.includes("kopio")) return "COPY_TEXT";
  if (haystack.includes("lähde") || haystack.includes("source")) return "SOURCES";
  return "TEXT";
}

function mapCard(card: any, userId: string) {
  const isPersonal = card.environment === "personal";

  return {
    id: String(card.id),
    legacyId: card.id,
    slug: card.slug,
    title: card.title,
    description: card.subtitle,
    type: isPersonal ? "PERSONAL" : "CLINICAL",
    status: isPersonal ? "NEEDS_REVIEW" : "LEGACY_IMPORTED",
    visibility: isPersonal ? "PRIVATE" : "PUBLIC",
    sourceStatus: "NOT_CHECKED",
    environment: card.environment,
    audience: card.audience,
    tags: card.tags,
    updatedAt: card.updatedAt,
    updatedByName: card.updatedByName,
    updatedByEmail: card.updatedByEmail,
    sections: (card.sections || []).map((section: any) => ({
      id: String(section.id),
      key: section.key,
      title: section.title,
      content: section.content,
      order: section.order,
      kind: mapSectionKind(section.title, section.key),
      highlightCallout: section.highlightCallout,
    })),
    fields: (card.fields || []).map((field: any) => ({
      id: String(field.id),
      key: field.key,
      label: field.label,
      type: field.type,
      unit: field.unit,
      placeholder: field.placeholder,
      options: field.options,
      order: field.order,
      isUniversal: field.isUniversal,
    })),
    rules: (card.rules || []).map((rule: any) => ({
      id: String(rule.id),
      groupId: rule.groupId,
      fieldKey: rule.fieldKey,
      operator: rule.operator,
      value: rule.value,
      highlightSectionKey: rule.highlightSectionKey,
      addHint: rule.addHint,
      priority: rule.priority,
    })),
    sources: [],
    revisions: card.revisions || [],
  };
}

async function getOwnedPersonalCard(slug: string, userId: string) {
  const card = await prisma.clinicalCard.findUnique({
    where: { slug },
    include: {
      sections: { orderBy: { order: "asc" } },
      fields: { orderBy: { order: "asc" } },
      rules: { orderBy: { priority: "asc" } },
      revisions: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!card || !card.isPublished || card.environment !== "personal" || card.updatedByUserId !== userId) {
    return null;
  }

  return card;
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = String((session.user as any).id || "");

    const card = await prisma.clinicalCard.findUnique({
      where: { slug: params.slug },
      include: {
        sections: { orderBy: { order: "asc" } },
        fields: { orderBy: { order: "asc" } },
        rules: { orderBy: { priority: "asc" } },
        revisions: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });

    if (!card || !card.isPublished) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isPersonal = card.environment === "personal";
    const isOwner = isPersonal && card.updatedByUserId === userId;

    if (isPersonal && !isOwner) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(mapCard(card, userId));
  } catch (error) {
    console.error("GET pikaohjeet-v2 detail error:", error);
    return NextResponse.json({ error: "Latausvirhe" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = String((session.user as any).id || "");
    const existing = await getOwnedPersonalCard(params.slug, userId);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : null;
    const tags = Array.isArray(body?.tags) ? body.tags.filter((tag: any) => typeof tag === "string") : [];
    const sections = Array.isArray(body?.sections) ? body.sections : [];

    if (!title) {
      return NextResponse.json({ error: "Otsikko puuttuu" }, { status: 400 });
    }

    if (sections.length === 0) {
      return NextResponse.json({ error: "Sisältö puuttuu" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.clinicalSection.deleteMany({ where: { cardId: existing.id } });
      await tx.clinicalField.deleteMany({ where: { cardId: existing.id } });
      await tx.clinicalRule.deleteMany({ where: { cardId: existing.id } });

      return tx.clinicalCard.update({
        where: { id: existing.id },
        data: {
          title,
          subtitle: description,
          tags,
          updatedByUserId: userId,
          updatedByEmail: session.user.email || null,
          updatedByName: (session.user as any).name || session.user.email || null,
          sections: {
            create: sections.map((section: any, index: number) => ({
              key:
                typeof section.key === "string" && section.key.trim()
                  ? normalizeSlug(section.key).replace(/-/g, "_")
                  : `section_${index + 1}`,
              title:
                typeof section.title === "string" && section.title.trim()
                  ? section.title.trim()
                  : `Osio ${index + 1}`,
              content: typeof section.content === "string" ? section.content : "",
              order: Number.isFinite(Number(section.order)) ? Number(section.order) : (index + 1) * 10,
            })),
          },
          revisions: {
            create: {
              action: "update_personal_note",
              editorUserId: userId,
              editorEmail: session.user.email || null,
              editorName: (session.user as any).name || session.user.email || null,
              summary: "Oma muistilappu päivitetty Pikaohjeet v2 -näkymästä",
              payload: body,
            },
          },
        },
        include: {
          sections: { orderBy: { order: "asc" } },
          fields: { orderBy: { order: "asc" } },
          rules: { orderBy: { priority: "asc" } },
          revisions: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      });
    });

    return NextResponse.json(mapCard(updated, userId));
  } catch (error: any) {
    console.error("PUT pikaohjeet-v2 detail error:", error);
    return NextResponse.json({ error: error?.message || "Tallennusvirhe" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = String((session.user as any).id || "");
    const existing = await getOwnedPersonalCard(params.slug, userId);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.clinicalCard.update({
      where: { id: existing.id },
      data: {
        isPublished: false,
        revisions: {
          create: {
            action: "archive_personal_note",
            editorUserId: userId,
            editorEmail: session.user.email || null,
            editorName: (session.user as any).name || session.user.email || null,
            summary: "Oma muistilappu arkistoitu Pikaohjeet v2 -näkymästä",
          },
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE pikaohjeet-v2 detail error:", error);
    return NextResponse.json({ error: error?.message || "Poisto epäonnistui" }, { status: 500 });
  }
}
