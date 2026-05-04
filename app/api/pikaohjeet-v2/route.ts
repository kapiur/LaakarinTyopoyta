import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

function normalizeSlug(input: string) {
  const base = input.toLowerCase().trim().replace(/[äå]/g, "a").replace(/[ö]/g, "o").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return base || `muistilappu-${Date.now()}`;
}

function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

function splitSystemTags(tags: string[] = [], userEmail = "") {
  const normalizedEmail = normalizeEmail(userEmail);
  const sharedWith = tags.filter((tag) => tag.startsWith("_share:")).map((tag) => normalizeEmail(tag.replace("_share:", ""))).filter(Boolean);
  const favoritedBy = tags.filter((tag) => tag.startsWith("_fav:")).map((tag) => normalizeEmail(tag.replace("_fav:", ""))).filter(Boolean);
  return {
    publicTags: tags.filter((tag) => !tag.startsWith("_share:") && !tag.startsWith("_fav:")),
    sharedWith: Array.from(new Set(sharedWith)),
    favoritedBy: Array.from(new Set(favoritedBy)),
    isFavorite: normalizedEmail ? favoritedBy.includes(normalizedEmail) : false,
  };
}

function withShareTags(tags: string[] = [], sharedWith: string[] = []) {
  const existingFavTags = tags.filter((tag) => typeof tag === "string" && tag.startsWith("_fav:"));
  const publicTags = tags.filter((tag) => typeof tag === "string" && tag.trim() && !tag.startsWith("_share:") && !tag.startsWith("_fav:")).map((tag) => tag.trim());
  const shareTags = Array.from(new Set(sharedWith.map(normalizeEmail).filter(Boolean))).map((email) => `_share:${email}`);
  return [...publicTags, ...existingFavTags, ...shareTags];
}

function mapCard(card: any, userId: string, userEmail: string) {
  const isPersonal = card.environment === "personal";
  const system = splitSystemTags(card.tags || [], userEmail);
  const isOwner = isPersonal && card.updatedByUserId === userId;
  const isSharedWithMe = isPersonal && system.sharedWith.includes(userEmail);

  return {
    id: String(card.id),
    legacyId: card.id,
    slug: card.slug,
    title: card.title,
    description: card.subtitle,
    type: isPersonal ? "PERSONAL" : "CLINICAL",
    status: isPersonal ? "NEEDS_REVIEW" : "LEGACY_IMPORTED",
    visibility: isPersonal ? (isOwner ? (system.sharedWith.length ? "SHARED_BY_ME" : "PRIVATE") : "SHARED_WITH_ME") : "PUBLIC",
    sourceStatus: "NOT_CHECKED",
    tags: system.publicTags,
    sharedWith: isOwner ? system.sharedWith : [],
    isFavorite: system.isFavorite,
    canEdit: !isPersonal || isOwner,
    isOwner,
    isSharedWithMe,
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
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = String((session.user as any).id || "");
    const userEmail = normalizeEmail(session.user.email || "");

    const cards = await prisma.clinicalCard.findMany({
      where: {
        isPublished: true,
        OR: [
          { environment: { not: "personal" } },
          { environment: "personal", updatedByUserId: userId },
          { environment: "personal", tags: { has: `_share:${userEmail}` } },
        ],
      },
      select: { id: true, slug: true, title: true, subtitle: true, tags: true, environment: true, audience: true, updatedAt: true, updatedByUserId: true, updatedByName: true, updatedByEmail: true, sections: { select: { id: true } } },
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    });

    return NextResponse.json(cards.map((card) => mapCard(card, userId, userEmail)));
  } catch (error) {
    console.error("GET pikaohjeet-v2 error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = String((session.user as any).id || "");
    const userEmail = normalizeEmail(session.user.email || "");
    const isAdmin = (session.user as any).role === "ADMIN";
    const body = await req.json();
    const requestedType = body?.type === "CLINICAL" ? "CLINICAL" : "PERSONAL";

    if (requestedType === "CLINICAL" && !isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : null;
    const sections = Array.isArray(body?.sections) ? body.sections : [];
    const fields = Array.isArray(body?.fields) ? body.fields : [];
    const tags = Array.isArray(body?.tags) ? body.tags.filter((tag: any) => typeof tag === "string") : [];
    const sharedWith = Array.isArray(body?.sharedWith) ? body.sharedWith.filter((email: any) => typeof email === "string") : [];
    const environment = requestedType === "CLINICAL" ? (typeof body?.environment === "string" ? body.environment : "terveysasema") : "personal";
    const audience = requestedType === "CLINICAL" ? (typeof body?.audience === "string" ? body.audience : "aikuinen") : "private";

    if (!title) return NextResponse.json({ error: "Otsikko puuttuu" }, { status: 400 });
    if (sections.length === 0) return NextResponse.json({ error: "Sisältö puuttuu" }, { status: 400 });

    const slugInput = typeof body?.slugSuggestion === "string" && body.slugSuggestion.trim() ? body.slugSuggestion : title;
    const baseSlug = normalizeSlug(slugInput);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.clinicalCard.findUnique({ where: { slug } })) { counter += 1; slug = `${baseSlug}-${counter}`; }

    const created = await prisma.clinicalCard.create({
      data: {
        title, slug, subtitle: description, environment, audience,
        tags: requestedType === "PERSONAL" ? withShareTags(tags, sharedWith) : tags.filter((tag: string) => !tag.startsWith("_fav:") && !tag.startsWith("_share:")),
        isPublished: true,
        updatedByUserId: userId,
        updatedByEmail: session.user.email || null,
        updatedByName: (session.user as any).name || session.user.email || null,
        sections: { create: sections.map((section: any, index: number) => ({ key: typeof section.key === "string" && section.key.trim() ? normalizeSlug(section.key).replace(/-/g, "_") : `section_${index + 1}`, title: typeof section.title === "string" && section.title.trim() ? section.title.trim() : `Osio ${index + 1}`, content: typeof section.content === "string" ? section.content : "", order: Number.isFinite(Number(section.order)) ? Number(section.order) : (index + 1) * 10, highlightCallout: typeof section.highlightCallout === "string" ? section.highlightCallout : null })) },
        fields: { create: requestedType === "CLINICAL" ? fields.map((field: any, index: number) => ({ key: typeof field.key === "string" && field.key.trim() ? normalizeSlug(field.key).replace(/-/g, "_") : `field_${index + 1}`, label: typeof field.label === "string" && field.label.trim() ? field.label.trim() : `Kenttä ${index + 1}`, type: typeof field.type === "string" && field.type.trim() ? field.type.trim() : "text", unit: typeof field.unit === "string" ? field.unit : null, placeholder: typeof field.placeholder === "string" ? field.placeholder : null, options: Array.isArray(field.options) ? field.options.filter((item: any) => typeof item === "string") : [], order: Number.isFinite(Number(field.order)) ? Number(field.order) : (index + 1) * 10, isUniversal: Boolean(field.isUniversal) })) : [] },
        revisions: { create: { action: requestedType === "CLINICAL" ? "create_clinical_card" : "create_personal_note", editorUserId: userId, editorEmail: session.user.email || null, editorName: (session.user as any).name || session.user.email || null, summary: requestedType === "CLINICAL" ? "Kliininen pikaohje luotu Pikaohjeet v2 -näkymästä" : "Oma muistilappu luotu Pikaohjeet v2 -näkymästä", payload: body } },
      },
      include: { sections: { select: { id: true } } },
    });

    return NextResponse.json(mapCard(created, userId, userEmail), { status: 201 });
  } catch (error: any) {
    console.error("POST pikaohjeet-v2 error:", error);
    return NextResponse.json({ error: error?.message || "Tallennusvirhe" }, { status: 500 });
  }
}
