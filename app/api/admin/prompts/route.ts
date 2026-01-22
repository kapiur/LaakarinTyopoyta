import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
  const prompts = await prisma.adminPrompt.findMany({
    orderBy: { createdAt: 'asc' }
  });
  return NextResponse.json(prompts);
}

export async function POST(req: Request) {
  const { label, content } = await req.json();
  const newPrompt = await prisma.adminPrompt.create({
    data: { label, content }
  });
  return NextResponse.json(newPrompt);
}

// Добавьте этот метод, если захотите удалять кнопки
export async function DELETE(req: Request) {
  const { id } = await req.json();
  await prisma.adminPrompt.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
