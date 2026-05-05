import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

function splitSystemTags(tags: string[] = []) {
  const favTags = tags.filter((tag) => tag.startsWith("_fav:"));
  const nonFavTags = tags.filter((tag) => !tag.startsWith("_fav:"));
  return { favTags, nonFavTags };
}

function canReadCard(card: any, userId: string, userEmail: string) {
  if (!card || !card.isPublished) return false;
  if (card.environment !== "personal") return true;
  const sharedWith = (card.tags || [])
    .filter((tag: string) => tag.startsWith("_share:"))
    .map((tag: string) => normalizeEmail(tag.replace("_share:", "")));
  return card.updatedByUserId === userId || sharedWith.includes(userEmail);
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = String((session.user as any).id || "");
    const userEmail = normalizeEmail(session.user.email || "");
    if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const nextFavorite = Boolean(body?.isFavorite);

    const card = await prisma.clinicalCard.findUnique({
      where: { slug: params.slug },
      select: { id: true, slug: true, tags: true, environment: true, updatedByUserId: true, isPublished: true },
    });

    if (!canReadCard(card, userId, userEmail)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const favTag = `_fav:${userEmail}`;
    const { nonFavTags, favTags } = splitSystemTags(card!.tags || []);
    const nextFavTags = nextFavorite
      ? Array.from(new Set([...favTags, favTag]))
      : favTags.filter((tag) => tag !== favTag);

    await prisma.clinicalCard.update({
      where: { id: card!.id },
      data: { tags: [...nonFavTags, ...nextFavTags] },
    });

    return NextResponse.json({ slug: params.slug, isFavorite: nextFavorite });
  } catch (error: any) {
    console.error("POST pikaohjeet favorite error:", error);
    return NextResponse.json({ error: error?.message || "Suosikin tallennus epäonnistui" }, { status: 500 });
  }
}
