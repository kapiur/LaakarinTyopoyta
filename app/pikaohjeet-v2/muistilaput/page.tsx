"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Clipboard, Loader2, Plus, Save, Search, Share2, Sparkles, Trash2, X } from "lucide-react";
import PrivacyNotice from "../../../components/PrivacyNotice";
import { useI18n } from "../../../lib/useI18n";

type UiLang = "fi" | "ru" | "en";
type PrivacyInfo = { anonymized?: boolean; findingTypes?: string[] } | null;

type Section = { key: string; title: string; content: string; order: number; kind: string };
type ShareUser = { email: string; name: string };
type CardListItem = { slug: string; title: string; description?: string | null; type: string; tags: string[]; visibility?: string; sharedWith?: string[]; canEdit?: boolean; isOwner?: boolean; isSharedWithMe?: boolean; updatedByName?: string | null; updatedByEmail?: string | null };
type CardDetail = CardListItem & { sections: Section[] };
type DraftCard = { title: string; description?: string; type: "PERSONAL"; status: "NEEDS_REVIEW"; visibility: "PRIVATE" | "SHARED_BY_ME" | "SHARED_WITH_ME"; sourceStatus: "NOT_CHECKED"; tags: string[]; sharedWith: string[]; sections: Section[]; warnings?: string[]; canEdit?: boolean; isOwner?: boolean; isSharedWithMe?: boolean };

const ui = {
  fi: {
    title: "Omat muistilaput", subtitle: "Muokkaa, jaa, rakenna osioita ja siisti AI:lla", back: "Takaisin Pikaohjeisiin", search: "Hae omista ja jaetuista muistilapuista...", select: "Valitse muistilappu listasta", save: "Tallenna muutokset", ai: "Muokkaa AI:lla", addSection: "Lisää osio", removeSection: "Poista osio", archive: "Arkistoi", confirmArchive: "Arkistoidaanko tämä muistilappu?", titleLabel: "Otsikko", description: "Kuvaus", tags: "Tagit pilkulla erotettuina", sectionTitle: "Osion otsikko", sectionContent: "Sisältö", saved: "Tallennettu", empty: "Ei muistilappuja", copy: "Kopioi", copied: "Kopioitu", shareTitle: "Jaa käyttäjille", sharedByMe: "Jaettu minun toimesta", sharedWithMe: "Jaettu minulle", private: "Vain minä", readonly: "Vain luku", noUsers: "Ei muita aktiivisia käyttäjiä", owner: "Omistaja" },
  ru: {
    title: "Мои заметки", subtitle: "Редактирование, sharing, секции и улучшение через AI", back: "Назад в Pikaohjeet", search: "Поиск по моим и общим заметкам...", select: "Выберите заметку из списка", save: "Сохранить изменения", ai: "Улучшить через AI", addSection: "Добавить секцию", removeSection: "Удалить секцию", archive: "В архив", confirmArchive: "Отправить эту заметку в архив?", titleLabel: "Заголовок", description: "Описание", tags: "Теги через запятую", sectionTitle: "Заголовок секции", sectionContent: "Содержание", saved: "Сохранено", empty: "Заметок нет", copy: "Копировать", copied: "Скопировано", shareTitle: "Поделиться с пользователями", sharedByMe: "Я поделился", sharedWithMe: "Поделились со мной", private: "Только я", readonly: "Только чтение", noUsers: "Нет других активных пользователей", owner: "Владелец" },
  en: {
    title: "My notes", subtitle: "Edit, share, manage sections, and improve with AI", back: "Back to Pikaohjeet", search: "Search my and shared notes...", select: "Select a note from the list", save: "Save changes", ai: "Improve with AI", addSection: "Add section", removeSection: "Remove section", archive: "Archive", confirmArchive: "Archive this note?", titleLabel: "Title", description: "Description", tags: "Comma-separated tags", sectionTitle: "Section title", sectionContent: "Content", saved: "Saved", empty: "No notes", copy: "Copy", copied: "Copied", shareTitle: "Share with users", sharedByMe: "Shared by me", sharedWithMe: "Shared with me", private: "Only me", readonly: "Read-only", noUsers: "No other active users", owner: "Owner" },
};

function makeSection(index: number): Section { return { key: `section_${Date.now()}_${index}`, title: `Osio ${index + 1}`, content: "", order: (index + 1) * 10, kind: "TEXT" }; }
function toDraft(card: CardDetail): DraftCard { return { title: card.title, description: card.description || "", type: "PERSONAL", status: "NEEDS_REVIEW", visibility: (card.visibility as any) || "PRIVATE", sourceStatus: "NOT_CHECKED", tags: card.tags || [], sharedWith: card.sharedWith || [], canEdit: card.canEdit !== false, isOwner: card.isOwner !== false && card.canEdit !== false, isSharedWithMe: Boolean(card.isSharedWithMe), sections: (card.sections || []).map((section, index) => ({ key: section.key || `section_${index + 1}`, title: section.title || `Osio ${index + 1}`, content: section.content || "", order: Number.isFinite(Number(section.order)) ? Number(section.order) : (index + 1) * 10, kind: section.kind || "TEXT" })) }; }
function draftToRawText(draft: DraftCard) { return [`Otsikko: ${draft.title}`, draft.description ? `Kuvaus: ${draft.description}` : "", draft.tags?.length ? `Tagit: ${draft.tags.join(", ")}` : "", ...draft.sections.map((section) => `\n## ${section.title}\n${section.content}`)].filter(Boolean).join("\n"); }
function noteBadge(dict: any, card: CardListItem | DraftCard) { if (card.isSharedWithMe || card.visibility === "SHARED_WITH_ME") return dict.sharedWithMe; if ((card.sharedWith || []).length > 0 || card.visibility === "SHARED_BY_ME") return dict.sharedByMe; return dict.private; }

export default function PersonalNoteManagerPage() {
  const { language } = useI18n();
  const dict = ui[(language as UiLang) || "fi"] ?? ui.fi;
  const [cards, setCards] = useState<CardListItem[]>([]);
  const [users, setUsers] = useState<ShareUser[]>([]);
  const [query, setQuery] = useState("");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftCard | null>(null);
  const [aiPrivacy, setAiPrivacy] = useState<PrivacyInfo>(null);
  const [loading, setLoading] = useState(true);
  const [loadingCard, setLoadingCard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function loadList(selectSlug?: string | null) {
    setLoading(true);
    try {
      const res = await fetch("/api/pikaohjeet-v2", { cache: "no-store" });
      const data = await res.json();
      const personal = Array.isArray(data) ? data.filter((card) => card.type === "PERSONAL") : [];
      setCards(personal);
      if (selectSlug !== undefined) setActiveSlug(selectSlug);
      else if (!activeSlug && personal.length > 0) setActiveSlug(personal[0].slug);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    loadList();
    fetch("/api/pikaohjeet-v2/users", { cache: "no-store" }).then((res) => res.ok ? res.json() : []).then((data) => setUsers(Array.isArray(data) ? data : [])).catch(() => setUsers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAiPrivacy(null);
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

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((card) => [card.title, card.description || "", noteBadge(dict, card), card.updatedByName || "", card.updatedByEmail || "", ...(card.tags || [])].join(" ").toLowerCase().includes(q));
  }, [cards, query, dict]);

  const canEdit = draft?.canEdit !== false;

  function updateSection(index: number, patch: Partial<Section>) { if (!canEdit) return; setDraft((current) => { if (!current) return current; const sections = [...current.sections]; sections[index] = { ...sections[index], ...patch }; return { ...current, sections }; }); }
  function addSection() { if (!canEdit) return; setDraft((current) => current ? { ...current, sections: [...current.sections, makeSection(current.sections.length)] } : current); }
  function removeSection(index: number) { if (!canEdit) return; setDraft((current) => { if (!current || current.sections.length <= 1) return current; return { ...current, sections: current.sections.filter((_, idx) => idx !== index) }; }); }
  function toggleShare(email: string) { if (!canEdit) return; setDraft((current) => { if (!current) return current; const exists = current.sharedWith.includes(email); return { ...current, sharedWith: exists ? current.sharedWith.filter((item) => item !== email) : [...current.sharedWith, email] }; }); }

  async function saveDraft() {
    if (!activeSlug || !draft || !canEdit) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/pikaohjeet-v2/${encodeURIComponent(activeSlug)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Tallennusvirhe");
      setDraft(toDraft(data));
      await loadList(data.slug);
      setSaved(true); setTimeout(() => setSaved(false), 1600);
    } catch (error: any) { alert(error?.message || "Tallennusvirhe"); }
    finally { setSaving(false); }
  }

  async function improveWithAi() {
    if (!draft || !canEdit) return;
    setAiLoading(true);
    setAiPrivacy(null);
    try {
      const res = await fetch("/api/pikaohjeet-v2/ai/clean-note", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: draft.title, rawText: draftToRawText(draft) }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "AI error");
      setAiPrivacy(data.privacy || null);
      setDraft({ ...data, sharedWith: draft.sharedWith, canEdit: true, isOwner: true, visibility: draft.sharedWith.length ? "SHARED_BY_ME" : "PRIVATE" });
    } catch (error: any) { alert(error?.message || "AI error"); }
    finally { setAiLoading(false); }
  }

  async function archiveCard() {
    if (!activeSlug || !canEdit) return;
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

  return (
    <div className="mx-auto flex h-[calc(100vh-96px)] max-w-[1700px] flex-col gap-4 p-4 text-slate-900">
      <header className="flex shrink-0 items-center justify-between rounded-[2rem] border border-slate-100 bg-white px-7 py-5 shadow-sm">
        <div><a href="/pikaohjeet-v2" className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400 hover:text-blue-600"><ArrowLeft size={14} /> {dict.back}</a><h1 className="text-2xl font-black tracking-tight text-slate-900">{dict.title}</h1><p className="text-xs font-bold text-slate-400">{dict.subtitle}</p></div>
        <div className="flex items-center gap-2">{saved && <span className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">{dict.saved}</span>}<button onClick={improveWithAi} disabled={!draft || !canEdit || aiLoading} className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-blue-700 hover:bg-blue-100 disabled:opacity-50">{aiLoading ? <Loader2 className="animate-spin" size={15} /> : <Sparkles size={15} />} {dict.ai}</button><button onClick={saveDraft} disabled={!draft || !canEdit || saving} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />} {dict.save}</button></div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-12 gap-5 overflow-hidden">
        <aside className="col-span-4 flex min-h-0 flex-col gap-4 xl:col-span-3"><div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={dict.search} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold outline-none focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10" /></div></div><div className="min-h-0 flex-1 overflow-y-auto pr-1">{loading ? <div className="flex h-40 items-center justify-center text-blue-500"><Loader2 className="animate-spin" /></div> : filteredCards.length === 0 ? <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-300">{dict.empty}</div> : <div className="space-y-2">{filteredCards.map((card) => <button key={card.slug} onClick={() => setActiveSlug(card.slug)} className={`w-full rounded-[1.35rem] border p-4 text-left transition ${activeSlug === card.slug ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-white hover:bg-slate-50"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-black text-slate-800">{card.title}</div>{card.description && <div className="mt-1 line-clamp-2 text-xs font-semibold text-slate-400">{card.description}</div>}</div><Share2 size={15} className={card.visibility === "PRIVATE" ? "text-slate-300" : "text-blue-500"} /></div><div className="mt-3 flex flex-wrap gap-1.5"><span className={`rounded-lg border px-2 py-1 text-[9px] font-black ${card.visibility === "PRIVATE" ? "border-slate-100 bg-slate-50 text-slate-500" : "border-blue-100 bg-blue-50 text-blue-700"}`}>{noteBadge(dict, card)}</span>{card.isSharedWithMe && <span className="rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 text-[9px] font-black text-amber-800">{dict.readonly}</span>}{card.tags?.slice(0, 3).map((tag) => <span key={tag} className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">#{tag}</span>)}</div></button>)}</div>}</div></aside>

        <section className="col-span-8 min-h-0 overflow-y-auto rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm xl:col-span-9">{loadingCard ? <div className="flex h-full items-center justify-center text-blue-500"><Loader2 className="animate-spin" /></div> : !draft ? <div className="flex h-full items-center justify-center text-sm font-black uppercase tracking-widest text-slate-300">{dict.select}</div> : <div className="mx-auto max-w-5xl space-y-5"><PrivacyNotice privacy={aiPrivacy} /><div className="flex flex-wrap items-center gap-2"><span className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wide ${draft.visibility === "PRIVATE" ? "border-slate-100 bg-slate-50 text-slate-500" : "border-blue-100 bg-blue-50 text-blue-700"}`}>{noteBadge(dict, draft)}</span>{!canEdit && <span className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-amber-800">{dict.readonly}</span>}</div><div className="grid gap-4 rounded-[2rem] border border-slate-100 bg-slate-50 p-5"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.titleLabel}</label><input value={draft.title} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold outline-none disabled:bg-slate-100 disabled:text-slate-500" /><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.description}</label><input value={draft.description || ""} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold outline-none disabled:bg-slate-100 disabled:text-slate-500" /><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.tags}</label><input value={(draft.tags || []).join(", ")} disabled={!canEdit} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold outline-none disabled:bg-slate-100 disabled:text-slate-500" /></div>{canEdit && <div className="rounded-[2rem] border border-blue-100 bg-blue-50/60 p-5"><div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-blue-700"><Share2 size={15} /> {dict.shareTitle}</div>{users.length === 0 ? <div className="text-sm font-bold text-slate-400">{dict.noUsers}</div> : <div className="grid gap-2 sm:grid-cols-2">{users.map((user) => <label key={user.email} className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white p-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={draft.sharedWith.includes(user.email.toLowerCase())} onChange={() => toggleShare(user.email.toLowerCase())} /> <span className="min-w-0"><span className="block truncate">{user.name}</span><span className="block truncate text-[10px] font-semibold text-slate-400">{user.email}</span></span></label>)}</div>}</div>}<div className="flex flex-wrap justify-between gap-3"><button onClick={addSection} disabled={!canEdit} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-600 hover:bg-slate-50 disabled:opacity-40"><Plus size={15} /> {dict.addSection}</button><button onClick={archiveCard} disabled={archiving || !canEdit} className="inline-flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-black uppercase tracking-wide text-rose-700 hover:bg-rose-100 disabled:opacity-40">{archiving ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />} {dict.archive}</button></div>{draft.sections.map((section, index) => <article key={section.key || index} className="rounded-[2rem] border border-slate-100 bg-slate-50 p-5"><div className="mb-4 flex items-center justify-between gap-4"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.sectionTitle}</label>{canEdit && <button onClick={() => removeSection(index)} disabled={draft.sections.length <= 1} className="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-rose-700 disabled:opacity-40"><X size={12} /> {dict.removeSection}</button>}</div><input value={section.title} disabled={!canEdit} onChange={(event) => updateSection(index, { title: event.target.value })} className="mb-4 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold outline-none disabled:bg-slate-100 disabled:text-slate-500" /><label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.sectionContent}</label><textarea value={section.content} disabled={!canEdit} onChange={(event) => updateSection(index, { content: event.target.value })} className="min-h-[240px] w-full rounded-[1.5rem] border border-slate-200 bg-white p-5 text-sm font-semibold leading-relaxed outline-none disabled:bg-slate-100 disabled:text-slate-500" /><div className="mt-4 rounded-[1.5rem] border border-slate-100 bg-white p-5"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-black uppercase tracking-wide text-slate-500">Preview</h3><button onClick={() => copyText(section.key, section.content)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-500 hover:bg-slate-50"><Clipboard size={13} /> {copiedKey === section.key ? dict.copied : dict.copy}</button></div><div className="prose prose-slate max-w-none text-sm font-semibold leading-relaxed"><ReactMarkdown>{section.content}</ReactMarkdown></div></div></article>)}</div>}</section>
      </main>
    </div>
  );
}
