export type CalculatorWorkspaceModuleId =
  | "calculator:bmi"
  | "calculator:gfr"
  | "calculator:chads"
  | "calculator:pe"
  | "calculator:vte"
  | "calculator:abg"
  | "calculator:cad";

export type TemplateWorkspaceModuleId = `template:${number}`;
export type RouteWorkspaceModuleId = "route:literature";
export type InlineWorkspaceModuleId = CalculatorWorkspaceModuleId | TemplateWorkspaceModuleId | RouteWorkspaceModuleId;
export type WorkspaceModuleId = "text" | InlineWorkspaceModuleId;

export const inlineWorkspaceModules = {
  "calculator:bmi": {
    id: "calculator:bmi",
    label: "BMI",
    href: "/calculators/bmi",
    icon: "Activity",
  },
  "calculator:gfr": {
    id: "calculator:gfr",
    label: "GFR",
    href: "/calculators/gfr",
    icon: "Calculator",
  },
  "calculator:chads": {
    id: "calculator:chads",
    label: "CHADS / HAS-BLED",
    href: "/calculators/chads",
    icon: "Heart",
  },
  "calculator:pe": {
    id: "calculator:pe",
    label: "PE",
    href: "/calculators/pe",
    icon: "Wind",
  },
  "calculator:vte": {
    id: "calculator:vte",
    label: "VTE",
    href: "/calculators/vte",
    icon: "ShieldAlert",
  },
  "calculator:abg": {
    id: "calculator:abg",
    label: "ABG",
    href: "/calculators/abg",
    icon: "Activity",
  },
  "calculator:cad": {
    id: "calculator:cad",
    label: "CAD",
    href: "/calculators/cad",
    icon: "Stethoscope",
  },
} as const satisfies Record<CalculatorWorkspaceModuleId, {
  id: CalculatorWorkspaceModuleId;
  label: string;
  href: string;
  icon: string;
}>;

export function isInlineWorkspaceActionId(actionId: string): actionId is InlineWorkspaceModuleId {
  return actionId in inlineWorkspaceModules || /^template:\d+$/.test(actionId) || actionId === "route:literature";
}

export function isTemplateWorkspaceModuleId(moduleId: string): moduleId is TemplateWorkspaceModuleId {
  return /^template:\d+$/.test(moduleId);
}

export function getTemplateIdFromWorkspaceModule(moduleId: TemplateWorkspaceModuleId) {
  return Number(moduleId.slice("template:".length));
}

export function workspaceModuleIdForAction(actionId: string): WorkspaceModuleId | null {
  if (actionId.startsWith("aiTool:")) return "text";
  return isInlineWorkspaceActionId(actionId) ? actionId : null;
}
