"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { 
  LayoutDashboard, 
  FileText, 
  Calculator, 
  Settings, 
  LogOut, 
  Pill,
  Zap,
  Link as LinkIcon,
  Bot,
  FlaskConical
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
  Bot,
  Zap,
  LinkIcon,
  Pill,
  Calculator,
  FlaskConical,
};

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useI18n();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [navItems, setNavItems] = useState<SidebarVisibilityItem[]>(() =>
    getSortedSidebarItemDefinitions().map((item) => ({
      ...item,
      customOrder: null,
      isVisible: item.defaultEnabled,
    }))
  );

  if (pathname === '/login') return null;

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

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
      <div className="p-6 border-b border-slate-100">
        <Link href="/" className="text-xl font-bold text-blue-600 flex items-center gap-2 hover:opacity-80 transition-opacity">
          <LayoutDashboard size={24} />
          <span>Työpöytä</span>
        </Link>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {visibleNavItems.map((item) => {
          const Icon = iconMap[item.icon] ?? LayoutDashboard;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                isActive ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <Icon size={20} className={isActive ? '' : 'group-hover:scale-110 transition-transform'} />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 space-y-2">
        {session?.user && (
          <div className="px-4 py-2 mb-2 bg-slate-50 rounded-xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider italic">{t("sidebar.user")}</p>
            <p className="text-xs font-medium text-slate-700 truncate">{session.user.email}</p>
            {isAdmin && <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-1">Admin</p>}
          </div>
        )}
        
        <Link href="/settings" className={`flex items-center gap-3 w-full px-4 py-3 transition-all group rounded-xl ${pathname.startsWith('/settings') || pathname.startsWith('/profile/security') || pathname.startsWith('/admin/users') ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
          <Settings size={20} className="group-hover:rotate-45 transition-transform" />
          <span className="text-sm font-medium">{t("sidebar.settings")}</span>
        </Link>

        <button 
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group font-medium"
        >
          <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
          <span className="text-sm">{t("sidebar.logout")}</span>
        </button>
      </div>
    </aside>
  );
}
