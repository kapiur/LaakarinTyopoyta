import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt((session.user as any).id);
    const drugs = await prisma.pcaDrug.findMany({
      where: { userId: userId },
      orderBy: { name: 'asc' }
    });
    
    return NextResponse.json(drugs);
  } catch (error) {
    console.error("GET PCA Library Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const userId = parseInt((session.user as any).id);

    const drug = await prisma.pcaDrug.create({
      data: {
        name: body.name,
        strength: parseFloat(body.strength),
        userId: userId
      }
    });

    return NextResponse.json(drug);
  } catch (error) {
    console.error("POST PCA Library Error:", error);
    return NextResponse.json({ error: "Failed to create drug" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = parseInt((session.user as any).id);

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await prisma.pcaDrug.deleteMany({
      where: {
        id: parseInt(id),
        userId: userId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE PCA Library Error:", error);
    return NextResponse.json({ error: "Failed to delete drug" }, { status: 500 });
  }
}
