import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAuthenticatedUser } from "../../../../lib/admin-auth";
import { prisma } from "../../../../lib/prisma";
import { revokeAllManagedUserSessionsForUser } from "../../../../lib/authSession";

export async function POST(req: Request) {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  try {
    const body = await req.json();
    const oldValue = body.oldValue;
    const newValue = body.newValue;
    const userId = Number((session?.user as any)?.id);

    if (!Number.isInteger(userId)) {
      return NextResponse.json({ error: "Virheellinen käyttäjä" }, { status: 400 });
    }

    if (typeof oldValue !== "string" || typeof newValue !== "string") {
      return NextResponse.json({ error: "Pakolliset kentät puuttuvat" }, { status: 400 });
    }

    if (newValue.length < 8) {
      return NextResponse.json({ error: "Uuden tunnisteen tulee olla vähintään 8 merkkiä" }, { status: 400 });
    }

    if (oldValue === newValue) {
      return NextResponse.json({ error: "Uuden tunnisteen tulee poiketa nykyisestä" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Käyttäjää ei löydy" }, { status: 404 });
    }

    const isCurrentValid = await bcrypt.compare(oldValue, user.password);
    if (!isCurrentValid) {
      return NextResponse.json({ error: "Nykyinen tunniste on virheellinen" }, { status: 400 });
    }

    const newHash = await bcrypt.hash(newValue, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: newHash,
        mustChangePassword: false
      }
    });

    await revokeAllManagedUserSessionsForUser(userId, "password_changed");

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Tunnisteen vaihtaminen epäonnistui" }, { status: 500 });
  }
}
