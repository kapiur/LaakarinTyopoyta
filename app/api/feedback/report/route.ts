import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/admin-auth";
import { prisma } from "../../../../lib/prisma";

const ALLOWED_FEEDBACK_TYPES = new Set(["error", "outdated", "unclear", "translation", "other"]);

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function POST(req: Request) {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  const userId = Number((session?.user as any)?.id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const feedbackType = normalizeText(body?.feedbackType, 32);
    const comment = normalizeText(body?.comment, 4000);

    if (!ALLOWED_FEEDBACK_TYPES.has(feedbackType)) {
      return NextResponse.json({ error: "Invalid feedback type" }, { status: 400 });
    }

    if (!comment) {
      return NextResponse.json({ error: "Comment is required" }, { status: 400 });
    }

    await prisma.feedbackReport.create({
      data: {
        userId,
        surface: normalizeText(body?.surface, 64) || "workspace",
        contextType: normalizeText(body?.contextType, 64) || null,
        feedbackType,
        title: normalizeText(body?.title, 255) || null,
        comment,
        pagePath: normalizeText(body?.pagePath, 255) || null,
        sourceLabel: normalizeText(body?.sourceLabel, 255) || null,
        sourceUrl: normalizeText(body?.sourceUrl, 2000) || null,
        clinicalCountry: normalizeText(body?.clinicalCountry, 16) || null,
        uiLanguage: normalizeText(body?.uiLanguage, 16) || null,
        metadata: typeof body?.metadata === "object" && body.metadata ? body.metadata : undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (routeError) {
    console.error("Feedback report save failed:", routeError);
    return NextResponse.json({ error: "Feedback report save failed" }, { status: 500 });
  }
}
