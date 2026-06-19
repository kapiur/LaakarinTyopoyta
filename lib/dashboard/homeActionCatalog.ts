import { DEFAULT_AI_TOOL_METADATA } from "../ai/toolMetadata";
import { getSortedCalculatorDefinitions } from "../calculators/registry";
import { prisma } from "../prisma";

export type HomeActionType = "route" | "calculator" | "template" | "aiTool";

export type HomeActionItem = {
  id: string;
  type: HomeActionType;
  key: string;
  label?: string;
  labelKey?: string;
  description?: string;
  descriptionKey?: string;
  href?: string;
  icon: string;
  group: HomeActionType;
};

type DefaultToolVisibilityRow = {
  toolKey: string;
  isVisible: boolean;
};

export const DEFAULT_HOME_ACTION_IDS = [
  "aiTool:summarize",
  "calculator:gfr",
  "calculator:abg",
  "route:literature",
  "route:quick-guides",
];

const routeActions: HomeActionItem[] = [
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

export function parseHomeActionId(actionId: string) {
  const separatorIndex = actionId.indexOf(":");
  if (separatorIndex < 1 || separatorIndex === actionId.length - 1) return null;
  return {
    actionType: actionId.slice(0, separatorIndex),
    actionKey: actionId.slice(separatorIndex + 1),
  };
}

export async function buildHomeActionCatalog(userId: number): Promise<HomeActionItem[]> {
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

  const calculators: HomeActionItem[] = getSortedCalculatorDefinitions()
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

  const templates: HomeActionItem[] = templateRows.map((template) => ({
    id: `template:${template.id}`,
    type: "template",
    key: String(template.id),
    label: template.title,
    description: template.category.name,
    href: `/malli?templateId=${template.id}`,
    icon: "FileText",
    group: "template",
  }));

  const defaultTools: HomeActionItem[] = DEFAULT_AI_TOOL_METADATA
    .filter((tool) => defaultToolVisibility.get(tool.key) !== false)
    .map((tool) => {
      const suffix = tool.key === "fix" ? "Fix" : tool.key === "translate" ? "Translate" : tool.key === "summarize" ? "Summarize" : "Labs";
      return {
        id: `aiTool:${tool.key}`,
        type: "aiTool",
        key: tool.key,
        labelKey: `dashboard.tool${suffix}`,
        descriptionKey: `dashboard.tool${suffix}Description`,
        icon: tool.icon,
        group: "aiTool",
      };
    });

  const userTools: HomeActionItem[] = userToolRows.map((tool) => ({
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
