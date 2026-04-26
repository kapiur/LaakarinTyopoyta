import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

const prisma = new PrismaClient();

function getUserId(session: any) {
  const userId = parseInt((session?.user as any)?.id);
  return Number.isFinite(userId) ? userId : null;
}

function normalizeName(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function parsePositiveStrength(value: unknown) {
  const strength = parseFloat(String(value));
  return Number.isFinite(strength) && strength > 0 ? strength : null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const drugs = await prisma.pcaDrug.findMany({
    where: { userId },
    orderBy: { name: 'asc' }
  });
  return NextResponse.json(drugs);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, strength } = await req.json();
  const normalizedName = normalizeName(name);
  const parsedStrength = parsePositiveStrength(strength);

  if (!normalizedName) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!parsedStrength) return NextResponse.json({ error: "strength must be a positive number" }, { status: 400 });

  const drug = await prisma.pcaDrug.create({
    data: { name: normalizedName, strength: parsedStrength, userId }
  });
  return NextResponse.json(drug);
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('id'));

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "valid id is required" }, { status: 400 });
  }

  const { name, strength } = await req.json();
  const normalizedName = normalizeName(name);
  const parsedStrength = parsePositiveStrength(strength);

  if (!normalizedName) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!parsedStrength) return NextResponse.json({ error: "strength must be a positive number" }, { status: 400 });

  const existing = await prisma.pcaDrug.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "drug not found" }, { status: 404 });

  const drug = await prisma.pcaDrug.update({
    where: { id },
    data: { name: normalizedName, strength: parsedStrength }
  });

  return NextResponse.json(drug);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('id'));

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "valid id is required" }, { status: 400 });
  }

  await prisma.pcaDrug.deleteMany({
    where: { id, userId }
  });
  return NextResponse.json({ success: true });
}
