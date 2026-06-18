"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Braces, MessageSquare, MoveRight, Wand2 } from 'lucide-react';
import { normalizeUiLanguage } from '../../lib/i18n';
import { useI18n } from '../../lib/useI18n';

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showQuickLinks = pathname === '/templates';
  const { language } = useI18n();

  const copy = {
    fi: {
      fill: 'Täytä malli',
      builder: 'Rakenna kenttiä',
      syntax: 'Ohje syntaksista',
      move: 'Siirrä malleja',
    },
    ru: {
      fill: 'Заполнить шаблон',
      builder: 'Собрать поля',
      syntax: 'Справка по синтаксису',
      move: 'Переместить шаблоны',
    },
    en: {
      fill: 'Fill template',
      builder: 'Build fields',
      syntax: 'Syntax help',
      move: 'Move templates',
    },
    de: {
      fill: 'Vorlage ausfüllen',
      builder: 'Felder erstellen',
      syntax: 'Syntaxhilfe',
      move: 'Vorlagen verschieben',
    },
  } as const;

  const normalizedLanguage = normalizeUiLanguage(language);
  const lang: keyof typeof copy = normalizedLanguage;
  const c = copy[lang];

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
              {c.fill}
            </Link>
            <Link
              href="/templates/builder"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-blue-700 active:scale-95"
            >
              <Wand2 size={14} />
              {c.builder}
            </Link>
            <Link
              href="/templates/syntax"
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 ring-1 ring-slate-100 transition-all hover:bg-blue-50 hover:text-blue-700 active:scale-95"
            >
              <Braces size={14} />
              {c.syntax}
            </Link>
            <Link
              href="/templates/move"
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-blue-600 active:scale-95"
            >
              <MoveRight size={14} />
              {c.move}
            </Link>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
