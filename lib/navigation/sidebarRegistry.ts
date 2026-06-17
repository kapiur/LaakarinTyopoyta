import type { TranslationKey } from "../i18n";

export type SidebarIconName =
  | "LayoutDashboard"
  | "FileText"
  | "Bot"
  | "Zap"
  | "LinkIcon"
  | "Pill"
  | "Calculator"
  | "FlaskConical"
  | "BookText";

export type SidebarItemDefinition = {
  key: string;
  href: string;
  labelKey: TranslationKey;
  icon: SidebarIconName;
  sortOrder: number;
  defaultEnabled: boolean;
};

const SIDEBAR_ITEMS = [
  { key: "home", href: "/", labelKey: "sidebar.home", icon: "LayoutDashboard", sortOrder: 1, defaultEnabled: true },
  { key: "templates", href: "/malli", labelKey: "sidebar.templates", icon: "FileText", sortOrder: 2, defaultEnabled: true },
  { key: "ai-tools", href: "/ai-tools", labelKey: "sidebar.aiTools", icon: "Bot", sortOrder: 3, defaultEnabled: true },
  { key: "quick-guides", href: "/pikaohjeet-v2", labelKey: "sidebar.quickGuides", icon: "Zap", sortOrder: 4, defaultEnabled: true },
  { key: "links", href: "/links", labelKey: "sidebar.links", icon: "LinkIcon", sortOrder: 5, defaultEnabled: true },
  { key: "literature", href: "/literature", labelKey: "sidebar.literature", icon: "BookText", sortOrder: 6, defaultEnabled: true },
  { key: "medicines", href: "/medicines", labelKey: "sidebar.medicines", icon: "Pill", sortOrder: 7, defaultEnabled: true },
  { key: "calculators", href: "/calculators", labelKey: "sidebar.calculators", icon: "Calculator", sortOrder: 8, defaultEnabled: true },
  { key: "drug-libraries", href: "/calculators/peds-library", labelKey: "sidebar.drugLibraries", icon: "FlaskConical", sortOrder: 9, defaultEnabled: true },
] as const satisfies readonly SidebarItemDefinition[];

export type SidebarItemKey = (typeof SIDEBAR_ITEMS)[number]["key"];

export function isSidebarItemKey(value: unknown): value is SidebarItemKey {
  return typeof value === "string" && SIDEBAR_ITEMS.some((item) => item.key === value);
}

export function getSidebarItemDefinitions(): SidebarItemDefinition[] {
  return [...SIDEBAR_ITEMS];
}

export function getSortedSidebarItemDefinitions(): SidebarItemDefinition[] {
  return getSidebarItemDefinitions().sort((a, b) => a.sortOrder - b.sortOrder || a.href.localeCompare(b.href, "fi"));
}

export function getSidebarItemDefinition(key: SidebarItemKey) {
  return SIDEBAR_ITEMS.find((item) => item.key === key) ?? null;
}
