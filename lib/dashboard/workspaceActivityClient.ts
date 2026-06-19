export const WORKSPACE_ACTIVITY_EVENT = "laakarin-tyopoyta:workspace-activity";

export async function recordWorkspaceActivity(actionId: string) {
  if (typeof window === "undefined" || !actionId) return;

  try {
    const response = await fetch("/api/home/recent-actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId }),
      keepalive: true,
    });
    if (!response.ok) return;
    const data = await response.json();
    window.dispatchEvent(new CustomEvent(WORKSPACE_ACTIVITY_EVENT, { detail: data.action }));
  } catch (error) {
    console.error("Workspace activity recording failed", error);
  }
}

export function homeActionIdForPath(pathname: string) {
  const calculatorMatch = pathname.match(/^\/calculators\/([^/]+)$/);
  if (calculatorMatch && CALCULATOR_KEYS.has(calculatorMatch[1])) return `calculator:${calculatorMatch[1]}`;
  if (pathname === "/literature") return "route:literature";
  if (pathname === "/pikaohjeet-v2") return "route:quick-guides";
  if (pathname === "/medicines") return "route:medicines";
  if (pathname === "/links") return "route:links";
  return null;
}
import { CALCULATOR_KEYS } from "../calculators/registry";
