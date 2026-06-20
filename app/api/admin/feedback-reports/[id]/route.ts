import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../../lib/admin-auth";
import { prisma } from "../../../../../lib/prisma";

const ALLOWED_STATUS = new Set(["new", "reviewing", "resolved", "dismissed"]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const status = typeof body?.status === "string" ? body.status : "";
    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const report = await prisma.feedbackReport.update({
      where: { id: params.id },
      data: { status },
    });

    return NextResponse.json({ ok: true, report });
  } catch (routeError) {
    console.error("Admin feedback report update failed:", routeError);
    return NextResponse.json({ error: "Admin feedback report update failed" }, { status: 500 });
  }
}
