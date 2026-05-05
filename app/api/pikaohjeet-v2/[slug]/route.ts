import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

function normalizeSlug(input: string) {
  const base = input.toLowerCase().trim().replace(/[äå]/g, "a").replace(/[ö]/g, "o").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return base || `section-${Date.now()}`;
}

function normalizeEmail(input: string) { return input.trim().toLowerCase(); }

function splitPersonalTags(tags: string[] = []) {
  const sharedWith = tags.filter((tag) => tag.startsWith("_share:")).map((tag) => normalizeEmail(tag.replace("_share:", ""))).filter(Boolean);
  return { publicTags: tags.filter((tag) => !tag.startsWith("_share:")), sharedWith: Array.from(new Set(sharedWith)) };
}

function withShareTags(tags: string[] = [], sharedWith: string[] = []) {
  const publicTags = tags.filter((tag) => typeof tag === "string" && tag.trim() && !tag.startsWith("_share:")).map((tag) => tag.trim());
  const shareTags = Array.from(new Set(sharedWith.map(normalizeEmail).filter(Boolean))).map((email) => `_share:${email}`);
  return [...publicTags, ...shareTags];
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

function extractInternalStatus(tags: string[] = []) {
  const statusTag = tags.find((tag) => tag.startsWith("_status:"));
  const sourceTag = tags.find((tag) => tag.startsWith("_source:"));
  return { status: statusTag?.replace("_status:", "") || "NEEDS_REVIEW", sourceStatus: sourceTag?.replace("_source:", "") || "NOT_CHECKED", publicTags: tags.filter((tag) => !tag.startsWith("_status:") && !tag.startsWith("_source:")) };
}

function withInternalTags(tags: string[] = [], status?: string, sourceStatus?: string) {
  const clean = tags.filter((tag) => typeof tag === "string" && tag.trim() && !tag.startsWith("_status:") && !tag.startsWith("_source:")).map((tag) => tag.trim());
  if (status) clean.push(`_status:${status}`);
  if (sourceStatus) clean.push(`_source:${sourceStatus}`);
  return clean;
}

function mapCard(card: any, userId: string, userEmail: string) {
  const isPersonal = card.environment === "personal";
  const personal = splitPersonalTags(card.tags || []);
  const internal = extractInternalStatus(card.tags || []);
  const isOwner = isPersonal && card.updatedByUserId === userId;
  const isSharedWithMe = isPersonal && personal.sharedWith.includes(userEmail);

  return {
    id: String(card.id), legacyId: card.id, slug: card.slug, title: card.title, description: card.subtitle,
    type: isPersonal ? "PERSONAL" : "CLINICAL",
    status: isPersonal ? "NEEDS_REVIEW" : internal.status,
    visibility: isPersonal ? (isOwner ? (personal.sharedWith.length ? "SHARED_BY_ME" : "PRIVATE") : "SHARED_WITH_ME") : "PUBLIC",
    sourceStatus: isPersonal ? "NOT_CHECKED" : internal.sourceStatus,
    environment: card.environment, audience: card.audience,
    tags: isPersonal ? personal.publicTags : internal.publicTags,
    sharedWith: isPersonal && isOwner ? personal.sharedWith : [],
    canEdit: isPersonal ? isOwner : true,
    isOwner,
    isSharedWithMe,
    updatedAt: card.updatedAt, updatedByName: card.updatedByName, updatedByEmail: card.updatedByEmail,
    sections: (card.sections || []).map((section: any) => ({ id: String(section.id), key: section.key, title: section.title, content: section.content, order: section.order, kind: mapSectionKind(section.title, section.key), highlightCallout: section.highlightCallout })),
    fields: (card.fields || []).map((field: any) => ({ id: String(field.id), key: field.key, label: field.label, type: field.type, unit: field.unit, placeholder: field.placeholder, options: field.options, order: field.order, isUniversal: field.isUniversal })),
    rules: (card.rules || []).map((rule: any) => ({ id: String(rule.id), groupId: rule.groupId, fieldKey: rule.fieldKey, operator: rule.operator, value: rule.value, highlightSectionKey: rule.highlightSectionKey, addHint: rule.addHint, priority: rule.priority })),
    sources: [], revisions: card.revisions || [],
  };
}

async function getCard(slug: string) {
  return prisma.clinicalCard.findUnique({ where: { slug }, include: { sections: { orderBy: { order: "asc" } }, fields: { orderBy: { order: "asc" } }, rules: { orderBy: { priority: "asc" } }, revisions: { orderBy: { createdAt: "desc" }, take: 5 } } });
}

function canReadCard(card: any, userId: string, userEmail: string) {
  if (!card || !card.isPublished) return false;
  if (card.environment !== "personal") return true;
  const personal = splitPersonalTags(card.tags || []);
  return card.updatedByUserId === userId || personal.sharedWith.includes(userEmail);
}

function canEditCard(card: any, userId: string, isAdmin: boolean) {
  if (!card || !card.isPublished) return false;
  if (card.environment === "personal") return card.updatedByUserId === userId;
  return isAdmin;
}

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = String((session.user as any).id || "");
    const userEmail = normalizeEmail(session.user.email || "");
    const card = await getCard(params.slug);
    if (!canReadCard(card, userId, userEmail)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(mapCard(card, userId, userEmail));
  } catch (error) {
    console.error("GET pikaohjeet-v2 detail error:", error);
    return NextResponse.json({ error: "Latausvirhe" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = String((session.user as any).id || "");
    const userEmail = normalizeEmail(session.user.email || "");
    const isAdmin = (session.user as any).role === "ADMIN";
    const existing = await getCard(params.slug);
    if (!canEditCard(existing, userId, isAdmin)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isPersonal = existing!.environment === "personal";
    const body = await req.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : null;
    const tags = Array.isArray(body?.tags) ? body.tags.filter((tag: any) => typeof tag === "string") : [];
    const sharedWith = Array.isArray(body?.sharedWith) ? body.sharedWith.filter((email: any) => typeof email === "string") : [];
    const sections = Array.isArray(body?.sections) ? body.sections : [];
    const status = typeof body?.status === "string" ? body.status : "NEEDS_REVIEW";
    const sourceStatus = typeof body?.sourceStatus === "string" ? body.sourceStatus : "NOT_CHECKED";
    const environment = isPersonal ? "personal" : (typeof body?.environment === "string" ? body.environment : existing!.environment);
    const audience = isPersonal ? "private" : (typeof body?.audience === "string" ? body.audience : existing!.audience);

    if (!title) return NextResponse.json({ error: "Otsikko puuttuu" }, { status: 400 });
    if (sections.length === 0) return NextResponse.json({ error: "Sisältö puuttuu" }, { status: 400 });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.clinicalSection.deleteMany({ where: { cardId: existing!.id } });
      await tx.clinicalField.deleteMany({ where: { cardId: existing!.id } });
      await tx.clinicalRule.deleteMany({ where: { cardId: existing!.id } });
      return tx.clinicalCard.update({
        where: { id: existing!.id },
        data: {
          title, subtitle: description,
          tags: isPersonal ? withShareTags(tags, sharedWith) : withInternalTags(tags, status, sourceStatus),
          environment, audience, updatedByUserId: userId, updatedByEmail: session.user.email || null, updatedByName: (session.user as any).name || session.user.email || null,
          sections: { create: sections.map((section: any, index: number) => ({ key: typeof section.key === "string" && section.key.trim() ? normalizeSlug(section.key).replace(/-/g, "_") : `section_${index + 1}`, title: typeof section.title === "string" && section.title.trim() ? section.title.trim() : `Osio ${index + 1}`, content: typeof section.content === "string" ? section.content : "", order: Number.isFinite(Number(section.order)) ? Number(section.order) : (index + 1) * 10, highlightCallout: typeof section.highlightCallout === "string" ? section.highlightCallout : null })) },
          revisions: { create: { action: isPersonal ? "update_personal_note" : "update_clinical_card", editorUserId: userId, editorEmail: session.user.email || null, editorName: (session.user as any).name || session.user.email || null, summary: isPersonal ? "Oma muistilappu päivitetty Pikaohjeet v2 -näkymästä" : "Kliininen pikaohje päivitetty Pikaohjeet v2 -näkymästä", payload: body } },
        },
        include: { sections: { orderBy: { order: "asc" } }, fields: { orderBy: { order: "asc" } }, rules: { orderBy: { priority: "asc" } }, revisions: { orderBy: { createdAt: "desc" }, take: 5 } },
      });
    });
    return NextResponse.json(mapCard(updated, userId, userEmail));
  } catch (error: any) {
    console.error("PUT pikaohjeet-v2 detail error:", error);
    return NextResponse.json({ error: error?.message || "Tallennusvirhe" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = String((session.user as any).id || "");
    const isAdmin = (session.user as any).role === "ADMIN";
    const existing = await getCard(params.slug);
    if (!canEditCard(existing, userId, isAdmin)) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const isPersonal = existing!.environment === "personal";
    await prisma.clinicalCard.update({ where: { id: existing!.id }, data: { isPublished: false, revisions: { create: { action: isPersonal ? "archive_personal_note" : "archive_clinical_card", editorUserId: userId, editorEmail: session.user.email || null, editorName: (session.user as any).name || session.user.email || null, summary: isPersonal ? "Oma muistilappu arkistoitu Pikaohjeet v2 -näkymästä" : "Kliininen pikaohje arkistoitu Pikaohjeet v2 -näkymästä" } } } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE pikaohjeet-v2 detail error:", error);
    return NextResponse.json({ error: error?.message || "Poisto epäonnistui" }, { status: 500 });
  }
}
