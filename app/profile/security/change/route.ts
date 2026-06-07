import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/admin-auth";

const prisma = new PrismaClient();

function normalizeField(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";
  return value;
}

function redirectWithParams(request: Request, path: string, params: Record<string, string>) {
  const url = new URL(path, request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(req: Request) {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  try {
    const formData = await req.formData();
    const oldValue = normalizeField(formData.get("oldValue"));
    const newValue = normalizeField(formData.get("newValue"));
    const repeatValue = normalizeField(formData.get("repeatValue"));
    const userId = Number((session?.user as any)?.id);

    if (!Number.isInteger(userId)) {
      return redirectWithParams(req, "/profile/security", { error: "Virheellinen käyttäjä" });
    }

    if (!oldValue || !newValue || !repeatValue) {
      return redirectWithParams(req, "/profile/security", { error: "Pakolliset kentät puuttuvat" });
    }

    if (newValue !== repeatValue) {
      return redirectWithParams(req, "/profile/security", { error: "Uusi tunniste ja vahvistus eivät täsmää." });
    }

    if (newValue.length < 8) {
      return redirectWithParams(req, "/profile/security", { error: "Uuden tunnisteen tulee olla vähintään 8 merkkiä" });
    }

    if (oldValue === newValue) {
      return redirectWithParams(req, "/profile/security", { error: "Uuden tunnisteen tulee poiketa nykyisestä" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      return redirectWithParams(req, "/profile/security", { error: "Käyttäjää ei löydy" });
    }

    const isCurrentValid = await bcrypt.compare(oldValue, user.password);
    if (!isCurrentValid) {
      return redirectWithParams(req, "/profile/security", { error: "Nykyinen tunniste on virheellinen" });
    }

    const newHash = await bcrypt.hash(newValue, 12);

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: newHash,
        mustChangePassword: false,
      },
    });

    return redirectWithParams(req, "/login", {
      passwordChanged: "1",
      t: Date.now().toString(),
    });
  } catch (error) {
    return redirectWithParams(req, "/profile/security", { error: "Tunnisteen vaihtaminen epäonnistui" });
  }
}
