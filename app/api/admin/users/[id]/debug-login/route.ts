import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "../../../../../../lib/admin-auth";

const prisma = new PrismaClient();

function parseUserId(value: string) {
  const userId = Number(value);
  return Number.isInteger(userId) ? userId : null;
}

function normalizeCandidate(value: unknown) {
  if (typeof value !== "string") return null;
  return value;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const userId = parseUserId(params.id);
  if (!userId) {
    return NextResponse.json({ error: "Virheellinen käyttäjä-ID" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const candidatePassword = normalizeCandidate(body?.candidatePassword);

    if (!candidatePassword || candidatePassword.length === 0) {
      return NextResponse.json({ error: "Testattava salasana puuttuu" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isActive: true,
        mustChangePassword: true,
        updatedAt: true,
        password: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Käyttäjää ei löydy" }, { status: 404 });
    }

    const passwordMatches = user.isActive ? await bcrypt.compare(candidatePassword, user.password) : false;
    const trimmedCandidate = candidatePassword.trim();
    const trimmedPasswordMatches =
      user.isActive && trimmedCandidate.length > 0 && trimmedCandidate !== candidatePassword
        ? await bcrypt.compare(trimmedCandidate, user.password)
        : passwordMatches;

    return NextResponse.json({
      ok: true,
      passwordMatches,
      trimmedPasswordMatches,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    return NextResponse.json({ error: "Kirjautumistestin suoritus epäonnistui" }, { status: 500 });
  }
}
