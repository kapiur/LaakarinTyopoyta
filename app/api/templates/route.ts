import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

const prisma = new PrismaClient();

async function getAuthSession() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return null;
  return session;
}

export async function GET() {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const currentUserId = parseInt((session.user as any).id);
    const categories = await prisma.category.findMany({
      where: { userId: currentUserId },
      include: { templates: true },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { title, content, categoryName, author } = body;
    const currentUserId = parseInt((session.user as any).id);
    let category = await prisma.category.findFirst({
      where: { name: categoryName, userId: currentUserId }
    });
    if (!category) {
      category = await prisma.category.create({
        data: { name: categoryName, userId: currentUserId }
      });
    }
    const template = await prisma.template.create({
      data: { title, content, author: author || "", categoryId: category.id, userId: currentUserId },
    });
    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { id, title, content, categoryName } = body;
    const currentUserId = parseInt((session.user as any).id);
    let category = await prisma.category.findFirst({
      where: { name: categoryName, userId: currentUserId }
    });
    if (!category) {
      category = await prisma.category.create({
        data: { name: categoryName, userId: currentUserId }
      });
    }
    await prisma.template.update({
      where: { id: parseInt(id), userId: currentUserId },
      data: { title, content, categoryId: category.id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getAuthSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const currentUserId = parseInt((session.user as any).id);
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    await prisma.template.delete({
      where: { id: parseInt(id), userId: currentUserId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
