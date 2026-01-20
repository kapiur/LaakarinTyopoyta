import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next"; // Если используете сессии

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { substanceId, notes, userId } = await req.json();

    const updated = await prisma.substance.update({
      where: { id: substanceId },
      data: {
        communityNotes: notes,
        lastUpdatedById: userId, // Привязываем к врачу, который внес правку
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Virhe tallennuksessa" }, { status: 500 });
  }
}
