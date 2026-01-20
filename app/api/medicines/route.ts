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
          // Фильтр по коммерческому названию (если введено)
          nameQuery ? { name: { contains: nameQuery, mode: 'insensitive' } } : {},
          // Фильтр по действующему веществу через связь (если введено)
          substanceQuery ? { 
            substance: { 
              is: { id: { contains: substanceQuery, mode: 'insensitive' } } 
            } 
          } : {},
        ],
      },
      include: {
        substance: true,
        packages: { where: { isAvailable: true } }
      },
      take: 20,
    });

    return NextResponse.json(medicines);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
