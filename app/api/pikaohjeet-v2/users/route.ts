import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const currentEmail = String(session.user.email || "").toLowerCase();
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        email: { not: currentEmail },
      },
      select: {
        email: true,
        name: true,
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    });

    return NextResponse.json(users.map((user) => ({
      email: user.email,
      name: user.name || user.email,
    })));
  } catch (error) {
    console.error("GET pikaohjeet-v2 users error:", error);
    return NextResponse.json({ error: "Käyttäjien lataus epäonnistui" }, { status: 500 });
  }
}
