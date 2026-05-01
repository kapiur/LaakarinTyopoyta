import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { normalizeUiLanguage, isSupportedUiLanguage } from "../../../../lib/i18n/config";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);

  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { uiLanguage: true },
  });

  return NextResponse.json({ uiLanguage: normalizeUiLanguage(user?.uiLanguage) });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);

  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const uiLanguage = body?.uiLanguage;

  if (!isSupportedUiLanguage(uiLanguage)) {
    return NextResponse.json({ error: "Invalid interface language" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { uiLanguage },
    select: { uiLanguage: true },
  });

  return NextResponse.json({ uiLanguage: normalizeUiLanguage(user.uiLanguage) });
}
