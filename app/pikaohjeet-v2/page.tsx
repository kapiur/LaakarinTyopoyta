"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import ReactMarkdown from "react-markdown";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clipboard,
  FileText,
  Loader2,
  Lock,
  Plus,
  Search,
  Sparkles,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import { useI18n } from "../../lib/useI18n";

type UiLang = "fi" | "ru" | "en";

type PikaohjeListItem = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  type: "CLINICAL" | "PERSONAL" | string;
  status: string;
  visibility: string;
  sourceStatus: string;
  tags: string[];
  updatedAt: string;
  sectionCount: number;
};

type PikaohjeSection = {
  id?: string;
  key: string;
  title: string;
  content: string;
  order: number;
  kind: "TEXT" | "WARNING" | "CRITERIA" | "ACTIONS" | "COPY_TEXT" | "SOURCES" | string;
};

type PikaohjeDetail = PikaohjeListItem & {
  environment?: string;
  audience?: string;
  sections: PikaohjeSection[];
  fields: Array<{
    id: string;
    key: string;
    label: string;
    type: string;
    unit?: string | null;
    placeholder?: string | null;
    options: string[];
    order: number;
  }>;
  rules: Array<{
    id: string;
    groupId?: string | null;
    fieldKey: string;
    operator: string;
    value: string;
    highlightSectionKey?: string | null;
    addHint?: string | null;
    priority: number;
  }>;
  sources: Array<{ title: string; url?: string | null; type?: string; verified?: boolean }>;
};

type DraftCard = {
  title: string;
  description?: string;
  type: "PERSONAL" | "CLINICAL";
  status: string;
  visibility: string;
  sourceStatus: string;
  tags: string[];
  sections: PikaohjeSection[];
  warnings?: string[];
};

const ui = {
  fi: {
    title: "Pikaohjeet v2",
    subtitle: "Nopeat kliiniset kortit ja omat muistilaput",
    search: "Hae ohjetta, muistilappua tai tagia...",
    all: "Kaikki",
    clinical: "Kliiniset",
    personal: "Omat",
    checked: "Tarkistetut",
    review: "Vaatii tarkistuksen",
    newNote: "Uusi muistilappu",
    aiClean: "Siisti AI:lla",
    rawText: "Liitä oma muistilappu tähän",
    rawPlaceholder: "Esim. rautalääkitysohje, oma fraasi, laboratoriotulkinta...",
    noteTitle: "Otsikko",
    draft: "AI-luonnos",
    notSaved: "Luonnosta ei ole vielä tallennettu tietokantaan.",
    legacy: "Legacy-kortti",
    sourceUnchecked: "Ei lähdetarkistettu",
    sourceChecked: "Lähde tarkistettu",
    private: "Vain minä",
    public: "Yhteinen",
    select: "Valitse kortti listasta",
    loading: "Ladataan...",
    noCards: "Ei hakutuloksia",
    copy: "Kopioi",
    copied: "Kopioitu",
    close: "Sulje",
    warning: "Huomio",
    openOld: "Avaa vanha Pikaohjeet",
  },
  ru: {
    title: "Pikaohjeet v2",
    subtitle: "Быстрые клинические карточки и личные напоминалки",
    search: "Поиск по карточкам, заметкам или тегам...",
    all: "Все",
    clinical: "Клинические",
    personal: "Мои",
    checked: "Проверенные",
    review: "Требуют проверки",
    newNote: "Новая заметка",
    aiClean: "Причесать через AI",
    rawText: "Вставь свою заметку сюда",
    rawPlaceholder: "Например: инструкция по железу, своя фраза, интерпретация лабораторий...",
    noteTitle: "Заголовок",
    draft: "AI-черновик",
    notSaved: "Черновик пока не сохранён в базу данных.",
    legacy: "Legacy-карточка",
    sourceUnchecked: "Источники не проверены",
    sourceChecked: "Источник проверен",
    private: "Только я",
    public: "Общая",
    select: "Выберите карточку из списка",
    loading: "Загрузка...",
    noCards: "Нет результатов",
    copy: "Копировать",
    copied: "Скопировано",
    close: "Закрыть",
    warning: "Внимание",
    openOld: "Открыть старый Pikaohjeet",
  },
  en: {
    title: "Pikaohjeet v2",
    subtitle: "Fast clinical cards and personal notes",
    search: "Search cards, notes, or tags...",
    all: "All",
    clinical: "Clinical",
    personal: "My notes",
    checked: "Checked",
    review: "Needs review",
    newNote: "New note",
    aiClean: "Clean with AI",
    rawText: "Paste your note here",
    rawPlaceholder: "For example: iron therapy note, own phrase, lab interpretation...",
    noteTitle: "Title",
    draft: "AI draft",
    notSaved: "The draft has not been saved to the database yet.",
    legacy: "Legacy card",
    sourceUnchecked: "Sources not checked",
    sourceChecked: "Source checked",
    private: "Only me",
    public: "Shared",
    select: "Select a card from the list",
    loading: "Loading...",
    noCards: "No results",
    copy: "Copy",
    copied: "Copied",
    close: "Close",
    warning: "Warning",
    openOld: "Open old Pikaohjeet",
  },
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function badgeClass(tone: "blue" | "amber" | "emerald" | "slate" | "rose") {
  const map = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    amber: "bg-amber-50 text-amber-800 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  };
  return map[tone];
}

function sectionTone(kind: string) {
  if (kind === "WARNING") return "border-amber-100 bg-amber-50/70";
  if (kind === "CRITERIA") return "border-blue-100 bg-blue-50/60";
  if (kind === "ACTIONS") return "border-emerald-100 bg-emerald-50/60";
  if (kind === "COPY_TEXT") return "border-violet-100 bg-violet-50/60";
  return "border-slate-100 bg-white";
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

export default function PikaohjeetV2Page() {
  const { data: session } = useSession();
  const { language } = useI18n();
  const dict = ui[(language as UiLang) || "fi"] ?? ui.fi;

  const [cards, setCards] = useState<PikaohjeListItem[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<PikaohjeDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingCard, setLoadingCard] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "clinical" | "personal" | "checked" | "review">("all");
  const [showNoteDrawer, setShowNoteDrawer] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [cleaning, setCleaning] = useState(false);
  const [draftCard, setDraftCard] = useState<DraftCard | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingList(true);
      try {
        const res = await fetch("/api/pikaohjeet-v2", { cache: "no-store" });
        const data = await res.json();
        if (!mounted) return;
        setCards(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) setActiveSlug(data[0].slug);
      } catch (error) {
        console.error(error);
      } finally {
        if (mounted) setLoadingList(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeSlug) return;
    let mounted = true;
    async function loadCard() {
      setLoadingCard(true);
      try {
        const res = await fetch(`/api/pikaohjeet-v2/${encodeURIComponent(activeSlug)}`, { cache: "no-store" });
        const data = await res.json();
        if (mounted) setActiveCard(res.ok ? data : null);
      } catch (error) {
        console.error(error);
        if (mounted) setActiveCard(null);
      } finally {
        if (mounted) setLoadingCard(false);
      }
    }
    loadCard();
    return () => {
      mounted = false;
    };
  }, [activeSlug]);

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cards.filter((card) => {
      if (filter === "clinical" && card.type !== "CLINICAL") return false;
      if (filter === "personal" && card.type !== "PERSONAL") return false;
      if (filter === "checked" && !card.sourceStatus.includes("CHECKED")) return false;
      if (filter === "review" && card.status !== "NEEDS_REVIEW") return false;
      if (!q) return true;
      return [card.title, card.description ?? "", ...card.tags].join(" ").toLowerCase().includes(q);
    });
  }, [cards, filter, query]);

  const cleanNote = async () => {
    setCleaning(true);
    setDraftCard(null);
    try {
      const res = await fetch("/api/pikaohjeet-v2/ai/clean-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: noteTitle, rawText: noteText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "AI error");
      setDraftCard(data);
    } catch (error: any) {
      alert(error?.message || "AI error");
    } finally {
      setCleaning(false);
    }
  };

  const handleCopy = async (key: string, text: string) => {
    await copyToClipboard(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1400);
  };

  const visibleCard = draftCard
    ? {
        title: draftCard.title,
        description: draftCard.description,
        type: draftCard.type,
        status: draftCard.status,
        visibility: draftCard.visibility,
        sourceStatus: draftCard.sourceStatus,
        tags: draftCard.tags,
        sections: draftCard.sections,
        warnings: draftCard.warnings || [],
      }
    : activeCard;

  return (
    <div className="mx-auto flex h-[calc(100vh-96px)] max-w-[1700px] flex-col gap-4 p-4 text-slate-900">
      <header className="flex shrink-0 items-center justify-between rounded-[2rem] border border-slate-100 bg-white px-7 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100">
            <BookOpen size={21} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">{dict.title}</h1>
            <p className="text-xs font-bold text-slate-400">{dict.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/pikaohjeet" className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-50">
            {dict.openOld}
          </a>
          <button
            onClick={() => setShowNoteDrawer(true)}
            className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700"
          >
            <Plus size={16} /> {dict.newNote}
          </button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-12 gap-5 overflow-hidden">
        <aside className="col-span-4 flex min-h-0 flex-col gap-4 xl:col-span-3">
          <div className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={dict.search}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ["all", dict.all],
                ["clinical", dict.clinical],
                ["personal", dict.personal],
                ["checked", dict.checked],
                ["review", dict.review],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wide transition",
                    filter === key ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-100 bg-white text-slate-400 hover:bg-slate-50"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {loadingList ? (
              <div className="flex h-40 items-center justify-center text-blue-500">
                <Loader2 className="animate-spin" />
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-300">{dict.noCards}</div>
            ) : (
              <div className="space-y-2">
                {filteredCards.map((card) => (
                  <button
                    key={card.slug}
                    onClick={() => {
                      setDraftCard(null);
                      setActiveSlug(card.slug);
                    }}
                    className={cn(
                      "w-full rounded-[1.35rem] border p-4 text-left transition",
                      activeSlug === card.slug && !draftCard
                        ? "border-blue-200 bg-blue-50 shadow-sm"
                        : "border-slate-100 bg-white hover:border-blue-100 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-slate-800">{card.title}</div>
                        {card.description && <div className="mt-1 line-clamp-2 text-xs font-semibold text-slate-400">{card.description}</div>}
                      </div>
                      <Stethoscope size={16} className="shrink-0 text-blue-500" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className={cn("rounded-lg border px-2 py-1 text-[9px] font-black uppercase", badgeClass("blue"))}>{dict.legacy}</span>
                      <span className={cn("rounded-lg border px-2 py-1 text-[9px] font-black uppercase", badgeClass("amber"))}>{dict.sourceUnchecked}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="col-span-8 min-h-0 overflow-hidden rounded-[2rem] border border-slate-100 bg-slate-50 shadow-sm xl:col-span-9">
          {loadingCard && !draftCard ? (
            <div className="flex h-full items-center justify-center text-blue-500"><Loader2 className="animate-spin" /></div>
          ) : visibleCard ? (
            <div className="h-full overflow-y-auto p-6 xl:p-10">
              <div className="mb-7 rounded-[2rem] border border-slate-100 bg-white p-7 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-wide", visibleCard.type === "PERSONAL" ? badgeClass("slate") : badgeClass("blue"))}>
                        {visibleCard.type === "PERSONAL" ? <UserRound size={13} /> : <Stethoscope size={13} />}
                        {visibleCard.type === "PERSONAL" ? dict.personal : dict.clinical}
                      </span>
                      <span className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-wide", visibleCard.sourceStatus?.includes("CHECKED") ? badgeClass("emerald") : badgeClass("amber"))}>
                        {visibleCard.sourceStatus?.includes("CHECKED") ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                        {visibleCard.sourceStatus?.includes("CHECKED") ? dict.sourceChecked : dict.sourceUnchecked}
                      </span>
                      {visibleCard.visibility === "PRIVATE" && (
                        <span className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-black uppercase tracking-wide", badgeClass("slate"))}>
                          <Lock size={13} /> {dict.private}
                        </span>
                      )}
                    </div>
                    <h2 className="text-4xl font-black tracking-tight text-slate-900">{visibleCard.title}</h2>
                    {visibleCard.description && <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-slate-500">{visibleCard.description}</p>}
                    {visibleCard.tags?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {visibleCard.tags.map((tag) => (
                          <span key={tag} className="rounded-xl bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {draftCard && (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-relaxed text-amber-900">
                      <div className="mb-1 flex items-center gap-2 font-black uppercase tracking-wide"><Sparkles size={14} /> {dict.draft}</div>
                      {dict.notSaved}
                    </div>
                  )}
                </div>
              </div>

              {draftCard?.warnings && draftCard.warnings.length > 0 && (
                <div className="mb-5 rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5 text-sm font-semibold text-amber-900">
                  <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide"><AlertTriangle size={16} /> {dict.warning}</div>
                  <ul className="list-disc space-y-1 pl-5">
                    {draftCard.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
                  </ul>
                </div>
              )}

              <div className="space-y-5">
                {[...(visibleCard.sections || [])].sort((a, b) => a.order - b.order).map((section) => (
                  <article key={section.key} className={cn("rounded-[2rem] border p-7 shadow-sm", sectionTone(section.kind))}>
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <h3 className="text-sm font-black uppercase tracking-wide text-slate-800">{section.title}</h3>
                      {section.kind === "COPY_TEXT" && (
                        <button
                          onClick={() => handleCopy(section.key, section.content)}
                          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-500 transition hover:bg-slate-50"
                        >
                          <Clipboard size={13} /> {copiedKey === section.key ? dict.copied : dict.copy}
                        </button>
                      )}
                    </div>
                    <div className="prose prose-slate max-w-none text-sm font-semibold leading-relaxed prose-p:my-2 prose-li:my-1">
                      <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-black uppercase tracking-widest text-slate-300">
              <FileText className="mr-3" size={20} /> {dict.select}
            </div>
          )}
        </section>
      </main>

      {showNoteDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">{dict.newNote}</h2>
                <p className="text-xs font-bold text-slate-400">{dict.notSaved}</p>
              </div>
              <button onClick={() => setShowNoteDrawer(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
                <X size={22} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.noteTitle}</label>
                  <input
                    value={noteTitle}
                    onChange={(event) => setNoteTitle(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400">{dict.rawText}</label>
                  <textarea
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    placeholder={dict.rawPlaceholder}
                    className="min-h-[360px] w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm font-semibold leading-relaxed outline-none focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>
            </div>
            <footer className="border-t border-slate-100 p-6">
              <button
                onClick={cleanNote}
                disabled={cleaning || !noteText.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cleaning ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} {dict.aiClean}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
