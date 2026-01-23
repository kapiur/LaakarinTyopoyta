import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";

const prisma = new PrismaClient();

// 1. ПОЛУЧЕНИЕ ПОЛНОЙ КАРТОЧКИ
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const card = await prisma.clinicalCard.findUnique({
      where: { slug: params.slug },
      include: {
        sections: { orderBy: { order: 'asc' } },
        fields: { orderBy: { order: 'asc' } },
        rules: true,
      }
    });

    if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(card);
  } catch (error) {
    return NextResponse.json({ error: "Latausvirhe" }, { status: 500 });
  }
}

// 2. ОБНОВЛЕНИЕ СТРУКТУРЫ И ПЕРЕИМЕНОВАНИЕ (PUT)
export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    // Извлекаем title и subtitle для возможности переименования
    const { title, subtitle, sections, fields, rules } = body;
    const slug = params.slug;

    const result = await prisma.$transaction(async (tx) => {
      const card = await tx.clinicalCard.findUnique({ where: { slug } });
      if (!card) throw new Error("Card not found");

      // Обновляем основные данные карточки
      await tx.clinicalCard.update({
        where: { id: card.id },
        data: {
          title: title || card.title,
          subtitle: subtitle !== undefined ? subtitle : card.subtitle,
          updatedAt: new Date(),
          updatedByEmail: session.user.email,
          updatedByName: (session.user as any).name || "User",
        }
      });

      // --- СИНХРОНИЗАЦИЯ СЕКЦИЙ ---
      const incomingSectionKeys = sections.map((s: any) => s.key);
      await tx.clinicalSection.deleteMany({
        where: { cardId: card.id, key: { notIn: incomingSectionKeys } }
      });

      for (const s of sections) {
        const { id, cardId, ...dataToSave } = s; 
        await tx.clinicalSection.upsert({
          where: { cardId_key: { cardId: card.id, key: s.key } },
          create: { ...dataToSave, cardId: card.id },
          update: { title: s.title, content: s.content, order: s.order }
        });
      }

      // --- СИНХРОНИЗАЦИЯ ПОЛЕЙ ---
      const incomingFieldKeys = fields.map((f: any) => f.key);
      await tx.clinicalField.deleteMany({
        where: { cardId: card.id, key: { notIn: incomingFieldKeys } }
      });

      for (const f of fields) {
        const { id, cardId, ...dataToSave } = f;
        await tx.clinicalField.upsert({
          where: { cardId_key: { cardId: card.id, key: f.key } },
          create: { ...dataToSave, cardId: card.id },
          update: { label: f.label, type: f.type, unit: f.unit, options: f.options, order: f.order }
        });
      }

      // --- СИНХРОНИЗАЦИЯ ПРАВИЛ ---
      await tx.clinicalRule.deleteMany({ where: { cardId: card.id } });
      if (rules && rules.length > 0) {
        await tx.clinicalRule.createMany({
          data: rules.map((r: any) => ({
            cardId: card.id,
            fieldKey: r.fieldKey,
            operator: r.operator,
            value: r.value,
            highlightSectionKey: r.highlightSectionKey,
            addHint: r.addHint,
            priority: r.priority
          }))
        });
      }

      return card;
    });

    return NextResponse.json({ success: true, card: result });
  } catch (error: any) {
    console.error("PUT Error:", error);
    return NextResponse.json({ error: error.message || "Tallennusvirhe" }, { status: 500 });
  }
}

// 3. УДАЛЕНИЕ КАРТОЧКИ (DELETE)
export async function DELETE(req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const slug = params.slug;

    // Удаление ClinicalCard повлечет за собой удаление всех связанных данных 
    // (sections, fields, rules) благодаря onDelete: Cascade в схеме Prisma
    await prisma.clinicalCard.delete({
      where: { slug }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Error:", error);
    return NextResponse.json({ error: "Poisto epäonnistui" }, { status: 500 });
  }
}
