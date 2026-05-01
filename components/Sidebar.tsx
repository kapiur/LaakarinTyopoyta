"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useI18n();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  if (pathname === '/login') return null;

  const navItems = [
    { href: "/", label: t("sidebar.home"), icon: LayoutDashboard },
    { href: "/templates", label: t("sidebar.templates"), icon: FileText },
    { href: "/ai-tools", label: t("sidebar.aiTools"), icon: Bot },
    { href: "/pikaohjeet", label: t("sidebar.quickGuides"), icon: Zap },
    { href: "/links", label: t("sidebar.links"), icon: LinkIcon },
    { href: "/medicines", label: t("sidebar.medicines"), icon: Pill },
    { href: "/calculators", label: t("sidebar.calculators"), icon: Calculator },
    { href: "/calculators/peds-library", label: t("sidebar.drugLibraries"), icon: FlaskConical },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
      <div className="p-6 border-b border-slate-100">
        <Link href="/" className="text-xl font-bold text-blue-600 flex items-center gap-2 hover:opacity-80 transition-opacity">
          <LayoutDashboard size={24} />
          <span>Työpöytä</span>
        </Link>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
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
              <span>{item.label}</span>
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
