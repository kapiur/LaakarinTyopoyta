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
          <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
            <div className="p-6 border-b border-slate-100">
              <Link href="/" className="text-xl font-bold text-blue-600 flex items-center gap-2">
                <LayoutDashboard size={24} />
                <span>Työpöytä</span>
              </Link>
            </div>
            
            <nav className="flex-1 p-4 space-y-2">
              <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                <LayoutDashboard size={20} />
                <span className="font-medium">Pääsivu</span>
              </Link>
              
              <Link href="/templates" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                <FileText size={20} />
                <span className="font-medium">Mallit</span>
              </Link>
              
              <Link href="/calculators" className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all opacity-50 cursor-not-allowed">
                <Calculator size={20} />
                <span className="font-medium">Laskurit</span>
              </Link>
            </nav>

            <div className="p-4 border-t border-slate-100">
              <button className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-slate-600 transition-all">
                <Settings size={20} />
                <span className="text-sm">Asetukset</span>
              </button>
            </div>
          </aside>

          {/* ОСНОВНОЙ КОНТЕНТ */}
          <main className="flex-1 overflow-auto p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
