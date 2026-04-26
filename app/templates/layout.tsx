import Link from 'next/link';
import { MoveRight } from 'lucide-react';

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="fixed right-6 bottom-6 z-50">
        <Link
          href="/templates/move"
          className="flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl shadow-slate-300 transition-all hover:bg-blue-600 active:scale-95"
        >
          <MoveRight size={14} />
          Siirrä malleja
        </Link>
      </div>
      {children}
    </div>
  );
}
