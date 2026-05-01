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
  Link as LinkIcon, // Импортируем иконку для ссылок
  Terminal,
  Bot,
  FlaskConical,
  Users
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  if (pathname === '/login') return null;

  // Основные навигационные элементы
  const navItems = [
    { href: "/", label: "Pääsivu", icon: LayoutDashboard },
    { href: "/templates", label: "Mallit", icon: FileText },
    { href: "/ai-tools", label: "AI-työkalut", icon: Bot },
    { href: "/pikaohjeet", label: "Pikaohjeet", icon: Zap },
    { href: "/links", label: "Linkit", icon: LinkIcon }, // НОВЫЙ ПУНКТ
    { href: "/medicines", label: "Lääkkeet", icon: Pill },
    { href: "/calculators", label: "Laskurit", icon: Calculator },
    { href: "/calculators/peds-library", label: "Lääkekirjastot", icon: FlaskConical },
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

        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admin</p>
            <Link
              href="/admin/users"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                pathname.startsWith('/admin/users') ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <Users size={20} className="group-hover:scale-110 transition-transform" />
              <span>Käyttäjät</span>
            </Link>
            <Link
              href="/admin/prompts"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                pathname.startsWith('/admin/prompts') ? 'bg-blue-50 text-blue-600 font-bold shadow-sm' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <Terminal size={20} className="group-hover:scale-110 transition-transform" />
              <span>Prompt Lab</span>
            </Link>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-100 space-y-2">
        {session?.user && (
          <div className="px-4 py-2 mb-2 bg-slate-50 rounded-xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider italic">Käyttäjä</p>
            <p className="text-xs font-medium text-slate-700 truncate">{session.user.email}</p>
            {isAdmin && <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-1">Admin</p>}
          </div>
        )}
        
        <Link href="/profile/security" className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-slate-600 transition-all group rounded-xl hover:bg-slate-50">
          <Settings size={20} className="group-hover:rotate-45 transition-transform" />
          <span className="text-sm font-medium">Asetukset</span>
        </Link>

        <button 
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group font-medium"
        >
          <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
          <span className="text-sm">Kirjaudu ulos</span>
        </button>
      </div>
    </aside>
  );
}
