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

function clearAuthCookies(response: NextResponse) {
  const expiredAt = new Date(0);
  const cookieNames = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
  ];

  for (const name of cookieNames) {
    response.cookies.set({
      name,
      value: "",
      expires: expiredAt,
      path: "/",
      httpOnly: name.includes("session-token") || name.includes("csrf-token"),
      sameSite: "lax",
      secure: name.startsWith("__Secure-") || name.startsWith("__Host-"),
    });
  }
}

export async function POST(req: Request) {
  console.log("[password-change] start");
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  try {
    console.log("[password-change] authenticated");
    const formData = await req.formData();
    console.log("[password-change] form-data-read");
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
    console.log("[password-change] user-loaded", { userId, found: Boolean(user), isActive: user?.isActive ?? null });
    if (!user || !user.isActive) {
      return redirectWithParams(req, "/profile/security", { error: "Käyttäjää ei löydy" });
    }

    const isCurrentValid = await bcrypt.compare(oldValue, user.password);
    console.log("[password-change] old-password-compared", { userId, isCurrentValid });
    if (!isCurrentValid) {
      return redirectWithParams(req, "/profile/security", { error: "Nykyinen tunniste on virheellinen" });
    }

    const newHash = await bcrypt.hash(newValue, 12);
    console.log("[password-change] new-password-hashed", { userId });

    await prisma.user.update({
      where: { id: userId },
      data: {
        password: newHash,
        mustChangePassword: false,
      },
    });
    console.log("[password-change] user-updated", { userId });

    const response = redirectWithParams(req, "/login", {
      passwordChanged: "1",
      t: Date.now().toString(),
    });
    clearAuthCookies(response);
    console.log("[password-change] auth-cookies-cleared", { userId });
    return response;
  } catch (error) {
    console.error("[password-change] failed", error);
    return redirectWithParams(req, "/profile/security", { error: "Tunnisteen vaihtaminen epäonnistui" });
  }
}
