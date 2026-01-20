import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.toLowerCase() || '';

  try {
    // Получаем препараты, подходящие под поиск по имени ИЛИ веществу
    const medicines = await prisma.medicine.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { substanceId: { contains: q, mode: 'insensitive' } }
        ]
      },
      include: {
        substance: true,
        packages: true
      },
      orderBy: { name: 'asc' }
    });

    // Группируем по имени, чтобы убрать дубликаты из списка поиска
    const uniqueMedicines = medicines.reduce((acc: any[], current) => {
      const exists = acc.find(m => m.name.toLowerCase() === current.name.toLowerCase());
      if (exists) {
        // Объединяем упаковки для таблицы в карточке
        exists.packages = [...exists.packages, ...current.packages];
        return acc;
      }
      return [...acc, current];
    }, []);

    return NextResponse.json(uniqueMedicines.slice(0, 50));
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
