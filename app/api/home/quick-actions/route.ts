import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { DEFAULT_AI_TOOL_METADATA } from "../../../../lib/ai/toolMetadata";
import { getSortedCalculatorDefinitions } from "../../../../lib/calculators/registry";
import { prisma } from "../../../../lib/prisma";

type ActionType = "route" | "calculator" | "template" | "aiTool";

type QuickActionItem = {
  id: string;
  type: ActionType;
  key: string;
  label?: string;
  labelKey?: string;
  description?: string;
  descriptionKey?: string;
  href?: string;
  icon: string;
  group: ActionType;
};

type DefaultToolVisibilityRow = {
  toolKey: string;
  isVisible: boolean;
};

const MAX_QUICK_ACTIONS = 10;

const routeActions: QuickActionItem[] = [
  {
    id: "route:literature",
    type: "route",
    key: "literature",
    labelKey: "sidebar.literature",
    descriptionKey: "dashboard.quickActionLiteratureDescription",
    href: "/literature",
    icon: "BookText",
    group: "route",
  },
  {
    id: "route:quick-guides",
    type: "route",
    key: "quick-guides",
    labelKey: "sidebar.quickGuides",
    descriptionKey: "dashboard.quickActionGuidesDescription",
    href: "/pikaohjeet-v2",
    icon: "Zap",
    group: "route",
  },
  {
    id: "route:medicines",
    type: "route",
    key: "medicines",
    labelKey: "sidebar.medicines",
    descriptionKey: "dashboard.quickActionMedicinesDescription",
    href: "/medicines",
    icon: "Pill",
    group: "route",
  },
  {
    id: "route:links",
    type: "route",
    key: "links",
    labelKey: "sidebar.links",
    descriptionKey: "dashboard.quickActionLinksDescription",
    href: "/links",
    icon: "LinkIcon",
    group: "route",
  },
];

const defaultActionIds = [
  "aiTool:summarize",
  "calculator:gfr",
  "calculator:abg",
  "route:literature",
  "route:quick-guides",
];

function getUserId(session: unknown) {
  const userId = Number((session as any)?.user?.id);
  return Number.isFinite(userId) ? userId : null;
}

async function buildCatalog(userId: number): Promise<QuickActionItem[]> {
  const [calculatorPreferences, templateRows, userToolRows, visibilityRows] = await Promise.all([
    prisma.userCalculatorPreference.findMany({ where: { userId } }),
    prisma.template.findMany({
      where: { userId },
      select: { id: true, title: true, category: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.aiTool.findMany({
      where: { userId, scope: "USER", isActive: true },
      select: { key: true, label: true, description: true, icon: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    prisma.$queryRaw<DefaultToolVisibilityRow[]>`
      SELECT "toolKey", "isVisible"
      FROM "UserAiToolVisibility"
      WHERE "userId" = ${userId}
    `.catch(() => [] as DefaultToolVisibilityRow[]),
  ]);

  const calculatorVisibility = new Map(
    calculatorPreferences.map((preference) => [preference.calculatorKey, preference.isVisible]),
  );
  const defaultToolVisibility = new Map(visibilityRows.map((row) => [row.toolKey, row.isVisible] as const));

  const calculators: QuickActionItem[] = getSortedCalculatorDefinitions()
    .filter((calculator) => calculatorVisibility.get(calculator.key) !== false)
    .map((calculator) => ({
      id: `calculator:${calculator.key}`,
      type: "calculator",
      key: calculator.key,
      label: calculator.title,
      description: calculator.description,
      href: calculator.route,
      icon: calculator.icon,
      group: "calculator",
    }));

  const templates: QuickActionItem[] = templateRows.map((template) => ({
    id: `template:${template.id}`,
    type: "template",
    key: String(template.id),
    label: template.title,
    description: template.category.name,
    href: `/malli?templateId=${template.id}`,
    icon: "FileText",
    group: "template",
  }));

  const defaultTools: QuickActionItem[] = DEFAULT_AI_TOOL_METADATA
    .filter((tool) => defaultToolVisibility.get(tool.key) !== false)
    .map((tool) => ({
      id: `aiTool:${tool.key}`,
      type: "aiTool",
      key: tool.key,
      labelKey: `dashboard.tool${tool.key === "fix" ? "Fix" : tool.key === "translate" ? "Translate" : tool.key === "summarize" ? "Summarize" : "Labs"}`,
      descriptionKey: `dashboard.tool${tool.key === "fix" ? "Fix" : tool.key === "translate" ? "Translate" : tool.key === "summarize" ? "Summarize" : "Labs"}Description`,
      icon: tool.icon,
      group: "aiTool",
    }));

  const userTools: QuickActionItem[] = userToolRows.map((tool) => ({
    id: `aiTool:${tool.key}`,
    type: "aiTool",
    key: tool.key,
    label: tool.label,
    description: tool.description ?? "",
    icon: tool.icon ?? "FileText",
    group: "aiTool",
  }));

  return [...defaultTools, ...userTools, ...calculators, ...templates, ...routeActions];
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [catalog, preferences] = await Promise.all([
      buildCatalog(userId),
      prisma.userHomeQuickAction.findMany({
        where: { userId },
        orderBy: [{ customOrder: "asc" }, { createdAt: "asc" }],
      }),
    ]);
    const catalogMap = new Map(catalog.map((item) => [item.id, item]));
    const configuredIds = preferences.map((preference) => `${preference.actionType}:${preference.actionKey}`);
    const selectedIds = (configuredIds.length > 0 ? configuredIds : defaultActionIds).filter((id) => catalogMap.has(id));

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

    const catalog = await buildCatalog(userId);
    const allowedIds = new Set(catalog.map((item) => item.id));
    if (orderedIds.some((id) => !allowedIds.has(id))) {
      return NextResponse.json({ error: "Unknown or unavailable quick action" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.userHomeQuickAction.deleteMany({ where: { userId } });
      await tx.userHomeQuickAction.createMany({
        data: orderedIds.map((id, index) => {
          const separatorIndex = id.indexOf(":");
          return {
            userId,
            actionType: id.slice(0, separatorIndex),
            actionKey: id.slice(separatorIndex + 1),
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
