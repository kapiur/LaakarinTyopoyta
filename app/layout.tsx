import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { LayoutDashboard, FileText, Calculator, Settings } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lääkärin Työpöytä",
  description: "Työkalut lääkärin arkeen",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fi">
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        <div className="flex h-screen overflow-hidden">
          {/* БОКОВОЕ МЕНЮ */}
          <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
            <div className="p-6 border-b border-slate-100">
              <Link href="/" className="text-xl font-bold text-blue-600 flex items-center gap-2 hover:opacity-80 transition-opacity">
                <LayoutDashboard size={24} />
                <span>Työpöytä</span>
              </Link>
            </div>
            
            <nav className="flex-1 p-4 space-y-2">
              <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all group">
                <LayoutDashboard size={20} className="group-hover:scale-110 transition-transform" />
                <span className="font-medium">Pääsivu</span>
              </Link>
              
              <Link href="/templates" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all group">
                <FileText size={20} className="group-hover:scale-110 transition-transform" />
                <span className="font-medium">Mallit</span>
              </Link>
              
              {/* ССЫЛКА ТЕПЕРЬ АКТИВНА */}
              <Link href="/calculators" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all group">
                <Calculator size={20} className="group-hover:scale-110 transition-transform" />
                <span className="font-medium">Laskurit</span>
              </Link>
            </nav>

            <div className="p-4 border-t border-slate-100">
              <button className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-slate-600 transition-all group">
                <Settings size={20} className="group-hover:rotate-45 transition-transform" />
                <span className="text-sm">Asetukset</span>
              </button>
            </div>
          </aside>

          {/* ОСНОВНОЙ КОНТЕНТ */}
          <main className="flex-1 overflow-auto bg-slate-50 relative">
            <div className="p-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
