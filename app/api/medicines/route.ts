import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Это предотвращает создание множества подключений к БД при каждом запросе
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) return NextResponse.json([]);

  try {
    const medicines = await prisma.medicine.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { substance: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 15,
    });
    return NextResponse.json(medicines);
  } catch (error) {
    return NextResponse.json({ error: 'Haku epäonnistui' }, { status: 500 });
  }
}
