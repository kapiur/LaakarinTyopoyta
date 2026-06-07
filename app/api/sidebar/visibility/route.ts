import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { getSidebarItemDefinition, getSortedSidebarItemDefinitions, isSidebarItemKey, type SidebarItemKey } from "../../../../lib/navigation/sidebarRegistry";
import { prisma } from "../../../../lib/prisma";

type SidebarVisibilityRow = {
  itemKey: string;
  isVisible: boolean;
  customOrder: number | null;
};

function getUserId(session: unknown) {
  const userId = Number((session as any)?.user?.id);
  return Number.isFinite(userId) ? userId : null;
}

async function getVisibilityRows(userId: number) {
  try {
    return await prisma.$queryRaw<SidebarVisibilityRow[]>`
      SELECT "itemKey", "isVisible", "customOrder"
      FROM "SidebarMenuPreference"
      WHERE "userId" = ${userId}
    `;
  } catch (error) {
    console.error("Sidebar visibility loading failed:", error);
    return [];
  }
}

function buildSidebarPayload(visibilityRows: SidebarVisibilityRow[]) {
  const visibilityMap = new Map(visibilityRows.map((row) => [row.itemKey, row]));

  return getSortedSidebarItemDefinitions()
    .map((item) => {
      const preference = visibilityMap.get(item.key);
      return {
        ...item,
        customOrder: preference?.customOrder ?? null,
        effectiveOrder: preference?.customOrder ?? item.sortOrder,
        isVisible: preference?.isVisible ?? item.defaultEnabled,
      };
    })
    .sort((a, b) => a.effectiveOrder - b.effectiveOrder || a.sortOrder - b.sortOrder || a.href.localeCompare(b.href, "fi"))
    .map(({ effectiveOrder, ...item }) => item);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const visibilityRows = await getVisibilityRows(userId);
    const items = buildSidebarPayload(visibilityRows);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Sidebar visibility API error:", error);
    return NextResponse.json({ error: "Sidebar visibility loading failed" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const itemKey = body?.itemKey;
    const isVisible = body?.isVisible;

    if (!isSidebarItemKey(itemKey)) {
      return NextResponse.json({ error: "Invalid sidebar item key" }, { status: 400 });
    }

    if (typeof isVisible !== "boolean") {
      return NextResponse.json({ error: "isVisible must be boolean" }, { status: 400 });
    }

    const itemDefinition = getSidebarItemDefinition(itemKey);

    if (!itemDefinition) {
      return NextResponse.json({ error: "Unknown sidebar item" }, { status: 400 });
    }

    const id = randomUUID();

    await prisma.$executeRaw`
      INSERT INTO "SidebarMenuPreference" (
        "id", "userId", "itemKey", "isVisible", "customOrder", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${userId}, ${itemKey}, ${isVisible}, ${itemDefinition.sortOrder}, NOW(), NOW()
      )
      ON CONFLICT ("userId", "itemKey")
      DO UPDATE SET
        "isVisible" = EXCLUDED."isVisible",
        "updatedAt" = NOW()
    `;

    return NextResponse.json({ itemKey, isVisible });
  } catch (error) {
    console.error("Sidebar visibility update failed:", error);
    return NextResponse.json({ error: "Sidebar visibility update failed" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const orderedKeys = body?.orderedKeys;

    if (!Array.isArray(orderedKeys) || orderedKeys.length === 0) {
      return NextResponse.json({ error: "orderedKeys must be a non-empty array" }, { status: 400 });
    }

    if (!orderedKeys.every(isSidebarItemKey)) {
      return NextResponse.json({ error: "orderedKeys contains invalid sidebar item keys" }, { status: 400 });
    }

    const normalizedOrderedKeys = orderedKeys as SidebarItemKey[];

    if (new Set(normalizedOrderedKeys).size !== normalizedOrderedKeys.length) {
      return NextResponse.json({ error: "orderedKeys must not contain duplicates" }, { status: 400 });
    }

    const defaultKeys = getSortedSidebarItemDefinitions().map((item) => item.key) as SidebarItemKey[];

    if (normalizedOrderedKeys.length !== defaultKeys.length || defaultKeys.some((key) => !normalizedOrderedKeys.includes(key))) {
      return NextResponse.json({ error: "orderedKeys must include every sidebar item exactly once" }, { status: 400 });
    }

    await prisma.$transaction(
      normalizedOrderedKeys.map((itemKey, index) =>
        prisma.sidebarMenuPreference.upsert({
          where: {
            userId_itemKey: { userId, itemKey },
          },
          update: {
            customOrder: index + 1,
          },
          create: {
            userId,
            itemKey,
            isVisible: getSidebarItemDefinition(itemKey)?.defaultEnabled ?? true,
            customOrder: index + 1,
          },
        })
      )
    );

    const visibilityRows = await getVisibilityRows(userId);
    const items = buildSidebarPayload(visibilityRows);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Sidebar order update failed:", error);
    return NextResponse.json({ error: "Sidebar order update failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.$executeRaw`
      DELETE FROM "SidebarMenuPreference"
      WHERE "userId" = ${userId}
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Sidebar visibility reset failed:", error);
    return NextResponse.json({ error: "Sidebar visibility reset failed" }, { status: 500 });
  }
}
