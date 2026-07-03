import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-auth";
import { prisma } from "../../../../lib/prisma";

type UserRow = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  isActive: boolean;
  practiceCountry: string | null;
  lausuntoToolEnabled: boolean | null;
};

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const rows = await prisma.$queryRaw<UserRow[]>`
      SELECT
        u."id",
        u."email",
        u."name",
        u."role"::text AS "role",
        u."isActive",
        cs."practiceCountry" AS "practiceCountry",
        lap."lausuntoToolEnabled" AS "lausuntoToolEnabled"
      FROM "User" u
      LEFT JOIN "UserClinicalSettings" cs ON cs."userId" = u."id"
      LEFT JOIN "UserLausuntoAccessPolicy" lap ON lap."userId" = u."id"
      ORDER BY u."role" ASC, u."createdAt" ASC
    `;

    return NextResponse.json({
      users: rows.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        isActive: row.isActive,
        practiceCountry: row.practiceCountry ?? "FI",
        lausuntoToolEnabled: row.lausuntoToolEnabled === true,
      })),
    });
  } catch (routeError) {
    console.error("Lausunto access loading failed:", routeError);
    return NextResponse.json({ error: "Lausunto access loading failed" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await req.json();
    const userId = Number(body?.userId);
    const lausuntoToolEnabled = body?.lausuntoToolEnabled === true;

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "User is required" }, { status: 400 });
    }

    const policyId = randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "UserLausuntoAccessPolicy" (
        "id", "userId", "lausuntoToolEnabled", "createdAt", "updatedAt"
      ) VALUES (
        ${policyId}, ${userId}, ${lausuntoToolEnabled}, NOW(), NOW()
      )
      ON CONFLICT ("userId")
      DO UPDATE SET
        "lausuntoToolEnabled" = EXCLUDED."lausuntoToolEnabled",
        "updatedAt" = NOW()
    `;

    return NextResponse.json({ ok: true });
  } catch (routeError) {
    console.error("Lausunto access save failed:", routeError);
    return NextResponse.json({ error: "Lausunto access save failed" }, { status: 500 });
  }
}
