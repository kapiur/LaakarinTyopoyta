import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { prisma } from "../../../../../lib/prisma";
import { revokeAllManagedUserSessionsForUser } from "../../../../../lib/authSession";

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function parseUserId(value: string) {
  const userId = Number(value);
  return Number.isInteger(userId) ? userId : null;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const userId = parseUserId(params.id);
  if (!userId) {
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

    if (typeof isActive === "boolean" && isActive === false) {
      await revokeAllManagedUserSessionsForUser(userId, "account_deactivated");
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: "Käyttäjän päivitys epäonnistui" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const userId = parseUserId(params.id);
  if (!userId) {
    return NextResponse.json({ error: "Virheellinen käyttäjä-ID" }, { status: 400 });
  }

  try {
    const currentUserId = Number((session?.user as any)?.id);
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!targetUser) {
      return NextResponse.json({ error: "Käyttäjää ei löydy" }, { status: 404 });
    }

    if (targetUser.role === "ADMIN") {
      return NextResponse.json({ error: "Admin-käyttäjää ei voi poistaa käyttöliittymästä" }, { status: 400 });
    }

    if (currentUserId === targetUser.id) {
      return NextResponse.json({ error: "Et voi poistaa omaa käyttäjääsi" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.substance.updateMany({
        where: { lastUpdatedById: userId },
        data: { lastUpdatedById: null }
      });

      await tx.aIHistory.deleteMany({ where: { userId } });
      await tx.aiTool.deleteMany({ where: { userId } });
      await tx.pcaDrug.deleteMany({ where: { userId } });
      await tx.pedsDrug.deleteMany({ where: { userId } });
      await tx.pedsIndication.deleteMany({ where: { userId } });
      await tx.template.deleteMany({ where: { userId } });
      await tx.category.deleteMany({ where: { userId } });
      await tx.quickLink.deleteMany({ where: { userId } });
      await tx.linkCategory.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Käyttäjän poistaminen epäonnistui" }, { status: 500 });
  }
}
