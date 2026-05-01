import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

const prisma = new PrismaClient();

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const userId = Number(params.id);
  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Virheellinen käyttäjä-ID" }, { status: 400 });
  }

  try {
    const { email, name, isActive, mustChangePassword } = await req.json();

    const currentUserId = Number((session?.user as any)?.id);
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!targetUser) {
      return NextResponse.json({ error: "Käyttäjää ei löydy" }, { status: 404 });
    }

    if (targetUser.role === "ADMIN" && currentUserId === targetUser.id && isActive === false) {
      return NextResponse.json({ error: "Et voi poistaa omaa admin-käyttäjää käytöstä" }, { status: 400 });
    }

    const data: any = {};

    if (typeof email === "string" && email.trim()) {
      const normalizedEmail = normalizeEmail(email);
      const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json({ error: "Sähköposti on jo käytössä" }, { status: 409 });
      }
      data.email = normalizedEmail;
    }

    if (typeof name === "string") {
      data.name = name.trim() || null;
    }

    if (typeof isActive === "boolean") {
      data.isActive = isActive;
    }

    if (typeof mustChangePassword === "boolean") {
      data.mustChangePassword = mustChangePassword;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: "Käyttäjän päivitys epäonnistui" }, { status: 500 });
  }
}
