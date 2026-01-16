import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = parseInt((session.user as any).id);
  const drugs = await prisma.pcaDrug.findMany({
    where: { userId },
    orderBy: { name: 'asc' }
  });
  return NextResponse.json(drugs);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, strength } = await req.json();
  const userId = parseInt((session.user as any).id);

  const drug = await prisma.pcaDrug.create({
    data: { name, strength: parseFloat(strength), userId }
  });
  return NextResponse.json(drug);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const userId = parseInt((session.user as any).id);

  await prisma.pcaDrug.deleteMany({
    where: { id: parseInt(id!), userId }
  });
  return NextResponse.json({ success: true });
}
