import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { substanceId, notes } = await req.json();
    
    const updated = await prisma.substance.update({
      where: { id: substanceId },
      data: { communityNotes: notes },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save notes' }, { status: 500 });
  }
}
