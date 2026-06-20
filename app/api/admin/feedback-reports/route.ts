import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { prisma } from "../../../../lib/prisma";

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    const reports = await prisma.feedbackReport.findMany({
      where: status && status !== "all" ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      reports: reports.map((report) => ({
        id: report.id,
        surface: report.surface,
        contextType: report.contextType,
        feedbackType: report.feedbackType,
        title: report.title,
        comment: report.comment,
        pagePath: report.pagePath,
        sourceLabel: report.sourceLabel,
        sourceUrl: report.sourceUrl,
        clinicalCountry: report.clinicalCountry,
        uiLanguage: report.uiLanguage,
        metadata: report.metadata,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
        user: report.user,
      })),
    });
  } catch (routeError) {
    console.error("Admin feedback reports loading failed:", routeError);
    return NextResponse.json({ error: "Admin feedback reports loading failed" }, { status: 500 });
  }
}
