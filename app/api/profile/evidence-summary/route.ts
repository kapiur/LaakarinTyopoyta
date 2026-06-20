import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/admin-auth";
import { prisma } from "../../../../lib/prisma";
import { getUserEvidenceSummary } from "../../../../lib/clinical/evidence/evidenceSummary";

export async function GET() {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  const userId = Number((session?.user as any)?.id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await getUserEvidenceSummary(userId);
    return NextResponse.json(summary);
  } catch (routeError) {
    console.error("Evidence summary loading failed:", routeError);
    return NextResponse.json({ error: "Evidence summary loading failed" }, { status: 500 });
  }
}

export async function POST() {
  const { session, error } = await requireAuthenticatedUser();
  if (error) return error;

  const userId = Number((session?.user as any)?.id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.userClinicalSettings.upsert({
      where: { userId },
      update: { guidelineUpdatesSeenAt: new Date() },
      create: {
        userId,
        practiceCountry: "FI",
        usePracticeCountryDefaults: true,
        clinicalCountry: "FI",
        clinicalOutputLanguage: "fi",
        evidenceStrictness: "strict",
        allowLocalSources: true,
        allowSupplementarySources: false,
        guidelineUpdatesSeenAt: new Date(),
      },
    });

    const summary = await getUserEvidenceSummary(userId);
    return NextResponse.json({ ok: true, summary });
  } catch (routeError) {
    console.error("Evidence summary update failed:", routeError);
    return NextResponse.json({ error: "Evidence summary update failed" }, { status: 500 });
  }
}
