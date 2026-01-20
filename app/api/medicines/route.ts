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
      take: 100, 
    });

    const grouped = medicines.reduce((acc: any[], current) => {
      const existing = acc.find(item => item.name.toLowerCase() === current.name.toLowerCase());
      
      // Извлекаем дозировку из первой упаковки, если она есть
      const currentStrength = current.packages?.[0]?.strength || "";

      if (existing) {
        existing.packages = [...existing.packages, ...current.packages];
        return acc;
      }
      
      // Добавляем поле strength в объект, который отправляем на фронтенд
      return [...acc, { ...current, strength: currentStrength }];
    }, []);

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
