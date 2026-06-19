export type WorkspaceModuleId = "text" | "calculator:bmi" | "calculator:gfr";

export type InlineWorkspaceModuleId = Exclude<WorkspaceModuleId, "text">;

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
} as const satisfies Record<InlineWorkspaceModuleId, {
  id: InlineWorkspaceModuleId;
  label: string;
  href: string;
  icon: string;
}>;

export function isInlineWorkspaceActionId(actionId: string): actionId is InlineWorkspaceModuleId {
  return actionId in inlineWorkspaceModules;
}

export function workspaceModuleIdForAction(actionId: string): WorkspaceModuleId | null {
  if (actionId.startsWith("aiTool:")) return "text";
  return isInlineWorkspaceActionId(actionId) ? actionId : null;
}
