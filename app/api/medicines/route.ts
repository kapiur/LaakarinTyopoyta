import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nameQuery = searchParams.get('name');
  const substanceQuery = searchParams.get('substance');

  try {
    const medicines = await prisma.medicine.findMany({
      where: {
        AND: [
          // 1. Поиск по коммерческому названию
          nameQuery ? { name: { contains: nameQuery, mode: 'insensitive' } } : {},
          
          // 2. Поиск по действующему веществу (Substance)
          // Упростили синтаксис связи для Prisma
          substanceQuery ? { 
            substanceId: { contains: substanceQuery, mode: 'insensitive' } 
          } : {},
        ],
      },
      include: {
        // Подтягиваем Wiki-заметки, GFR и Lääke75+
        substance: {
          select: {
            id: true,
            communityNotes: true,
            laake75Class: true,
            laake75Comment: true,
            gfrGuidelines: true,
          }
        },
        // Подтягиваем все упаковки для интерактивной таблицы
        packages: {
          orderBy: {
            strength: 'asc', // Группируем внутри карточки по дозировке
          }
        }
      },
      // Сортировка по алфавиту для удобства врача
      orderBy: { name: 'asc' },
      take: 50, // Увеличили лимит, так как данных теперь 29к
    });

    // Добавляем заголовок для предотвращения кэширования при обновлении базы
    return NextResponse.json(medicines, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
