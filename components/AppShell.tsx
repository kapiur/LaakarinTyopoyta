"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu } from "lucide-react";
import { Providers } from "./Providers";
import Sidebar from "./Sidebar";
import CalculatorsTabEnhancer from "./CalculatorsTabEnhancer";
import PcaLibraryEditLinksEnhancer from "./PcaLibraryEditLinksEnhancer";
import MalliTemplateValidatorEnhancer from "./MalliTemplateValidatorEnhancer";
import MalliTemplateAiAssistantEnhancer from "./MalliTemplateAiAssistantEnhancer";
import { homeActionIdForPath, recordWorkspaceActivity } from "../lib/dashboard/workspaceActivityClient";
import PwaRegistration from "./PwaRegistration";
import InstallPwaButton from "./InstallPwaButton";
import CaseSessionDock from "./workspace/CaseSessionDock";

function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex h-[100dvh] min-h-0 overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-area-top flex h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 items-end border-b border-slate-200 bg-white md:hidden">
          <div className="flex h-14 w-full items-center justify-between px-3">
            <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Menu" className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100">
              <Menu size={22} />
            </button>
            <Link href="/" className="flex min-w-0 items-center gap-2 font-bold text-blue-600">
              <LayoutDashboard size={20} />
              <span className="truncate">Lääkärin Työpöytä</span>
            </Link>
            <InstallPwaButton />
          </div>
        </header>
        <main className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 scroll-smooth">
          <div className="mx-auto max-w-[1600px] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" onClick={() => setMobileNavOpen(false)} aria-label="Close menu" />
          <div className="safe-area-top relative h-full w-fit animate-in slide-in-from-left duration-200">
            <Sidebar mobile onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  useEffect(() => {
    const actionId = homeActionIdForPath(pathname);
    if (actionId) recordWorkspaceActivity(actionId);
  }, [pathname]);

  if (isLogin) {
    return <Providers>{children}</Providers>;
  }

  return (
    <Providers>
      <PwaRegistration />
      <CalculatorsTabEnhancer />
      <PcaLibraryEditLinksEnhancer />
      <MalliTemplateValidatorEnhancer />
      <MalliTemplateAiAssistantEnhancer />
      <WorkspaceShell>{children}</WorkspaceShell>
      <CaseSessionDock />
    </Providers>
  );
}
