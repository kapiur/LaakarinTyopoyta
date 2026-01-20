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
        OR: [
          // Поиск по торговому названию
          nameQuery ? { name: { contains: nameQuery, mode: 'insensitive' } } : {},
          // Поиск по действующему веществу
          substanceQuery ? { 
            substanceId: { contains: substanceQuery, mode: 'insensitive' } 
          } : {},
        ],
      },
      include: {
        substance: true, // Включаем Wiki-заметки и Lääke75+
        packages: true   // Включаем все упаковки для таблицы
      },
      orderBy: { name: 'asc' },
      take: 50,
    });

    return NextResponse.json(medicines);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
