import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

function mapSectionKind(title: string, key: string) {
  const haystack = `${title} ${key}`.toLowerCase();
  if (haystack.includes("tarkista") || haystack.includes("heti") || haystack.includes("päivyst")) return "WARNING";
  if (haystack.includes("kriteer") || haystack.includes("raja") || haystack.includes("diagnos")) return "CRITERIA";
  if (haystack.includes("toimi") || haystack.includes("suunnitel") || haystack.includes("hoito")) return "ACTIONS";
  if (haystack.includes("potilaskertom") || haystack.includes("kopio")) return "COPY_TEXT";
  if (haystack.includes("lähde") || haystack.includes("source")) return "SOURCES";
  return "TEXT";
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

    return NextResponse.json({
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
      sections: card.sections.map((section) => ({
        id: String(section.id),
        key: section.key,
        title: section.title,
        content: section.content,
        order: section.order,
        kind: mapSectionKind(section.title, section.key),
        highlightCallout: section.highlightCallout,
      })),
      fields: card.fields.map((field) => ({
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
      rules: card.rules.map((rule) => ({
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
      revisions: card.revisions,
    });
  } catch (error) {
    console.error("GET pikaohjeet-v2 detail error:", error);
    return NextResponse.json({ error: "Latausvirhe" }, { status: 500 });
  }
}
