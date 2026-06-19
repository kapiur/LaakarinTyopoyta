import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import {
  buildHomeActionCatalog,
  DEFAULT_HOME_ACTION_IDS,
  parseHomeActionId,
} from "../../../../lib/dashboard/homeActionCatalog";
import { prisma } from "../../../../lib/prisma";

const MAX_QUICK_ACTIONS = 10;

function getUserId(session: unknown) {
  const userId = Number((session as any)?.user?.id);
  return Number.isFinite(userId) ? userId : null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [catalog, preferences] = await Promise.all([
      buildHomeActionCatalog(userId),
      prisma.userHomeQuickAction.findMany({
        where: { userId },
        orderBy: [{ customOrder: "asc" }, { createdAt: "asc" }],
      }),
    ]);
    const catalogMap = new Map(catalog.map((item) => [item.id, item]));
    const configuredIds = preferences.map((preference) => `${preference.actionType}:${preference.actionKey}`);
    const selectedIds = (configuredIds.length > 0 ? configuredIds : DEFAULT_HOME_ACTION_IDS).filter((id) => catalogMap.has(id));

    return NextResponse.json({
      selected: selectedIds.map((id) => catalogMap.get(id)),
      catalog,
      maxActions: MAX_QUICK_ACTIONS,
      configured: configuredIds.length > 0,
    });
  } catch (error) {
    console.error("Home quick actions loading failed", error);
    return NextResponse.json({ error: "Quick actions loading failed" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const orderedIds = body?.orderedIds;
    if (!Array.isArray(orderedIds) || orderedIds.length < 1 || orderedIds.length > MAX_QUICK_ACTIONS) {
      return NextResponse.json({ error: `Choose between 1 and ${MAX_QUICK_ACTIONS} actions` }, { status: 400 });
    }
    if (!orderedIds.every((id) => typeof id === "string") || new Set(orderedIds).size !== orderedIds.length) {
      return NextResponse.json({ error: "Invalid quick action list" }, { status: 400 });
    }

    const catalog = await buildHomeActionCatalog(userId);
    const allowedIds = new Set(catalog.map((item) => item.id));
    if (orderedIds.some((id) => !allowedIds.has(id))) {
      return NextResponse.json({ error: "Unknown or unavailable quick action" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.userHomeQuickAction.deleteMany({ where: { userId } });
      await tx.userHomeQuickAction.createMany({
        data: orderedIds.map((id, index) => {
          const parsed = parseHomeActionId(id)!;
          return {
            userId,
            ...parsed,
            customOrder: index + 1,
          };
        }),
      });
    });

    const catalogMap = new Map(catalog.map((item) => [item.id, item]));
    return NextResponse.json({ selected: orderedIds.map((id) => catalogMap.get(id)) });
  } catch (error) {
    console.error("Home quick actions saving failed", error);
    return NextResponse.json({ error: "Quick actions saving failed" }, { status: 500 });
  }
}
