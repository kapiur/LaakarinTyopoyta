"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowDown, ArrowLeft, ArrowUp, Clipboard, Loader2, Plus, Save, Search, Trash2, X } from "lucide-react";
import PikaohjeAgentDock from "../../../components/ai-agent/PikaohjeAgentDock";
import { useI18n } from "../../../lib/useI18n";

type UiLang = "fi" | "ru" | "en";
type Section = { key: string; title: string; content: string; order: number; kind: string };
type CardListItem = { slug: string; title: string; description?: string | null; type: string; status: string; sourceStatus: string; tags: string[] };
type CardDetail = CardListItem & { environment?: string; audience?: string; sections: Section[] };
type Draft = { title: string; description?: string; type: "CLINICAL"; status: string; visibility: "PUBLIC"; sourceStatus: string; environment?: string; audience?: string; tags: string[]; sections: Section[] };

type Option = { value: string; label: string };

const statusOptions: Record<UiLang, Option[]> = {
  fi: [
    { value: "NEEDS_REVIEW", label: "Vaatii tarkistuksen" },
    { value: "PARTLY_CHECKED", label: "Osittain tarkistettu" },
    { value: "KAYPA_HOITO_CHECKED", label: "Käypä hoito tarkistettu" },
    { value: "LOCAL_GUIDE", label: "Paikallinen ohje" },
  ],
  ru: [
    { value: "NEEDS_REVIEW", label: "Требует проверки" },
    { value: "PARTLY_CHECKED", label: "Частично проверено" },
    { value: "KAYPA_HOITO_CHECKED", label: "Проверено по Käypä hoito" },
    { value: "LOCAL_GUIDE", label: "Локальная инструкция" },
  ],
  en: [
    { value: "NEEDS_REVIEW", label: "Needs review" },
    { value: "PARTLY_CHECKED", label: "Partly checked" },
    { value: "KAYPA_HOITO_CHECKED", label: "Käypä hoito checked" },
    { value: "LOCAL_GUIDE", label: "Local guide" },
  ],
};

const sourceOptions: Record<UiLang, Option[]> = {
  fi: [
    { value: "NOT_CHECKED", label: "Lähteitä ei tarkistettu" },
    { value: "NEEDS_REVIEW", label: "Lähteet vaativat tarkistuksen" },
    { value: "PARTLY_CHECKED", label: "Lähteet osittain tarkistettu" },
    { value: "KAYPA_HOITO_CHECKED", label: "Käypä hoito lähteenä" },
    { value: "LOCAL_SOURCE", label: "Paikallinen lähde" },
  ],
  ru: [
    { value: "NOT_CHECKED", label: "Источники не проверены" },
    { value: "NEEDS_REVIEW", label: "Источники требуют проверки" },
    { value: "PARTLY_CHECKED", label: "Источники частично проверены" },
    { value: "KAYPA_HOITO_CHECKED", label: "Источник Käypä hoito" },
    { value: "LOCAL_SOURCE", label: "Локальный источник" },
  ],
  en: [
    { value: "NOT_CHECKED", label: "Sources not checked" },
    { value: "NEEDS_REVIEW", label: "Sources need review" },
    { value: "PARTLY_CHECKED", label: "Sources partly checked" },
    { value: "KAYPA_HOITO_CHECKED", label: "Käypä hoito source" },
    { value: "LOCAL_SOURCE", label: "Local source" },
  ],
};

const ui = {
  fi: { title: "Clinical card manager", subtitle: "Admin-only kliinisten pikaohjeiden muokkaus", back: "Takaisin Pikaohjeisiin", search: "Hae kliinisistä korteista...", select: "Valitse kliininen kortti", save: "Tallenna muutokset", archive: "Arkistoi", confirmArchive: "Arkistoidaanko tämä kliininen kortti?", titleLabel: "Otsikko", description: "Kuvaus", tags: "Tagit", status: "Tarkistusstatus", sourceStatus: "Lähdestatus", environment: "Ympäristö", audience: "Kohderyhmä", addSection: "Lisää osio loppuun", addBelow: "Lisää alle", removeSection: "Poista osio", moveUp: "Siirrä ylös", moveDown: "Siirrä alas", sectionTitle: "Osion otsikko", sectionContent: "Sisältö", saved: "Tallennettu", empty: "Ei kliinisiä kortteja", copied: "Kopioitu", copy: "Kopioi" },
  ru: { title: "Clinical card manager", subtitle: "Admin-only редактирование клинических карточек", back: "Назад в Pikaohjeet", search: "Поиск по клиническим карточкам...", select: "Выберите клиническую карточку", save: "Сохранить изменения", archive: "В архив", confirmArchive: "Отправить эту клиническую карточку в архив?", titleLabel: "Заголовок", description: "Описание", tags: "Теги", status: "Статус проверки", sourceStatus: "Статус источников", environment: "Среда", audience: "Аудитория", addSection: "Добавить секцию в конец", addBelow: "Добавить ниже", removeSection: "Удалить секцию", moveUp: "Выше", moveDown: "Ниже", sectionTitle: "Заголовок секции", sectionContent: "Содержание", saved: "Сохранено", empty: "Клинических карточек нет", copied: "Скопировано", copy: "Копировать" },
  en: { title: "Clinical card manager", subtitle: "Admin-only clinical card editing", back: "Back to Pikaohjeet", search: "Search clinical cards...", select: "Select a clinical card", save: "Save changes", archive: "Archive", confirmArchive: "Archive this clinical card?", titleLabel: "Title", description: "Description", tags: "Tags", status: "Review status", sourceStatus: "Source status", environment: "Environment", audience: "Audience", addSection: "Add section to end", addBelow: "Add below", removeSection: "Remove section", moveUp: "Move up", moveDown: "Move down", sectionTitle: "Section title", sectionContent: "Content", saved: "Saved", empty: "No clinical cards", copied: "Copied", copy: "Copy" },
};

function langOf(value: string): UiLang { return value === "ru" || value === "en" ? value : "fi"; }
function labelFor(options: Option[], value: string) { return options.find((item) => item.value === value)?.label || value; }
function makeSection(index: number): Section { return { key: `section_${Date.now()}_${index}`, title: `Osio ${index + 1}`, content: "", order: (index + 1) * 10, kind: "TEXT" }; }
function normalizeSectionOrders(sections: Section[]) { return sections.map((section, index) => ({ ...section, order: (index + 1) * 10 })); }
function toDraft(card: CardDetail): Draft { return { title: card.title, description: card.description || "", type: "CLINICAL", status: card.status || "NEEDS_REVIEW", visibility: "PUBLIC", sourceStatus: card.sourceStatus || "NOT_CHECKED", environment: card.environment || "terveysasema", audience: card.audience || "aikuinen", tags: card.tags || [], sections: normalizeSectionOrders((card.sections || []).map((s, i) => ({ key: s.key || `section_${i + 1}`, title: s.title || `Osio ${i + 1}`, content: s.content || "", order: Number.isFinite(Number(s.order)) ? Number(s.order) : (i + 1) * 10, kind: s.kind || "TEXT" }))) }; }

export default function ClinicalManagerPage() {
  const { language } = useI18n();
  const lang = langOf(language as string);
  const dict = ui[lang];
  const statusList = statusOptions[lang];
  const sourceList = sourceOptions[lang];
  const [cards, setCards] = useState<CardListItem[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingCard, setLoadingCard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function loadList(selectSlug?: string | null) {
    setLoading(true);
    try {
      const res = await fetch("/api/pikaohjeet-v2", { cache: "no-store" });
      const data = await res.json();
      const clinical = Array.isArray(data) ? data.filter((card) => card.type === "CLINICAL") : [];
      setCards(clinical);
      if (selectSlug !== undefined) setActiveSlug(selectSlug);
      else if (!activeSlug && clinical.length > 0) setActiveSlug(clinical[0].slug);
    } finally { setLoading(false); }
  }

  useEffect(() => { loadList(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    if (!activeSlug) { setDraft(null); return; }
    let mounted = true;
    async function loadCard() {
      setLoadingCard(true);
      try {
        const res = await fetch(`/api/pikaohjeet-v2/${encodeURIComponent(activeSlug)}`, { cache: "no-store" });
        const data = await res.json();
        if (mounted && res.ok) setDraft(toDraft(data));
      } finally { if (mounted) setLoadingCard(false); }
    }
    loadCard();
    return () => { mounted = false; };
  }, [activeSlug]);

  const filteredCards = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return cards; return cards.filter((card) => [card.title, card.description || "", labelFor(statusList, card.status), labelFor(sourceList, card.sourceStatus), ...(card.tags || [])].join(" ").toLowerCase().includes(q)); }, [cards, query, statusList, sourceList]);

  function updateSection(index: number, patch: Partial<Section>) { setDraft((current) => { if (!current) return current; const sections = [...current.sections]; sections[index] = { ...sections[index], ...patch }; return { ...current, sections: normalizeSectionOrders(sections) }; }); }
  function addSectionAfter(index: number) { setDraft((current) => { if (!current) return current; const sections = [...current.sections]; sections.splice(index + 1, 0, makeSection(index + 1)); return { ...current, sections: normalizeSectionOrders(sections) }; }); }
  function addSectionEnd() { setDraft((current) => current ? { ...current, sections: normalizeSectionOrders([...current.sections, makeSection(current.sections.length)]) } : current); }
  function removeSection(index: number) { setDraft((current) => { if (!current || current.sections.length <= 1) return current; return { ...current, sections: normalizeSectionOrders(current.sections.filter((_, idx) => idx !== index)) }; }); }
  function moveSection(index: number, direction: -1 | 1) { setDraft((current) => { if (!current) return current; const target = index + direction; if (target < 0 || target >= current.sections.length) return current; const sections = [...current.sections]; [sections[index], sections[target]] = [sections[target], sections[index]]; return { ...current, sections: normalizeSectionOrders(sections) }; }); }

  async function saveDraft() {
    if (!activeSlug || !draft) return;
    setSaving(true);
    try {
      const payload = { ...draft, sections: normalizeSectionOrders(draft.sections) };
      const res = await fetch(`/api/pikaohjeet-v2/${encodeURIComponent(activeSlug)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Tallennusvirhe");
      await loadList(data.slug);
      setSaved(true); setTimeout(() => setSaved(false), 1600);
    } catch (error: any) { alert(error?.message || "Tallennusvirhe"); }
    finally { setSaving(false); }
  }

  async function archiveCard() {
    if (!activeSlug) return;
    if (!window.confirm(dict.confirmArchive)) return;
    setArchiving(true);
    try {
      const res = await fetch(`/api/pikaohjeet-v2/${encodeURIComponent(activeSlug)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Poisto epäonnistui");
      await loadList(null);
    } catch (error: any) { alert(error?.message || "Poisto epäonnistui"); }
    finally { setArchiving(false); }
  }

  async function copyText(key: string, text: string) { await navigator.clipboard.writeText(text); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 1200); }

  return <div className="mx-auto flex h-[calc(100vh-96px)] max-w-[1700px] flex-col gap-4 p-4 text-slate-900">
    <header className="flex shrink-0 items-center justify-between rounded-[2rem] border border-slate-100 bg-white px-7 py-5 shadow-sm"><div><a href="/pikaohjeet-v2" className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400 hover:text-blue-600"><ArrowLeft size={14} /> {dict.back}</a><h1 className="text-2xl font-black tracking-tight text-slate-900">{dict.title}</h1><p className="text-xs font-bold text-slate-400">{dict.subtitle}</p></div><div className="flex items-center gap-2">{saved && <span className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">{dict.saved}</span>}<button onClick={saveDraft} disabled={!draft || saving} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} {dict.save}</button></div></header>
    <main className="grid min-h-0 flex-1 grid-cols-12 gap-5 overflow-hidden"><aside className="col-span-4 flex min-h-0 flex-col gap-4 xl:col-span-3"><div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={dict.search} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold outline-none focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10" /></div></div><div className="min-h-0 flex-1 overflow-y-auto pr-1">{loading ? <div className="flex h-40 items-center justify-center text-blue-500"><Loader2 className="animate-spin" /></div> : filteredCards.length === 0 ? <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-300">{dict.empty}</div> : <div className="space-y-2">{filteredCards.map((card) => <button key={card.slug} onClick={() => setActiveSlug(card.slug)} className={`w-full rounded-[1.35rem] border p-4 text-left transition ${activeSlug === card.slug ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-white hover:bg-slate-50"}`}><div className="truncate text-sm font-black text-slate-800">{card.title}</div>{card.description && <div className="mt-1 line-clamp-2 text-xs font-semibold text-slate-400">{card.description}</div>}<div className="mt-3 flex flex-wrap gap-1.5"><span className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] font-black text-blue-700">{labelFor(statusList, card.status)}</span><span className="rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 text-[9px] font-black text-amber-800">{labelFor(sourceList, card.sourceStatus)}</span></div></button>)}</div>}</div></aside>
    <section className="col-span-8 min-h-0 overflow-y-auto rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm xl:col-span-9">{loadingCard ? <div className="flex h-full items-center justify-center text-blue-500"><Loader2 className="animate-spin" /></div> : !draft ? <div className="flex h-full items-center justify-center text-sm font-black uppercase tracking-widest text-slate-300">{dict.select}</div> : <div className="mx-auto max-w-5xl space-y-5"><div className="grid gap-4 rounded-[2rem] border border-slate-100 bg-slate-50 p-5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.titleLabel}</label><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold outline-none focus:border-blue-200 focus:ring-4 focus:ring-blue-500/10" /><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.description}</label><input value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold outline-none focus:border-blue-200 focus:ring-4 focus:ring-blue-500/10" /><div className="grid grid-cols-2 gap-4"><div><label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.status}</label><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold outline-none">{statusList.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div><div><label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.sourceStatus}</label><select value={draft.sourceStatus} onChange={(e) => setDraft({ ...draft, sourceStatus: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold outline-none">{sourceList.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div></div><div className="grid grid-cols-2 gap-4"><div><label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.environment}</label><input value={draft.environment || ""} onChange={(e) => setDraft({ ...draft, environment: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold outline-none" /></div><div><label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.audience}</label><input value={draft.audience || ""} onChange={(e) => setDraft({ ...draft, audience: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold outline-none" /></div></div><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.tags}</label><input value={(draft.tags || []).join(", ")} onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold outline-none" /></div><div className="flex flex-wrap justify-between gap-3"><button onClick={addSectionEnd} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-600 hover:bg-slate-50"><Plus size={15} /> {dict.addSection}</button><button onClick={archiveCard} disabled={archiving} className="inline-flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-rose-700 hover:bg-rose-100 disabled:opacity-50">{archiving ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />} {dict.archive}</button></div>{draft.sections.map((section, index) => <article key={section.key || index} className="rounded-[2rem] border border-slate-100 bg-slate-50 p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.sectionTitle} · {index + 1}</label><div className="flex flex-wrap gap-2"><button onClick={() => moveSection(index, -1)} disabled={index === 0} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-600 disabled:opacity-40"><ArrowUp size={12} /> {dict.moveUp}</button><button onClick={() => moveSection(index, 1)} disabled={index === draft.sections.length - 1} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-600 disabled:opacity-40"><ArrowDown size={12} /> {dict.moveDown}</button><button onClick={() => addSectionAfter(index)} className="inline-flex items-center gap-1 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-blue-700"><Plus size={12} /> {dict.addBelow}</button><button onClick={() => removeSection(index)} disabled={draft.sections.length <= 1} className="inline-flex items-center gap-1 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-rose-700 disabled:opacity-40"><X size={12} /> {dict.removeSection}</button></div></div><input value={section.title} onChange={(e) => updateSection(index, { title: e.target.value })} className="mb-4 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold outline-none" /><label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.sectionContent}</label><textarea value={section.content} onChange={(e) => updateSection(index, { content: e.target.value })} className="min-h-[240px] w-full rounded-[1.5rem] border border-slate-200 bg-white p-5 text-sm font-semibold leading-relaxed outline-none" /><div className="mt-4 rounded-[1.5rem] border border-slate-100 bg-white p-5"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-black uppercase tracking-wide text-slate-500">Preview</h3><button onClick={() => copyText(section.key, section.content)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-500 hover:bg-slate-50"><Clipboard size={13} /> {copiedKey === section.key ? dict.copied : dict.copy}</button></div><div className="prose prose-slate max-w-none text-sm font-semibold leading-relaxed"><ReactMarkdown>{section.content}</ReactMarkdown></div></div></article>)}</div>}</section></main>
    <PikaohjeAgentDock activeSlug={activeSlug} draft={draft} onApplyDraft={(nextDraft) => setDraft(nextDraft)} />
  </div>;
}
