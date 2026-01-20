import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.toLowerCase() || '';

  try {
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

    // Группировка с сохранением Vahvuus (дозировки)
    const grouped = medicines.reduce((acc: any[], current) => {
      const existing = acc.find(item => item.name.toLowerCase() === current.name.toLowerCase());
      if (existing) {
        // Если у нас уже есть этот бренд, просто добавляем новые упаковки
        existing.packages = [...existing.packages, ...current.packages];
        return acc;
      }
      // Если бренда нет, берем дозировку из первой попавшейся записи (она обычно общая для группы)
      return [...acc, { ...current, strength: current.strength || "" }];
    }, []);

    return NextResponse.json(grouped);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
