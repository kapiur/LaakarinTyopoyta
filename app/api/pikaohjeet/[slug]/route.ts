import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

const prisma = new PrismaClient();

type Params = { params: { slug: string } };

// GET /api/pikaohjeet/:slug  -> полная карточка с секциями/полями/правилами
export async function GET(req: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const card = await prisma.clinicalCard.findUnique({
      where: { slug: params.slug },
      include: {
        fields: { orderBy: { order: "asc" } },
        sections: { orderBy: { order: "asc" } },
        rules: { orderBy: { priority: "asc" } },
      },
    });

    if (!card || !card.isPublished) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(card);
  } catch (error) {
    console.error("GET pikaohjeet/[slug] error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT /api/pikaohjeet/:slug -> обновление карточки (всем авторизованным)
export async function PUT(req: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // ожидаем payload вида:
    // { title, subtitle, tags, sections: [...], fields: [...], rules: [...] }
    // MVP: перезаписываем child-коллекции целиком (как в seed), фиксируем автора и ревизию

    const userAny = session.user as any;

    const editorUserId = userAny?.id ? String(userAny.id) : null;
    const editorEmail = session.user.email || null;
    const editorName = session.user.name || editorEmail || "User";

    const card = await prisma.clinicalCard.findUnique({
      where: { slug: params.slug },
      select: { id: true, isPublished: true },
    });

    if (!card || !card.isPublished) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Update base card
      const base = await tx.clinicalCard.update({
        where: { id: card.id },
        data: {
          title: body.title ?? undefined,
          subtitle: body.subtitle ?? undefined,
          tags: body.tags ?? undefined,
          updatedByUserId: editorUserId,
          updatedByEmail: editorEmail,
          updatedByName: editorName,
        },
      });

      // Replace children (simple, reliable MVP)
      if (Array.isArray(body.sections)) {
        await tx.clinicalSection.deleteMany({ where: { cardId: card.id } });
        await tx.clinicalSection.createMany({
          data: body.sections.map((s: any) => ({
            cardId: card.id,
            key: s.key,
            title: s.title,
            order: s.order ?? 0,
            content: s.content ?? "",
            highlightCallout: s.highlightCallout ?? null,
          })),
        });
      }

      if (Array.isArray(body.fields)) {
        await tx.clinicalField.deleteMany({ where: { cardId: card.id } });
        await tx.clinicalField.createMany({
          data: body.fields.map((f: any) => ({
            cardId: card.id,
            key: f.key,
            label: f.label,
            type: f.type,
            unit: f.unit ?? null,
            placeholder: f.placeholder ?? null,
            options: f.options ?? [],
            order: f.order ?? 0,
            isUniversal: !!f.isUniversal,
          })),
        });
      }

      if (Array.isArray(body.rules)) {
        await tx.clinicalRule.deleteMany({ where: { cardId: card.id } });
        await tx.clinicalRule.createMany({
          data: body.rules.map((r: any) => ({
            cardId: card.id,
            fieldKey: r.fieldKey,
            operator: r.operator,
            value: String(r.value),
            highlightSectionKey: r.highlightSectionKey ?? null,
            addHint: r.addHint ?? null,
            priority: r.priority ?? 50,
          })),
        });
      }

      await tx.clinicalRevision.create({
        data: {
          cardId: card.id,
          action: "update_card",
          summary: body.summary || "Updated card",
          editorUserId: editorUserId,
          editorEmail: editorEmail,
          editorName: editorName,
          payload: {
            title: body.title,
            subtitle: body.subtitle,
            tags: body.tags,
            // не пишем гигантский payload по умолчанию; при желании можно расширить
          },
        },
      });

      return base;
    });

    return NextResponse.json({ success: true, card: updated });
  } catch (error: any) {
    console.error("PUT pikaohjeet/[slug] error:", error);
    return NextResponse.json({ error: "Server error", detail: error?.message }, { status: 500 });
  }
}
