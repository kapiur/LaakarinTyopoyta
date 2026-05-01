"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Braces, MessageSquare, MoveRight, Wand2 } from 'lucide-react';

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showQuickLinks = pathname === '/templates';

  return (
    <div className="relative">
      {showQuickLinks && (
        <div className="mx-auto mt-4 flex max-w-[1600px] justify-end px-4">
          <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-100 bg-white/90 p-2 shadow-sm backdrop-blur">
            <Link
              href="/templates/fill"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
            >
              <MessageSquare size={14} />
              Täytä malli
            </Link>
            <Link
              href="/templates/builder"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
            >
              <Wand2 size={14} />
              Rakenna kenttiä
            </Link>
            <Link
              href="/templates/syntax"
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 ring-1 ring-slate-100 transition-all hover:bg-blue-50 hover:text-blue-700 active:scale-95"
            >
              <Braces size={14} />
              Ohje syntaksista
            </Link>
            <Link
              href="/templates/move"
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-blue-600 active:scale-95"
            >
              <MoveRight size={14} />
              Siirrä malleja
            </Link>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
