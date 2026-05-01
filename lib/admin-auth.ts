import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function requireAuthenticatedUser() {
  const session = await getCurrentSession();

  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  return { session, error: null };
}

export async function requireAdmin() {
  const session = await getCurrentSession();

  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  if ((session.user as any).role !== "ADMIN") {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 })
    };
  }

  return { session, error: null };
}
