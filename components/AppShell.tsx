"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Providers } from "./Providers";
import Sidebar from "./Sidebar";
import CalculatorsTabEnhancer from "./CalculatorsTabEnhancer";
import PcaLibraryEditLinksEnhancer from "./PcaLibraryEditLinksEnhancer";
import MalliTemplateValidatorEnhancer from "./MalliTemplateValidatorEnhancer";
import MalliTemplateAiAssistantEnhancer from "./MalliTemplateAiAssistantEnhancer";
import { homeActionIdForPath, recordWorkspaceActivity } from "../lib/dashboard/workspaceActivityClient";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  useEffect(() => {
    const actionId = homeActionIdForPath(pathname);
    if (actionId) recordWorkspaceActivity(actionId);
  }, [pathname]);

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <Providers>
      <CalculatorsTabEnhancer />
      <PcaLibraryEditLinksEnhancer />
      <MalliTemplateValidatorEnhancer />
      <MalliTemplateAiAssistantEnhancer />
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50 relative scroll-smooth">
          <div className="max-w-[1600px] mx-auto p-4 md:p-8">{children}</div>
        </main>
      </div>
    </Providers>
  );
}
