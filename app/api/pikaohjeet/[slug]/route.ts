import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth"; // Убедитесь, что путь верный

const prisma = new PrismaClient();

// 1. ПОЛУЧЕНИЕ ПОЛНОЙ КАРТОЧКИ ДЛЯ РЕДАКТОРА
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
        revisions: { orderBy: { createdAt: 'desc' }, take: 5 }
      }
    });

    if (!card) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(card);
  } catch (error) {
    return NextResponse.json({ error: "Latausvirhe" }, { status: 500 });
  }
}

// 2. СИНХРОНИЗАЦИЯ ВСЕЙ СТРУКТУРЫ (PUT)
export async function PUT(req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { sections, fields, rules } = body;
    const slug = params.slug;

    const result = await prisma.$transaction(async (tx) => {
      const card = await tx.clinicalCard.findUnique({ where: { slug } });
      if (!card) throw new Error("Card not found");

      // Обновляем метаданные карточки
      await tx.clinicalCard.update({
        where: { id: card.id },
        data: {
          updatedAt: new Date(),
          updatedByEmail: session.user.email,
          updatedByName: (session.user as any).name || "User",
        }
      });

      // --- СИНХРОНИЗАЦИЯ СЕКЦИЙ ---
      const incomingSectionKeys = sections.map((s: any) => s.key);
      // Удаляем те, что удалили в UI
      await tx.clinicalSection.deleteMany({
        where: { cardId: card.id, key: { notIn: incomingSectionKeys } }
      });
      // Обновляем или создаем
      for (const s of sections) {
        await tx.clinicalSection.upsert({
          where: { cardId_key: { cardId: card.id, key: s.key } },
          create: { ...s, cardId: card.id },
          update: { title: s.title, content: s.content, order: s.order, highlightCallout: s.highlightCallout }
        });
      }

      // --- СИНХРОНИЗАЦИЯ ПОЛЕЙ ---
      const incomingFieldKeys = fields.map((f: any) => f.key);
      await tx.clinicalField.deleteMany({
        where: { cardId: card.id, key: { notIn: incomingFieldKeys } }
      });
      for (const f of fields) {
        await tx.clinicalField.upsert({
          where: { cardId_key: { cardId: card.id, key: f.key } },
          create: { ...f, cardId: card.id },
          update: { label: f.label, type: f.type, unit: f.unit, options: f.options, order: f.order, isUniversal: f.isUniversal }
        });
      }

      // --- СИНХРОНИЗАЦИЯ ПРАВИЛ ---
      // Правила проще пересоздать, так как у них нет стабильных ключей
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

      // Записываем лог ревизии
      await tx.clinicalRevision.create({
        data: {
          cardId: card.id,
          action: "full_sync",
          editorEmail: session.user.email,
          editorName: (session.user as any).name || "User",
          summary: `Muokattu: ${sections.length} osiota, ${fields.length} kenttää, ${rules.length} sääntöä`
        }
      });

      return card;
    });

    return NextResponse.json({ success: true, card: result });
  } catch (error: any) {
    console.error("PUT Error:", error);
    return NextResponse.json({ error: error.message || "Tallennusvirhe" }, { status: 500 });
  }
}
