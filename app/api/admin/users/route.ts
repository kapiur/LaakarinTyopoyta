import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/admin-auth";

const prisma = new PrismaClient();

function normalizeEmail(email: string) {
  return email.toLowerCase().trim();
}

function validateInitialCredential(value: string) {
  return typeof value === "string" && value.length >= 8;
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const users = await prisma.user.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
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

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Käyttäjien haku epäonnistui" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { email, name, initialCredential, mustChangePassword } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Sähköposti puuttuu" }, { status: 400 });
    }

    if (!validateInitialCredential(initialCredential)) {
      return NextResponse.json({ error: "Väliaikaisen salasanan tulee olla vähintään 8 merkkiä" }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existingUser) {
      return NextResponse.json({ error: "Käyttäjä tällä sähköpostilla on jo olemassa" }, { status: 409 });
    }

    const credentialHash = await bcrypt.hash(initialCredential, 12);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: typeof name === "string" && name.trim() ? name.trim() : null,
        password: credentialHash,
        role: "USER",
        isActive: true,
        mustChangePassword: mustChangePassword !== false
      },
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

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Käyttäjän luominen epäonnistui" }, { status: 500 });
  }
}
