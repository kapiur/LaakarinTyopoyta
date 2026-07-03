"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { 
  LayoutDashboard, 
  FileText, 
  FileBadge2,
  Calculator, 
  Settings, 
  LogOut, 
  Pill,
  Zap,
  Link as LinkIcon,
  Bot,
  FlaskConical,
  BookText,
  ChevronLeft,
  ChevronRight,
  User
} from "lucide-react";
import { useI18n } from "../lib/useI18n";
import type { TranslationKey } from "../lib/i18n";
import { getSortedSidebarItemDefinitions, type SidebarIconName } from "../lib/navigation/sidebarRegistry";

type SidebarVisibilityItem = {
  key: string;
  href: string;
  labelKey: TranslationKey;
  icon: SidebarIconName;
  sortOrder: number;
  customOrder: number | null;
  isVisible: boolean;
};

const iconMap = {
  LayoutDashboard,
  FileText,
  FileBadge2,
  Bot,
  Zap,
  LinkIcon,
  Pill,
  Calculator,
  FlaskConical,
  BookText,
};

const SIDEBAR_STATE_KEY = "laakarin-tyopoyta:sidebar-collapsed";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useI18n();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [navItems, setNavItems] = useState<SidebarVisibilityItem[]>(() =>
    getSortedSidebarItemDefinitions().map((item) => ({
      ...item,
      customOrder: null,
      isVisible: item.defaultEnabled,
    }))
  );

  if (pathname === '/login') return null;

  useEffect(() => {
    try {
      const savedValue = window.localStorage.getItem(SIDEBAR_STATE_KEY);
      setIsCollapsed(savedValue === "true");
    } catch (error) {
      console.error("Sidebar state loading failed", error);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSidebarVisibility() {
      try {
        const response = await fetch("/api/sidebar/visibility", { cache: "no-store" });
        if (!response.ok) return;

        const data = await response.json();
        if (isMounted && Array.isArray(data.items)) {
          setNavItems(data.items);
        }
      } catch (error) {
        console.error("Sidebar visibility loading failed", error);
      }
    }

    loadSidebarVisibility();
    return () => {
      isMounted = false;
    };
  }, []);

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => item.isVisible),
    [navItems]
  );

  function toggleCollapsed() {
    setIsCollapsed((current) => {
      const nextValue = !current;
      try {
        window.localStorage.setItem(SIDEBAR_STATE_KEY, String(nextValue));
      } catch (error) {
        console.error("Sidebar state saving failed", error);
      }
      return nextValue;
    });
  }

  return (
    <aside className={`${isCollapsed ? "w-20" : "w-64"} bg-white border-r border-slate-200 flex flex-col shadow-sm z-10 transition-[width] duration-200 ease-out`}>
      <div className={`border-b border-slate-100 ${isCollapsed ? "p-3" : "p-6"}`}>
        <div className={`relative flex items-center ${isCollapsed ? "justify-center" : "justify-between"} gap-2`}>
          <Link
            href="/"
            title={t("dashboard.title")}
            className={`text-blue-600 flex items-center hover:opacity-80 transition-opacity ${isCollapsed ? "justify-center" : "gap-2 text-xl font-bold"}`}
          >
            <LayoutDashboard size={24} />
            {!isCollapsed && <span>{t("sidebar.workspace")}</span>}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            title={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            aria-label={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            className={`rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors ${isCollapsed ? "absolute top-0 -right-3 z-20 bg-white p-1.5 shadow-sm" : "p-2.5"}`}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
      
      <nav className={`flex-1 ${isCollapsed ? "p-3" : "p-4"} space-y-2`}>
        {visibleNavItems.map((item) => {
          const Icon = iconMap[item.icon] ?? LayoutDashboard;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              title={t(item.labelKey)}
              className={`flex items-center rounded-xl transition-all group ${
                isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-3"
              } ${
                isActive ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <Icon size={20} className={isActive ? '' : 'group-hover:scale-110 transition-transform'} />
              {!isCollapsed && <span>{t(item.labelKey)}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={`${isCollapsed ? "p-3" : "p-4"} border-t border-slate-100 space-y-2`}>
        {session?.user && (
          <div
            title={session.user.email || undefined}
            className={`${isCollapsed ? "mb-2 flex justify-center px-0 py-2" : "px-4 py-2 mb-2"} bg-slate-50 rounded-xl`}
          >
            {isCollapsed ? (
              <div className="relative">
                <User size={18} className="text-slate-600" />
                {isAdmin && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-blue-600" />}
              </div>
            ) : (
              <>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider italic">{t("sidebar.user")}</p>
                <p className="text-xs font-medium text-slate-700 truncate">{session.user.email}</p>
                {isAdmin && <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-1">{t("sidebar.admin")}</p>}
              </>
            )}
          </div>
        )}
        
        <Link
          href="/settings"
          title={t("sidebar.settings")}
          className={`flex items-center w-full transition-all group rounded-xl ${isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-3"} ${pathname.startsWith('/settings') || pathname.startsWith('/profile/security') || pathname.startsWith('/admin/users') || pathname.startsWith('/admin/ai-access') || pathname.startsWith('/admin/ai-providers') || pathname.startsWith('/admin/clinical-sources') || pathname.startsWith('/admin/lausunto-access') ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
        >
          <Settings size={20} className="group-hover:rotate-45 transition-transform" />
          {!isCollapsed && <span className="text-sm font-medium">{t("sidebar.settings")}</span>}
        </Link>

        <button 
          onClick={() => signOut({ callbackUrl: '/login' })}
          title={t("sidebar.logout")}
          aria-label={t("sidebar.logout")}
          className={`flex items-center w-full text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group font-medium ${isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-3"}`}
        >
          <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
          {!isCollapsed && <span className="text-sm">{t("sidebar.logout")}</span>}
        </button>
      </div>
    </aside>
  );
}
