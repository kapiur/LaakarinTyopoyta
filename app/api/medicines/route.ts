import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const searchTerm = searchParams.get('q')?.toLowerCase() || '';

  try {
    const medicines = await prisma.medicine.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { substanceId: { contains: searchTerm, mode: 'insensitive' } }
        ]
      },
      include: {
        substance: true,
        packages: true
      },
      orderBy: { name: 'asc' },
      // Берем побольше, так как будем группировать на фронтенде или через Distinct
      take: 100, 
    });

    // Группируем препараты по имени, чтобы не было "лестницы" из одинаковых Panadol
    const grouped = medicines.reduce((acc: any[], current) => {
      const existing = acc.find(item => item.name.toLowerCase() === current.name.toLowerCase());
      if (existing) {
        // Добавляем упаковки к уже найденному бренду
        existing.packages = [...existing.packages, ...current.packages];
        return acc;
      }
      return [...acc, current];
    }, []);

    return NextResponse.json(grouped);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
