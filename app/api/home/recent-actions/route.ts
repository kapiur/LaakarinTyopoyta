import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import {
  buildHomeActionCatalog,
  DEFAULT_HOME_ACTION_IDS,
  parseHomeActionId,
} from "../../../../lib/dashboard/homeActionCatalog";
import { prisma } from "../../../../lib/prisma";
import { workspaceModuleIdForAction } from "../../../../lib/dashboard/workspaceModuleRegistry";

const RECENT_ACTION_LIMIT = 5;

function getUserId(session: unknown) {
  const userId = Number((session as any)?.user?.id);
  return Number.isFinite(userId) ? userId : null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [catalog, activities, pinnedPreferences] = await Promise.all([
      buildHomeActionCatalog(userId),
      prisma.userWorkspaceActivity.findMany({
        where: { userId },
        orderBy: { lastUsedAt: "desc" },
        take: 30,
      }),
      prisma.userHomeQuickAction.findMany({ where: { userId } }),
    ]);

    const catalogMap = new Map(catalog.map((item) => [item.id, item]));
    const pinnedIds = new Set(
      pinnedPreferences.length > 0
        ? pinnedPreferences.map((preference) => `${preference.actionType}:${preference.actionKey}`)
        : DEFAULT_HOME_ACTION_IDS,
    );
    const validActivities = activities
      .map((activity) => ({
        actionId: `${activity.actionType}:${activity.actionKey}`,
        lastUsedAt: activity.lastUsedAt,
      }))
      .filter((activity) => catalogMap.has(activity.actionId));
    const lastAiTool = validActivities.find((activity) => activity.actionId.startsWith("aiTool:"));
    const lastWorkspaceModuleId = validActivities
      .map((activity) => workspaceModuleIdForAction(activity.actionId))
      .find((moduleId) => moduleId !== null) ?? null;
    const recent = validActivities
      .filter((activity) => !pinnedIds.has(activity.actionId))
      .slice(0, RECENT_ACTION_LIMIT)
      .map((activity) => ({
        ...catalogMap.get(activity.actionId),
        lastUsedAt: activity.lastUsedAt,
      }));

    return NextResponse.json({
      recent,
      lastAiToolKey: lastAiTool?.actionId.slice("aiTool:".length) ?? null,
      lastWorkspaceModuleId,
    });
  } catch (error) {
    console.error("Recent workspace actions loading failed", error);
    return NextResponse.json({ error: "Recent actions loading failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const actionId = typeof body?.actionId === "string" ? body.actionId : "";
    const parsed = parseHomeActionId(actionId);
    if (!parsed) return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    const catalog = await buildHomeActionCatalog(userId);
    const action = catalog.find((item) => item.id === actionId);
    if (!action) return NextResponse.json({ error: "Unavailable action" }, { status: 400 });

    const activity = await prisma.userWorkspaceActivity.upsert({
      where: {
        userId_actionType_actionKey: {
          userId,
          ...parsed,
        },
      },
      update: {
        useCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
      create: {
        userId,
        ...parsed,
      },
    });

    return NextResponse.json({ action: { ...action, lastUsedAt: activity.lastUsedAt } });
  } catch (error) {
    console.error("Workspace activity recording failed", error);
    return NextResponse.json({ error: "Activity recording failed" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.userWorkspaceActivity.deleteMany({ where: { userId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Recent workspace actions clearing failed", error);
    return NextResponse.json({ error: "Recent actions clearing failed" }, { status: 500 });
  }
}
