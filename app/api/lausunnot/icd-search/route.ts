import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/admin-auth";
import { getLausuntoWorkspaceAccess } from "../../../../lib/lausunto/access";
import { searchIcd10Catalog } from "../../../../lib/lausunto/icd10Catalog";

export async function GET(req: Request) {
  const { session, error } = await requireAuthenticatedUser();
  if (error || !session) return error;

  const userId = Number((session.user as any)?.id);
  const access = await getLausuntoWorkspaceAccess(userId);
  if (!access.enabled) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") ?? "";

  return NextResponse.json({
    items: searchIcd10Catalog(query),
  });
}
