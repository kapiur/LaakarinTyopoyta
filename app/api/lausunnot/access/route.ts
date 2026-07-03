import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "../../../../lib/admin-auth";
import { getLausuntoWorkspaceAccess } from "../../../../lib/lausunto/access";

export async function GET() {
  const { session, error } = await requireAuthenticatedUser();
  if (error || !session) return error;

  const userId = Number((session.user as any)?.id);
  const access = await getLausuntoWorkspaceAccess(userId);

  return NextResponse.json(access);
}
