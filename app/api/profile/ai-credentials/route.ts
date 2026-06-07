import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/admin-auth";
import { prisma } from "../../../../lib/prisma";
import { AI_MODEL_REGISTRY } from "../../../../lib/ai/modelRegistry";
import { getUserAiAccessPolicy, normalizeProvider } from "../../../../lib/ai/userAiSettings";
import { encryptSecret, getSecretPreview } from "../../../../lib/security/secretCrypto";

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  const userId = Number((session?.user as any)?.id);

  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const policy = await getUserAiAccessPolicy(userId);
    const credentials = await prisma.userAiCredential.findMany({
      where: { userId },
      orderBy: { provider: "asc" },
      select: {
        provider: true,
        keyPreview: true,
        baseUrl: true,
        defaultModel: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      credentials,
      policy,
      registry: AI_MODEL_REGISTRY,
    });
  } catch (err) {
    console.error("User AI credentials loading failed:", err);
    return NextResponse.json({ error: "AI-avainten lataus epäonnistui" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  const userId = Number((session?.user as any)?.id);

  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const policy = await getUserAiAccessPolicy(userId);

    if (!policy.allowUserCredentials) {
      return NextResponse.json({ error: "Omat AI-avaimet eivät ole käytössä tälle käyttäjälle" }, { status: 403 });
    }

    const provider = normalizeProvider(body?.provider);
    const secret = normalizeOptionalString(body?.secret);
    const baseUrl = normalizeOptionalString(body?.baseUrl);
    const defaultModel = normalizeOptionalString(body?.defaultModel);

    if (!provider) {
      return NextResponse.json({ error: "Tuntematon AI-palvelu" }, { status: 400 });
    }

    if (!secret) {
      return NextResponse.json({ error: "API-avain puuttuu" }, { status: 400 });
    }

    if (policy.allowedProviders.length > 0 && !policy.allowedProviders.includes(provider)) {
      return NextResponse.json({ error: "Tämä AI-palvelu ei ole sallittu käyttäjälle" }, { status: 403 });
    }

    const encryptedSecret = encryptSecret(secret);
    const keyPreview = getSecretPreview(secret);

    await prisma.userAiCredential.upsert({
      where: {
        userId_provider: {
          userId,
          provider,
        },
      },
      update: {
        encryptedSecret,
        keyPreview,
        baseUrl,
        defaultModel,
      },
      create: {
        userId,
        provider,
        encryptedSecret,
        keyPreview,
        baseUrl,
        defaultModel,
      },
    });

    return NextResponse.json({
      ok: true,
      credential: {
        provider,
        keyPreview,
        baseUrl,
        defaultModel,
      },
    });
  } catch (err) {
    console.error("User AI credential save failed:", err);
    return NextResponse.json({ error: "AI-avaimen tallennus epäonnistui" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  const userId = Number((session?.user as any)?.id);

  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const provider = normalizeProvider(searchParams.get("provider"));

    if (!provider) {
      return NextResponse.json({ error: "Tuntematon AI-palvelu" }, { status: 400 });
    }

    await prisma.userAiCredential.deleteMany({
      where: {
        userId,
        provider,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("User AI credential delete failed:", err);
    return NextResponse.json({ error: "AI-avaimen poisto epäonnistui" }, { status: 500 });
  }
}
