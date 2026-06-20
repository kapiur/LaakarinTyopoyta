"use client";

import { useEffect, useState } from 'react';
import { Search, Database, ChevronRight, MessageSquare } from 'lucide-react';
import { normalizeUiLanguage, type UiLanguage } from '../../lib/i18n';
import { useI18n } from '../../lib/useI18n';

const copy = {
  fi: {
    title: 'Lääketietokanta',
    searchPlaceholder: 'Hae nimellä tai aineella...',
    missingSubstance: 'Vaikuttava aine puuttuu',
    communityNotes: 'Yhteisön muistiinpanot',
    save: 'Tallenna',
    edit: 'Muokkaa',
    noNotes: 'Ei vielä merkintöjä.',
    strengthAndSize: 'Vahvuus / Koko',
    status: 'Status',
    defaultPackage: 'Vakio',
    available: 'Varastossa',
    unavailable: 'Loppu',
    searchFromList: 'Hae lääke listasta',
  },
  ru: {
    title: 'База лекарств',
    searchPlaceholder: 'Искать по названию или веществу...',
    missingSubstance: 'Действующее вещество не указано',
    communityNotes: 'Заметки сообщества',
    save: 'Сохранить',
    edit: 'Редактировать',
    noNotes: 'Пока нет заметок.',
    strengthAndSize: 'Дозировка / Размер',
    status: 'Статус',
    defaultPackage: 'Стандарт',
    available: 'В наличии',
    unavailable: 'Нет',
    searchFromList: 'Выберите препарат из списка',
  },
  en: {
    title: 'Medicine database',
    searchPlaceholder: 'Search by name or substance...',
    missingSubstance: 'Active substance missing',
    communityNotes: 'Community notes',
    save: 'Save',
    edit: 'Edit',
    noNotes: 'No notes yet.',
    strengthAndSize: 'Strength / Size',
    status: 'Status',
    defaultPackage: 'Default',
    available: 'Available',
    unavailable: 'Unavailable',
    searchFromList: 'Search for a medicine from the list',
  },
  de: {
    title: 'Arzneimitteldatenbank',
    searchPlaceholder: 'Nach Name oder Wirkstoff suchen...',
    missingSubstance: 'Wirkstoff fehlt',
    communityNotes: 'Gemeinsame Notizen',
    save: 'Speichern',
    edit: 'Bearbeiten',
    noNotes: 'Noch keine Notizen.',
    strengthAndSize: 'Stärke / Größe',
    status: 'Status',
    defaultPackage: 'Standard',
    available: 'Verfügbar',
    unavailable: 'Nicht verfügbar',
    searchFromList: 'Arzneimittel aus der Liste auswählen',
  },
} as const;

export default function MedicinesPage() {
  const { language } = useI18n();
  const lang = normalizeUiLanguage(language);
  const c = copy[lang] ?? copy.en;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMed, setSelectedMed] = useState<any>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [tempNotes, setTempNotes] = useState('');

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        setLoading(true);
        try {
          const res = await fetch(`/api/medicines?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          setResults(data);
        } finally {
          setLoading(false);
        }
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const saveNotes = async () => {
    if (!selectedMed?.substanceId) return;
    try {
      const res = await fetch('/api/substances/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ substanceId: selectedMed.substanceId, notes: tempNotes }),
      });
      if (res.ok) {
        setSelectedMed({ ...selectedMed, substance: { ...selectedMed.substance, communityNotes: tempNotes } });
        setIsEditingNotes(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col overflow-hidden bg-slate-50 font-sans text-slate-900 lg:h-[calc(100dvh-4rem)] lg:flex-row">
      <aside className="z-20 flex max-h-[38rem] w-full shrink-0 flex-col border-b bg-white shadow-sm lg:max-h-none lg:w-[420px] lg:border-b-0 lg:border-r lg:shadow-xl">
        <div className="space-y-4 border-b p-4 sm:p-6">
          <div className="flex items-center gap-2 text-blue-600 font-black uppercase tracking-tighter">
            <Database size={20} />
            <h1>{c.title}</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              placeholder={c.searchPlaceholder}
              className="w-full pl-11 pr-4 py-3 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {results.map((med) => (
            <button key={med.id} onClick={() => { setSelectedMed(med); setTempNotes(med.substance?.communityNotes || ''); }}
              className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${
                selectedMed?.name === med.name ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-50 hover:border-blue-200'
              }`}
            >
              <div>
                <div className="font-black text-sm uppercase">{med.name}</div>
                <div className="text-[10px] font-bold uppercase opacity-60 mt-1">{med.substanceId}</div>
              </div>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      </aside>

      <main className="custom-scrollbar min-h-[32rem] flex-1 overflow-y-auto bg-slate-50 p-0 sm:p-4 lg:p-8">
        {selectedMed ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm sm:p-8 lg:rounded-[40px] lg:p-10">
              <h2 className="mb-4 break-words text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">{selectedMed.name}</h2>
              <button onClick={() => setQuery(selectedMed.substanceId)}
                className="break-all text-base font-bold uppercase text-blue-600 hover:underline sm:text-xl"
              >
                {selectedMed.substanceId || c.missingSubstance}
              </button>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-8 lg:rounded-[40px]">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3"><MessageSquare className="text-amber-500" /> <h3 className="font-black uppercase text-xs tracking-widest">{c.communityNotes}</h3></div>
                <button onClick={() => isEditingNotes ? saveNotes() : setIsEditingNotes(true)} className="px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase">
                  {isEditingNotes ? c.save : c.edit}
                </button>
              </div>
              {isEditingNotes ? <textarea className="w-full h-32 p-4 bg-slate-50 border rounded-2xl outline-none" value={tempNotes} onChange={(e) => setTempNotes(e.target.value)} /> :
                <p className="text-lg italic text-slate-600">{selectedMed.substance?.communityNotes || c.noNotes}</p>}
            </div>

            <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm lg:rounded-[40px]">
              <table className="min-w-[620px] w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">
                  <tr>
                    <th className="px-8 py-4">VNR</th>
                    <th className="px-8 py-4">{c.strengthAndSize}</th>
                    <th className="px-8 py-4 text-right">{c.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedMed.packages?.map((pkg: any) => (
                    <tr key={pkg.vnr} className="hover:bg-slate-50/50">
                      <td className="px-8 py-6 font-bold text-blue-600">{pkg.vnr}</td>
                      <td className="px-8 py-6 font-bold text-slate-700">{selectedMed.strength} - {pkg.sizeText || c.defaultPackage}</td>
                      <td className="px-8 py-6 text-right font-black text-[10px] uppercase">
                        {pkg.isAvailable ? <span className="text-emerald-500">{c.available}</span> : <span className="text-slate-300">{c.unavailable}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300"><p className="font-black uppercase tracking-[0.4em] text-xs">{c.searchFromList}</p></div>
        )}
      </main>
    </div>
  );
}
