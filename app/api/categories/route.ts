import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const cats = await prisma.category.findMany({ include: { _count: { select: { templates: true } } } });
  return NextResponse.json(cats);
}

export async function POST(req: Request) {
  const { name } = await req.json();
  const cat = await prisma.category.create({ data: { name } });
  return NextResponse.json(cat);
}

export async function PUT(req: Request) {
  const { id, name } = await req.json();
  const updated = await prisma.category.update({ where: { id }, data: { name } });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
