"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Braces, MoveRight } from 'lucide-react';

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showQuickLinks = pathname === '/templates';

  return (
    <div className="relative">
      {showQuickLinks && (
        <div className="fixed right-6 bottom-6 z-50 flex flex-col gap-3">
          <Link
            href="/templates/syntax"
            className="flex items-center gap-2 rounded-2xl bg-white px-5 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-2xl shadow-slate-200 ring-1 ring-slate-100 transition-all hover:bg-blue-50 hover:text-blue-700 active:scale-95"
          >
            <Braces size={14} />
            Ohje syntaksista
          </Link>
          <Link
            href="/templates/move"
            className="flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl shadow-slate-300 transition-all hover:bg-blue-600 active:scale-95"
          >
            <MoveRight size={14} />
            Siirrä malleja
          </Link>
        </div>
      )}
      {children}
    </div>
  );
}
